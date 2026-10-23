using System.Net;
using ParqueTI.Api.Dtos;
using ParqueTI.Api.Modelos;

namespace ParqueTI.Tests;

[Collection("api")]
public class SesionTests(Fabrica f) : IClassFixture<Fabrica>
{
    [Fact]
    public async Task Sin_token_responde_401()
    {
        var r = await f.CreateClient().GetAsync("/api/equipos");
        Assert.Equal(HttpStatusCode.Unauthorized, r.StatusCode);
    }

    [Fact]
    public async Task Demo_entrega_token_con_el_rol_pedido()
    {
        var c = await f.ComoAsync("Tecnico");
        var yo = await (await c.GetAsync("/api/auth/yo")).LeerAsync<UsuarioDto>();
        Assert.Equal(Rol.Tecnico, yo.Rol);
    }

    [Fact]
    public async Task Contrasena_incorrecta_responde_401()
    {
        var r = await f.CreateClient().PostJson("/api/auth/entrar", new { correo = "admin@parque-ti.demo", clave = "no-es-esta" });
        Assert.Equal(HttpStatusCode.Unauthorized, r.StatusCode);
    }

    [Fact]
    public async Task Tecnico_no_puede_crear_equipos_ni_entregarlos()
    {
        var c = await f.ComoAsync("Tecnico");
        var crear = await c.PostJson("/api/equipos", new { tipo = "Monitor", marca = "LG", modelo = "X", serial = "SERIAL-TEC-1" });
        Assert.Equal(HttpStatusCode.Forbidden, crear.StatusCode);
        var asignar = await c.PostJson("/api/asignaciones", new { equipoId = 1, empleadoId = 1 });
        Assert.Equal(HttpStatusCode.Forbidden, asignar.StatusCode);
    }

    [Fact]
    public async Task Datos_invalidos_responden_400()
    {
        var c = await f.ComoAsync("Admin");
        var r = await c.PostJson("/api/equipos", new { tipo = "Monitor", marca = "", modelo = "X", serial = "1" });
        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
    }
}

[Collection("api")]
public class EquiposTests(Fabrica f) : IClassFixture<Fabrica>
{
    private static object NuevoEquipo(string serial) => new { tipo = "Portatil", marca = "Lenovo", modelo = "ThinkPad T14", serial, fechaCompra = "2025-03-10" };

    [Fact]
    public async Task Crear_genera_el_codigo_y_queda_disponible()
    {
        var c = await f.ComoAsync("Admin");
        var e = await (await c.PostJson("/api/equipos", NuevoEquipo("abc-crear-1"))).LeerAsync<EquipoDetalleDto>();
        Assert.Matches(@"^EQ-\d{4}$", e.Equipo.Codigo);
        Assert.Equal("ABC-CREAR-1", e.Equipo.Serial);
        Assert.Equal(EstadoEquipo.Disponible, e.Equipo.Estado);

        // Se puede buscar por el código que lleva el QR
        var porCodigo = await (await c.GetAsync($"/api/equipos/{e.Equipo.Codigo.ToLower()}")).LeerAsync<EquipoDetalleDto>();
        Assert.Equal(e.Equipo.Id, porCodigo.Equipo.Id);
    }

    [Fact]
    public async Task Serial_repetido_responde_409()
    {
        var c = await f.ComoAsync("Admin");
        await (await c.PostJson("/api/equipos", NuevoEquipo("REPETIDO-1"))).LeerAsync<EquipoDetalleDto>();
        var r = await c.PostJson("/api/equipos", NuevoEquipo("repetido-1"));
        Assert.Equal(HttpStatusCode.Conflict, r.StatusCode);
        Assert.Contains("REPETIDO-1", await r.TituloAsync());
    }

    [Fact]
    public async Task Fecha_de_compra_futura_responde_409()
    {
        var c = await f.ComoAsync("Admin");
        var r = await c.PostJson("/api/equipos", new { tipo = "Monitor", marca = "LG", modelo = "X", serial = "FUTURO-1", fechaCompra = DateTime.UtcNow.AddDays(10).ToString("yyyy-MM-dd") });
        Assert.Equal(HttpStatusCode.Conflict, r.StatusCode);
    }

