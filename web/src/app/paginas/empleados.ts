import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonButtons, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonMenuButton, IonSearchbar, IonSpinner, IonTitle, IonToggle, IonToolbar,
  ModalController, ViewWillEnter,
} from '@ionic/angular';
import { Avisos } from '../componentes/avisos';
import { EmpleadoForm } from '../componentes/empleado-form';
import { ApiService } from '../nucleo/api.service';
import { Empleado } from '../nucleo/modelos';
import { SesionService } from '../nucleo/sesion.service';

@Component({
  selector: 'app-empleados',
  imports: [FormsModule, RouterLink, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonSearchbar, IonSpinner, IonToggle, IonFab, IonFabButton, IonIcon],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-menu-button /></ion-buttons>
        <ion-title>Empleados</ion-title>
      </ion-toolbar>
      <ion-toolbar class="filtros">
        <ion-searchbar placeholder="Nombre, cargo o área" [debounce]="300" [(ngModel)]="buscar" (ionInput)="cargar()" />
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="pagina">
        <div class="barra-lista">
          <p class="conteo">{{ lista()?.length ?? 0 }} personas</p>
          <ion-toggle [(ngModel)]="inactivos" (ionChange)="cargar()" labelPlacement="start">Ver inactivos</ion-toggle>
        </div>
        @if (lista(); as lista) {
          <ul class="personas">
            @for (p of lista; track p.id) {
              <li [class.inactivo]="!p.activo">
                <a [routerLink]="['/empleados', p.id]">
                  <span class="persona__inicial">{{ p.nombre[0] }}</span>
                  <span class="personas__nombre"><strong>{{ p.nombre }}</strong><small>{{ p.cargo }}</small></span>
                  <span class="personas__area">{{ p.area }}</span>
                  <span class="personas__n" [class.cero]="!p.equiposActuales">{{ p.equiposActuales }} <small>{{ p.equiposActuales === 1 ? 'equipo' : 'equipos' }}</small></span>
                </a>
              </li>
            } @empty { <li class="vacio">Nadie coincide con la búsqueda.</li> }
          </ul>
        } @else {
          <div class="cargando"><ion-spinner /></div>
        }
      </div>
      @if (sesion.esAdmin()) {
        <ion-fab slot="fixed" vertical="bottom" horizontal="end">
          <ion-fab-button (click)="nuevo()" aria-label="Nuevo empleado"><ion-icon name="add" /></ion-fab-button>
        </ion-fab>
      }
    </ion-content>
  `,
})
export class Empleados implements OnInit, ViewWillEnter {
  private api = inject(ApiService);
  private avisos = inject(Avisos);
  private modales = inject(ModalController);
  private router = inject(Router);
  protected sesion = inject(SesionService);
  lista = signal<Empleado[] | null>(null);
  buscar = '';
  inactivos = false;

  ngOnInit() {
    this.cargar();
  }

  ionViewWillEnter() {
    if (this.lista()) this.cargar();
  }

  async cargar() {
    try {
      this.lista.set(await this.api.empleados(this.buscar, this.inactivos));
    } catch (e) {
      this.avisos.error(e);
    }
  }

  async nuevo() {
    const m = await this.modales.create({ component: EmpleadoForm });
    await m.present();
    const { data, role } = await m.onDidDismiss<Empleado>();
    if (role === 'guardado' && data) {
      this.avisos.ok(`${data.nombre} agregado`);
      this.router.navigate(['/empleados', data.id]);
    }
  }
}
