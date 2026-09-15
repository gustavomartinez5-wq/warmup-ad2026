-- Supabase concede permisos a anon y authenticated en toda tabla nueva del esquema public.
-- Una tabla que se cree después y se olvide de revocar queda abierta. Se apaga aquí.
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;

-- La lista del equipo no se toca desde la app, ni para leerla.
revoke all on equipo from anon, authenticated;
