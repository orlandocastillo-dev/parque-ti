namespace ParqueTI.Api.Servicios;

// Algo que la regla del negocio no permite (asignar un equipo en reparación, por ejemplo). Responde 409.
public class ReglaNegocioException(string mensaje) : Exception(mensaje);

// Responde 404
public class NoEncontradoException(string mensaje) : Exception(mensaje);
