import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonSelect, IonSelectOption, IonTextarea, IonTitle, IonToolbar, ModalController,
} from '@ionic/angular';
import { ApiService, mensajeDeError } from '../nucleo/api.service';
import { hoyISO } from '../nucleo/formato';
import { EquipoDetalle, EquipoGuardar, TIPOS, TipoEquipo } from '../nucleo/modelos';

// Crear o editar un equipo. Devuelve el equipo guardado al cerrar.
@Component({
  selector: 'app-equipo-form',
  imports: [ReactiveFormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, IonInput, IonSelect, IonSelectOption, IonTextarea],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ actual ? 'Editar ' + actual.equipo.codigo : 'Nuevo equipo' }}</ion-title>
        <ion-buttons slot="end"><ion-button (click)="cerrar()" aria-label="Cerrar"><ion-icon slot="icon-only" name="close" /></ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <form [formGroup]="f" (ngSubmit)="guardar()" class="formulario">
        <ion-select label="Tipo" labelPlacement="stacked" fill="outline" formControlName="tipo" interface="popover">
          @for (t of tipos; track t.valor) { <ion-select-option [value]="t.valor">{{ t.nombre }}</ion-select-option> }
        </ion-select>
        <div class="formulario__fila">
          <ion-input label="Marca" labelPlacement="stacked" fill="outline" formControlName="marca" placeholder="Lenovo" [maxlength]="60" />
          <ion-input label="Modelo" labelPlacement="stacked" fill="outline" formControlName="modelo" placeholder="ThinkPad E14" [maxlength]="80" />
        </div>
        <ion-input label="Serial" labelPlacement="stacked" fill="outline" formControlName="serial" placeholder="Viene en la etiqueta de fábrica" [maxlength]="60" class="mono" />
        <ion-input label="Fecha de compra" labelPlacement="stacked" fill="outline" type="date" formControlName="fechaCompra" [max]="hoy" />
        <ion-textarea label="Notas" labelPlacement="stacked" fill="outline" formControlName="notas" placeholder="Memoria, disco, accesorios…" [autoGrow]="true" [maxlength]="500" />
        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
        <ion-button type="submit" expand="block" [disabled]="f.invalid || guardando()">{{ guardando() ? 'Guardando…' : 'Guardar' }}</ion-button>
      </form>
    </ion-content>
  `,
})
export class EquipoForm implements OnInit {
  // Lo pasa quien abre el modal (ModalController.create({ componentProps }))
  actual?: EquipoDetalle;

  private ventana = inject(ModalController);
  private api = inject(ApiService);
  tipos = TIPOS;
  hoy = hoyISO();
  guardando = signal(false);
  error = signal('');

  f = inject(FormBuilder).nonNullable.group({
    tipo: ['Portatil' as TipoEquipo, Validators.required],
    marca: ['', [Validators.required, Validators.maxLength(60)]],
    modelo: ['', [Validators.required, Validators.maxLength(80)]],
    serial: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(60)]],
    fechaCompra: [''],
    notas: [''],
  });

  ngOnInit() {
    const e = this.actual;
    if (e) this.f.setValue({ tipo: e.equipo.tipo, marca: e.equipo.marca, modelo: e.equipo.modelo, serial: e.equipo.serial, fechaCompra: e.equipo.fechaCompra ?? '', notas: e.notas ?? '' });
  }

  async guardar() {
    const v = this.f.getRawValue();
    const datos: EquipoGuardar = { ...v, fechaCompra: v.fechaCompra || null, notas: v.notas.trim() || null };
    this.guardando.set(true);
    this.error.set('');
    try {
      const r = this.actual ? await this.api.editarEquipo(this.actual.equipo.id, datos) : await this.api.crearEquipo(datos);
      await this.ventana.dismiss(r, 'guardado');
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
