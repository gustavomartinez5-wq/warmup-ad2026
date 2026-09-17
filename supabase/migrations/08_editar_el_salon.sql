-- Reacomodar el salón el día del evento, desde /host o desde /admin.
--
-- Por qué los movimientos viven aquí y no en el navegador: `reclutadores_mesa_unica`
-- es un índice único parcial (01_esquema_base.sql) y un índice parcial no se puede
-- diferir. Un intercambio hecho con dos `update` desde el navegador truena en el
-- primero, y si se cae la red entre uno y otro deja el salón a medio arreglar —dos
-- mesas con el mismo número, o una empresa sin mesa— justo el día del evento.
-- Cada función de abajo es una transacción: pasa completa o no pasa.
--
-- Las funciones son SECURITY INVOKER a propósito: corren como quien las llama, así
-- que el RLS de la migración 06 sigue mandando. El `es_equipo()` explícito está
-- para dar un error que se entienda en vez de «0 filas».

-- ── Lo que quedó pendiente de commitear ─────────────────────────────────────
-- El editor, el importador y las cifras usan 'cancelado' desde el 15-sep, pero
-- el valor se agregó a mano a la base viva y nunca entró a una migración. Una
-- base nueva levantada desde esta carpeta lo rechazaba.
alter type estatus_t add value if not exists 'cancelado';

-- ── La bitácora ─────────────────────────────────────────────────────────────
-- El 28 manda la app, pero una reimportación del Excel borra y reinserta
-- `reclutadores`. Sin esto, lo que el equipo arregló en el salón se pierde al día
-- siguiente sin que nadie se dé cuenta.
create table cambios_salon (
  id         uuid primary key default gen_random_uuid(),
  edicion_id uuid not null references ediciones (id) on delete cascade,
  usuario_id uuid references auth.users (id) on delete set null,
  accion     text  not null,
  detalle    jsonb not null default '{}',
  creado_en  timestamptz not null default now()
);
create index cambios_salon_recientes on cambios_salon (edicion_id, creado_en desc);

alter table cambios_salon enable row level security;
-- La migración 07 apagó los permisos por omisión: sin este grant, nadie entra.
grant select, insert on cambios_salon to authenticated;
create policy equipo_todo on cambios_salon
  for all to authenticated using (es_equipo()) with check (es_equipo());

create or replace function public.anotar_cambio(
  p_edicion uuid, p_accion text, p_detalle jsonb
)
returns void language sql security invoker set search_path = public
as $$
  insert into cambios_salon (edicion_id, usuario_id, accion, detalle)
  values (p_edicion, auth.uid(), p_accion, p_detalle);
$$;

-- ── Auxiliares ──────────────────────────────────────────────────────────────

create or replace function public.exige_equipo()
returns void language plpgsql security invoker set search_path = public
as $$
begin
  if not es_equipo() then
    raise exception 'Esta cuenta no está en el equipo.';
  end if;
end $$;

/**
 * El estado en vivo es del número de mesa, no de la empresa. Cuando una mesa se
 * mueve, se libera o se intercambia, el estado viejo se borra: si no, la mesa
 * nueva hereda un «Ocupado» de alguien que ya no está ahí y arranca un reloj
 * falso. Al no haber fila, `mesas_publicas` la devuelve como disponible.
 */
create or replace function public.limpia_estado(
  p_edicion uuid, p_bloque bloque_t, p_numeros int[]
)
returns void language sql security invoker set search_path = public
as $$
  delete from mesas_estado
   where edicion_id = p_edicion and bloque = p_bloque and numero = any(p_numeros);
$$;

-- ── Cambiar quién se sienta en una mesa ─────────────────────────────────────
/**
 * El nombre pasa a «Por definir» cuando cambia la empresa: la fila traía el
 * nombre de la persona de la empresa anterior, y dejarlo puesto sería decir que
 * ahora trabaja en la nueva.
 */
create or replace function public.cambiar_empresa_de_mesa(
  p_fila uuid, p_empresa uuid
)
returns void language plpgsql security invoker set search_path = public
as $$
declare v reclutadores; v_antes text; v_ahora text;
begin
  perform exige_equipo();

  select * into v from reclutadores where id = p_fila for update;
  if v.id is null then raise exception 'Esa mesa ya no existe. Recarga la pantalla.'; end if;

  select nombre into v_antes from empresas where id = v.empresa_id;
  select nombre into v_ahora from empresas where id = p_empresa;
  if v_ahora is null then raise exception 'Esa empresa no existe.'; end if;

  update reclutadores
     set empresa_id = p_empresa,
         nombre     = case when p_empresa <> v.empresa_id then 'Por definir' else nombre end
   where id = p_fila;

  perform limpia_estado(v.edicion_id, v.bloque, array[v.mesa_numero]);
  perform anotar_cambio(v.edicion_id, 'empresa', jsonb_build_object(
    'bloque', v.bloque, 'mesa', v.mesa_numero, 'antes', v_antes, 'ahora', v_ahora));
