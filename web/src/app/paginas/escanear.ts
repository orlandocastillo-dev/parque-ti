import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonMenuButton, IonTitle, IonToolbar, ViewDidLeave } from '@ionic/angular';
import jsQR from 'jsqr';

// El técnico apunta la cámara a la etiqueta del equipo y se abre su ficha
@Component({
  selector: 'app-escanear',
  imports: [FormsModule, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonButton, IonIcon, IonInput],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-menu-button /></ion-buttons>
        <ion-title>Escanear equipo</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="pagina escanear">
        <div class="visor" [attr.data-estado]="estado()">
          <video #video playsinline muted></video>
          <canvas #lienzo hidden></canvas>
          <span class="visor__marco" aria-hidden="true"></span>
          @switch (estado()) {
            @case ('apagada') {
              <div class="visor__aviso">
                <ion-icon name="qr-code-outline" />
                <p>Apunta la cámara a la etiqueta QR pegada en el equipo.</p>
                <ion-button (click)="encender()"><ion-icon slot="start" name="camera-outline" />Abrir la cámara</ion-button>
              </div>
            }
            @case ('error') {
              <div class="visor__aviso">
                <p>{{ error() }}</p>
                <ion-button fill="outline" color="light" (click)="encender()">Intentar de nuevo</ion-button>
              </div>
            }
            @case ('leyendo') {
              <p class="visor__pista">Buscando un código QR…</p>
            }
          }
        </div>

        <form class="manual" (ngSubmit)="abrir(codigo)">
          <p>¿La etiqueta está dañada? Escribe el código:</p>
          <div class="manual__fila">
            <ion-input fill="outline" placeholder="EQ-0007" [(ngModel)]="codigo" name="codigo" class="mono" autocapitalize="characters" />
            <ion-button type="submit" [disabled]="!codigo.trim()">Abrir</ion-button>
          </div>
        </form>
      </div>
    </ion-content>
  `,
})
export class Escanear implements ViewDidLeave {
  private router = inject(Router);
  private video = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  private lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  estado = signal<'apagada' | 'leyendo' | 'error'>('apagada');
  error = signal('');
  codigo = '';
  private flujo: MediaStream | null = null;
  private cuadro = 0;

  async encender() {
    try {
      this.flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    } catch {
      this.error.set('No se pudo abrir la cámara. Revisa que le diste permiso a esta página.');
      this.estado.set('error');
      return;
    }
    const v = this.video().nativeElement;
    v.srcObject = this.flujo;
    await v.play().catch(() => undefined);
    this.estado.set('leyendo');
    this.leer();
  }

  private leer = () => {
    const v = this.video().nativeElement;
    if (this.estado() !== 'leyendo') return;
    if (v.readyState >= 2 && v.videoWidth) {
      const c = this.lienzo().nativeElement;
      // Se lee en baja resolución: es suficiente y no calienta el celular
      const escala = Math.min(1, 480 / v.videoWidth);
      c.width = v.videoWidth * escala;
      c.height = v.videoHeight * escala;
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(v, 0, 0, c.width, c.height);
      const img = ctx.getImageData(0, 0, c.width, c.height);
      const qr = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
      if (qr?.data) {
        const codigo = this.extraer(qr.data);
        if (codigo) {
          navigator.vibrate?.(80);
          this.abrir(codigo);
          return;
        }
      }
    }
    this.cuadro = requestAnimationFrame(this.leer);
  };

  // El QR trae el código (EQ-0007); también acepta un enlace que termine en el código
  private extraer(texto: string) {
    const m = texto.trim().toUpperCase().match(/EQ-\d{1,6}/);
    return m?.[0] ?? null;
  }

  abrir(codigo: string) {
    const c = this.extraer(codigo) ?? codigo.trim().toUpperCase();
    if (!c) return;
    this.apagar();
    this.codigo = '';
    this.router.navigate(['/equipos', c]);
  }

  private apagar() {
    cancelAnimationFrame(this.cuadro);
    this.flujo?.getTracks().forEach((t) => t.stop());
    this.flujo = null;
    if (this.estado() === 'leyendo') this.estado.set('apagada');
  }

  ionViewDidLeave() {
    this.apagar();
  }
}
