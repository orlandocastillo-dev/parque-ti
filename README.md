# Parque TI

Inventario de los equipos de cómputo de una empresa: quién tiene cada portátil, monitor o impresora, el acta de entrega en PDF, el historial de mantenimientos y una etiqueta con código QR para encontrar cualquier equipo escaneándolo con el celular.

**Demo:** https://parque-ti.vercel.app (se puede entrar como administradora o como técnico, sin contraseña)

La API gratuita de Render se apaga cuando nadie la usa, así que la primera visita del día puede tardar cerca de un minuto en responder.

## Qué hace

- **Equipos**: registro con código automático (EQ-0001), serial, fecha de compra y estado: disponible, entregado, en reparación o de baja.
- **Entregas**: se le entrega un equipo a un empleado, se genera el acta de entrega en PDF para firmar y se recibe de vuelta. Un equipo no puede estar entregado a dos personas, aunque dos pantallas lo intenten al mismo tiempo.
- **Mantenimientos**: preventivos y reparaciones. Mientras un equipo está en reparación no se puede entregar; al cerrar la reparación vuelve a quien lo tenía.
- **Escanear QR**: el técnico abre la cámara del celular, apunta a la etiqueta y llega a la ficha del equipo.
- **Etiquetas**: hoja con los QR de los equipos para imprimir y pegar.
- **Resumen**: equipos por estado y por tipo, últimos movimientos y pendientes (reparaciones largas, equipos para renovar y equipos sin mantenimiento preventivo).
- **Roles**: la administradora maneja todo; el técnico consulta equipos y registra mantenimientos.

## Tecnologías

| Parte | Tecnologías |
|---|---|
| API (`api/`) | C#, ASP.NET Core 10, Entity Framework Core, PostgreSQL, JWT |
| Web y app (`web/`) | Angular 22, Ionic 9, TypeScript, jsPDF, jsQR |
| Pruebas | xUnit con pruebas de integración contra PostgreSQL, Vitest |
| Publicación | Render (API en Docker), Vercel (web), Supabase (base de datos), GitHub Actions |

## Cómo está organizada la API

```
api/src/ParqueTI.Api
├── Controladores/   rutas HTTP, autorización por rol
├── Servicios/       reglas del negocio (entregas, reparaciones, bajas, resumen)
├── Modelos/         entidades
├── Dtos/            lo que entra y sale de la API, con validaciones
└── Datos/           DbContext, esquema SQL y datos de demostración
```

Las reglas importantes también están protegidas en la base de datos: índices únicos parciales impiden dos entregas activas del mismo equipo o dos reparaciones abiertas, y la columna `xmin` de PostgreSQL detecta cuando dos personas cambian el mismo equipo al tiempo (la segunda recibe un 409 en vez de pisar el cambio).

## Correr en local

Necesitas .NET 10, Node 24 y un PostgreSQL.

```bash
# API (http://localhost:5080)
cd api/src/ParqueTI.Api
dotnet run --urls http://localhost:5080

# Web (http://localhost:4200)
cd web
npm install
npm start
```

La cadena de conexión de desarrollo está en `appsettings.Development.json`. Al arrancar, la API crea las tablas y, si `Demo:Reiniciar` está activo, carga los datos de demostración.

## Pruebas

```bash
cd api && dotnet test      # necesita PostgreSQL en localhost:5432 (usuario y clave postgres)
cd web && npm test
```

En cada push, GitHub Actions corre las dos con un PostgreSQL de verdad y construye la imagen de Docker de la API.
