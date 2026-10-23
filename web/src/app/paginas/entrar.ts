import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonInput, IonSpinner } from '@ionic/angular';
import { ApiService, mensajeDeError } from '../nucleo/api.service';
import { Rol } from '../nucleo/modelos';
import { SesionService } from '../nucleo/sesion.service';

@Component({
  selector: 'app-entrar',
  imports: [IonContent, IonButton, IonIcon, IonInput, IonSpinner, FormsModule],
  template: `
    <ion-content class="entrar">
      <div class="entrar__caja">
        <div class="entrar__marca">
          <span class="menu__logo" aria-hidden="true"></span>
          <span>Parque TI</span>
        </div>
        <h1>El inventario de los equipos de cómputo de la empresa.</h1>
        <p class="entrar__texto">
          Quién tiene cada portátil, monitor o impresora, el acta de entrega en PDF, el historial de mantenimientos y una etiqueta con código QR para encontrar
          cualquier equipo escaneándolo con el celular.
        </p>

        <div class="servidor" [attr.data-estado]="servidor()">
          @switch (servidor()) {
            @case ('despertando') {
              <ion-spinner name="dots" />
              <span>Despertando el servidor. La primera visita del día puede tardar hasta un minuto…</span>
            }
            @case ('listo') {
              <span class="servidor__punto"></span>
              <span>Servidor listo</span>
            }
            @case ('error') {
              <span>No se pudo contactar el servidor.</span>
              <button type="button" (click)="despertar()">Reintentar</button>
            }
          }
        </div>

        <h2>Entra a la demostración</h2>
        <div class="entrar__roles">
          <button type="button" class="rol" (click)="demo('Admin')" [disabled]="cargando()">
            <ion-icon name="shield-checkmark-outline" />
            <strong>Como administradora</strong>
            <span>Registra equipos, los entrega a los empleados y saca las actas.</span>
          </button>
          <button type="button" class="rol" (click)="demo('Tecnico')" [disabled]="cargando()">
            <ion-icon name="build-outline" />
            <strong>Como técnico</strong>
            <span>Escanea el QR de un equipo y registra su mantenimiento. Pensado para el celular.</span>
          </button>
        </div>
        <p class="entrar__nota">Los datos son de una empresa inventada y se reinician solos cada cierto tiempo. Puedes cambiar lo que quieras.</p>

        <details class="entrar__cuenta">
          <summary>Tengo una cuenta</summary>
          <form (ngSubmit)="entrar()">
            <ion-input label="Correo" labelPlacement="stacked" type="email" name="correo" [(ngModel)]="correo" autocomplete="username" fill="outline" />
            <ion-input label="Contraseña" labelPlacement="stacked" type="password" name="clave" [(ngModel)]="clave" autocomplete="current-password" fill="outline" />
            <ion-button type="submit" expand="block" [disabled]="cargando() || !correo || !clave">Entrar</ion-button>
          </form>
        </details>

        @if (error()) {
          <p class="entrar__error" role="alert">{{ error() }}</p>
        }
      </div>
    </ion-content>
  `,
})
export class Entrar implements OnInit {
  private api = inject(ApiService);
  private sesion = inject(SesionService);
  private router = inject(Router);

  servidor = signal<'despertando' | 'listo' | 'error'>('despertando');
  cargando = signal(false);
  error = signal('');
  correo = '';
  clave = '';

  ngOnInit() {
    this.despertar();
  }

  async despertar() {
    this.servidor.set('despertando');
    // Render apaga el servidor gratis cuando nadie lo usa; se reintenta mientras arranca
    for (let i = 0; i < 6; i++) {
      try {
        await this.api.despertar();
        this.servidor.set('listo');
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 4000));
      }
    }
    this.servidor.set('error');
  }

  async demo(rol: Rol) {
    await this.hacer(() => this.api.demo(rol));
  }

  async entrar() {
    await this.hacer(() => this.api.entrar(this.correo.trim(), this.clave));
  }

  private async hacer(pedir: () => Promise<import('../nucleo/modelos').Sesion>) {
    this.cargando.set(true);
    this.error.set('');
    try {
      const s = await pedir();
      this.sesion.guardar(s);
      await this.router.navigateByUrl(s.usuario.rol === 'Admin' ? '/resumen' : '/escanear', { replaceUrl: true });
    } catch (e) {
      this.error.set(mensajeDeError(e));
    } finally {
      this.cargando.set(false);
    }
  }
}
