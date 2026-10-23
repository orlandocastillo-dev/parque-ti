namespace ParqueTI.Api.Modelos;

public class Usuario
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
    public string Correo { get; set; } = "";
    public string ClaveHash { get; set; } = "";
    public Rol Rol { get; set; }
    public DateTime Creado { get; set; }
}
