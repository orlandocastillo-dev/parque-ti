using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ParqueTI.Api.Dtos;
using ParqueTI.Api.Modelos;
using ParqueTI.Api.Servicios;

namespace ParqueTI.Api.Controladores;

[Route("api/equipos")]
[Authorize]
public class EquiposController(EquiposServicio servicio) : BaseController
{
    [HttpGet]
    public Task<List<EquipoResumenDto>> Listar(string? buscar, EstadoEquipo? estado, TipoEquipo? tipo) =>
        servicio.ListarAsync(buscar, estado, tipo);

    [HttpGet("{codigo}")]
    public Task<EquipoDetalleDto> Detalle(string codigo) => servicio.DetalleAsync(codigo);

    [HttpPost]
    [Authorize(Roles = nameof(Rol.Admin))]
    public async Task<ActionResult<EquipoDetalleDto>> Crear(EquipoGuardarDto dto)
    {
        var creado = await servicio.CrearAsync(dto);
        return CreatedAtAction(nameof(Detalle), new { codigo = creado.Equipo.Codigo }, creado);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = nameof(Rol.Admin))]
    public Task<EquipoDetalleDto> Actualizar(int id, EquipoGuardarDto dto) => servicio.ActualizarAsync(id, dto);

    [HttpPost("{id:int}/baja")]
    [Authorize(Roles = nameof(Rol.Admin))]
    public Task<EquipoDetalleDto> DarDeBaja(int id, BajaDto dto) => servicio.DarDeBajaAsync(id, dto.Motivo);
}
