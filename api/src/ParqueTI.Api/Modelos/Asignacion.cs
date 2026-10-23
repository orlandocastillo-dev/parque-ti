namespace ParqueTI.Api.Modelos;

public class Asignacion
{
    public int Id { get; set; }
    public int EquipoId { get; set; }
    public Equipo Equipo { get; set; } = null!;
    public int EmpleadoId { get; set; }
    public Empleado Empleado { get; set; } = null!;
    public DateTime FechaEntrega { get; set; }
    public DateTime? FechaDevolucion { get; set; }
    public string? Observaciones { get; set; }
    public int EntregadoPorId { get; set; }
    public Usuario EntregadoPor { get; set; } = null!;

    public bool Activa => FechaDevolucion is null;
}
