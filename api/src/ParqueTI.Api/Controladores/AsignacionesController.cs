using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ParqueTI.Api.Dtos;
using ParqueTI.Api.Modelos;
using ParqueTI.Api.Servicios;

namespace ParqueTI.Api.Controladores;

// Entregar y recibir equipos lo hace el administrador
[Route("api/asignaciones")]
[Authorize(Roles = nameof(Rol.Admin))]
public class AsignacionesController(AsignacionesServicio servicio) : BaseController
{
    [HttpPost]
    public Task<AsignacionDto> Asignar(AsignarDto dto) => servicio.AsignarAsync(dto, UsuarioId);

    [HttpPost("{id:int}/devolver")]
    public Task<AsignacionDto> Devolver(int id, DevolverDto dto) => servicio.DevolverAsync(id, dto.Observaciones);

    [HttpGet("{id:int}")]
    public Task<AsignacionDto> Detalle(int id) => servicio.CargarAsync(id);
}
