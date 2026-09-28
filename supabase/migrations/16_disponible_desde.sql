-- Desde cuándo está disponible una mesa. 28-sep-2026, a media mañana del evento.
--
-- Los hosts quieren ver cuánto lleva una mesa libre para mandar primero a la que
-- más ha esperado. Solo lo pinta `/host` con sesión; scouts, reclutadores y lista
-- de espera no cambian.
--
-- Va por trigger y no por `set_estado_mesa` a propósito: el día del evento no se
-- reescribe ninguna función que usen el reclutador o el scout, ni `mesas_publicas`
-- (cambiar lo que regresa obliga a borrarla y crearla, y en ese hueco `/mesa` truena).
-- `/host` lee la columna aparte, directo de `mesas_estado`, que el equipo ya lee.

alter table mesas_estado add column disponible_desde timestamptz;

create or replace function public.marcar_disponible_desde()
returns trigger language plpgsql set search_path = public
as $$
begin
  if new.estado = 'disponible' then
    -- Solo al pasar a Disponible. Separar o sumar espera no reinicia el reloj.
    if tg_op = 'INSERT' or old.estado is distinct from 'disponible' then
      new.disponible_desde := now();
    end if;
  else
    new.disponible_desde := null;
  end if;
  return new;
end $$;

create trigger mesas_estado_disponible_desde
  before insert or update of estado on mesas_estado
  for each row execute function public.marcar_disponible_desde();

-- Las que ya estaban disponibles al aplicar esto: su último movimiento. Es
-- aproximado, porque separar y sumar espera también mueven `actualizado_en`.
update mesas_estado set disponible_desde = actualizado_en where estado = 'disponible';
