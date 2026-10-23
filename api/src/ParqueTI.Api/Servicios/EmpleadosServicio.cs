using Microsoft.EntityFrameworkCore;
using ParqueTI.Api.Datos;
using ParqueTI.Api.Dtos;
using ParqueTI.Api.Modelos;

namespace ParqueTI.Api.Servicios;

public class EmpleadosServicio(ParqueContext db)
{
    public async Task<List<EmpleadoDto>> ListarAsync(string? buscar, bool incluirInactivos)
    {
        var q = db.Empleados.AsNoTracking();
        if (!incluirInactivos) q = q.Where(p => p.Activo);
        if (!string.IsNullOrWhiteSpace(buscar))
        {
            var t = $"%{buscar.Trim()}%";
            q = q.Where(p => EF.Functions.ILike(p.Nombre, t) || EF.Functions.ILike(p.Area, t) || EF.Functions.ILike(p.Cargo, t));
        }
        return await q.OrderBy(p => p.Nombre)
            .Select(p => new EmpleadoDto(p.Id, p.Nombre, p.Cargo, p.Area, p.Correo, p.Activo,
                p.Asignaciones.Count(a => a.FechaDevolucion == null)))
            .ToListAsync();
    }

    public async Task<EmpleadoDetalleDto> DetalleAsync(int id)
    {
        var p = await db.Empleados.AsNoTracking()
            .Include(x => x.Asignaciones).ThenInclude(a => a.Equipo)
            .Include(x => x.Asignaciones).ThenInclude(a => a.EntregadoPor)
            .AsSplitQuery()
            .FirstOrDefaultAsync(x => x.Id == id) ?? throw new NoEncontradoException("El empleado no existe.");
        foreach (var a in p.Asignaciones) a.Empleado = p;

        var actuales = p.Asignaciones.Where(a => a.Activa).ToList();
        // El resumen del equipo muestra a quién está asignado: aquí siempre es esta persona
        foreach (var a in actuales) a.Equipo.Asignaciones = [a];
        return new EmpleadoDetalleDto(
            ADto(p, actuales.Count),
            actuales.Select(a => a.Equipo.Resumen()).ToList(),
            p.Asignaciones.OrderByDescending(a => a.FechaEntrega).Select(a => a.ADto()).ToList());
    }

    public async Task<EmpleadoDto> CrearAsync(EmpleadoGuardarDto dto)
    {
        var p = new Empleado { Nombre = dto.Nombre.Trim(), Cargo = dto.Cargo.Trim(), Area = dto.Area.Trim(), Correo = dto.Correo.Limpio()?.ToLowerInvariant() };
        db.Empleados.Add(p);
        await db.SaveChangesAsync();
        return ADto(p, 0);
    }

    public async Task<EmpleadoDto> ActualizarAsync(int id, EmpleadoGuardarDto dto)
    {
        var p = await db.Empleados.FindAsync(id) ?? throw new NoEncontradoException("El empleado no existe.");
        p.Nombre = dto.Nombre.Trim(); p.Cargo = dto.Cargo.Trim(); p.Area = dto.Area.Trim(); p.Correo = dto.Correo.Limpio()?.ToLowerInvariant();
        await db.SaveChangesAsync();
        return ADto(p, await ContarActualesAsync(id));
    }

    public async Task<EmpleadoDto> CambiarActivoAsync(int id, bool activo)
    {
        var p = await db.Empleados.FindAsync(id) ?? throw new NoEncontradoException("El empleado no existe.");
        var actuales = await ContarActualesAsync(id);
        if (!activo && actuales > 0)
            throw new ReglaNegocioException($"{p.Nombre} todavía tiene {actuales} equipo(s) entregados. Recíbelos antes de desactivarlo.");
        p.Activo = activo;
        await db.SaveChangesAsync();
        return ADto(p, actuales);
    }

    private Task<int> ContarActualesAsync(int id) => db.Asignaciones.CountAsync(a => a.EmpleadoId == id && a.FechaDevolucion == null);

    private static EmpleadoDto ADto(Empleado p, int actuales) => new(p.Id, p.Nombre, p.Cargo, p.Area, p.Correo, p.Activo, actuales);
}
