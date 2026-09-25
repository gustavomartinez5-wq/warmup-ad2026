-- Mapas guardados: tres espacios para guardar un acomodo del salón y cargarlo después,
-- como las partidas de un juego. Pedido por Gustavo el 24-sep.
--
-- Cada espacio guarda los dos bloques juntos. Por mesa: la fila de `reclutadores`, el
-- nombre de la empresa y su número. El nombre de la empresa sirve para reconocer a
-- quien cambió de persona después de guardar. Ningún nombre de reclutador.
--
-- Guardar aquí no mueve mesas. Cargar un mapa solo llena el borrador del editor; lo que
-- cambia el salón sigue siendo «Guardar acomodo» → `acomodar_mesas` (migración 13), con
-- sus revisiones y su bitácora.
--
--   filas = { "b1": [ { "fila": uuid, "empresa": text, "numero": int }, … ], "b2": [ … ] }

create table acomodos_guardados (
  id           uuid primary key default gen_random_uuid(),
  edicion_id   uuid not null references ediciones (id) on delete cascade,
  ranura       smallint not null check (ranura between 1 and 3),
  nombre       text not null check (char_length(btrim(nombre)) between 1 and 40),
  filas        jsonb not null,
  guardado_por uuid references auth.users (id) on delete set null default auth.uid(),
  guardado_en  timestamptz not null default now(),
  unique (edicion_id, ranura)
);

alter table acomodos_guardados enable row level security;
-- La migración 07 apagó los permisos por omisión: sin este grant, nadie entra.
-- anon no recibe nada. Tampoco entra a la publicación de tiempo real.
grant select, insert, update on acomodos_guardados to authenticated;
create policy equipo_todo on acomodos_guardados
  for all to authenticated using (es_equipo()) with check (es_equipo());
