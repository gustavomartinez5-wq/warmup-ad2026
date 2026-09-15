-- El repo es público y la clave anónima queda a la vista. Estas políticas son lo único
-- que separa los datos de cualquiera con el link.
-- Ojo: la migración 06 endurece equipo_todo. Este archivo es el paso intermedio.

alter table ediciones        enable row level security;
alter table carreras         enable row level security;
alter table empresas         enable row level security;
alter table empresa_carreras enable row level security;
alter table reclutadores     enable row level security;
alter table mesas_estado     enable row level security;
alter table pendientes       enable row level security;
alter table cupos            enable row level security;

-- Nadie anónimo toca nada por omisión.
revoke all on ediciones, carreras, empresas, empresa_carreras,
              reclutadores, mesas_estado, pendientes, cupos
  from anon;

do $$
declare t text;
begin
  foreach t in array array['ediciones','carreras','empresas','empresa_carreras',
                           'reclutadores','mesas_estado','pendientes','cupos']
  loop
    execute format('grant select, insert, update, delete on %I to authenticated', t);
    execute format($p$create policy equipo_todo on %I
                        for all to authenticated using (true) with check (true)$p$, t);
  end loop;
end $$;

-- ── Lo que ve alguien sin sesión ────────────────────────────────────────────

-- El catálogo de carreras no es dato de nadie.
grant select on carreras to anon;
create policy carreras_publicas on carreras for select to anon using (true);

-- De la edición, solo cómo se llama y cuándo es.
grant select (id, nombre, fecha, activa) on ediciones to anon;
create policy edicion_activa_publica on ediciones for select to anon using (activa);

-- El estado de las mesas no lleva nombres: número, bloque, estado y reloj.
-- Se lee para que el reclutador vea su mesa y el cronómetro sobreviva a una recarga.
grant select on mesas_estado to anon;
create policy estado_publico on mesas_estado for select to anon using (true);

-- empresas, empresa_carreras, reclutadores, pendientes y cupos se quedan sin
-- política para anon: traen correos, celulares y nombres de personas externas al Tec.
