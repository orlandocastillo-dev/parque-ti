using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ParqueTI.Api.Dtos;
using ParqueTI.Api.Modelos;
using ParqueTI.Api.Servicios;

namespace ParqueTI.Api.Controladores;

[Route("api/empleados")]
[Authorize]
public class EmpleadosController(EmpleadosServicio servicio) : BaseController
{
    [HttpGet]
    public Task<List<EmpleadoDto>> Listar(string? buscar, bool inactivos = false) => servicio.ListarAsync(buscar, inactivos);

    [HttpGet("{id:int}")]
    public Task<EmpleadoDetalleDto> Detalle(int id) => servicio.DetalleAsync(id);

    [HttpPost]
    [Authorize(Roles = nameof(Rol.Admin))]
    public async Task<ActionResult<EmpleadoDto>> Crear(EmpleadoGuardarDto dto)
    {
        var p = await servicio.CrearAsync(dto);
        return CreatedAtAction(nameof(Detalle), new { id = p.Id }, p);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = nameof(Rol.Admin))]
    public Task<EmpleadoDto> Actualizar(int id, EmpleadoGuardarDto dto) => servicio.ActualizarAsync(id, dto);

    [HttpPost("{id:int}/desactivar")]
    [Authorize(Roles = nameof(Rol.Admin))]
    public Task<EmpleadoDto> Desactivar(int id) => servicio.CambiarActivoAsync(id, false);

    [HttpPost("{id:int}/activar")]
    [Authorize(Roles = nameof(Rol.Admin))]
    public Task<EmpleadoDto> Activar(int id) => servicio.CambiarActivoAsync(id, true);
}
