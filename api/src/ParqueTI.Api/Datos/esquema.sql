-- Tablas de Parque TI. La API corre este archivo al arrancar; todo es "if not exists",
-- así que se puede correr las veces que sea sin perder datos. El esquema "parque" lo crea Esquema.cs si no existe.

create table if not exists parque.usuarios (
    id          serial primary key,
    nombre      text not null,
    correo      text not null unique,
    clave_hash  text not null,
    rol         text not null check (rol in ('Admin', 'Tecnico')),
    creado      timestamptz not null default now()
);

create table if not exists parque.empleados (
    id      serial primary key,
    nombre  text not null,
    cargo   text not null,
    area    text not null,
    correo  text,
    activo  boolean not null default true,
    creado  timestamptz not null default now()
);

create sequence if not exists parque.equipos_codigo_seq;

create table if not exists parque.equipos (
    id            serial primary key,
    codigo        text not null unique default ('EQ-' || lpad(nextval('parque.equipos_codigo_seq')::text, 4, '0')),
    tipo          text not null check (tipo in ('Portatil', 'Escritorio', 'Monitor', 'Impresora', 'Celular', 'Tablet', 'Otro')),
    marca         text not null,
    modelo        text not null,
    serial        text not null unique,
    fecha_compra  date,
    estado        text not null default 'Disponible' check (estado in ('Disponible', 'Asignado', 'EnReparacion', 'DeBaja')),
    notas         text,
    creado        timestamptz not null default now()
);

create table if not exists parque.asignaciones (
    id                serial primary key,
    equipo_id         int not null references parque.equipos (id),
    empleado_id       int not null references parque.empleados (id),
    fecha_entrega     timestamptz not null default now(),
    fecha_devolucion  timestamptz,
    observaciones     text,
    entregado_por_id  int not null references parque.usuarios (id)
);

-- Un equipo solo puede estar entregado a una persona a la vez, aunque dos pantallas lo intenten al mismo tiempo
create unique index if not exists asignaciones_una_activa on parque.asignaciones (equipo_id) where fecha_devolucion is null;
create index if not exists asignaciones_empleado on parque.asignaciones (empleado_id);

create table if not exists parque.mantenimientos (
    id            serial primary key,
    equipo_id     int not null references parque.equipos (id),
    tipo          text not null check (tipo in ('Preventivo', 'Correctivo')),
    descripcion   text not null,
    fecha_inicio  timestamptz not null default now(),
    fecha_fin     timestamptz,
    resultado     text,
    tecnico_id    int not null references parque.usuarios (id)
);

-- Y solo una reparación abierta por equipo
create unique index if not exists mantenimientos_uno_abierto on parque.mantenimientos (equipo_id) where fecha_fin is null;
create index if not exists mantenimientos_equipo on parque.mantenimientos (equipo_id);
