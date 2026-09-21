-- Dos cosas que salieron de la simulación del 21-sep.
--
-- 1. «Cedió su turno» vuelve a ser un estado aparte de «No llegó». La primera
--    decisión fue juntarlos; Cecilia marcó como grave no poder distinguir a quien
--    avisó de quien desapareció, porque le cambia la cuenta real de ausencias.
-- 2. mi_turno devuelve la hora en que se sacó el turno, para que la pantalla de
--    espera diga «Sacaste tu turno a las 10:42». Los tres estudiantes de la
--    simulación dudaron si la app seguía viva tras 25 a 45 minutos sin cambios.
--
-- Va en dos pasos porque Postgres no deja usar un valor nuevo de un enum en la
-- misma transacción en que se agrega. Correr la parte A, y después la B.

-- ── A ──────────────────────────────────────────────────────────────────────
alter type turno_t add value if not exists 'cedio';

-- ── B ──────────────────────────────────────────────────────────────────────
create or replace function public.ceder_turno(p_id uuid)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare v_filas int;
begin
  update turnos
     set estado = 'cedio'
   where id = p_id
     and estado in ('espera', 'llamado');
  get diagnostics v_filas = row_count;
  return v_filas = 1;
end $$;

-- Cambia lo que devuelve, así que se borra y se vuelve a crear.
drop function if exists public.mi_turno(uuid);

create function public.mi_turno(p_id uuid)
returns table (
  folio       int,
  servicio    servicio_t,
  estado      turno_t,
  destino     destino_t,
  mesa_numero int,
  empresa     text,
  adelante    int,
  creado_en   timestamptz
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
             and o.folio < t.folio),
         t.creado_en
    from turnos t
    left join reclutadores r
           on t.destino = 'mesa'
          and r.edicion_id  = t.edicion_id
          and r.bloque      = t.bloque
          and r.mesa_numero = t.mesa_numero
    left join empresas e on e.id = r.empresa_id
   where t.id = p_id;
$$;

revoke all on function public.mi_turno(uuid) from public;
grant execute on function public.mi_turno(uuid) to anon, authenticated;

-- Deshacerla: un valor de enum no se puede quitar sin rehacer el tipo. Para
-- volver al comportamiento anterior basta con que ceder_turno escriba 'no_llego'
-- otra vez; 'cedio' se queda en el tipo sin usarse.
