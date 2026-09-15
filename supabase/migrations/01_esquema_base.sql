-- Warm Up AD2026 — esquema base.
-- Copia la forma del Excel de control: la unidad es una persona en un bloque, con su mesa.

create type bloque_t    as enum ('b1', 'b2');
create type estatus_t   as enum ('confirmado', 'por_confirmar');
create type estado_t    as enum ('disponible', 'ocupado', 'break', 'no_llego');

-- Una edición del evento. total_mesas sube cuando se consigue una mesa excedente.
create table ediciones (
  id                  uuid primary key default gen_random_uuid(),
  nombre              text        not null,
  fecha               date        not null,
  activa              boolean     not null default false,
  total_mesas         int         not null default 74,
  atenciones_por_hora int         not null default 2,
  prop_cv             numeric     not null default 0.6,
  prop_entrevista     numeric     not null default 0.4,
  creado_en           timestamptz not null default now()
);
create unique index ediciones_una_activa on ediciones (activa) where activa;

-- Catálogo nacional de programas académicos. Global, no por edición.
create table carreras (
  siglas  text primary key,
  nombre  text not null,
  escuela text not null
);

create table empresas (
  id             uuid primary key default gen_random_uuid(),
  edicion_id     uuid not null references ediciones (id) on delete cascade,
  nombre         text not null,
  giro           text,
  representante  text,
  correo         text,
  celular        text,
  areas_texto    text,
  perfiles_texto text,
  notas          text,
  creado_en      timestamptz not null default now(),
  unique (edicion_id, nombre)
);

create table empresa_carreras (
  empresa_id uuid not null references empresas (id) on delete cascade,
  siglas     text not null references carreras (siglas) on delete cascade,
  primary key (empresa_id, siglas)
);

-- Una fila por persona por bloque, igual que la hoja Reclutadores del Excel.
create table reclutadores (
  id          uuid primary key default gen_random_uuid(),
  edicion_id  uuid not null references ediciones (id) on delete cascade,
  empresa_id  uuid not null references empresas  (id) on delete cascade,
  nombre      text not null,
  bloque      bloque_t  not null,
  estatus     estatus_t not null default 'por_confirmar',
  mesa_numero int,
  notas       text,
  creado_en   timestamptz not null default now(),
  constraint mesa_positiva check (mesa_numero is null or mesa_numero > 0)
);
create unique index reclutadores_mesa_unica
  on reclutadores (edicion_id, bloque, mesa_numero)
  where mesa_numero is not null;
create index reclutadores_empresa on reclutadores (empresa_id);

-- El estado en vivo. El mapa de asignación se deriva de reclutadores.
create table mesas_estado (
  edicion_id     uuid not null references ediciones (id) on delete cascade,
  numero         int  not null,
  bloque         bloque_t not null,
  estado         estado_t not null default 'disponible',
  ocupado_desde  timestamptz,
  actualizado_en timestamptz not null default now(),
  primary key (edicion_id, numero, bloque)
);

create table pendientes (
  id         uuid primary key default gen_random_uuid(),
  edicion_id uuid not null references ediciones (id) on delete cascade,
  empresa_id uuid references empresas (id) on delete set null,
  texto      text not null,
  resuelto   boolean not null default false,
  creado_en  timestamptz not null default now()
);

-- El registro de estudiantes vive fuera de la app: aquí solo se teclea el número.
create table cupos (
  edicion_id          uuid not null references ediciones (id) on delete cascade,
  bloque              bloque_t not null,
  franja              text not null,
  orden               int  not null,
  registro_cv         int  not null default 0,
  registro_entrevista int  not null default 0,
  primary key (edicion_id, bloque, franja)
);
