import { HttpClient, HttpErrorResponse, HttpInterceptorFn, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { API } from './config';
import {
  Asignacion, Empleado, EmpleadoDetalle, EmpleadoGuardar, EquipoDetalle, EquipoGuardar, EquipoResumen,
  EstadoEquipo, Mantenimiento, Resumen, Rol, Sesion, TipoEquipo, TipoMantenimiento,
} from './modelos';
import { SesionService } from './sesion.service';

// Pone el token en cada petición a la API y, si vence, manda a iniciar sesión otra vez
export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const sesion = inject(SesionService);
  const router = inject(Router);
  const token = sesion.token();
  const conToken = token && req.url.startsWith(API) ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(conToken).pipe(
    catchError((e: HttpErrorResponse) => {
      if (e.status === 401 && token) {
        sesion.salir();
        router.navigateByUrl('/entrar');
      }
      return throwError(() => e);
    }),
  );
};

// El mensaje que se le muestra a la persona cuando algo falla
export function mensajeDeError(e: unknown): string {
  if (e instanceof HttpErrorResponse) {
    if (e.status === 0) return 'No hay conexión con el servidor. Revisa el internet e intenta de nuevo.';
    if (e.status === 429) return 'Demasiados intentos seguidos. Espera un minuto.';
    const p = e.error as { title?: string; errors?: Record<string, string[]> } | null;
    if (p?.errors) return Object.values(p.errors).flat()[0] ?? 'Revisa los datos.';
    if (p?.title) return p.title;
  }
  return 'Algo salió mal. Intenta de nuevo.';
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  private get<T>(ruta: string, params?: Record<string, string | number | boolean | null | undefined>) {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(params ?? {})) if (v !== null && v !== undefined && v !== '') p = p.set(k, String(v));
    return firstValueFrom(this.http.get<T>(API + ruta, { params: p }));
  }
  private post<T>(ruta: string, cuerpo: unknown = {}) {
    return firstValueFrom(this.http.post<T>(API + ruta, cuerpo));
  }
  private put<T>(ruta: string, cuerpo: unknown) {
    return firstValueFrom(this.http.put<T>(API + ruta, cuerpo));
  }

  despertar() { return firstValueFrom(this.http.get<{ estado: string }>(API + '/salud')); }
  entrar(correo: string, clave: string) { return this.post<Sesion>('/api/auth/entrar', { correo, clave }); }
  demo(rol: Rol) { return this.post<Sesion>('/api/auth/demo', { rol }); }

  resumen() { return this.get<Resumen>('/api/resumen'); }

  equipos(f: { buscar?: string; estado?: EstadoEquipo | null; tipo?: TipoEquipo | null } = {}) { return this.get<EquipoResumen[]>('/api/equipos', f); }
  equipo(codigo: string) { return this.get<EquipoDetalle>(`/api/equipos/${encodeURIComponent(codigo)}`); }
  crearEquipo(e: EquipoGuardar) { return this.post<EquipoDetalle>('/api/equipos', e); }
  editarEquipo(id: number, e: EquipoGuardar) { return this.put<EquipoDetalle>(`/api/equipos/${id}`, e); }
  darDeBaja(id: number, motivo: string) { return this.post<EquipoDetalle>(`/api/equipos/${id}/baja`, { motivo }); }

  empleados(buscar?: string, inactivos = false) { return this.get<Empleado[]>('/api/empleados', { buscar, inactivos }); }
  empleado(id: number) { return this.get<EmpleadoDetalle>(`/api/empleados/${id}`); }
  crearEmpleado(e: EmpleadoGuardar) { return this.post<Empleado>('/api/empleados', e); }
  editarEmpleado(id: number, e: EmpleadoGuardar) { return this.put<Empleado>(`/api/empleados/${id}`, e); }
  cambiarActivo(id: number, activo: boolean) { return this.post<Empleado>(`/api/empleados/${id}/${activo ? 'activar' : 'desactivar'}`); }

  asignar(equipoId: number, empleadoId: number, observaciones: string | null) { return this.post<Asignacion>('/api/asignaciones', { equipoId, empleadoId, observaciones }); }
  devolver(id: number, observaciones: string | null) { return this.post<Asignacion>(`/api/asignaciones/${id}/devolver`, { observaciones }); }

  mantenimientos(abiertos = false, limite = 50) { return this.get<Mantenimiento[]>('/api/mantenimientos', { abiertos, limite }); }
  registrarMantenimiento(equipoId: number, tipo: TipoMantenimiento, descripcion: string, resultado: string | null) {
    return this.post<Mantenimiento>('/api/mantenimientos', { equipoId, tipo, descripcion, resultado });
  }
  cerrarMantenimiento(id: number, resultado: string) { return this.post<Mantenimiento>(`/api/mantenimientos/${id}/cerrar`, { resultado }); }
}
