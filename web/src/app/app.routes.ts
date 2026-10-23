import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { SesionService } from './nucleo/sesion.service';

const conSesion: CanActivateFn = () => inject(SesionService).usuario() ? true : inject(Router).parseUrl('/entrar');
const soloAdmin: CanActivateFn = () => inject(SesionService).esAdmin() ? true : inject(Router).parseUrl('/escanear');
// El técnico arranca en el escáner; el administrador, en el resumen
const inicio: CanActivateFn = () => {
  const s = inject(SesionService);
  return inject(Router).parseUrl(!s.usuario() ? '/entrar' : s.esAdmin() ? '/resumen' : '/escanear');
};

export const routes: Routes = [
  { path: '', pathMatch: 'full', canActivate: [inicio], children: [] },
  { path: 'entrar', loadComponent: () => import('./paginas/entrar').then((m) => m.Entrar) },
  {
    path: '',
    canActivate: [conSesion],
    children: [
      { path: 'resumen', loadComponent: () => import('./paginas/resumen').then((m) => m.ResumenPagina) },
      { path: 'escanear', loadComponent: () => import('./paginas/escanear').then((m) => m.Escanear) },
      { path: 'equipos', loadComponent: () => import('./paginas/equipos').then((m) => m.Equipos) },
      { path: 'equipos/:codigo', loadComponent: () => import('./paginas/equipo').then((m) => m.EquipoPagina) },
      { path: 'empleados', loadComponent: () => import('./paginas/empleados').then((m) => m.Empleados) },
      { path: 'empleados/:id', loadComponent: () => import('./paginas/empleado').then((m) => m.EmpleadoPagina) },
      { path: 'mantenimientos', loadComponent: () => import('./paginas/mantenimientos').then((m) => m.Mantenimientos) },
      { path: 'etiquetas', canActivate: [soloAdmin], loadComponent: () => import('./paginas/etiquetas').then((m) => m.Etiquetas) },
    ],
  },
  { path: '**', redirectTo: '' },
];
