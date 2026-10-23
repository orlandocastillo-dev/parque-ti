using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ParqueTI.Api.Modelos;

namespace ParqueTI.Api.Datos;

// Datos de una empresa inventada para la demostración. Se borran y se vuelven a crear al arrancar
// la API (si Demo:Reiniciar está activo), así cada visita encuentra todo en orden.
public static class SemillaDemo
{
    public const string CorreoAdmin = "admin@parque-ti.demo";
    public const string CorreoTecnico = "tecnico@parque-ti.demo";

    public static async Task ReiniciarAsync(ParqueContext db, IPasswordHasher<Usuario> hasher, TimeProvider reloj)
    {
        await db.Database.ExecuteSqlRawAsync(
            "truncate parque.mantenimientos, parque.asignaciones, parque.equipos, parque.empleados, parque.usuarios restart identity cascade; " +
            "alter sequence parque.equipos_codigo_seq restart with 1;");

        var ahora = reloj.GetUtcNow().UtcDateTime;
        var hoy = DateOnly.FromDateTime(ahora);
        DateTime Hace(int dias, int hora = 9) => ahora.Date.AddDays(-dias).AddHours(hora + 5); // 9 a. m. en Colombia
        DateOnly Compra(int meses) => hoy.AddMonths(-meses);

        // Las cuentas demo entran sin contraseña por /api/auth/demo; la clave es aleatoria y nadie la conoce
        var admin = new Usuario { Nombre = "Laura Gómez", Correo = CorreoAdmin, Rol = Rol.Admin };
        var tecnico = new Usuario { Nombre = "Andrés Pertuz", Correo = CorreoTecnico, Rol = Rol.Tecnico };
        foreach (var u in new[] { admin, tecnico }) u.ClaveHash = hasher.HashPassword(u, Guid.NewGuid().ToString("N"));
        db.Usuarios.AddRange(admin, tecnico);

        var p = new Dictionary<string, Empleado>();
        foreach (var (n, c, a) in new[]
        {
            ("Valentina Ríos", "Contadora", "Contabilidad"),
            ("Carlos Mendoza", "Auxiliar contable", "Contabilidad"),
            ("Mariana Ospina", "Directora comercial", "Comercial"),
            ("Jorge Barrios", "Asesor comercial", "Comercial"),
            ("Daniela Castro", "Asesora comercial", "Comercial"),
            ("Sebastián Molina", "Analista de compras", "Compras"),
            ("Natalia Herrera", "Jefe de talento humano", "Talento humano"),
            ("Felipe Navarro", "Coordinador de bodega", "Logística"),
            ("Camila Pineda", "Auxiliar de bodega", "Logística"),
            ("Ricardo Fontalvo", "Gerente general", "Gerencia"),
            ("Paola Villamizar", "Asistente de gerencia", "Gerencia"),
            ("Esteban Rojas", "Diseñador gráfico", "Mercadeo"),
            ("Luisa Arrieta", "Community manager", "Mercadeo"),
            ("Mauricio Díaz", "Recepcionista", "Administración"),
        })
        {
            var correo = string.Join('.', n.ToLowerInvariant().Split(' ')).Normalize(System.Text.NormalizationForm.FormD);
            correo = new string(correo.Where(ch => ch < 128).ToArray()) + "@empresa-demo.co";
            p[n.Split(' ')[0]] = new Empleado { Nombre = n, Cargo = c, Area = a, Correo = correo };
        }
        var inactivo = new Empleado { Nombre = "Óscar Julio", Cargo = "Asesor comercial", Area = "Comercial", Correo = "oscar.julio@empresa-demo.co", Activo = false };
        db.Empleados.AddRange(p.Values);
        db.Empleados.Add(inactivo);
        await db.SaveChangesAsync();

        var equipos = new List<Equipo>();
        Equipo Eq(TipoEquipo t, string marca, string modelo, string serial, int meses, string? notas = null)
        {
            var e = new Equipo { Tipo = t, Marca = marca, Modelo = modelo, Serial = serial, FechaCompra = Compra(meses), Notas = notas };
            equipos.Add(e);
            return e;
        }

        var l1 = Eq(TipoEquipo.Portatil, "Lenovo", "ThinkPad E14 Gen 5", "PF4KX21A", 14, "16 GB RAM, SSD 512 GB");
        var l2 = Eq(TipoEquipo.Portatil, "Lenovo", "ThinkPad E14 Gen 5", "PF4KX21C", 14, "16 GB RAM, SSD 512 GB");
        var l3 = Eq(TipoEquipo.Portatil, "HP", "ProBook 440 G9", "5CD2341HJ7", 30);
        var l4 = Eq(TipoEquipo.Portatil, "HP", "ProBook 440 G9", "5CD2341HK2", 30);
        var l5 = Eq(TipoEquipo.Portatil, "Dell", "Latitude 5440", "7HQ2LZ3", 8);
        var l6 = Eq(TipoEquipo.Portatil, "Dell", "Latitude 5440", "7HQ2LZ9", 8);
        var l7 = Eq(TipoEquipo.Portatil, "Apple", "MacBook Air M2", "C02HM1XQMD6T", 20, "Para diseño");
        var l8 = Eq(TipoEquipo.Portatil, "Lenovo", "IdeaPad 3", "PW09BR7Q", 62, "Batería dura menos de una hora");
        var l9 = Eq(TipoEquipo.Portatil, "Asus", "VivoBook 15", "N2NRCV05A311", 52);
        var d1 = Eq(TipoEquipo.Escritorio, "Dell", "OptiPlex 3000", "3DPKQ63", 26, "Equipo de recepción");
        var d2 = Eq(TipoEquipo.Escritorio, "HP", "ProDesk 400 G7", "MXL0352B8K", 58);
        var d3 = Eq(TipoEquipo.Escritorio, "Lenovo", "ThinkCentre M70s", "MJ0FG1RT", 18);
        var m1 = Eq(TipoEquipo.Monitor, "LG", "24MK430H", "107NTAB3J488", 26);
        var m2 = Eq(TipoEquipo.Monitor, "Samsung", "S24C310", "H4ZW800321", 12);
        var m3 = Eq(TipoEquipo.Monitor, "Samsung", "S24C310", "H4ZW800347", 12);
        var m4 = Eq(TipoEquipo.Monitor, "Dell", "P2422H", "CN0D9H2W", 20);
        var m5 = Eq(TipoEquipo.Monitor, "LG", "27UL500", "203NTPC8L114", 20, "4K, para diseño");
        var i1 = Eq(TipoEquipo.Impresora, "Epson", "EcoTank L3250", "X8HM045612", 34, "Impresora de contabilidad");
        var i2 = Eq(TipoEquipo.Impresora, "HP", "LaserJet M111w", "VNC3R70412", 22, "Impresora compartida, segundo piso");
        var c1 = Eq(TipoEquipo.Celular, "Samsung", "Galaxy A35", "R58X20ABCDE", 10);
        var c2 = Eq(TipoEquipo.Celular, "Samsung", "Galaxy A35", "R58X20ABCDK", 10);
        var c3 = Eq(TipoEquipo.Celular, "Xiaomi", "Redmi Note 13", "86512307XQ", 6);
        var t1 = Eq(TipoEquipo.Tablet, "Samsung", "Galaxy Tab A9+", "R9TW50BFGH", 9, "Inventario de bodega");
        var o1 = Eq(TipoEquipo.Otro, "Logitech", "Rally Bar Mini", "2117LZ0F3A", 16, "Sala de juntas");
        var vieja = Eq(TipoEquipo.Portatil, "Acer", "Aspire 5", "NXHE3AL00414", 74, "Pantalla rota");
        db.Equipos.AddRange(equipos);
        await db.SaveChangesAsync();

        void Entregar(Equipo e, Empleado quien, int haceDias, int? devueltoHace = null, string? obs = null)
        {
            db.Asignaciones.Add(new Asignacion
            {
                EquipoId = e.Id, EmpleadoId = quien.Id, EntregadoPorId = admin.Id, FechaEntrega = Hace(haceDias),
                FechaDevolucion = devueltoHace is { } d ? Hace(d, 16) : null, Observaciones = obs,
            });
            if (devueltoHace is null) e.Estado = EstadoEquipo.Asignado;
        }

        Entregar(l1, p["Valentina"], 410, obs: "Con cargador y maletín");
        Entregar(i1, p["Valentina"], 400);
        Entregar(l2, p["Carlos"], 405);
        Entregar(l3, p["Mariana"], 880, devueltoHace: 260, obs: "Se cambió por un equipo más nuevo");
        Entregar(l5, p["Mariana"], 255);
        Entregar(c1, p["Mariana"], 290);
        Entregar(m4, p["Mariana"], 255);
        Entregar(l3, p["Jorge"], 240);
        Entregar(c2, p["Jorge"], 290);
        Entregar(l4, p["Daniela"], 870);
        Entregar(l6, p["Sebastián"], 250);
        Entregar(d3, p["Natalia"], 520);
        Entregar(m2, p["Natalia"], 360);
        Entregar(l9, p["Felipe"], 1500);
        Entregar(t1, p["Camila"], 270);
        Entregar(l7, p["Ricardo"], 600, devueltoHace: 560);
        Entregar(m3, p["Ricardo"], 300);
        Entregar(l8, p["Paola"], 1800);
        Entregar(l7, p["Esteban"], 550);
        Entregar(m5, p["Esteban"], 600);
        Entregar(c3, p["Luisa"], 180);
        Entregar(d1, p["Mauricio"], 780);
        Entregar(m1, p["Mauricio"], 780);
        Entregar(d2, inactivo, 1600, devueltoHace: 120, obs: "Se retiró de la empresa");

        void Mant(Equipo e, TipoMantenimiento t, string desc, int haceDias, int? duroDias, string? resultado, Usuario? quien = null)
        {
            db.Mantenimientos.Add(new Mantenimiento
            {
                EquipoId = e.Id, TecnicoId = (quien ?? tecnico).Id, Tipo = t, Descripcion = desc,
                FechaInicio = Hace(haceDias, 10), FechaFin = duroDias is { } dd ? Hace(haceDias - dd, 15) : null, Resultado = resultado,
            });
        }

        Mant(l1, TipoMantenimiento.Preventivo, "Limpieza interna y actualización de Windows", 95, 0, "Sin novedad");
        Mant(l2, TipoMantenimiento.Preventivo, "Limpieza interna y actualización de Windows", 95, 0, "Sin novedad");
        Mant(l3, TipoMantenimiento.Correctivo, "No carga la batería", 300, 3, "Se cambió el cargador");
        Mant(l3, TipoMantenimiento.Preventivo, "Limpieza y cambio de pasta térmica", 120, 0, "Sin novedad");
        Mant(l5, TipoMantenimiento.Preventivo, "Revisión general", 60, 0, "Sin novedad");
        Mant(l6, TipoMantenimiento.Preventivo, "Revisión general", 60, 0, "Sin novedad");
        Mant(d3, TipoMantenimiento.Preventivo, "Limpieza y actualización de drivers", 150, 0, "Sin novedad");
        Mant(l7, TipoMantenimiento.Preventivo, "Actualización de macOS y respaldo", 40, 0, "Sin novedad");
        Mant(d1, TipoMantenimiento.Correctivo, "El equipo se apaga solo", 420, 5, "Se cambió la fuente de poder");
        Mant(i1, TipoMantenimiento.Correctivo, "Imprime con rayas", 210, 2, "Limpieza de cabezales");
        Mant(vieja, TipoMantenimiento.Correctivo, "Pantalla rota por caída", 340, 20, "No vale la pena repararlo: se recomienda dar de baja");
        // Reparaciones abiertas: una larga (sale en alertas) y una reciente
        Mant(l4, TipoMantenimiento.Correctivo, "Teclado con varias teclas que no responden", 12, null, null);
        Mant(i2, TipoMantenimiento.Correctivo, "Atasca el papel en cada impresión", 2, null, null);
        l4.Estado = EstadoEquipo.EnReparacion;
        i2.Estado = EstadoEquipo.EnReparacion;
        vieja.Estado = EstadoEquipo.DeBaja;
        vieja.Notas = $"Pantalla rota\nDado de baja el {hoy.AddDays(-318):yyyy-MM-dd}: no vale la pena repararlo";

        await db.SaveChangesAsync();
    }
}
