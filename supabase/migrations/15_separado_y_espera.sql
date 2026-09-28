-- «Separado» y personas esperando por mesa. 27-sep-2026.
--
-- Dos hosts mandan estudiantes a la vez y pueden mandar a dos a la misma mesa.
-- El host separa la mesa antes de mandar a alguien y el otro la ve apartada.
-- Además, un contador de cuántas personas esperan a esa empresa.
--
-- Solo el equipo separa y cuenta (`/host`). Scouts y lista de espera lo ven por
-- `mesas_publicas` y por el tiempo real de `mesas_estado`, que anon ya lee.
-- El separado se quita solo al marcar Ocupado: el estudiante ya llegó (Gustavo).
-- El contador se mueve a mano.

alter table mesas_estado
  add column separado_en timestamptz,
  add column esperando   int not null default 0 check (esperando >= 0);

-- ── Separar ─────────────────────────────────────────────────────────────────
/**
 * Separar una mesa que ya está separada se rechaza: es justo el choque entre dos
 * hosts que se quiere evitar. El candado de la fila hace que el segundo espere al
 * primero y lea su separado.
 */
create or replace function public.separar_mesa(
  p_numero int, p_bloque bloque_t, p_separar boolean
)
returns mesas_estado language plpgsql security invoker set search_path = public
as $$
declare v_edicion uuid; v_fila mesas_estado;
begin
  perform exige_equipo();
  select id into v_edicion from ediciones where activa limit 1;
  if v_edicion is null then raise exception 'No hay una edición activa.'; end if;

  if not exists (select 1 from reclutadores
                  where edicion_id = v_edicion and bloque = p_bloque and mesa_numero = p_numero) then
    raise exception 'La mesa % no está asignada en ese bloque.', p_numero;
  end if;

  insert into mesas_estado (edicion_id, numero, bloque)
  values (v_edicion, p_numero, p_bloque)
  on conflict (edicion_id, numero, bloque) do nothing;

  select * into v_fila from mesas_estado
   where edicion_id = v_edicion and numero = p_numero and bloque = p_bloque
   for update;

  if p_separar and v_fila.separado_en is not null then
    raise exception 'Otro host ya separó la mesa % hace % min.', p_numero,
      floor(extract(epoch from now() - v_fila.separado_en) / 60)::int;
  end if;

  update mesas_estado
     set separado_en    = case when p_separar then now() end,
         actualizado_en = now()
   where edicion_id = v_edicion and numero = p_numero and bloque = p_bloque
  returning * into v_fila;
  return v_fila;
end $$;

-- ── Personas esperando ──────────────────────────────────────────────────────
/** Una sola sentencia: si dos hosts suman a la vez, cuenta los dos. Nunca baja de 0. */
create or replace function public.ajustar_espera(
  p_numero int, p_bloque bloque_t, p_delta int
)
returns mesas_estado language plpgsql security invoker set search_path = public
as $$
declare v_edicion uuid; v_fila mesas_estado;
begin
  perform exige_equipo();
  select id into v_edicion from ediciones where activa limit 1;
  if v_edicion is null then raise exception 'No hay una edición activa.'; end if;

  if not exists (select 1 from reclutadores
                  where edicion_id = v_edicion and bloque = p_bloque and mesa_numero = p_numero) then
    raise exception 'La mesa % no está asignada en ese bloque.', p_numero;
  end if;

  insert into mesas_estado (edicion_id, numero, bloque, esperando)
  values (v_edicion, p_numero, p_bloque, greatest(0, p_delta))
  on conflict (edicion_id, numero, bloque) do update
     set esperando      = greatest(0, mesas_estado.esperando + p_delta),
         actualizado_en = now()
  returning * into v_fila;
  return v_fila;
end $$;

-- ── Ocupado quita el separado ───────────────────────────────────────────────
create or replace function public.set_estado_mesa(
  p_numero int, p_bloque bloque_t, p_estado estado_t
)
returns mesas_estado
language plpgsql security definer set search_path = public
as $$
declare v_edicion uuid; v_fila mesas_estado;
begin
  select id into v_edicion from ediciones where activa limit 1;
  if v_edicion is null then
    raise exception 'No hay una edición activa.';
  end if;

  -- La mesa tiene que existir en ese bloque. Evita que se creen filas sueltas.
  if not exists (
    select 1 from reclutadores
     where edicion_id = v_edicion and bloque = p_bloque and mesa_numero = p_numero
  ) then
    raise exception 'La mesa % no está asignada en ese bloque.', p_numero;
  end if;

  insert into mesas_estado (edicion_id, numero, bloque, estado, ocupado_desde, actualizado_en)
  values (v_edicion, p_numero, p_bloque, p_estado,
          case when p_estado = 'ocupado' then now() end, now())
  on conflict (edicion_id, numero, bloque) do update
     set estado         = excluded.estado,
         -- Marcar Ocupado siempre arranca una sesión nueva.
         ocupado_desde  = case when excluded.estado = 'ocupado' then now() end,
         -- Y quita el separado: el estudiante que se mandó ya llegó.
         separado_en    = case when excluded.estado = 'ocupado' then null
                               else mesas_estado.separado_en end,
         actualizado_en = now()
  returning * into v_fila;

  return v_fila;
end $$;

-- ── Lo público trae las dos columnas nuevas ─────────────────────────────────
-- Cambian las columnas que regresa: no basta con `create or replace`.
drop function public.mesas_publicas(bloque_t);
create function public.mesas_publicas(p_bloque bloque_t)
returns table (
  numero        int,
  empresa       text,
  giro          text,
  carreras      text[],
  estado        estado_t,
  ocupado_desde timestamptz,
  separado_en   timestamptz,
  esperando     int
)
language sql stable security definer set search_path = public
as $$
  select r.mesa_numero,
         e.nombre,
         e.giro,
         coalesce(array_agg(ec.siglas order by ec.siglas)
                    filter (where ec.siglas is not null), '{}'),
         coalesce(me.estado, 'disponible'::estado_t),
         me.ocupado_desde,
         me.separado_en,
         coalesce(me.esperando, 0)
    from reclutadores r
    join empresas  e  on e.id  = r.empresa_id
    join ediciones ed on ed.id = r.edicion_id and ed.activa
    left join empresa_carreras ec on ec.empresa_id = e.id
    left join mesas_estado me
           on me.edicion_id = r.edicion_id
          and me.numero     = r.mesa_numero
          and me.bloque     = r.bloque
   where r.bloque = p_bloque
     and r.mesa_numero is not null
   group by r.mesa_numero, e.nombre, e.giro, me.estado, me.ocupado_desde, me.separado_en, me.esperando
   order by r.mesa_numero;
$$;

-- ── Permisos ────────────────────────────────────────────────────────────────
revoke all on function public.mesas_publicas(bloque_t) from public;
grant execute on function public.mesas_publicas(bloque_t) to anon, authenticated;

revoke all on function public.set_estado_mesa(int, bloque_t, estado_t) from public;
grant execute on function public.set_estado_mesa(int, bloque_t, estado_t) to anon, authenticated;

-- Separar y contar son del equipo: anon no las ve.
revoke all on function public.separar_mesa(int, bloque_t, boolean) from public, anon;
revoke all on function public.ajustar_espera(int, bloque_t, int)     from public, anon;
grant execute on function public.separar_mesa(int, bloque_t, boolean) to authenticated;
grant execute on function public.ajustar_espera(int, bloque_t, int)   to authenticated;
