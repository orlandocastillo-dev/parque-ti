using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using ParqueTI.Api.Servicios;

namespace ParqueTI.Api;

// Convierte los errores de negocio en respuestas claras (ProblemDetails) en vez de un 500
public class ManejadorErrores(IProblemDetailsService problemas, ILogger<ManejadorErrores> log) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext ctx, Exception ex, CancellationToken ct)
    {
        var (estado, titulo) = ex switch
        {
            NoEncontradoException => (StatusCodes.Status404NotFound, ex.Message),
            ReglaNegocioException => (StatusCodes.Status409Conflict, ex.Message),
            DbUpdateConcurrencyException => (StatusCodes.Status409Conflict, "Alguien más cambió este registro al mismo tiempo. Recarga e intenta de nuevo."),
            DbUpdateException { InnerException: PostgresException { SqlState: PostgresErrorCodes.UniqueViolation } } =>
                (StatusCodes.Status409Conflict, "Ese cambio choca con otro que se acaba de hacer. Recarga e intenta de nuevo."),
            _ => (0, ""),
        };
        if (estado == 0)
        {
            log.LogError(ex, "Error no controlado");
            return false;
        }

        ctx.Response.StatusCode = estado;
        return await problemas.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = ctx,
            Exception = ex,
            ProblemDetails = new ProblemDetails { Status = estado, Title = titulo },
        });
    }
}