    [Fact]
    public async Task Filtros_y_busqueda()
    {
        var c = await f.ComoAsync("Tecnico");
        var reparacion = await (await c.GetAsync("/api/equipos?estado=EnReparacion")).LeerAsync<List<EquipoResumenDto>>();
        Assert.NotEmpty(reparacion);
        Assert.All(reparacion, e => Assert.Equal(EstadoEquipo.EnReparacion, e.Estado));

        // Buscar por el nombre de quien lo tiene
        var deEsteban = await (await c.GetAsync("/api/equipos?buscar=esteban")).LeerAsync<List<EquipoResumenDto>>();
        Assert.Equal(2, deEsteban.Count);
        Assert.All(deEsteban, e => Assert.Equal("Esteban Rojas", e.AsignadoA?.Nombre));
    }

    [Fact]
    public async Task No_se_da_de_baja_un_equipo_entregado()
    {
        var c = await f.ComoAsync("Admin");
        var asignado = (await (await c.GetAsync("/api/equipos?estado=Asignado")).LeerAsync<List<EquipoResumenDto>>()).First();
        var r = await c.PostJson($"/api/equipos/{asignado.Id}/baja", new { motivo = "Prueba de baja" });
        Assert.Equal(HttpStatusCode.Conflict, r.StatusCode);
    }

    [Fact]
    public async Task Dar_de_baja_un_disponible_y_ya_no_se_puede_editar()
    {
        var c = await f.ComoAsync("Admin");
        var e = await (await c.PostJson("/api/equipos", NuevoEquipo("BAJA-1"))).LeerAsync<EquipoDetalleDto>();
        var baja = await (await c.PostJson($"/api/equipos/{e.Equipo.Id}/baja", new { motivo = "Se mojó" })).LeerAsync<EquipoDetalleDto>();
        Assert.Equal(EstadoEquipo.DeBaja, baja.Equipo.Estado);
        Assert.Contains("Se mojó", baja.Notas);

        var editar = await c.PutJson($"/api/equipos/{e.Equipo.Id}", NuevoEquipo("BAJA-1"));
        Assert.Equal(HttpStatusCode.Conflict, editar.StatusCode);
    }
}

[Collection("api")]
public class EntregasTests(Fabrica f) : IClassFixture<Fabrica>
{
    private async Task<(HttpClient c, int equipo, int empleado)> PrepararAsync(string serial)
    {
        var c = await f.ComoAsync("Admin");
        var e = await (await c.PostJson("/api/equipos", new { tipo = "Monitor", marca = "Samsung", modelo = "S24", serial })).LeerAsync<EquipoDetalleDto>();
        var p = await (await c.PostJson("/api/empleados", new { nombre = $"Persona {serial}", cargo = "Analista", area = "Pruebas" })).LeerAsync<EmpleadoDto>();
        return (c, e.Equipo.Id, p.Id);
    }

    [Fact]
    public async Task Entregar_y_recibir()
    {
        var (c, equipo, empleado) = await PrepararAsync("ENT-1");
        var a = await (await c.PostJson("/api/asignaciones", new { equipoId = equipo, empleadoId = empleado, observaciones = "Con cable HDMI" })).LeerAsync<AsignacionDto>();
        Assert.Null(a.FechaDevolucion);

        var detalle = await (await c.GetAsync($"/api/equipos/{equipo}")).LeerAsync<EquipoDetalleDto>();
        Assert.Equal(EstadoEquipo.Asignado, detalle.Equipo.Estado);
        Assert.Equal(empleado, detalle.Equipo.AsignadoA?.Id);
        Assert.Equal(a.Id, detalle.AsignacionActual?.Id);

        // No se puede entregar dos veces
        var otra = await c.PostJson("/api/asignaciones", new { equipoId = equipo, empleadoId = empleado });
        Assert.Equal(HttpStatusCode.Conflict, otra.StatusCode);

        var dev = await (await c.PostJson($"/api/asignaciones/{a.Id}/devolver", new { observaciones = "Llegó bien" })).LeerAsync<AsignacionDto>();
        Assert.NotNull(dev.FechaDevolucion);
        Assert.Contains("Llegó bien", dev.Observaciones);
        detalle = await (await c.GetAsync($"/api/equipos/{equipo}")).LeerAsync<EquipoDetalleDto>();
        Assert.Equal(EstadoEquipo.Disponible, detalle.Equipo.Estado);
        Assert.Single(detalle.Asignaciones);

        var otraVez = await c.PostJson($"/api/asignaciones/{a.Id}/devolver", new { });
        Assert.Equal(HttpStatusCode.Conflict, otraVez.StatusCode);
    }

