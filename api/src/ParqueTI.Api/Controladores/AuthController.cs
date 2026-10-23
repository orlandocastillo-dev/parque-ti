using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using ParqueTI.Api.Datos;
using ParqueTI.Api.Dtos;
using ParqueTI.Api.Modelos;
using ParqueTI.Api.Servicios;

namespace ParqueTI.Api.Controladores;

[Route("api/auth")]
public class AuthController(ParqueContext db, TokenServicio tokens, IPasswordHasher<Usuario> hasher, IConfiguration config) : BaseController
{
    [HttpPost("entrar")]
    [AllowAnonymous]
    [EnableRateLimiting("entrar")]
    public async Task<ActionResult<SesionDto>> Entrar(LoginDto dto)
    {
        var correo = dto.Correo.Trim().ToLowerInvariant();
        var u = await db.Usuarios.FirstOrDefaultAsync(x => x.Correo == correo);
        if (u is null || hasher.VerifyHashedPassword(u, u.ClaveHash, dto.Clave) == PasswordVerificationResult.Failed)
            return Problem(statusCode: 401, title: "Correo o contraseña incorrectos.");
        return tokens.Emitir(u);
    }

    // Entrada sin contraseña a las cuentas de demostración (solo si está activado en la configuración)
    [HttpPost("demo")]
    [AllowAnonymous]
    [EnableRateLimiting("entrar")]
    public async Task<ActionResult<SesionDto>> Demo(DemoDto dto)
    {
        if (!config.GetValue<bool>("Demo:Habilitado")) return NotFound();
        var correo = dto.Rol == Rol.Admin ? SemillaDemo.CorreoAdmin : SemillaDemo.CorreoTecnico;
        var u = await db.Usuarios.FirstOrDefaultAsync(x => x.Correo == correo);
        if (u is null) return NotFound();
        return tokens.Emitir(u);
    }

    [HttpGet("yo")]
    [Authorize]
    public async Task<ActionResult<UsuarioDto>> Yo()
    {
        var u = await db.Usuarios.FindAsync(UsuarioId);
        return u is null ? Unauthorized() : u.ADto();
    }
}
