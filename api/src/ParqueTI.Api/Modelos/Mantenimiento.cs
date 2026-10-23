namespace ParqueTI.Api.Modelos;

public class Mantenimiento
{
    public int Id { get; set; }
    public int EquipoId { get; set; }
    public Equipo Equipo { get; set; } = null!;
    public TipoMantenimiento Tipo { get; set; }
    public string Descripcion { get; set; } = "";
    public DateTime FechaInicio { get; set; }
    public DateTime? FechaFin { get; set; }
    public string? Resultado { get; set; }
    public int TecnicoId { get; set; }
    public Usuario Tecnico { get; set; } = null!;

    public bool Abierto => FechaFin is null;
}
