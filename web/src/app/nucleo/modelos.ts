export type Rol = 'Admin' | 'Tecnico';
export type TipoEquipo = 'Portatil' | 'Escritorio' | 'Monitor' | 'Impresora' | 'Celular' | 'Tablet' | 'Otro';
export type EstadoEquipo = 'Disponible' | 'Asignado' | 'EnReparacion' | 'DeBaja';
export type TipoMantenimiento = 'Preventivo' | 'Correctivo';

export interface Usuario { id: number; nombre: string; correo: string; rol: Rol; }
export interface Sesion { token: string; expira: string; usuario: Usuario; }

export interface PersonaCorta { id: number; nombre: string; area: string; }

export interface EquipoResumen {
  id: number; codigo: string; tipo: TipoEquipo; marca: string; modelo: string; serial: string;
  fechaCompra: string | null; estado: EstadoEquipo; asignadoA: PersonaCorta | null;
}

export interface Asignacion {
  id: number; codigoEquipo: string; equipo: string; empleado: PersonaCorta;
  fechaEntrega: string; fechaDevolucion: string | null; observaciones: string | null; entregadoPor: string;
}

export interface Mantenimiento {
  id: number; codigoEquipo: string; equipo: string; tipo: TipoMantenimiento; descripcion: string;
  fechaInicio: string; fechaFin: string | null; resultado: string | null; tecnico: string;
}

export interface EquipoDetalle {
  equipo: EquipoResumen; notas: string | null; aniosDeUso: number | null;
  asignacionActual: Asignacion | null; reparacionAbierta: Mantenimiento | null;
  asignaciones: Asignacion[]; mantenimientos: Mantenimiento[];
}

export interface EquipoGuardar {
  tipo: TipoEquipo; marca: string; modelo: string; serial: string; fechaCompra: string | null; notas: string | null;
}

export interface Empleado { id: number; nombre: string; cargo: string; area: string; correo: string | null; activo: boolean; equiposActuales: number; }
export interface EmpleadoGuardar { nombre: string; cargo: string; area: string; correo: string | null; }
export interface EmpleadoDetalle { empleado: Empleado; equiposActuales: EquipoResumen[]; historial: Asignacion[]; }

export interface Conteo { clave: string; total: number; }
export interface Alerta { tipo: 'reparacion' | 'renovar' | 'preventivo'; mensaje: string; codigoEquipo: string; }
export interface Actividad { fecha: string; tipo: 'entrega' | 'devolucion' | 'mantenimiento' | 'reparacion'; texto: string; codigoEquipo: string; }
export interface Resumen {
  totalEquipos: number; porEstado: Conteo[]; porTipo: Conteo[]; empleadosActivos: number;
  reparacionesAbiertas: number; alertas: Alerta[]; actividad: Actividad[];
}

export const TIPOS: { valor: TipoEquipo; nombre: string; icono: string }[] = [
  { valor: 'Portatil', nombre: 'Portátil', icono: 'laptop-outline' },
  { valor: 'Escritorio', nombre: 'Escritorio', icono: 'desktop-outline' },
  { valor: 'Monitor', nombre: 'Monitor', icono: 'tv-outline' },
  { valor: 'Impresora', nombre: 'Impresora', icono: 'print-outline' },
  { valor: 'Celular', nombre: 'Celular', icono: 'phone-portrait-outline' },
  { valor: 'Tablet', nombre: 'Tablet', icono: 'tablet-portrait-outline' },
  { valor: 'Otro', nombre: 'Otro', icono: 'hardware-chip-outline' },
];

export const ESTADOS: { valor: EstadoEquipo; nombre: string }[] = [
  { valor: 'Disponible', nombre: 'Disponible' },
  { valor: 'Asignado', nombre: 'Entregado' },
  { valor: 'EnReparacion', nombre: 'En reparación' },
  { valor: 'DeBaja', nombre: 'De baja' },
];

export const nombreTipo = (t: TipoEquipo) => TIPOS.find((x) => x.valor === t)?.nombre ?? t;
export const iconoTipo = (t: TipoEquipo) => TIPOS.find((x) => x.valor === t)?.icono ?? 'hardware-chip-outline';
export const nombreEstado = (e: EstadoEquipo) => ESTADOS.find((x) => x.valor === e)?.nombre ?? e;
