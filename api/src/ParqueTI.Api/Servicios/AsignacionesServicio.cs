using Microsoft.EntityFrameworkCore;
using ParqueTI.Api.Datos;
using ParqueTI.Api.Dtos;
using ParqueTI.Api.Modelos;

namespace ParqueTI.Api.Servicios;

public class AsignacionesServicio(ParqueContext db, TimeProvider reloj)
{
    public async Task<AsignacionDto> AsignarAsync(AsignarDto dto, int usuarioId)
    {
        var equipo = await db.Equipos.FindAsync(dto.EquipoId) ?? throw new NoEncontradoException("El equipo no existe.");
        var empleado = await db.Empleados.FindAsync(dto.EmpleadoId) ?? throw new NoEncontradoException("El empleado no existe.");

        if (!empleado.Activo) throw new ReglaNegocioException($"{empleado.Nombre} está inactivo; no se le pueden entregar equipos.");
        if (equipo.Estado != EstadoEquipo.Disponible)
            throw new ReglaNegocioException(equipo.Estado switch
            {
                EstadoEquipo.Asignado => $"El equipo {equipo.Codigo} ya está entregado a otra persona.",
                EstadoEquipo.EnReparacion => $"El equipo {equipo.Codigo} está en reparación.",
                _ => $"El equipo {equipo.Codigo} está dado de baja.",
            });

        var a = new Asignacion
        {
            Equipo = equipo, Empleado = empleado, EntregadoPorId = usuarioId,
            FechaEntrega = reloj.GetUtcNow().UtcDateTime, Observaciones = dto.Observaciones.Limpio(),
        };
        equipo.Estado = EstadoEquipo.Asignado;
        db.Asignaciones.Add(a);
        await db.SaveChangesAsync();
        return await CargarAsync(a.Id);
    }

    public async Task<AsignacionDto> DevolverAsync(int id, string? observaciones)
    {
        var a = await db.Asignaciones.Include(x => x.Equipo).FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new NoEncontradoException("La entrega no existe.");
        if (!a.Activa) throw new ReglaNegocioException("Este equipo ya había sido devuelto.");

        a.FechaDevolucion = reloj.GetUtcNow().UtcDateTime;
        var obs = observaciones.Limpio();
        if (obs is not null) a.Observaciones = string.IsNullOrEmpty(a.Observaciones) ? $"Devolución: {obs}" : $"{a.Observaciones}\nDevolución: {obs}";
        // Si estaba en reparación sigue así; si no, queda libre
        if (a.Equipo.Estado == EstadoEquipo.Asignado) a.Equipo.Estado = EstadoEquipo.Disponible;
        await db.SaveChangesAsync();
        return await CargarAsync(id);
    }

    public async Task<AsignacionDto> CargarAsync(int id) =>
        (await db.Asignaciones.AsNoTracking()
            .Include(a => a.Equipo).Include(a => a.Empleado).Include(a => a.EntregadoPor)
            .FirstAsync(a => a.Id == id)).ADto();
}
