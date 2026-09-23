-- Acomodar el salón completo de un bloque en un solo paso, desde /admin/acomodo.
--
-- Desde el 22-sep las mesas viven en la app, no en el Excel. El equipo las acomoda
-- arrastrando empresas en una cuadrícula; al soltar, todas se renumeran 1, 2, 3…
-- Con las funciones de la migración 08 eso serían decenas de llamadas sueltas, y si
-- la red se cae a la mitad el salón queda a medio acomodar. Esta hace todo en una
-- transacción: pasa completa o no pasa.
--
-- La zona de portafolio (giro 'Revisión de portafolio') no entra: se queda en sus
-- números. Las demás empresas ocupan desde la 1, en el orden que llega, cada una en
-- mesas seguidas y respetando el orden que ya traían sus filas.
--
-- SECURITY INVOKER, como las de la 08: el RLS de la migración 06 sigue mandando.

create or replace function public.reordenar_salon(p_bloque bloque_t, p_empresas uuid[])
returns int language plpgsql security invoker set search_path = public
as $$
declare
  v_edicion uuid; v_total int; v_tope int;
  v_ids uuid[]; v_nuevos int[]; v_viejos int[];
  v_tocados int[]; v_ocupadas int[];
  v_esperadas uuid[]; v_cambian int;
  v_antes jsonb; v_despues jsonb;
begin
  perform exige_equipo();

  select id, total_mesas into v_edicion, v_total from ediciones where activa limit 1;
  if v_edicion is null then raise exception 'No hay una edición activa.'; end if;

  -- Las empresas con mesa en este bloque, fuera de portafolio.
  select coalesce(array_agg(distinct r.empresa_id), '{}')
    into v_esperadas
    from reclutadores r join empresas e on e.id = r.empresa_id
   where r.edicion_id = v_edicion and r.bloque = p_bloque
     and coalesce(e.giro, '') <> 'Revisión de portafolio';

  if p_empresas is null
     or cardinality(p_empresas) <> (select count(distinct x) from unnest(p_empresas) x)
     or cardinality(p_empresas) <> cardinality(v_esperadas)
     or not (p_empresas <@ v_esperadas) then
    raise exception 'El acomodo no trae las mismas empresas que hay en el bloque. Recarga la pantalla.';
  end if;

  -- Hasta dónde se puede llenar: la mesa antes de la zona de portafolio, o el total.
  select coalesce(min(r.mesa_numero) - 1, v_total) into v_tope
    from reclutadores r join empresas e on e.id = r.empresa_id
   where r.edicion_id = v_edicion and r.bloque = p_bloque
     and e.giro = 'Revisión de portafolio';

  -- El número nuevo de cada fila: por el lugar de su empresa y, dentro de ella,
  -- por el orden que ya traía.
  with orden as (
    select x.empresa_id, x.lugar
      from unnest(p_empresas) with ordinality as x(empresa_id, lugar)
  ), filas as (
    select r.id, r.mesa_numero as viejo,
           row_number() over (order by o.lugar, r.mesa_numero nulls last, r.id)::int as nuevo
      from reclutadores r join orden o on o.empresa_id = r.empresa_id
     where r.edicion_id = v_edicion and r.bloque = p_bloque
  )
  select array_agg(id), array_agg(nuevo), array_agg(viejo)
    into v_ids, v_nuevos, v_viejos
    from filas
   where viejo is distinct from nuevo;

  if v_ids is null then return 0; end if;

  if (select max(n) from unnest(v_nuevos) n) > v_tope then
    raise exception 'No caben: el acomodo llega a la mesa % y la última libre es la %.',
      (select max(n) from unnest(v_nuevos) n), v_tope;
  end if;

  -- Una mesa en sesión no se mueve: el reclutador perdería su reloj a media entrevista.
  v_tocados := array(select distinct n from unnest(v_viejos || v_nuevos) n where n is not null);
  select array_agg(numero order by numero) into v_ocupadas
    from mesas_estado
   where edicion_id = v_edicion and bloque = p_bloque
     and numero = any(v_tocados) and estado = 'ocupado';
  if v_ocupadas is not null then
    raise exception 'Hay mesas en sesión que cambiarían de número: %. Espera a que terminen.',
      array_to_string(v_ocupadas, ', ');
  end if;

  -- La bitácora lleva empresas y mesas, nunca nombres de personas.
  select jsonb_object_agg(nombre, mesas) into v_antes from (
    select e.nombre, jsonb_agg(r.mesa_numero order by r.mesa_numero) as mesas
      from reclutadores r join empresas e on e.id = r.empresa_id
     where r.id = any(v_ids) group by e.nombre) t;

  -- Se estacionan en null y se ponen de vuelta: los números nuevos no chocan entre sí
  -- ni con las filas que no se mueven.
  update reclutadores set mesa_numero = null where id = any(v_ids);
  update reclutadores r set mesa_numero = x.nuevo
    from unnest(v_ids, v_nuevos) as x(id, nuevo)
   where r.id = x.id;

  select jsonb_object_agg(nombre, mesas), count(*) into v_despues, v_cambian from (
    select e.nombre, jsonb_agg(r.mesa_numero order by r.mesa_numero) as mesas
      from reclutadores r join empresas e on e.id = r.empresa_id
     where r.id = any(v_ids) group by e.nombre) t;

  perform limpia_estado(v_edicion, p_bloque, v_tocados);
  perform anotar_cambio(v_edicion, 'reordenar', jsonb_build_object(
    'bloque', p_bloque, 'empresas', v_cambian, 'antes', v_antes, 'despues', v_despues));
  return v_cambian;
end $$;

revoke all on function public.reordenar_salon(bloque_t, uuid[]) from public;
grant execute on function public.reordenar_salon(bloque_t, uuid[]) to authenticated;
