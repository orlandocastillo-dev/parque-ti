import { HttpErrorResponse } from '@angular/common/http';
import { mensajeDeError } from './api.service';
import { haceCuanto } from './formato';
import { nombreEstado, nombreTipo } from './modelos';

const hace = (dias: number) => new Date(Date.now() - dias * 86400000).toISOString();

describe('haceCuanto', () => {
  it('dice hoy, ayer, días, meses y años', () => {
    expect(haceCuanto(hace(0))).toBe('hoy');
    expect(haceCuanto(hace(1))).toBe('ayer');
    expect(haceCuanto(hace(12))).toBe('hace 12 días');
    expect(haceCuanto(hace(65))).toBe('hace 2 meses');
    expect(haceCuanto(hace(800))).toBe('hace 2 años');
  });
});

describe('mensajeDeError', () => {
  it('usa el título que manda la API', () => {
    const e = new HttpErrorResponse({ status: 409, error: { title: 'El equipo EQ-0003 está en reparación.' } });
    expect(mensajeDeError(e)).toBe('El equipo EQ-0003 está en reparación.');
  });

  it('muestra el primer error de validación', () => {
    const e = new HttpErrorResponse({ status: 400, error: { title: 'One or more validation errors occurred.', errors: { Serial: ['El serial es muy corto.'] } } });
    expect(mensajeDeError(e)).toBe('El serial es muy corto.');
  });

  it('avisa cuando no hay conexión', () => {
    expect(mensajeDeError(new HttpErrorResponse({ status: 0 }))).toContain('No hay conexión');
  });
});

describe('nombres', () => {
  it('traduce tipos y estados para mostrar', () => {
    expect(nombreTipo('Portatil')).toBe('Portátil');
    expect(nombreEstado('EnReparacion')).toBe('En reparación');
    expect(nombreEstado('Asignado')).toBe('Entregado');
  });
});
