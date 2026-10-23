using Microsoft.EntityFrameworkCore;
using ParqueTI.Api.Datos;
using ParqueTI.Api.Dtos;
using ParqueTI.Api.Modelos;

namespace ParqueTI.Api.Servicios;

public class MantenimientosServicio(ParqueContext db, TimeProvider reloj)
{
    public async Task<List<MantenimientoDto>> ListarAsync(bool soloAbiertos, int limite)
    {
        var q = db.Mantenimientos.AsNoTracking().Include(m => m.Equipo).Include(m => m.Tecnico).AsQueryable();
        if (soloAbiertos) q = q.Where(m => m.FechaFin == null);
        var lista = await q.OrderByDescending(m => m.FechaInicio).Take(Math.Clamp(limite, 1, 200)).ToListAsync();
        return lista.Select(m => m.ADto()).ToList();
    }

    // Preventivo: se registra ya hecho. Correctivo: queda abierto y el equipo pasa a reparación.
    public async Task<MantenimientoDto> RegistrarAsync(MantenimientoCrearDto dto, int tecnicoId)
    {
        var equipo = await db.Equipos.FindAsync(dto.EquipoId) ?? throw new NoEncontradoException("El equipo no existe.");
        if (equipo.Estado == EstadoEquipo.DeBaja) throw new ReglaNegocioException("El equipo está dado de baja.");

        var ahora = reloj.GetUtcNow().UtcDateTime;
        var m = new Mantenimiento
        {
            Equipo = equipo, TecnicoId = tecnicoId, Tipo = dto.Tipo,
            Descripcion = dto.Descripcion.Trim(), FechaInicio = ahora,
        };

        if (dto.Tipo == TipoMantenimiento.Preventivo)
        {
            if (equipo.Estado == EstadoEquipo.EnReparacion)
                throw new ReglaNegocioException("El equipo tiene una reparación abierta; ciérrala primero.");
            m.FechaFin = ahora;
            m.Resultado = dto.Resultado.Limpio() ?? "Sin novedad";
        }
        else
        {
            if (equipo.Estado == EstadoEquipo.EnReparacion)
                throw new ReglaNegocioException($"El equipo {equipo.Codigo} ya tiene una reparación abierta.");
            equipo.Estado = EstadoEquipo.EnReparacion;
        }

        db.Mantenimientos.Add(m);
        await db.SaveChangesAsync();
        return await CargarAsync(m.Id);
    }

    public async Task<MantenimientoDto> CerrarAsync(int id, string resultado)
    {
        var m = await db.Mantenimientos.Include(x => x.Equipo).FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new NoEncontradoException("El mantenimiento no existe.");
        if (!m.Abierto) throw new ReglaNegocioException("Este mantenimiento ya estaba cerrado.");

        m.FechaFin = reloj.GetUtcNow().UtcDateTime;
        m.Resultado = resultado.Trim();
        // Vuelve a quien lo tenía; si no lo tenía nadie, queda disponible
        var entregado = await db.Asignaciones.AnyAsync(a => a.EquipoId == m.EquipoId && a.FechaDevolucion == null);
        m.Equipo.Estado = entregado ? EstadoEquipo.Asignado : EstadoEquipo.Disponible;
        await db.SaveChangesAsync();
        return await CargarAsync(id);
    }

    private async Task<MantenimientoDto> CargarAsync(int id) =>
        (await db.Mantenimientos.AsNoTracking().Include(m => m.Equipo).Include(m => m.Tecnico).FirstAsync(m => m.Id == id)).ADto();
}