    [Fact]
    public async Task Dos_entregas_al_mismo_tiempo_solo_pasa_una()
    {
        var (c, equipo, empleado) = await PrepararAsync("ENT-CARRERA");
        var p2 = await (await c.PostJson("/api/empleados", new { nombre = "Segunda persona", cargo = "Analista", area = "Pruebas" })).LeerAsync<EmpleadoDto>();

        var respuestas = await Task.WhenAll(
            c.PostJson("/api/asignaciones", new { equipoId = equipo, empleadoId = empleado }),
            c.PostJson("/api/asignaciones", new { equipoId = equipo, empleadoId = p2.Id }));

        Assert.Single(respuestas, r => r.StatusCode == HttpStatusCode.OK);
        Assert.Single(respuestas, r => r.StatusCode == HttpStatusCode.Conflict);
        var detalle = await (await c.GetAsync($"/api/equipos/{equipo}")).LeerAsync<EquipoDetalleDto>();
        Assert.Single(detalle.Asignaciones);
    }

    [Fact]
    public async Task Empleado_con_equipos_no_se_puede_desactivar_y_uno_inactivo_no_recibe()
    {
        var (c, equipo, empleado) = await PrepararAsync("ENT-INACTIVO");
        var a = await (await c.PostJson("/api/asignaciones", new { equipoId = equipo, empleadoId = empleado })).LeerAsync<AsignacionDto>();

        var desactivar = await c.PostAsync($"/api/empleados/{empleado}/desactivar", null);
        Assert.Equal(HttpStatusCode.Conflict, desactivar.StatusCode);

        await (await c.PostJson($"/api/asignaciones/{a.Id}/devolver", new { })).LeerAsync<AsignacionDto>();
        var p = await (await c.PostAsync($"/api/empleados/{empleado}/desactivar", null)).LeerAsync<EmpleadoDto>();
        Assert.False(p.Activo);

        var entregar = await c.PostJson("/api/asignaciones", new { equipoId = equipo, empleadoId = empleado });
        Assert.Equal(HttpStatusCode.Conflict, entregar.StatusCode);
    }

    [Fact]
    public async Task Detalle_del_empleado_muestra_sus_equipos()
    {
        var (c, equipo, empleado) = await PrepararAsync("ENT-DETALLE");
        await (await c.PostJson("/api/asignaciones", new { equipoId = equipo, empleadoId = empleado })).LeerAsync<AsignacionDto>();
        var d = await (await c.GetAsync($"/api/empleados/{empleado}")).LeerAsync<EmpleadoDetalleDto>();
        Assert.Equal(1, d.Empleado.EquiposActuales);
        Assert.Equal(equipo, Assert.Single(d.EquiposActuales).Id);
    }
}

[Collection("api")]
public class MantenimientosTests(Fabrica f) : IClassFixture<Fabrica>
{
    [Fact]
    public async Task Reparacion_bloquea_la_entrega_y_al_cerrar_vuelve_a_disponible()
    {
        var admin = await f.ComoAsync("Admin");
        var tecnico = await f.ComoAsync("Tecnico");
        var e = await (await admin.PostJson("/api/equipos", new { tipo = "Impresora", marca = "Epson", modelo = "L3250", serial = "MANT-1" })).LeerAsync<EquipoDetalleDto>();
        var p = await (await admin.PostJson("/api/empleados", new { nombre = "Persona mantenimiento", cargo = "Analista", area = "Pruebas" })).LeerAsync<EmpleadoDto>();

        var m = await (await tecnico.PostJson("/api/mantenimientos", new { equipoId = e.Equipo.Id, tipo = "Correctivo", descripcion = "No enciende" })).LeerAsync<MantenimientoDto>();
        Assert.Null(m.FechaFin);
        Assert.Equal("Andrés Pertuz", m.Tecnico);

        var entregar = await admin.PostJson("/api/asignaciones", new { equipoId = e.Equipo.Id, empleadoId = p.Id });
        Assert.Equal(HttpStatusCode.Conflict, entregar.StatusCode);
        var otra = await tecnico.PostJson("/api/mantenimientos", new { equipoId = e.Equipo.Id, tipo = "Correctivo", descripcion = "Otra falla" });
        Assert.Equal(HttpStatusCode.Conflict, otra.StatusCode);

        var cerrado = await (await tecnico.PostJson($"/api/mantenimientos/{m.Id}/cerrar", new { resultado = "Se cambió la fuente" })).LeerAsync<MantenimientoDto>();
        Assert.NotNull(cerrado.FechaFin);
        var d = await (await tecnico.GetAsync($"/api/equipos/{e.Equipo.Id}")).LeerAsync<EquipoDetalleDto>();
        Assert.Equal(EstadoEquipo.Disponible, d.Equipo.Estado);
        Assert.Null(d.ReparacionAbierta);
    }

