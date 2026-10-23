using Microsoft.AspNetCore.Mvc;

namespace ParqueTI.Api.Controladores;

[ApiController]
[Produces("application/json")]
public abstract class BaseController : ControllerBase
{
    // Id del usuario que hizo la petición (viene en el token)
    protected int UsuarioId => int.Parse(User.FindFirst("sub")!.Value);
}
