import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonRadio, IonRadioGroup, IonSearchbar,
  IonSpinner, IonTextarea, IonTitle, IonToolbar, ModalController,
} from '@ionic/angular';
import { ApiService, mensajeDeError } from '../nucleo/api.service';
import { Asignacion, Empleado, EquipoResumen } from '../nucleo/modelos';

// Elegir a quién se le entrega un equipo
@Component({
  selector: 'app-asignar',
  imports: [FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, IonSearchbar, IonList, IonItem, IonLabel, IonRadioGroup, IonRadio, IonSpinner, IonFooter, IonTextarea],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Entregar {{ equipo.codigo }}</ion-title>
        <ion-buttons slot="end"><ion-button (click)="cerrar()" aria-label="Cerrar"><ion-icon slot="icon-only" name="close" /></ion-button></ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar placeholder="Buscar persona o área" [(ngModel)]="buscar" />
      </ion-toolbar>
    </ion-header>
    <ion-content>
      @if (empleados(); as _) {
        <ion-radio-group [(ngModel)]="elegido">
          <ion-list>
            @for (p of filtrados(); track p.id) {
              <ion-item>
                <ion-radio [value]="p.id" justify="space-between">
                  <ion-label>
                    <strong>{{ p.nombre }}</strong>
                    <p>{{ p.cargo }} · {{ p.area }}{{ p.equiposActuales ? ' · tiene ' + p.equiposActuales : '' }}</p>
                  </ion-label>
                </ion-radio>
              </ion-item>
            } @empty {
              <ion-item><ion-label>Nadie coincide con la búsqueda.</ion-label></ion-item>
            }
          </ion-list>
        </ion-radio-group>
      } @else {
        <div class="cargando"><ion-spinner /></div>
      }
    </ion-content>
    <ion-footer>
      <div class="pie-modal">
        <ion-textarea label="Observaciones de la entrega" labelPlacement="stacked" fill="outline" [(ngModel)]="observaciones" placeholder="Con cargador, maletín, mouse…" [maxlength]="500" [rows]="2" />
        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
        <ion-button expand="block" [disabled]="!elegido || guardando()" (click)="entregar()">{{ guardando() ? 'Guardando…' : 'Entregar equipo' }}</ion-button>
      </div>
    </ion-footer>
  `,
})
export class Asignar implements OnInit {
  equipo!: EquipoResumen;

  private api = inject(ApiService);
  private ventana = inject(ModalController);
  empleados = signal<Empleado[] | null>(null);
  private busqueda = signal('');
  filtrados = computed(() => {
    const t = this.busqueda().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    const base = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    return (this.empleados() ?? []).filter((p) => !t || base(`${p.nombre} ${p.area} ${p.cargo}`).includes(t));
  });
  get buscar() { return this.busqueda(); }
  set buscar(v: string) { this.busqueda.set(v ?? ''); }

  elegido: number | null = null;
  observaciones = '';
  guardando = signal(false);
  error = signal('');

  async ngOnInit() {
    try {
      this.empleados.set(await this.api.empleados());
    } catch (e) {
      this.error.set(mensajeDeError(e));
      this.empleados.set([]);
    }
  }

  async entregar() {
    if (!this.elegido) return;
    this.guardando.set(true);
    this.error.set('');
    try {
      const a: Asignacion = await this.api.asignar(this.equipo.id, this.elegido, this.observaciones.trim() || null);
      await this.ventana.dismiss(a, 'guardado');
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
