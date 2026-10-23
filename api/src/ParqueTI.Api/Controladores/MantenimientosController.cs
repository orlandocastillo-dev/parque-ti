using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ParqueTI.Api.Dtos;
using ParqueTI.Api.Servicios;

namespace ParqueTI.Api.Controladores;

// Técnicos y administradores pueden registrar mantenimientos
[Route("api/mantenimientos")]
[Authorize]
public class MantenimientosController(MantenimientosServicio servicio) : BaseController
{
    [HttpGet]
    public Task<List<MantenimientoDto>> Listar(bool abiertos = false, int limite = 50) => servicio.ListarAsync(abiertos, limite);

    [HttpPost]
    public Task<MantenimientoDto> Registrar(MantenimientoCrearDto dto) => servicio.RegistrarAsync(dto, UsuarioId);

    [HttpPost("{id:int}/cerrar")]
    public Task<MantenimientoDto> Cerrar(int id, CerrarMantenimientoDto dto) => servicio.CerrarAsync(id, dto.Resultado);
}
