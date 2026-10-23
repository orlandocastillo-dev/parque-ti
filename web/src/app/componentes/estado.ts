import { Component, computed, input } from '@angular/core';
import { EstadoEquipo, nombreEstado } from '../nucleo/modelos';

@Component({
  selector: 'app-estado',
  template: `<span class="estado" [attr.data-estado]="estado()">{{ nombre() }}</span>`,
})
export class Estado {
  estado = input.required<EstadoEquipo>();
  nombre = computed(() => nombreEstado(this.estado()));
}
