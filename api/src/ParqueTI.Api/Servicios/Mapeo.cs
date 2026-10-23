using ParqueTI.Api.Dtos;
using ParqueTI.Api.Modelos;

namespace ParqueTI.Api.Servicios;

public static class Mapeo
{
    public static string Nombre(this Equipo e) => $"{e.Marca} {e.Modelo}";

    public static PersonaCortaDto Corta(this Empleado p) => new(p.Id, p.Nombre, p.Area);

    // Requiere Asignaciones (con Empleado) cargadas
    public static EquipoResumenDto Resumen(this Equipo e) => new(
        e.Id, e.Codigo, e.Tipo, e.Marca, e.Modelo, e.Serial, e.FechaCompra, e.Estado,
        e.Asignaciones.FirstOrDefault(a => a.FechaDevolucion == null)?.Empleado.Corta());

    public static AsignacionDto ADto(this Asignacion a) => new(
        a.Id, a.Equipo.Codigo, a.Equipo.Nombre(), a.Empleado.Corta(),
        a.FechaEntrega, a.FechaDevolucion, a.Observaciones, a.EntregadoPor.Nombre);

    public static MantenimientoDto ADto(this Mantenimiento m) => new(
        m.Id, m.Equipo.Codigo, m.Equipo.Nombre(), m.Tipo, m.Descripcion,
        m.FechaInicio, m.FechaFin, m.Resultado, m.Tecnico.Nombre);

    public static UsuarioDto ADto(this Usuario u) => new(u.Id, u.Nombre, u.Correo, u.Rol);

    public static string? Limpio(this string? texto) => string.IsNullOrWhiteSpace(texto) ? null : texto.Trim();
}
