import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonButtons, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonMenuButton, IonSearchbar, IonSegment, IonSegmentButton,
  IonSpinner, IonTitle, IonToolbar, ModalController, ViewWillEnter,
} from '@ionic/angular';
import { Avisos } from '../componentes/avisos';
import { EquipoForm } from '../componentes/equipo-form';
import { Estado } from '../componentes/estado';
import { Placa } from '../componentes/placa';
import { ApiService } from '../nucleo/api.service';
import { EquipoDetalle, EquipoResumen, ESTADOS, EstadoEquipo, iconoTipo, nombreTipo } from '../nucleo/modelos';
import { SesionService } from '../nucleo/sesion.service';

@Component({
  selector: 'app-equipos',
  imports: [FormsModule, RouterLink, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonSearchbar, IonSegment, IonSegmentButton, IonIcon, IonSpinner, IonFab, IonFabButton, Placa, Estado],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-menu-button /></ion-buttons>
        <ion-title>Equipos</ion-title>
      </ion-toolbar>
      <ion-toolbar class="filtros">
        <ion-searchbar placeholder="Código, serial, marca o persona" [debounce]="300" [(ngModel)]="buscar" (ionInput)="cargar()" />
      </ion-toolbar>
      <ion-toolbar class="filtros">
        <ion-segment [value]="filtro()" (ionChange)="cambiarFiltro($any($event.detail.value))" [scrollable]="true">
          <ion-segment-button value="todos">Todos</ion-segment-button>
          @for (e of estados; track e.valor) { <ion-segment-button [value]="e.valor">{{ e.nombre }}</ion-segment-button> }
        </ion-segment>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="pagina">
        @if (lista(); as lista) {
          <p class="conteo">{{ lista.length }} {{ lista.length === 1 ? 'equipo' : 'equipos' }}</p>
          <ul class="tabla-equipos">
            @for (e of lista; track e.id) {
              <li>
                <a [routerLink]="['/equipos', e.codigo]">
                  <app-placa [codigo]="e.codigo" />
                  <span class="tabla-equipos__equipo">
                    <ion-icon [name]="icono(e.tipo)" [attr.aria-label]="tipo(e.tipo)" />
                    <span><strong>{{ e.marca }} {{ e.modelo }}</strong><small class="mono">{{ e.serial }}</small></span>
                  </span>
                  <span class="tabla-equipos__quien">{{ e.asignadoA ? e.asignadoA.nombre : '—' }}<small>{{ e.asignadoA?.area }}</small></span>
                  <app-estado [estado]="e.estado" />
                </a>
              </li>
            } @empty {
              <li class="vacio">No hay equipos con ese filtro.</li>
            }
          </ul>
        } @else {
          <div class="cargando"><ion-spinner /></div>
        }
      </div>
      @if (sesion.esAdmin()) {
        <ion-fab slot="fixed" vertical="bottom" horizontal="end">
          <ion-fab-button (click)="nuevo()" aria-label="Nuevo equipo"><ion-icon name="add" /></ion-fab-button>
        </ion-fab>
      }
    </ion-content>
  `,
})
export class Equipos implements ViewWillEnter {
  // ?estado=EnReparacion (desde el resumen)
  estado = input<EstadoEquipo | undefined>();

  private api = inject(ApiService);
  private avisos = inject(Avisos);
  private modales = inject(ModalController);
  private router = inject(Router);
  protected sesion = inject(SesionService);

  estados = ESTADOS;
  lista = signal<EquipoResumen[] | null>(null);
  filtro = signal<EstadoEquipo | 'todos'>('todos');
  buscar = '';
  tipo = nombreTipo;
  icono = iconoTipo;

  constructor() {
    // Carga la primera vez y cada vez que cambia el ?estado= de la dirección
    effect(() => {
      const e = this.estado();
      untracked(() => {
        this.filtro.set(e ?? 'todos');
        this.cargar();
      });
    });
  }

  // Al volver a la lista (después de editar un equipo, por ejemplo) se actualiza
  ionViewWillEnter() {
    if (this.lista()) this.cargar();
  }

  cambiarFiltro(v: EstadoEquipo | 'todos') {
    this.filtro.set(v);
    this.cargar();
  }

  async cargar() {
    try {
      const f = this.filtro();
      this.lista.set(await this.api.equipos({ buscar: this.buscar, estado: f === 'todos' ? null : f }));
    } catch (e) {
      this.avisos.error(e);
    }
  }

  async nuevo() {
    const m = await this.modales.create({ component: EquipoForm });
    await m.present();
    const { data, role } = await m.onDidDismiss<EquipoDetalle>();
    if (role === 'guardado' && data) {
      this.avisos.ok(`Equipo ${data.equipo.codigo} registrado`);
      this.router.navigate(['/equipos', data.equipo.codigo]);
    }
  }
}
