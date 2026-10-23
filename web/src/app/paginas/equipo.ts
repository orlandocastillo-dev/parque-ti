import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonLabel, IonSegment, IonSegmentButton, IonSpinner, IonTitle, IonToolbar,
  ModalController, ViewWillEnter,
} from '@ionic/angular';
import QRCode from 'qrcode';
import { Asignar } from '../componentes/asignar';
import { Avisos } from '../componentes/avisos';
import { EquipoForm } from '../componentes/equipo-form';
import { Estado } from '../componentes/estado';
import { MantenimientoForm } from '../componentes/mantenimiento-form';
import { Placa } from '../componentes/placa';
import { ApiService } from '../nucleo/api.service';
import { fecha, fechaHora, haceCuanto } from '../nucleo/formato';
import { Asignacion, EquipoDetalle, iconoTipo, nombreTipo } from '../nucleo/modelos';
import { SesionService } from '../nucleo/sesion.service';

@Component({
  selector: 'app-equipo',
  imports: [RouterLink, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonButton, IonIcon, IonSpinner, IonSegment, IonSegmentButton, IonLabel, Placa, Estado],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/equipos" text="" /></ion-buttons>
        <ion-title class="mono">{{ codigo() }}</ion-title>
        @if (sesion.esAdmin() && d() && d()!.equipo.estado !== 'DeBaja') {
          <ion-buttons slot="end">
            <ion-button (click)="editar()" aria-label="Editar"><ion-icon slot="icon-only" name="create-outline" /></ion-button>
          </ion-buttons>
        }
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="pagina">
        @if (noExiste()) {
          <div class="vacio vacio--grande">
            <h2>No encontramos el equipo {{ codigo() }}</h2>
            <p>Revisa el código de la etiqueta.</p>
            <ion-button routerLink="/escanear" fill="outline">Escanear otro</ion-button>
          </div>
        } @else if (d(); as d) {
          <section class="ficha" [attr.data-estado]="d.equipo.estado">
            <div class="ficha__datos">
              <app-placa [codigo]="d.equipo.codigo" [grande]="true" />
              <h1><ion-icon [name]="icono(d.equipo.tipo)" /> {{ d.equipo.marca }} {{ d.equipo.modelo }}</h1>
              <dl>
                <div><dt>Tipo</dt><dd>{{ tipo(d.equipo.tipo) }}</dd></div>
                <div><dt>Serial</dt><dd class="mono">{{ d.equipo.serial }}</dd></div>
                <div><dt>Compra</dt><dd>{{ fecha(d.equipo.fechaCompra) }}@if (d.aniosDeUso !== null) { <small> · {{ d.aniosDeUso === 0 ? 'menos de 1 año' : d.aniosDeUso === 1 ? '1 año' : d.aniosDeUso + ' años' }}</small> }</dd></div>
                <div><dt>Estado</dt><dd><app-estado [estado]="d.equipo.estado" /></dd></div>
              </dl>
              @if (d.notas) { <p class="ficha__notas">{{ d.notas }}</p> }
            </div>
            @if (qr()) {
              <figure class="ficha__qr">
                <img [src]="qr()" [alt]="'Código QR de ' + d.equipo.codigo" width="132" height="132" />
                <figcaption>Escanéalo para abrir esta ficha</figcaption>
              </figure>
            }
          </section>

          <div class="columnas">
            <section class="bloque">
              <h2>¿Quién lo tiene?</h2>
              @if (d.asignacionActual; as a) {
                <a class="persona" [routerLink]="['/empleados', a.empleado.id]">
                  <span class="persona__inicial">{{ a.empleado.nombre[0] }}</span>
                  <span><strong>{{ a.empleado.nombre }}</strong><small>{{ a.empleado.area }} · desde {{ fecha(a.fechaEntrega) }}</small></span>
                </a>
                @if (a.observaciones) { <p class="nota">{{ a.observaciones }}</p> }
                <div class="acciones">
                  <ion-button fill="outline" (click)="acta(a)"><ion-icon slot="start" name="document-text-outline" />Acta de entrega</ion-button>
                  @if (sesion.esAdmin()) {
                    <ion-button fill="outline" color="dark" (click)="recibir(a)"><ion-icon slot="start" name="swap-horizontal" />Recibir equipo</ion-button>
                  }
                </div>
              } @else {
                <p class="vacio">{{ d.equipo.estado === 'DeBaja' ? 'Está dado de baja.' : 'Nadie. Está en la bodega de tecnología.' }}</p>
                @if (sesion.esAdmin() && d.equipo.estado === 'Disponible') {
                  <div class="acciones">
                    <ion-button (click)="entregar()"><ion-icon slot="start" name="person-outline" />Entregar a alguien</ion-button>
                  </div>
                }
              }
            </section>

            <section class="bloque">
              <h2>Mantenimiento</h2>
              @if (d.reparacionAbierta; as r) {
                <div class="reparacion">
                  <strong>En reparación {{ hace(r.fechaInicio) }}</strong>
                  <p>{{ r.descripcion }}</p>
                  <small>Abierta por {{ r.tecnico }}</small>
                </div>
                <div class="acciones">
                  <ion-button (click)="cerrarReparacion(r.id)"><ion-icon slot="start" name="checkmark-circle-outline" />Cerrar reparación</ion-button>
                </div>
              } @else {
                @if (ultimoPreventivo(); as u) {
                  <p>Último preventivo {{ hace(u) }}.</p>
                } @else {
                  <p class="vacio">Nunca ha tenido mantenimiento preventivo.</p>
                }
                @if (d.equipo.estado !== 'DeBaja') {
                  <div class="acciones">
                    <ion-button (click)="mantenimiento()"><ion-icon slot="start" name="construct-outline" />Registrar mantenimiento</ion-button>
                  </div>
                }
              }
            </section>
          </div>

          <section class="bloque">
            <ion-segment [value]="pestana()" (ionChange)="pestana.set($any($event.detail.value))">
              <ion-segment-button value="entregas"><ion-label>Entregas ({{ d.asignaciones.length }})</ion-label></ion-segment-button>
              <ion-segment-button value="mantenimientos"><ion-label>Mantenimientos ({{ d.mantenimientos.length }})</ion-label></ion-segment-button>
            </ion-segment>
            <ol class="historial">
              @if (pestana() === 'entregas') {
                @for (a of d.asignaciones; track a.id) {
                  <li [class.historial__activa]="!a.fechaDevolucion">
                    <div>
                      <strong><a [routerLink]="['/empleados', a.empleado.id]">{{ a.empleado.nombre }}</a></strong>
                      <small>{{ fecha(a.fechaEntrega) }} → {{ a.fechaDevolucion ? fecha(a.fechaDevolucion) : 'hoy' }} · entregó {{ a.entregadoPor }}</small>
                      @if (a.observaciones) { <p>{{ a.observaciones }}</p> }
                    </div>
                    <button type="button" class="enlace" (click)="acta(a)">Acta</button>
                  </li>
                } @empty { <li class="vacio">Nunca se ha entregado.</li> }
              } @else {
                @for (m of d.mantenimientos; track m.id) {
                  <li [class.historial__activa]="!m.fechaFin">
                    <div>
                      <strong>{{ m.tipo === 'Correctivo' ? 'Reparación' : 'Preventivo' }}: {{ m.descripcion }}</strong>
                      <small>{{ fechaHora(m.fechaInicio) }} · {{ m.tecnico }}{{ m.fechaFin ? '' : ' · abierta' }}</small>
                      @if (m.resultado) { <p>{{ m.resultado }}</p> }
                    </div>
                  </li>
                } @empty { <li class="vacio">Sin mantenimientos.</li> }
              }
            </ol>
          </section>

          @if (sesion.esAdmin() && d.equipo.estado === 'Disponible') {
            <p class="zona-baja"><button type="button" class="enlace enlace--peligro" (click)="baja()"><ion-icon name="trash-outline" /> Dar de baja este equipo</button></p>
          }
        } @else {
          <div class="cargando"><ion-spinner /></div>
        }
      </div>
    </ion-content>
  `,
})
export class EquipoPagina implements ViewWillEnter {
  codigo = input.required<string>();

  private api = inject(ApiService);
  private avisos = inject(Avisos);
  private modales = inject(ModalController);
  protected sesion = inject(SesionService);

  d = signal<EquipoDetalle | null>(null);
  qr = signal<string | null>(null);
  noExiste = signal(false);
  pestana = signal<'entregas' | 'mantenimientos'>('entregas');

  fecha = fecha;
  fechaHora = fechaHora;
  hace = haceCuanto;
  tipo = nombreTipo;
  icono = iconoTipo;

  constructor() {
    effect(() => {
      const c = this.codigo();
      untracked(() => {
        this.d.set(null);
        this.qr.set(null);
        this.cargar(c);
      });
    });
  }

  ionViewWillEnter() {
    if (this.d()) this.cargar(this.codigo());
  }

  ultimoPreventivo() {
    return this.d()?.mantenimientos.find((m) => m.tipo === 'Preventivo')?.fechaInicio ?? null;
  }

  async cargar(codigo: string) {
    try {
      const d = await this.api.equipo(codigo);
      this.d.set(d);
      this.noExiste.set(false);
      if (!this.qr()) this.qr.set(await QRCode.toDataURL(d.equipo.codigo, { margin: 1, width: 264, color: { dark: '#1b2027', light: '#ffffff' } }));
    } catch (e: any) {
      if (e?.status === 404) this.noExiste.set(true);
      else this.avisos.error(e);
    }
  }

  private async abrir(component: any, componentProps: Record<string, unknown>, mensaje: (data: any) => string) {
    const m = await this.modales.create({ component, componentProps });
    await m.present();
    const { data, role } = await m.onDidDismiss();
    if (role === 'guardado') {
      this.avisos.ok(mensaje(data));
      await this.cargar(this.codigo());
    }
  }

  editar() {
    this.abrir(EquipoForm, { actual: this.d() }, () => 'Cambios guardados');
  }

  entregar() {
    this.abrir(Asignar, { equipo: this.d()!.equipo }, (a: Asignacion) => `Entregado a ${a.empleado.nombre}`);
  }

  mantenimiento() {
    this.abrir(MantenimientoForm, { equipo: this.d()!.equipo, enReparacion: !!this.d()!.reparacionAbierta }, (m) =>
      m.tipo === 'Correctivo' ? 'El equipo quedó en reparación' : 'Mantenimiento registrado');
  }

  async recibir(a: Asignacion) {
    const obs = await this.avisos.pedirTexto(`Recibir de ${a.empleado.nombre}`, '¿En qué estado llega? (opcional)', 'Recibir', 0);
    if (obs === null) return;
    try {
      await this.api.devolver(a.id, obs || null);
      this.avisos.ok('Equipo recibido');
      await this.cargar(this.codigo());
    } catch (e) {
      this.avisos.error(e);
    }
  }

  async cerrarReparacion(id: number) {
    const r = await this.avisos.pedirTexto('Cerrar reparación', '¿Qué se le hizo?', 'Cerrar');
    if (!r) return;
    try {
      await this.api.cerrarMantenimiento(id, r);
      this.avisos.ok('Reparación cerrada');
      await this.cargar(this.codigo());
    } catch (e) {
      this.avisos.error(e);
    }
  }

  async baja() {
    const motivo = await this.avisos.pedirTexto('Dar de baja', 'Motivo: daño sin arreglo, obsoleto, robo…', 'Dar de baja', 5);
    if (!motivo) return;
    try {
      await this.api.darDeBaja(this.d()!.equipo.id, motivo);
      this.avisos.ok('Equipo dado de baja');
      await this.cargar(this.codigo());
    } catch (e) {
      this.avisos.error(e);
    }
  }

  async acta(a: Asignacion) {
    try {
      const p = await this.api.empleado(a.empleado.id);
      // jsPDF pesa: se carga solo cuando alguien pide un acta
      const { descargarActa } = await import('../nucleo/acta');
      await descargarActa(a, this.d()!.equipo, p.empleado.cargo);
    } catch (e) {
      this.avisos.error(e);
    }
  }
}
