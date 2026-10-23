import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonSpinner, IonTitle, IonToolbar, ModalController, ViewWillEnter } from '@ionic/angular';
import { Avisos } from '../componentes/avisos';
import { EmpleadoForm } from '../componentes/empleado-form';
import { Estado } from '../componentes/estado';
import { Placa } from '../componentes/placa';
import { ApiService } from '../nucleo/api.service';
import { fecha } from '../nucleo/formato';
import { EmpleadoDetalle, iconoTipo } from '../nucleo/modelos';
import { SesionService } from '../nucleo/sesion.service';

@Component({
  selector: 'app-empleado',
  imports: [RouterLink, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonButton, IonIcon, IonSpinner, Placa, Estado],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/empleados" text="" /></ion-buttons>
        <ion-title>{{ d()?.empleado?.nombre ?? 'Empleado' }}</ion-title>
        @if (sesion.esAdmin() && d()) {
          <ion-buttons slot="end"><ion-button (click)="editar()" aria-label="Editar"><ion-icon slot="icon-only" name="create-outline" /></ion-button></ion-buttons>
        }
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="pagina">
        @if (d(); as d) {
          <section class="ficha ficha--persona">
            <span class="persona__inicial persona__inicial--grande">{{ d.empleado.nombre[0] }}</span>
            <div>
              <h1>{{ d.empleado.nombre }}</h1>
              <p>{{ d.empleado.cargo }} · {{ d.empleado.area }}</p>
              @if (d.empleado.correo) { <p class="mono">{{ d.empleado.correo }}</p> }
              @if (!d.empleado.activo) { <p class="etiqueta-inactivo">Inactivo</p> }
            </div>
          </section>

          <section class="bloque">
            <h2>Equipos que tiene <span class="bloque__n">{{ d.equiposActuales.length }}</span></h2>
            <ul class="tabla-equipos">
              @for (e of d.equiposActuales; track e.id) {
                <li>
                  <a [routerLink]="['/equipos', e.codigo]">
                    <app-placa [codigo]="e.codigo" />
                    <span class="tabla-equipos__equipo"><ion-icon [name]="icono(e.tipo)" /><span><strong>{{ e.marca }} {{ e.modelo }}</strong><small class="mono">{{ e.serial }}</small></span></span>
                    <app-estado [estado]="e.estado" />
                  </a>
                </li>
              } @empty { <li class="vacio">No tiene equipos a su cargo.</li> }
            </ul>
          </section>

          <section class="bloque">
            <h2>Historial</h2>
            <ol class="historial">
              @for (a of d.historial; track a.id) {
                <li [class.historial__activa]="!a.fechaDevolucion">
                  <div>
                    <strong><a [routerLink]="['/equipos', a.codigoEquipo]">{{ a.codigoEquipo }}</a> · {{ a.equipo }}</strong>
                    <small>{{ fecha(a.fechaEntrega) }} → {{ a.fechaDevolucion ? fecha(a.fechaDevolucion) : 'hoy' }}</small>
                  </div>
                </li>
              } @empty { <li class="vacio">Nunca ha recibido equipos.</li> }
            </ol>
          </section>

          @if (sesion.esAdmin()) {
            <p class="zona-baja">
              <button type="button" class="enlace" [class.enlace--peligro]="d.empleado.activo" (click)="cambiarActivo(!d.empleado.activo)">
                {{ d.empleado.activo ? 'Desactivar (se retiró de la empresa)' : 'Volver a activar' }}
              </button>
            </p>
          }
        } @else {
          <div class="cargando"><ion-spinner /></div>
        }
      </div>
    </ion-content>
  `,
})
export class EmpleadoPagina implements ViewWillEnter {
  id = input.required<string>();

  private api = inject(ApiService);
  private avisos = inject(Avisos);
  private modales = inject(ModalController);
  protected sesion = inject(SesionService);
  d = signal<EmpleadoDetalle | null>(null);
  fecha = fecha;
  icono = iconoTipo;

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => {
        this.d.set(null);
        this.cargar(+id);
      });
    });
  }

  ionViewWillEnter() {
    if (this.d()) this.cargar(+this.id());
  }

  async cargar(id: number) {
    try {
      this.d.set(await this.api.empleado(id));
    } catch (e) {
      this.avisos.error(e);
    }
  }

  async editar() {
    const m = await this.modales.create({ component: EmpleadoForm, componentProps: { actual: this.d()!.empleado } });
    await m.present();
    if ((await m.onDidDismiss()).role === 'guardado') {
      this.avisos.ok('Cambios guardados');
      this.cargar(+this.id());
    }
  }

  async cambiarActivo(activo: boolean) {
    if (!activo && !(await this.avisos.confirmar('¿Desactivar?', 'Ya no se le podrán entregar equipos. Su historial se conserva.', 'Desactivar'))) return;
    try {
      await this.api.cambiarActivo(+this.id(), activo);
      this.avisos.ok(activo ? 'Empleado activo de nuevo' : 'Empleado desactivado');
      this.cargar(+this.id());
    } catch (e) {
      this.avisos.error(e);
    }
  }
}
