// En el computador de desarrollo la API corre en el puerto 5080; publicada, vive en Render
export const API = ['localhost', '127.0.0.1'].includes(location.hostname)
  ? `http://${location.hostname}:5080`
  : 'https://parque-ti-api.onrender.com';
