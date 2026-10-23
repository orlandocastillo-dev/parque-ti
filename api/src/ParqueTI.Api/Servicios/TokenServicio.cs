using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using ParqueTI.Api.Dtos;
using ParqueTI.Api.Modelos;

namespace ParqueTI.Api.Servicios;

public class OpcionesJwt
{
    public const string Emisor = "parque-ti";
    public const string Audiencia = "parque-ti-web";
    public string Clave { get; set; } = "";
    public int Horas { get; set; } = 10;

    public SymmetricSecurityKey Llave() => new(Encoding.UTF8.GetBytes(Clave));
}

public class TokenServicio(OpcionesJwt opciones, TimeProvider reloj)
{
    public SesionDto Emitir(Usuario u)
    {
        var expira = reloj.GetUtcNow().UtcDateTime.AddHours(opciones.Horas);
        var token = new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Issuer = OpcionesJwt.Emisor,
            Audience = OpcionesJwt.Audiencia,
            Expires = expira,
            Subject = new ClaimsIdentity([
                new Claim("sub", u.Id.ToString()),
                new Claim("nombre", u.Nombre),
                new Claim("rol", u.Rol.ToString()),
            ]),
            SigningCredentials = new SigningCredentials(opciones.Llave(), SecurityAlgorithms.HmacSha256),
        });
        return new SesionDto(token, expira, u.ADto());
    }
}
