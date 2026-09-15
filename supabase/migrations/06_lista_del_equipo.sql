-- Tener sesión no alcanza. La cuenta tiene que estar en esta lista.
-- Así, si alguien se registra por su cuenta con la clave pública, no ve nada.
create table equipo (
  usuario_id uuid primary key references auth.users (id) on delete cascade,
  nota       text,
  creado_en  timestamptz not null default now()
);
alter table equipo enable row level security;
-- Sin grants: esta tabla no se toca desde la app, solo por SQL.

create or replace function public.es_equipo()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from equipo where usuario_id = auth.uid()) $$;

revoke all on function public.es_equipo() from public;
grant execute on function public.es_equipo() to authenticated;

-- Las políticas dejan de confiar en "tiene sesión" y pasan a "está en el equipo".
do $$
declare t text;
begin
  foreach t in array array['ediciones','carreras','empresas','empresa_carreras',
                           'reclutadores','mesas_estado','pendientes','cupos']
  loop
    execute format('drop policy if exists equipo_todo on %I', t);
    execute format($p$create policy equipo_todo on %I
                        for all to authenticated
                        using (es_equipo()) with check (es_equipo())$p$, t);
  end loop;
end $$;

-- Dar de alta una cuenta, después de crearla en el panel de Supabase:
--   insert into equipo (usuario_id, nota)
--   select id, 'cuenta del equipo' from auth.users where email = 'correo@dominio';
