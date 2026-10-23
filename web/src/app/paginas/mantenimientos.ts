import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonLabel, IonMenuButton, IonSegment, IonSegmentButton, IonSpinner, IonTitle, IonToolbar, ViewWillEnter,
} from '@ionic/angular';
import { Avisos } from '../componentes/avisos';
import { Placa } from '../componentes/placa';
import { ApiService } from '../nucleo/api.service';
import { fechaHora, haceCuanto } from '../nucleo/formato';
import { Mantenimiento } from '../nucleo/modelos';

@Component({
  selector: 'app-mantenimientos',
  imports: [RouterLink, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonSegment, IonSegmentButton, IonLabel, IonSpinner, IonButton, Placa],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-menu-button /></ion-buttons>
        <ion-title>Mantenimientos</ion-title>
      </ion-toolbar>
      <ion-toolbar class="filtros">
        <ion-segment [value]="vista()" (ionChange)="cambiar($any($event.detail.value))">
          <ion-segment-button value="abiertos"><ion-label>En reparación</ion-label></ion-segment-button>
          <ion-segment-button value="todos"><ion-label>Recientes</ion-label></ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="pagina">
        @if (lista(); as lista) {
          <ul class="tarjetas-mant">
            @for (m of lista; track m.id) {
              <li [class.abierto]="!m.fechaFin">
                <a [routerLink]="['/equipos', m.codigoEquipo]" class="tarjetas-mant__equipo">
                  <app-placa [codigo]="m.codigoEquipo" />
                  <span>{{ m.equipo }}</span>
                </a>
                <p class="tarjetas-mant__tipo">{{ m.tipo === 'Correctivo' ? 'Reparación' : 'Preventivo' }} · {{ m.tecnico }} · <span [title]="fechaHora(m.fechaInicio)">{{ hace(m.fechaInicio) }}</span></p>
                <p>{{ m.descripcion }}</p>
                @if (m.resultado) { <p class="tarjetas-mant__resultado">{{ m.resultado }}</p> }
                @if (!m.fechaFin) {
                  <ion-button size="small" (click)="cerrar(m)">Cerrar reparación</ion-button>
                }
              </li>
            } @empty {
              <li class="vacio">{{ vista() === 'abiertos' ? 'No hay equipos en reparación.' : 'Sin mantenimientos.' }}</li>
            }
          </ul>
        } @else {
          <div class="cargando"><ion-spinner /></div>
        }
      </div>
    </ion-content>
  `,
})
export class Mantenimientos implements OnInit, ViewWillEnter {
  private api = inject(ApiService);
  private avisos = inject(Avisos);
  lista = signal<Mantenimiento[] | null>(null);
  vista = signal<'abiertos' | 'todos'>('abiertos');
  hace = haceCuanto;
  fechaHora = fechaHora;

  ngOnInit() {
    this.cargar();
  }

  ionViewWillEnter() {
    if (this.lista()) this.cargar();
  }

  cambiar(v: 'abiertos' | 'todos') {
    this.vista.set(v);
    this.lista.set(null);
    this.cargar();
  }

  async cargar() {
    try {
      this.lista.set(await this.api.mantenimientos(this.vista() === 'abiertos', 40));
    } catch (e) {
      this.avisos.error(e);
    }
  }

  async cerrar(m: Mantenimiento) {
    const r = await this.avisos.pedirTexto(`Cerrar reparación de ${m.codigoEquipo}`, '¿Qué se le hizo?', 'Cerrar');
    if (!r) return;
    try {
      await this.api.cerrarMantenimiento(m.id, r);
      this.avisos.ok('Reparación cerrada');
      this.cargar();
    } catch (e) {
      this.avisos.error(e);
    }
  }
}
