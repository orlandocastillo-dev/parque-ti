import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { IonButton, IonButtons, IonCheckbox, IonContent, IonHeader, IonIcon, IonMenuButton, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';
import QRCode from 'qrcode';
import { Avisos } from '../componentes/avisos';
import { ApiService } from '../nucleo/api.service';
import { EquipoResumen } from '../nucleo/modelos';

interface Etiqueta { e: EquipoResumen; qr: string; }

// Hoja de etiquetas con QR para imprimir y pegar en los equipos
@Component({
  selector: 'app-etiquetas',
  imports: [IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonButton, IonIcon, IonCheckbox, IonSpinner],
  template: `
    <ion-header class="no-imprimir">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-menu-button /></ion-buttons>
        <ion-title>Etiquetas QR</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="solid" class="boton-amarillo" (click)="imprimir()" [disabled]="!elegidas().length"><ion-icon slot="start" name="print-outline" />Imprimir {{ elegidas().length }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="pagina">
        <p class="no-imprimir ayuda">Marca los equipos que necesitan etiqueta. Se imprimen en hoja carta, listas para recortar y pegar.</p>
        <p class="no-imprimir"><button type="button" class="enlace" (click)="todas(true)">Marcar todas</button> · <button type="button" class="enlace" (click)="todas(false)">Ninguna</button></p>
        @if (lista(); as lista) {
          <div class="hoja-etiquetas">
            @for (x of lista; track x.e.id) {
              <label class="etiqueta" [class.fuera]="!marcadas().has(x.e.id)">
                <ion-checkbox class="no-imprimir" [checked]="marcadas().has(x.e.id)" (ionChange)="marcar(x.e.id, $event.detail.checked)" aria-label="Incluir" />
                <img [src]="x.qr" alt="" width="84" height="84" />
                <span class="etiqueta__texto">
                  <small>PARQUE TI · PROPIEDAD DE LA EMPRESA</small>
                  <b class="mono">{{ x.e.codigo }}</b>
                  <span>{{ x.e.marca }} {{ x.e.modelo }}</span>
                  <span class="mono">S/N {{ x.e.serial }}</span>
                </span>
              </label>
            }
          </div>
        } @else {
          <div class="cargando"><ion-spinner /></div>
        }
      </div>
    </ion-content>
  `,
})
export class Etiquetas implements OnInit {
  private api = inject(ApiService);
  private avisos = inject(Avisos);
  lista = signal<Etiqueta[] | null>(null);
  marcadas = signal(new Set<number>());
  elegidas = computed(() => (this.lista() ?? []).filter((x) => this.marcadas().has(x.e.id)));

  async ngOnInit() {
    try {
      const equipos = (await this.api.equipos()).filter((e) => e.estado !== 'DeBaja');
      const lista = await Promise.all(equipos.map(async (e) => ({ e, qr: await QRCode.toDataURL(e.codigo, { margin: 0, width: 200 }) })));
      this.lista.set(lista);
      this.marcadas.set(new Set(lista.map((x) => x.e.id)));
    } catch (e) {
      this.avisos.error(e);
    }
  }

  marcar(id: number, si: boolean) {
    const s = new Set(this.marcadas());
    if (si) s.add(id);
    else s.delete(id);
    this.marcadas.set(s);
  }

  todas(si: boolean) {
    this.marcadas.set(si ? new Set((this.lista() ?? []).map((x) => x.e.id)) : new Set());
  }

  imprimir() {
    window.print();
  }
}
