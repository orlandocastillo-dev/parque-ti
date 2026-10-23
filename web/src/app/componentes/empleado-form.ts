import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonTitle, IonToolbar, ModalController } from '@ionic/angular';
import { ApiService, mensajeDeError } from '../nucleo/api.service';
import { Empleado } from '../nucleo/modelos';

@Component({
  selector: 'app-empleado-form',
  imports: [ReactiveFormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, IonInput],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ actual ? 'Editar empleado' : 'Nuevo empleado' }}</ion-title>
        <ion-buttons slot="end"><ion-button (click)="cerrar()" aria-label="Cerrar"><ion-icon slot="icon-only" name="close" /></ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <form [formGroup]="f" (ngSubmit)="guardar()" class="formulario">
        <ion-input label="Nombre completo" labelPlacement="stacked" fill="outline" formControlName="nombre" [maxlength]="120" />
        <div class="formulario__fila">
          <ion-input label="Cargo" labelPlacement="stacked" fill="outline" formControlName="cargo" [maxlength]="80" />
          <ion-input label="Área" labelPlacement="stacked" fill="outline" formControlName="area" [maxlength]="80" />
        </div>
        <ion-input label="Correo (opcional)" labelPlacement="stacked" fill="outline" type="email" formControlName="correo" [maxlength]="120" />
        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
        <ion-button type="submit" expand="block" [disabled]="f.invalid || guardando()">{{ guardando() ? 'Guardando…' : 'Guardar' }}</ion-button>
      </form>
    </ion-content>
  `,
})
export class EmpleadoForm implements OnInit {
  actual?: Empleado;

  private ventana = inject(ModalController);
  private api = inject(ApiService);
  guardando = signal(false);
  error = signal('');

  f = inject(FormBuilder).nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    cargo: ['', [Validators.required, Validators.maxLength(80)]],
    area: ['', [Validators.required, Validators.maxLength(80)]],
    correo: ['', [Validators.email, Validators.maxLength(120)]],
  });

  ngOnInit() {
    const p = this.actual;
    if (p) this.f.setValue({ nombre: p.nombre, cargo: p.cargo, area: p.area, correo: p.correo ?? '' });
  }

  async guardar() {
    const v = this.f.getRawValue();
    const datos = { nombre: v.nombre.trim(), cargo: v.cargo.trim(), area: v.area.trim(), correo: v.correo.trim() || null };
    this.guardando.set(true);
    this.error.set('');
    try {
      const r = this.actual ? await this.api.editarEmpleado(this.actual.id, datos) : await this.api.crearEmpleado(datos);
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
