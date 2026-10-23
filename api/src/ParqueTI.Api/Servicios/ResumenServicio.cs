using Microsoft.EntityFrameworkCore;
using ParqueTI.Api.Datos;
using ParqueTI.Api.Dtos;
using ParqueTI.Api.Modelos;

namespace ParqueTI.Api.Servicios;

public class ResumenServicio(ParqueContext db, TimeProvider reloj)
{
    // Un equipo con más de esto de uso se sugiere renovar
    public const int AniosParaRenovar = 4;
    // Y si pasa más de esto sin mantenimiento preventivo, se avisa
    public const int DiasSinPreventivo = 180;
    public const int DiasReparacionLarga = 7;

    public async Task<ResumenDto> CalcularAsync()
    {
        var ahora = reloj.GetUtcNow().UtcDateTime;
        var hoy = DateOnly.FromDateTime(ahora);

        var equipos = await db.Equipos.AsNoTracking()
            .Select(e => new
            {
                e.Codigo, e.Tipo, e.Estado, e.FechaCompra, e.Marca, e.Modelo,
                UltimoPreventivo = e.Mantenimientos.Where(m => m.Tipo == TipoMantenimiento.Preventivo).Max(m => (DateTime?)m.FechaInicio),
            })
            .ToListAsync();

        var abiertas = await db.Mantenimientos.AsNoTracking().Include(m => m.Equipo)
            .Where(m => m.FechaFin == null).ToListAsync();

        var alertas = new List<AlertaDto>();
        foreach (var m in abiertas.Where(m => (ahora - m.FechaInicio).TotalDays > DiasReparacionLarga).OrderBy(m => m.FechaInicio))
            alertas.Add(new("reparacion", $"{m.Equipo.Codigo} lleva {(int)(ahora - m.FechaInicio).TotalDays} días en reparación", m.Equipo.Codigo));

        var activos = equipos.Where(e => e.Estado != EstadoEquipo.DeBaja).ToList();
        foreach (var e in activos.Where(e => e.FechaCompra is { } f && EquiposServicio.AniosEntre(f, hoy) >= AniosParaRenovar).OrderBy(e => e.FechaCompra))
            alertas.Add(new("renovar", $"{e.Codigo} ({e.Marca} {e.Modelo}) tiene {EquiposServicio.AniosEntre(e.FechaCompra!.Value, hoy)} años: conviene renovarlo", e.Codigo));

        foreach (var e in activos.Where(e => e.Tipo is TipoEquipo.Portatil or TipoEquipo.Escritorio &&
                                             (e.UltimoPreventivo is null || (ahora - e.UltimoPreventivo.Value).TotalDays > DiasSinPreventivo)).OrderBy(e => e.Codigo))
            alertas.Add(new("preventivo", e.UltimoPreventivo is null
                ? $"{e.Codigo} nunca ha tenido mantenimiento preventivo"
                : $"{e.Codigo} lleva más de 6 meses sin mantenimiento preventivo", e.Codigo));

        var entregas = await db.Asignaciones.AsNoTracking().Include(a => a.Equipo).Include(a => a.Empleado)
            .OrderByDescending(a => a.FechaDevolucion ?? a.FechaEntrega).Take(10).ToListAsync();
        var mants = await db.Mantenimientos.AsNoTracking().Include(m => m.Equipo)
            .OrderByDescending(m => m.FechaFin ?? m.FechaInicio).Take(10).ToListAsync();

        var actividad = entregas.Select(a => a.FechaDevolucion is { } d
                ? new ActividadDto(d, "devolucion", $"{a.Empleado.Nombre} devolvió {a.Equipo.Codigo}", a.Equipo.Codigo)
                : new ActividadDto(a.FechaEntrega, "entrega", $"{a.Equipo.Codigo} entregado a {a.Empleado.Nombre}", a.Equipo.Codigo))
            .Concat(mants.Select(m => m.FechaFin is { } f
                ? new ActividadDto(f, "mantenimiento", $"{m.Tipo} terminado en {m.Equipo.Codigo}", m.Equipo.Codigo)
                : new ActividadDto(m.FechaInicio, "reparacion", $"{m.Equipo.Codigo} entró a reparación", m.Equipo.Codigo)))
            .OrderByDescending(x => x.Fecha).Take(8).ToList();

        return new ResumenDto(
            equipos.Count,
            Enum.GetValues<EstadoEquipo>().Select(s => new ConteoDto(s.ToString(), equipos.Count(e => e.Estado == s))).ToList(),
            Enum.GetValues<TipoEquipo>().Select(t => new ConteoDto(t.ToString(), activos.Count(e => e.Tipo == t))).Where(c => c.Total > 0).ToList(),
            await db.Empleados.CountAsync(p => p.Activo),
            abiertas.Count,
            alertas,
            actividad);
    }
}
