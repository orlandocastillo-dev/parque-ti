import { Injectable, computed, signal } from '@angular/core';
import { Sesion } from './modelos';

const CLAVE = 'parque-ti:sesion';

function leer(): Sesion | null {
  try {
    const s = JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as Sesion | null;
    return s && new Date(s.expira) > new Date() ? s : null;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class SesionService {
  private readonly actual = signal<Sesion | null>(leer());

  readonly usuario = computed(() => this.actual()?.usuario ?? null);
  readonly esAdmin = computed(() => this.usuario()?.rol === 'Admin');
  readonly token = computed(() => this.actual()?.token ?? null);

  guardar(s: Sesion) {
    this.actual.set(s);
    try {
      localStorage.setItem(CLAVE, JSON.stringify(s));
    } catch {
      // modo privado: la sesión dura mientras la pestaña esté abierta
    }
  }

  salir() {
    this.actual.set(null);
    try {
      localStorage.removeItem(CLAVE);
    } catch {}
  }
}
