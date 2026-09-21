-- Ceder el turno desde el celular.
--
-- La persona que tiene que irse avisa, en vez de desaparecer. Queda como
-- «No llegó», igual que quien no se presentó cuando lo llamaron: se decidió así
-- el 21-sep para no agregar un estado. El teléfono sí distingue los dos casos,
-- porque sabe que fue él quien cedió.
--
-- Como sacar_turno y mi_turno, es la única puerta: anon no puede tocar la tabla.
-- Pide el uuid completo, así que un teléfono solo puede ceder el suyo.

create or replace function public.ceder_turno(p_id uuid)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare v_filas int;
begin
  -- Solo un turno que sigue vivo. Uno atendido o ya cerrado no se toca.
  update turnos
     set estado = 'no_llego'
   where id = p_id
     and estado in ('espera', 'llamado');
  get diagnostics v_filas = row_count;
  return v_filas = 1;
end $$;

revoke all on function public.ceder_turno(uuid) from public;
grant execute on function public.ceder_turno(uuid) to anon, authenticated;

-- Deshacerla:
--   drop function if exists ceder_turno(uuid);
