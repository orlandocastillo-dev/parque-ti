import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButtons, IonContent, IonHeader, IonIcon, IonMenuButton, IonRefresher, IonRefresherContent, IonSpinner, IonTitle, IonToolbar,
  RefresherCustomEvent, ViewWillEnter,
} from '@ionic/angular';
import { Avisos } from '../componentes/avisos';
import { Placa } from '../componentes/placa';
import { ApiService } from '../nucleo/api.service';
import { fechaHora, haceCuanto } from '../nucleo/formato';
import { EstadoEquipo, Resumen, TipoEquipo, iconoTipo, nombreEstado, nombreTipo } from '../nucleo/modelos';

@Component({
  selector: 'app-resumen',
  imports: [IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonRefresher, IonRefresherContent, IonIcon, IonSpinner, RouterLink, Placa],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-menu-button /></ion-buttons>
        <ion-title>Resumen</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refrescar($event)"><ion-refresher-content /></ion-refresher>
      <div class="pagina">
        @if (r(); as r) {
          <section class="cifras" aria-label="Equipos por estado">
            <a class="cifra cifra--total" routerLink="/equipos">
              <span class="cifra__n">{{ r.totalEquipos }}</span>
              <span class="cifra__t">equipos registrados</span>
            </a>
            @for (c of r.porEstado; track c.clave) {
              <a class="cifra" [attr.data-estado]="c.clave" routerLink="/equipos" [queryParams]="{ estado: c.clave }">
                <span class="cifra__n">{{ c.total }}</span>
                <span class="cifra__t">{{ estado(c.clave) }}</span>
              </a>
            }
          </section>

          <div class="columnas">
            <section class="bloque">
              <h2>Pendientes <span class="bloque__n">{{ r.alertas.length }}</span></h2>
              @if (r.alertas.length) {
                <ul class="alertas">
                  @for (a of r.alertas; track $index) {
                    <li [attr.data-tipo]="a.tipo">
                      <a [routerLink]="['/equipos', a.codigoEquipo]">
                        <ion-icon [name]="a.tipo === 'reparacion' ? 'time-outline' : a.tipo === 'renovar' ? 'refresh-outline' : 'construct-outline'" />
                        <span>{{ a.mensaje }}</span>
                      </a>
                    </li>
                  }
                </ul>
              } @else {
                <p class="vacio">Todo al día.</p>
              }
            </section>

            <section class="bloque">
              <h2>Equipos en uso por tipo</h2>
              <ul class="barras">
                @for (t of r.porTipo; track t.clave) {
                  <li>
                    <ion-icon [name]="icono(t.clave)" />
                    <span class="barras__nombre">{{ tipo(t.clave) }}</span>
                    <span class="barras__barra"><i [style.width.%]="(t.total / maxTipo()) * 100"></i></span>
                    <b>{{ t.total }}</b>
                  </li>
                }
              </ul>
              <p class="bloque__pie">{{ r.empleadosActivos }} empleados activos · {{ r.reparacionesAbiertas }} en reparación</p>
            </section>
          </div>

          <section class="bloque">
            <h2>Últimos movimientos</h2>
            <ul class="movimientos">
              @for (m of r.actividad; track $index) {
                <li>
                  <a [routerLink]="['/equipos', m.codigoEquipo]">
                    <app-placa [codigo]="m.codigoEquipo" />
                    <span class="movimientos__texto">{{ m.texto }}</span>
                    <time [title]="fechaHora(m.fecha)">{{ hace(m.fecha) }}</time>
                  </a>
                </li>
              }
            </ul>
          </section>
        } @else {
          <div class="cargando"><ion-spinner /></div>
        }
      </div>
    </ion-content>
  `,
})
export class ResumenPagina implements ViewWillEnter {
  private api = inject(ApiService);
  private avisos = inject(Avisos);
  r = signal<Resumen | null>(null);
  maxTipo = computed(() => Math.max(1, ...(this.r()?.porTipo.map((t) => t.total) ?? [1])));

  estado = (e: string) => nombreEstado(e as EstadoEquipo);
  tipo = (t: string) => nombreTipo(t as TipoEquipo);
  icono = (t: string) => iconoTipo(t as TipoEquipo);
  hace = haceCuanto;
  fechaHora = fechaHora;

  ionViewWillEnter() {
    this.cargar();
  }

  async cargar() {
    try {
      this.r.set(await this.api.resumen());
    } catch (e) {
      this.avisos.error(e);
    }
  }

  async refrescar(ev: RefresherCustomEvent) {
    await this.cargar();
    ev.target.complete();
  }
}
