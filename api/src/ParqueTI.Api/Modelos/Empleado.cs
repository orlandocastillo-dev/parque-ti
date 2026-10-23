namespace ParqueTI.Api.Modelos;

public class Empleado
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
    public string Cargo { get; set; } = "";
    public string Area { get; set; } = "";
    public string? Correo { get; set; }
    public bool Activo { get; set; } = true;
    public DateTime Creado { get; set; }

    public List<Asignacion> Asignaciones { get; set; } = [];
}
