import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import {
  IonApp, IonContent, IonIcon, IonItem, IonLabel, IonList, IonMenu, IonMenuToggle, IonRouterOutlet, IonSplitPane,
} from '@ionic/angular';
import { SesionService } from './nucleo/sesion.service';

interface Opcion { url: string; nombre: string; icono: string; soloAdmin?: boolean; }

@Component({
  selector: 'app-root',
  imports: [IonApp, IonSplitPane, IonMenu, IonContent, IonList, IonMenuToggle, IonItem, IonIcon, IonLabel, IonRouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <ion-app>
      <ion-split-pane contentId="principal" when="lg" [disabled]="!sesion.usuario()">
        <ion-menu contentId="principal" type="overlay" [disabled]="!sesion.usuario()">
          <ion-content class="menu">
            <div class="menu__marca">
              <span class="menu__logo" aria-hidden="true"></span>
              <div>
                <strong>Parque TI</strong>
                <small>Inventario de equipos</small>
              </div>
            </div>
            <ion-list lines="none">
              @for (o of opciones(); track o.url) {
                <ion-menu-toggle [autoHide]="false">
                  <ion-item [routerLink]="o.url" routerLinkActive="activo" [detail]="false" button>
                    <ion-icon slot="start" [name]="o.icono" />
                    <ion-label>{{ o.nombre }}</ion-label>
                  </ion-item>
                </ion-menu-toggle>
              }
            </ion-list>
            @if (sesion.usuario(); as u) {
              <div class="menu__usuario">
                <span class="menu__rol">{{ u.rol === 'Admin' ? 'Administrador' : 'Técnico' }}</span>
                <strong>{{ u.nombre }}</strong>
                <button type="button" (click)="salir()">Salir</button>
              </div>
            }
          </ion-content>
        </ion-menu>
        <ion-router-outlet id="principal" />
      </ion-split-pane>
    </ion-app>
  `,
})
export class App {
  protected sesion = inject(SesionService);
  private router = inject(Router);

  private todas: Opcion[] = [
    { url: '/resumen', nombre: 'Resumen', icono: 'grid-outline' },
    { url: '/escanear', nombre: 'Escanear QR', icono: 'qr-code-outline' },
    { url: '/equipos', nombre: 'Equipos', icono: 'laptop-outline' },
    { url: '/empleados', nombre: 'Empleados', icono: 'people-outline' },
    { url: '/mantenimientos', nombre: 'Mantenimientos', icono: 'construct-outline' },
    { url: '/etiquetas', nombre: 'Etiquetas QR', icono: 'pricetags-outline', soloAdmin: true },
  ];
  protected opciones = computed(() => this.todas.filter((o) => !o.soloAdmin || this.sesion.esAdmin()));

  salir() {
    this.sesion.salir();
    this.router.navigateByUrl('/entrar', { replaceUrl: true });
  }
}
