using System.ComponentModel.DataAnnotations;
using ParqueTI.Api.Modelos;

namespace ParqueTI.Api.Dtos;

// ---- Sesión ----
public record LoginDto([Required, EmailAddress] string Correo, [Required] string Clave);
public record DemoDto([Required] Rol Rol);
public record UsuarioDto(int Id, string Nombre, string Correo, Rol Rol);
public record SesionDto(string Token, DateTime Expira, UsuarioDto Usuario);

// ---- Empleados ----
public record EmpleadoGuardarDto(
    [Required, StringLength(120, MinimumLength = 3)] string Nombre,
    [Required, StringLength(80)] string Cargo,
    [Required, StringLength(80)] string Area,
    [EmailAddress, StringLength(120)] string? Correo);

public record EmpleadoDto(int Id, string Nombre, string Cargo, string Area, string? Correo, bool Activo, int EquiposActuales);

public record EmpleadoDetalleDto(EmpleadoDto Empleado, List<EquipoResumenDto> EquiposActuales, List<AsignacionDto> Historial);

// ---- Equipos ----
public record EquipoGuardarDto(
    [Required] TipoEquipo Tipo,
    [Required, StringLength(60)] string Marca,
    [Required, StringLength(80)] string Modelo,
    [Required, StringLength(60, MinimumLength = 3)] string Serial,
    DateOnly? FechaCompra,
    [StringLength(500)] string? Notas);

public record BajaDto([Required, StringLength(300, MinimumLength = 5)] string Motivo);

public record PersonaCortaDto(int Id, string Nombre, string Area);

public record EquipoResumenDto(
    int Id, string Codigo, TipoEquipo Tipo, string Marca, string Modelo, string Serial,
    DateOnly? FechaCompra, EstadoEquipo Estado, PersonaCortaDto? AsignadoA);

public record EquipoDetalleDto(
    EquipoResumenDto Equipo, string? Notas, int? AniosDeUso,
    AsignacionDto? AsignacionActual, MantenimientoDto? ReparacionAbierta,
    List<AsignacionDto> Asignaciones, List<MantenimientoDto> Mantenimientos);

// ---- Asignaciones ----
public record AsignarDto([Required] int EquipoId, [Required] int EmpleadoId, [StringLength(500)] string? Observaciones);
public record DevolverDto([StringLength(500)] string? Observaciones);

public record AsignacionDto(
    int Id, string CodigoEquipo, string Equipo, PersonaCortaDto Empleado,
    DateTime FechaEntrega, DateTime? FechaDevolucion, string? Observaciones, string EntregadoPor);

// ---- Mantenimientos ----
public record MantenimientoCrearDto(
    [Required] int EquipoId,
    [Required] TipoMantenimiento Tipo,
    [Required, StringLength(500, MinimumLength = 5)] string Descripcion,
    [StringLength(500)] string? Resultado);

public record CerrarMantenimientoDto([Required, StringLength(500, MinimumLength = 3)] string Resultado);

public record MantenimientoDto(
    int Id, string CodigoEquipo, string Equipo, TipoMantenimiento Tipo, string Descripcion,
    DateTime FechaInicio, DateTime? FechaFin, string? Resultado, string Tecnico);

// ---- Resumen ----
public record ConteoDto(string Clave, int Total);
public record AlertaDto(string Tipo, string Mensaje, string CodigoEquipo);
public record ActividadDto(DateTime Fecha, string Tipo, string Texto, string CodigoEquipo);

public record ResumenDto(
    int TotalEquipos, List<ConteoDto> PorEstado, List<ConteoDto> PorTipo,
    int EmpleadosActivos, int ReparacionesAbiertas,
    List<AlertaDto> Alertas, List<ActividadDto> Actividad);
