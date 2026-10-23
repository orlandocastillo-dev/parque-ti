import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { PreloadAllModules, RouteReuseStrategy, provideRouter, withComponentInputBinding, withPreloading } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  add, arrowBack, arrowForward, buildOutline, cameraOutline, checkmarkCircleOutline, close, constructOutline, createOutline, desktopOutline, documentTextOutline, flashOutline, gridOutline, hardwareChipOutline, laptopOutline, peopleOutline, personOutline, phonePortraitOutline, pricetagsOutline, printOutline, qrCodeOutline, refreshOutline, searchOutline, shieldCheckmarkOutline, swapHorizontal, tabletPortraitOutline, timeOutline, trashOutline, tvOutline, warningOutline,
} from 'ionicons/icons';
import { routes } from './app.routes';
import { tokenInterceptor } from './nucleo/api.service';

addIcons({
  'grid-outline': gridOutline, 'qr-code-outline': qrCodeOutline, 'laptop-outline': laptopOutline,
  'people-outline': peopleOutline, 'construct-outline': constructOutline, 'pricetags-outline': pricetagsOutline,
  'desktop-outline': desktopOutline, 'tv-outline': tvOutline, 'print-outline': printOutline,
  'phone-portrait-outline': phonePortraitOutline, 'tablet-portrait-outline': tabletPortraitOutline,
  'hardware-chip-outline': hardwareChipOutline, 'add': add, 'search-outline': searchOutline,
  'warning-outline': warningOutline, 'time-outline': timeOutline, 'refresh-outline': refreshOutline,
  'arrow-forward': arrowForward, 'arrow-back': arrowBack, 'close': close, 'camera-outline': cameraOutline,
  'document-text-outline': documentTextOutline, 'person-outline': personOutline, 'swap-horizontal': swapHorizontal,
  'checkmark-circle-outline': checkmarkCircleOutline, 'trash-outline': trashOutline, 'create-outline': createOutline,
  'shield-checkmark-outline': shieldCheckmarkOutline, 'flash-outline': flashOutline, 'build-outline': buildOutline,
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular({ mode: 'md' }),
    provideRouter(routes, withComponentInputBinding(), withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptors([tokenInterceptor])),
  ],
};
