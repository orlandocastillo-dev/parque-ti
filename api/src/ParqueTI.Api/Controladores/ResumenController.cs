using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ParqueTI.Api.Dtos;
using ParqueTI.Api.Servicios;

namespace ParqueTI.Api.Controladores;

[Route("api/resumen")]
[Authorize]
public class ResumenController(ResumenServicio servicio) : BaseController
{
    [HttpGet]
    public Task<ResumenDto> Obtener() => servicio.CalcularAsync();
}
