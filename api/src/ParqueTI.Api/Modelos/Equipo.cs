namespace ParqueTI.Api.Modelos;

public class Equipo
{
    public int Id { get; set; }

    // Lo genera la base (EQ-0001, EQ-0002...)
    public string Codigo { get; set; } = null!;
    public TipoEquipo Tipo { get; set; }
    public string Marca { get; set; } = "";
    public string Modelo { get; set; } = "";
    public string Serial { get; set; } = "";
    public DateOnly? FechaCompra { get; set; }
    public EstadoEquipo Estado { get; set; } = EstadoEquipo.Disponible;
    public string? Notas { get; set; }
    public DateTime Creado { get; set; }

    // xmin de Postgres: si dos personas cambian el mismo equipo a la vez, la segunda recibe un conflicto
    public uint Version { get; set; }

    public List<Asignacion> Asignaciones { get; set; } = [];
    public List<Mantenimiento> Mantenimientos { get; set; } = [];
}
