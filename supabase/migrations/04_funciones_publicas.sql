-- Las dos únicas cosas que alguien sin sesión puede hacer.

-- Qué empresa está en cada mesa de un bloque, sin nombres de reclutador ni contactos.
-- Es SECURITY DEFINER a propósito: deja leer esta proyección sin abrir las tablas de abajo.
create or replace function public.mesas_publicas(p_bloque bloque_t)
returns table (
  numero        int,
  empresa       text,
  giro          text,
  carreras      text[],
  estado        estado_t,
  ocupado_desde timestamptz
)
language sql stable security definer set search_path = public
as $$
  select r.mesa_numero,
         e.nombre,
         e.giro,
         coalesce(array_agg(ec.siglas order by ec.siglas)
                    filter (where ec.siglas is not null), '{}'),
         coalesce(me.estado, 'disponible'::estado_t),
         me.ocupado_desde
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
   group by r.mesa_numero, e.nombre, e.giro, me.estado, me.ocupado_desde
   order by r.mesa_numero;
$$;

-- El único camino de escritura sin sesión. Toca estado y reloj, nada más.
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
         actualizado_en = now()
  returning * into v_fila;

  return v_fila;
end $$;

revoke all on function public.mesas_publicas(bloque_t)                 from public;
revoke all on function public.set_estado_mesa(int, bloque_t, estado_t) from public;
grant execute on function public.mesas_publicas(bloque_t)                 to anon, authenticated;
grant execute on function public.set_estado_mesa(int, bloque_t, estado_t) to anon, authenticated;

-- El host y el reclutador ven los cambios sin recargar.
alter publication supabase_realtime add table mesas_estado;
