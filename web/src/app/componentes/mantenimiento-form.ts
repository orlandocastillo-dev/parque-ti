import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonLabel, IonSegment, IonSegmentButton, IonTextarea, IonTitle, IonToolbar, ModalController,
} from '@ionic/angular';
import { ApiService, mensajeDeError } from '../nucleo/api.service';
import { EquipoResumen, Mantenimiento, TipoMantenimiento } from '../nucleo/modelos';

@Component({
  selector: 'app-mantenimiento-form',
  imports: [FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, IonSegment, IonSegmentButton, IonLabel, IonTextarea],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Mantenimiento de {{ equipo.codigo }}</ion-title>
        <ion-buttons slot="end"><ion-button (click)="cerrar()" aria-label="Cerrar"><ion-icon slot="icon-only" name="close" /></ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div class="formulario">
        <p class="formulario__equipo">{{ equipo.marca }} {{ equipo.modelo }}</p>
        <ion-segment [(ngModel)]="tipo">
          <ion-segment-button value="Preventivo"><ion-label>Preventivo</ion-label></ion-segment-button>
          <ion-segment-button value="Correctivo" [disabled]="enReparacion"><ion-label>Reparación</ion-label></ion-segment-button>
        </ion-segment>
        <p class="ayuda">
          @if (tipo === 'Preventivo') {
            Limpieza, actualizaciones o revisión. Queda registrado como hecho hoy.
          } @else {
            Algo está fallando. El equipo queda <b>en reparación</b> hasta que cierres el caso.
          }
        </p>
        <ion-textarea [label]="tipo === 'Preventivo' ? '¿Qué se hizo?' : '¿Qué falla tiene?'" labelPlacement="stacked" fill="outline" [(ngModel)]="descripcion" [autoGrow]="true" [maxlength]="500"
          [placeholder]="tipo === 'Preventivo' ? 'Limpieza interna y actualización de Windows' : 'No enciende, pantalla con rayas…'" />
        @if (tipo === 'Preventivo') {
          <ion-textarea label="Resultado (opcional)" labelPlacement="stacked" fill="outline" [(ngModel)]="resultado" placeholder="Sin novedad" [autoGrow]="true" [maxlength]="500" />
        }
        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
        <ion-button expand="block" [disabled]="descripcion.trim().length < 5 || guardando()" (click)="guardar()">{{ guardando() ? 'Guardando…' : 'Registrar' }}</ion-button>
      </div>
    </ion-content>
  `,
})
export class MantenimientoForm {
  equipo!: EquipoResumen;
  enReparacion = false;

  private api = inject(ApiService);
  private ventana = inject(ModalController);
  tipo: TipoMantenimiento = 'Preventivo';
  descripcion = '';
  resultado = '';
  guardando = signal(false);
  error = signal('');

  async guardar() {
    this.guardando.set(true);
    this.error.set('');
    try {
      const m: Mantenimiento = await this.api.registrarMantenimiento(this.equipo.id, this.tipo, this.descripcion.trim(), this.tipo === 'Preventivo' ? this.resultado.trim() || null : null);
      await this.ventana.dismiss(m, 'guardado');
    } catch (e) {
      this.error.set(mensajeDeError(e));
    } finally {
      this.guardando.set(false);
    }
  }

  cerrar() {
    this.ventana.dismiss(null, 'cancel');
  }
}