end $$;

-- ── Mover una mesa a otro número o a otro bloque ────────────────────────────
create or replace function public.mover_mesa(
  p_fila uuid, p_bloque bloque_t, p_numero int
)
returns void language plpgsql security invoker set search_path = public
as $$
declare v reclutadores; v_empresa text;
begin
  perform exige_equipo();
  if p_numero is null or p_numero < 1 then raise exception 'El número de mesa no es válido.'; end if;

  select * into v from reclutadores where id = p_fila for update;
  if v.id is null then raise exception 'Esa mesa ya no existe. Recarga la pantalla.'; end if;
  if v.bloque = p_bloque and v.mesa_numero = p_numero then return; end if;

  if exists (
    select 1 from reclutadores
     where edicion_id = v.edicion_id and bloque = p_bloque
       and mesa_numero = p_numero and id <> p_fila
  ) then
    raise exception 'La mesa % ya está tomada en ese bloque. Intercámbialas o recorre el tramo.',
      p_numero;
  end if;

  update reclutadores set bloque = p_bloque, mesa_numero = p_numero where id = p_fila;

  select nombre into v_empresa from empresas where id = v.empresa_id;
  perform limpia_estado(v.edicion_id, v.bloque,  array[v.mesa_numero]);
  perform limpia_estado(v.edicion_id, p_bloque,  array[p_numero]);
  perform anotar_cambio(v.edicion_id, 'mover', jsonb_build_object(
    'empresa', v_empresa,
    'de',   jsonb_build_object('bloque', v.bloque, 'mesa', v.mesa_numero),
    'a',    jsonb_build_object('bloque', p_bloque, 'mesa', p_numero)));
end $$;

-- ── Intercambiar dos mesas ──────────────────────────────────────────────────
/**
 * Se estaciona una en `null` antes de cruzarlas. Con el índice único puesto, un
 * intercambio directo choca consigo mismo a media operación.
 */
create or replace function public.intercambiar_mesas(p_fila_a uuid, p_fila_b uuid)
returns void language plpgsql security invoker set search_path = public
as $$
declare a reclutadores; b reclutadores; v_a text; v_b text;
begin
  perform exige_equipo();
  if p_fila_a = p_fila_b then raise exception 'Son la misma mesa.'; end if;

  -- Siempre en el mismo orden de id: dos hosts intercambiando el mismo par al
  -- mismo tiempo se bloquearían en cruz.
  select * into a from reclutadores where id = least(p_fila_a, p_fila_b)    for update;
  select * into b from reclutadores where id = greatest(p_fila_a, p_fila_b) for update;
  if a.id is null or b.id is null then
    raise exception 'Una de las dos mesas ya no existe. Recarga la pantalla.';
  end if;
  if a.edicion_id <> b.edicion_id then raise exception 'Son de ediciones distintas.'; end if;

  update reclutadores set mesa_numero = null where id = a.id;
  update reclutadores set bloque = a.bloque, mesa_numero = a.mesa_numero where id = b.id;
  update reclutadores set bloque = b.bloque, mesa_numero = b.mesa_numero where id = a.id;

  select nombre into v_a from empresas where id = a.empresa_id;
  select nombre into v_b from empresas where id = b.empresa_id;
  perform limpia_estado(a.edicion_id, a.bloque, array[a.mesa_numero]);
  perform limpia_estado(b.edicion_id, b.bloque, array[b.mesa_numero]);
  perform anotar_cambio(a.edicion_id, 'intercambiar', jsonb_build_object(
    'a', jsonb_build_object('empresa', v_a, 'bloque', a.bloque, 'mesa', a.mesa_numero),
    'b', jsonb_build_object('empresa', v_b, 'bloque', b.bloque, 'mesa', b.mesa_numero)));
end $$;

-- ── Recorrer un tramo para meter una mesa en medio ──────────────────────────
/**
 * Sube en uno cada mesa desde `p_desde` hasta el primer hueco, y devuelve
 * cuántas movió. El hueco se busca hasta el total del salón: recorrer más allá
 * mandaría gente a una mesa que no existe.
 *
 * Las filas se estacionan en `null` y se vuelven a poner, por lo mismo que el
 * intercambio: un `+1` en un solo update choca consigo mismo.
 */
create or replace function public.recorrer_mesas(p_bloque bloque_t, p_desde int)
returns int language plpgsql security invoker set search_path = public
as $$
declare
  v_edicion uuid; v_total int; v_hueco int; v_n int;
  v_ids uuid[]; v_nums int[]; i int;
