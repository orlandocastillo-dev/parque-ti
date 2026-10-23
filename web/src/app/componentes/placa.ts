import { Component, input } from '@angular/core';

// La etiqueta metálica que lleva cada equipo pegada: el código en grande
@Component({
  selector: 'app-placa',
  template: `<span class="placa" [class.placa--grande]="grande()"><i>PARQUE TI</i>{{ codigo() }}</span>`,
})
export class Placa {
  codigo = input.required<string>();
  grande = input(false);
}
