-- Acomodar el salón mesa por mesa, desde el Mapa de /admin/mesas.
--
-- En el Mapa se arrastran mesas sueltas: soltar una sobre otra las intercambia,
-- soltar sobre una libre la mueve. El equipo hace varios movimientos y guarda todo
-- junto al final. Esta función recibe solo las filas que cambian de número y su
-- número nuevo, y lo aplica en una transacción: pasa completo o no pasa.
--
-- A diferencia de `reordenar_salon` (migración 12), aquí una empresa sí puede
-- quedar partida: es decisión del equipo, no un error. Portafolio se mueve igual
-- que cualquier mesa.
--
-- SECURITY INVOKER, como las de la 08: el RLS de la migración 06 sigue mandando.

create or replace function public.acomodar_mesas(
  p_bloque bloque_t, p_filas uuid[], p_numeros int[]
)
returns int language plpgsql security invoker set search_path = public
as $$
declare
  v_edicion uuid; v_total int; v_n int;
  v_viejos int[]; v_tocados int[]; v_ocupadas int[]; v_choque int;
  v_detalle jsonb;
begin
  perform exige_equipo();

  select id, total_mesas into v_edicion, v_total from ediciones where activa limit 1;
  if v_edicion is null then raise exception 'No hay una edición activa.'; end if;

  v_n := coalesce(cardinality(p_filas), 0);
  if v_n = 0 then return 0; end if;
  if v_n <> coalesce(cardinality(p_numeros), 0) then
    raise exception 'El acomodo llegó incompleto. Recarga la pantalla.';
  end if;
  if (select count(distinct x) from unnest(p_filas) x) <> v_n then
    raise exception 'Una mesa viene dos veces en el acomodo. Recarga la pantalla.';
  end if;
  if (select count(distinct x) from unnest(p_numeros) x) <> v_n then
    raise exception 'Dos mesas quedarían con el mismo número.';
  end if;
  if exists (select 1 from unnest(p_numeros) x where x is null or x < 1 or x > v_total) then
    raise exception 'Hay un número fuera del salón: van del 1 al %.', v_total;
  end if;

  -- Cada fila tiene que ser de esta edición y de este bloque.
  if (select count(*) from reclutadores
       where id = any(p_filas) and edicion_id = v_edicion and bloque = p_bloque) <> v_n then
    raise exception 'Alguna mesa ya no está en este bloque. Recarga la pantalla.';
  end if;

  -- Un número nuevo no puede caer en una fila que no se mueve.
  select r.mesa_numero into v_choque
    from reclutadores r
   where r.edicion_id = v_edicion and r.bloque = p_bloque
     and not (r.id = any(p_filas)) and r.mesa_numero = any(p_numeros)
   limit 1;
  if v_choque is not null then
    raise exception 'La mesa % ya está tomada por una que no se movió. Recarga la pantalla.', v_choque;
  end if;

  select array_agg(r.mesa_numero) into v_viejos
    from reclutadores r where r.id = any(p_filas);

  -- Una mesa en sesión no se mueve: el reclutador perdería su reloj a media entrevista.
  v_tocados := array(select distinct n from unnest(v_viejos || p_numeros) n where n is not null);
  select array_agg(numero order by numero) into v_ocupadas
    from mesas_estado
   where edicion_id = v_edicion and bloque = p_bloque
     and numero = any(v_tocados) and estado = 'ocupado';
  if v_ocupadas is not null then
    raise exception 'Hay mesas en sesión que cambiarían: %. Espera a que terminen.',
      array_to_string(v_ocupadas, ', ');
  end if;

  -- La bitácora lleva empresas y mesas, nunca nombres de personas.
  select jsonb_agg(jsonb_build_object('empresa', e.nombre, 'de', r.mesa_numero, 'a', x.nuevo)
                   order by x.nuevo)
    into v_detalle
    from unnest(p_filas, p_numeros) as x(id, nuevo)
    join reclutadores r on r.id = x.id
    join empresas e on e.id = r.empresa_id;

  -- Se estacionan en null y se ponen de vuelta: un intercambio en un solo update
  -- choca consigo mismo en el índice único.
  update reclutadores set mesa_numero = null where id = any(p_filas);
  update reclutadores r set mesa_numero = x.nuevo
    from unnest(p_filas, p_numeros) as x(id, nuevo)
   where r.id = x.id;

  perform limpia_estado(v_edicion, p_bloque, v_tocados);
  perform anotar_cambio(v_edicion, 'acomodar', jsonb_build_object(
    'bloque', p_bloque, 'mesas', v_detalle));
  return v_n;
end $$;

revoke all on function public.acomodar_mesas(bloque_t, uuid[], int[]) from public;
grant execute on function public.acomodar_mesas(bloque_t, uuid[], int[]) to authenticated;
