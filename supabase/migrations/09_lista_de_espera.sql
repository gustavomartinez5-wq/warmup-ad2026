-- La fila del día del evento.
--
-- Un turno es un número, nada más: ni nombre, ni matrícula, ni carrera. Lo que
-- identifica a la persona lo pone ella al presentarse en la mesa. Esto no es una
-- precaución de más: los datos de estudiantes no pueden subir a Supabase ni a
-- Vercel, y la forma de cumplirlo es no tenerlos.
--
-- Por eso esta tabla no necesita protegerse: no hay nada que proteger. Lo que sí
-- se protege es la operación —llamar, cerrar, borrar—, que es solo del equipo.

create type servicio_t as enum ('cv', 'entrevista', 'portafolio');
create type turno_t    as enum ('espera', 'llamado', 'atendido', 'no_llego');
create type destino_t  as enum ('host', 'mesa');

create table turnos (
  id          uuid primary key default gen_random_uuid(),
  edicion_id  uuid not null references ediciones (id) on delete cascade,
  folio       int  not null,
  servicio    servicio_t not null,
  estado      turno_t not null default 'espera',
  -- A dónde lo mandó el gestor. Nulo mientras espera.
  destino     destino_t,
  mesa_numero int,
  bloque      bloque_t,
  llamado_en  timestamptz,
  creado_en   timestamptz not null default now(),
  -- Si el destino es una mesa, tiene que decir cuál y de qué bloque.
  constraint turnos_destino_mesa
    check (destino is distinct from 'mesa' or (mesa_numero is not null and bloque is not null)),
  unique (edicion_id, folio)
);

/**
 * Las dos filas reales del salón.
 *
 * Las mesas no están tipificadas por servicio: el mismo reclutador revisa un CV
 * y luego hace una entrevista. Lo único que es una zona aparte son los expertos
 * de portafolio. Así que la posición en la fila se cuenta sobre el pool de mesas
 * al que la persona va a entrar, no sobre la etiqueta que eligió.
 *
 * Contarlo por etiqueta daría un número mentiroso: quien viene por CV también
 * espera a los de entrevista, porque comparten las mismas mesas.
 */
create or replace function public.pool_de(p_servicio servicio_t)
returns text language sql immutable
as $$ select case when p_servicio = 'portafolio' then 'portafolio' else 'general' end $$;

-- El índice que usa el conteo de «cuántos van delante», en cada refresco de cada
-- teléfono que está esperando.
create index turnos_fila on turnos (edicion_id, estado, folio);
create index turnos_creado on turnos (edicion_id, creado_en);


-- ── Lo que puede hacer alguien sin sesión ───────────────────────────────────
-- Igual que el reclutador en /mesa: dos funciones y nada de acceso a la tabla.

/**
 * Sacar turno. Devuelve el folio que le tocó y el identificador que su teléfono
 * guarda para volver a su pantalla.
 *
 * El folio se calcula con el candado tomado: sin él, cien personas tocando el
 * botón a la vez se llevarían el mismo número o chocarían contra el único.
 */
create or replace function public.sacar_turno(p_servicio servicio_t)
returns table (id uuid, folio int)
language plpgsql security definer set search_path = public
as $$
declare v_edicion uuid; v_folio int;
begin
  select e.id into v_edicion from ediciones e where e.activa limit 1;
  if v_edicion is null then
    raise exception 'No hay una edición activa.';
  end if;

  perform pg_advisory_xact_lock(hashtext('turnos:' || v_edicion::text));

  select coalesce(max(t.folio), 0) + 1 into v_folio
    from turnos t where t.edicion_id = v_edicion;

  return query
    insert into turnos (edicion_id, folio, servicio)
    values (v_edicion, v_folio, p_servicio)
    returning turnos.id, turnos.folio;
end $$;

/**
 * El turno de quien pregunta, y cuántos van delante en su pool.
 *
 * Devuelve un solo renglón: el suyo. No hay forma de listar la fila desde aquí,
 * así que un teléfono no puede recorrer los turnos de los demás aunque adivine
 * identificadores: cada consulta le cuesta un uuid completo y solo saca el propio.
 *
 * `empresa` viene resuelta para que la pantalla pueda decir «Mesa 7 · Cemex» sin
 * abrirle a anon la tabla de reclutadores.
 */
create or replace function public.mi_turno(p_id uuid)
returns table (
  folio       int,
  servicio    servicio_t,
  estado      turno_t,
  destino     destino_t,
  mesa_numero int,
  empresa     text,
  adelante    int
)
language sql stable security definer set search_path = public
as $$
  select t.folio,
         t.servicio,
         t.estado,
         t.destino,
         t.mesa_numero,
         e.nombre,
         (select count(*)::int
            from turnos o
           where o.edicion_id = t.edicion_id
             and o.estado in ('espera', 'llamado')
             and pool_de(o.servicio) = pool_de(t.servicio)
             and o.folio < t.folio)
    from turnos t
    left join reclutadores r
           on t.destino = 'mesa'
          and r.edicion_id  = t.edicion_id
          and r.bloque      = t.bloque
          and r.mesa_numero = t.mesa_numero
    left join empresas e on e.id = r.empresa_id
   where t.id = p_id;
$$;

revoke all on function public.sacar_turno(servicio_t) from public;
revoke all on function public.mi_turno(uuid)          from public;
grant execute on function public.sacar_turno(servicio_t) to anon, authenticated;
grant execute on function public.mi_turno(uuid)          to anon, authenticated;


-- ── La operación es del equipo ──────────────────────────────────────────────
-- La migración 07 ya dejó a anon sin permisos por omisión en toda tabla nueva.
-- Esto solo abre la puerta del equipo, con la misma política que las demás.

alter table turnos enable row level security;

grant select, insert, update, delete on turnos to authenticated;
create policy equipo_todo on turnos
  for all to authenticated
  using (es_equipo()) with check (es_equipo());

-- La pantalla del gestor se entera de los turnos nuevos sin recargar.
-- El teléfono de quien espera no lee esta tabla: se entera por el canal de
-- difusión `fila`, y ese aviso no lleva datos.
alter publication supabase_realtime add table turnos;


-- ── Verificación ────────────────────────────────────────────────────────────
-- Con la clave anónima, esto debe fallar con «permission denied for table turnos»:
--   select * from turnos;
-- Y esto debe funcionar:
--   select * from sacar_turno('cv');
--   select * from mi_turno('<el uuid que devolvió>');
