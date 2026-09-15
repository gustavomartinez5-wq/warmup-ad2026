# Migraciones

El orden importa. Se aplicaron con el MCP de Supabase sobre el proyecto `warmup-sep2026`
(`vaowqzodsivdeqbqpcrn`, región us-east-1).

| Archivo | Qué hace |
|---|---|
| `01_esquema_base.sql` | Tablas, tipos e índices |
| `02_catalogo_carreras.sql` | Las 47 carreras del Tec, de la base nacional de junio 2026 |
| `03_politicas_rls.sql` | Quién ve qué |
| `04_funciones_publicas.sql` | Lo único que puede hacer alguien sin sesión |
| `05_edicion_ad2026.sql` | La edición y las seis franjas de cupo |
| `06_lista_del_equipo.sql` | Tener sesión no basta: hay que estar en la lista |
| `07_cerrar_permisos_por_omision.sql` | Toda tabla nueva nace cerrada |

Están aquí como respaldo y como historia. Si hay que rehacer la base desde cero, se corren
en este orden.