begin
  perform exige_equipo();

  select id, total_mesas into v_edicion, v_total from ediciones where activa limit 1;
  if v_edicion is null then raise exception 'No hay una edición activa.'; end if;
  if p_desde is null or p_desde < 1 then raise exception 'El número de mesa no es válido.'; end if;

  select min(n) into v_hueco
    from generate_series(p_desde, v_total) as n
   where not exists (
     select 1 from reclutadores
      where edicion_id = v_edicion and bloque = p_bloque and mesa_numero = n
   );
  if v_hueco is null then
    raise exception 'De la mesa % a la % no hay ninguna libre. Hay que conseguir otra mesa antes de recorrer.',
      p_desde, v_total;
  end if;

  select array_agg(id order by mesa_numero desc), array_agg(mesa_numero order by mesa_numero desc)
    into v_ids, v_nums
    from reclutadores
   where edicion_id = v_edicion and bloque = p_bloque
     and mesa_numero between p_desde and v_hueco - 1;

  v_n := coalesce(array_length(v_ids, 1), 0);
  if v_n = 0 then return 0; end if;

  update reclutadores set mesa_numero = null where id = any(v_ids);
  for i in 1 .. v_n loop
    update reclutadores set mesa_numero = v_nums[i] + 1 where id = v_ids[i];
  end loop;

  perform limpia_estado(v_edicion, p_bloque,
                        (select array_agg(n) from generate_series(p_desde, v_hueco) as n));
  perform anotar_cambio(v_edicion, 'recorrer', jsonb_build_object(
    'bloque', p_bloque, 'desde', p_desde, 'hasta', v_hueco, 'mesas', v_n));
  return v_n;
end $$;

-- ── Agregar una mesa que nadie había apartado ───────────────────────────────
create or replace function public.agregar_mesa(
  p_bloque bloque_t, p_numero int, p_empresa uuid
)
returns uuid language plpgsql security invoker set search_path = public
as $$
declare v_edicion uuid; v_fila uuid; v_empresa text;
begin
  perform exige_equipo();
  if p_numero is null or p_numero < 1 then raise exception 'El número de mesa no es válido.'; end if;

  select id into v_edicion from ediciones where activa limit 1;
  if v_edicion is null then raise exception 'No hay una edición activa.'; end if;

  select nombre into v_empresa from empresas where id = p_empresa and edicion_id = v_edicion;
  if v_empresa is null then raise exception 'Esa empresa no existe en esta edición.'; end if;

  if exists (
    select 1 from reclutadores
     where edicion_id = v_edicion and bloque = p_bloque and mesa_numero = p_numero
  ) then
    raise exception 'La mesa % ya está tomada en ese bloque.', p_numero;
  end if;

  -- 'confirmado' porque están parados ahí: no hay nada que confirmar.
  insert into reclutadores (edicion_id, empresa_id, nombre, bloque, estatus, mesa_numero)
  values (v_edicion, p_empresa, 'Por definir', p_bloque, 'confirmado', p_numero)
  returning id into v_fila;

  perform limpia_estado(v_edicion, p_bloque, array[p_numero]);
  perform anotar_cambio(v_edicion, 'agregar', jsonb_build_object(
    'empresa', v_empresa, 'bloque', p_bloque, 'mesa', p_numero));
  return v_fila;
end $$;

-- ── Liberar una mesa ────────────────────────────────────────────────────────
create or replace function public.liberar_mesa(p_fila uuid)
returns void language plpgsql security invoker set search_path = public
as $$
declare v reclutadores; v_empresa text;
begin
  perform exige_equipo();

  select * into v from reclutadores where id = p_fila for update;
  if v.id is null then raise exception 'Esa mesa ya no existe. Recarga la pantalla.'; end if;

  select nombre into v_empresa from empresas where id = v.empresa_id;
  delete from reclutadores where id = p_fila;

  perform limpia_estado(v.edicion_id, v.bloque, array[v.mesa_numero]);
  perform anotar_cambio(v.edicion_id, 'liberar', jsonb_build_object(
    'empresa', v_empresa, 'bloque', v.bloque, 'mesa', v.mesa_numero));
end $$;

-- ── Permisos ────────────────────────────────────────────────────────────────
-- Nada de esto lo toca `anon`: el reclutador solo cambia estados.
do $$
declare f text;
begin
  foreach f in array array[
    'anotar_cambio(uuid, text, jsonb)',
    'exige_equipo()',
    'limpia_estado(uuid, bloque_t, int[])',
    'cambiar_empresa_de_mesa(uuid, uuid)',
    'mover_mesa(uuid, bloque_t, int)',
    'intercambiar_mesas(uuid, uuid)',
    'recorrer_mesas(bloque_t, int)',
    'agregar_mesa(bloque_t, int, uuid)',
    'liberar_mesa(uuid)'
  ]
  loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
