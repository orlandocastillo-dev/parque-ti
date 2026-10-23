import { Injectable, inject } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { mensajeDeError } from '../nucleo/api.service';

@Injectable({ providedIn: 'root' })
export class Avisos {
  private toasts = inject(ToastController);
  private alertas = inject(AlertController);

  async ok(mensaje: string) {
    const t = await this.toasts.create({ message: mensaje, duration: 2500, position: 'bottom', cssClass: 'aviso aviso--ok' });
    await t.present();
  }

  async error(e: unknown) {
    const t = await this.toasts.create({ message: mensajeDeError(e), duration: 5000, position: 'bottom', cssClass: 'aviso aviso--error', buttons: [{ icon: 'close', role: 'cancel' }] });
    await t.present();
  }

  async confirmar(titulo: string, texto: string, si = 'Sí, continuar'): Promise<boolean> {
    const a = await this.alertas.create({ header: titulo, message: texto, buttons: [{ text: 'Cancelar', role: 'cancel' }, { text: si, role: 'confirm' }] });
    await a.present();
    return (await a.onDidDismiss()).role === 'confirm';
  }

  // Pide un texto (motivo de baja, resultado de una reparación...)
  async pedirTexto(titulo: string, etiqueta: string, si: string, minimo = 3): Promise<string | null> {
    const a = await this.alertas.create({
      header: titulo,
      inputs: [{ name: 'texto', type: 'textarea', placeholder: etiqueta, attributes: { maxlength: 300 } }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: si, role: 'confirm', handler: (v: { texto: string }) => (v.texto ?? '').trim().length >= minimo },
      ],
    });
    await a.present();
    const r = await a.onDidDismiss<{ values: { texto: string } }>();
    return r.role === 'confirm' ? r.data!.values.texto.trim() : null;
  }
}