    [Fact]
    public async Task Reparacion_de_un_equipo_entregado_vuelve_a_su_dueno()
    {
        var admin = await f.ComoAsync("Admin");
        var e = await (await admin.PostJson("/api/equipos", new { tipo = "Portatil", marca = "HP", modelo = "240 G9", serial = "MANT-2" })).LeerAsync<EquipoDetalleDto>();
        var p = await (await admin.PostJson("/api/empleados", new { nombre = "Dueña del portátil", cargo = "Analista", area = "Pruebas" })).LeerAsync<EmpleadoDto>();
        await (await admin.PostJson("/api/asignaciones", new { equipoId = e.Equipo.Id, empleadoId = p.Id })).LeerAsync<AsignacionDto>();

        var m = await (await admin.PostJson("/api/mantenimientos", new { equipoId = e.Equipo.Id, tipo = "Correctivo", descripcion = "Pantalla parpadea" })).LeerAsync<MantenimientoDto>();
        var d = await (await admin.GetAsync($"/api/equipos/{e.Equipo.Id}")).LeerAsync<EquipoDetalleDto>();
        Assert.Equal(EstadoEquipo.EnReparacion, d.Equipo.Estado);
        Assert.Equal(p.Id, d.Equipo.AsignadoA?.Id);

        await (await admin.PostJson($"/api/mantenimientos/{m.Id}/cerrar", new { resultado = "Se ajustó el cable flex" })).LeerAsync<MantenimientoDto>();
        d = await (await admin.GetAsync($"/api/equipos/{e.Equipo.Id}")).LeerAsync<EquipoDetalleDto>();
        Assert.Equal(EstadoEquipo.Asignado, d.Equipo.Estado);
    }

    [Fact]
    public async Task Preventivo_queda_cerrado_de_una_vez()
    {
        var tecnico = await f.ComoAsync("Tecnico");
        var equipo = (await (await tecnico.GetAsync("/api/equipos?estado=Disponible")).LeerAsync<List<EquipoResumenDto>>()).First();
        var m = await (await tecnico.PostJson("/api/mantenimientos", new { equipoId = equipo.Id, tipo = "Preventivo", descripcion = "Limpieza general" })).LeerAsync<MantenimientoDto>();
        Assert.NotNull(m.FechaFin);
        Assert.Equal("Sin novedad", m.Resultado);
        var d = await (await tecnico.GetAsync($"/api/equipos/{equipo.Id}")).LeerAsync<EquipoDetalleDto>();
        Assert.Equal(EstadoEquipo.Disponible, d.Equipo.Estado);
    }
}

[Collection("api")]
public class ResumenTests(Fabrica f) : IClassFixture<Fabrica>
{
    [Fact]
    public async Task Resumen_de_los_datos_de_demostracion()
    {
        var c = await f.ComoAsync("Admin");
        var r = await (await c.GetAsync("/api/resumen")).LeerAsync<ResumenDto>();

        Assert.Equal(r.TotalEquipos, r.PorEstado.Sum(x => x.Total));
        Assert.Equal(2, r.ReparacionesAbiertas);
        Assert.Equal(1, r.PorEstado.Single(x => x.Clave == "DeBaja").Total);
        Assert.Equal(14, r.EmpleadosActivos);

        // La reparación de 12 días sale como alerta; la de 2 días no
        Assert.Single(r.Alertas, a => a.Tipo == "reparacion");
        // El IdeaPad de hace 5 años se sugiere renovar
        Assert.Contains(r.Alertas, a => a.Tipo == "renovar" && a.Mensaje.Contains("IdeaPad"));
        // El dado de baja no genera alertas
        var baja = (await (await c.GetAsync("/api/equipos?estado=DeBaja")).LeerAsync<List<EquipoResumenDto>>()).Single();
        Assert.DoesNotContain(r.Alertas, a => a.CodigoEquipo == baja.Codigo);
        Assert.NotEmpty(r.Actividad);
    }
}
