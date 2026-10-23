using Microsoft.EntityFrameworkCore;
using ParqueTI.Api.Datos;
using ParqueTI.Api.Dtos;
using ParqueTI.Api.Modelos;

namespace ParqueTI.Api.Servicios;

public class EquiposServicio(ParqueContext db, TimeProvider reloj)
{
    private IQueryable<Equipo> ConAsignacionActual() =>
        db.Equipos.Include(e => e.Asignaciones.Where(a => a.FechaDevolucion == null)).ThenInclude(a => a.Empleado);

    public async Task<List<EquipoResumenDto>> ListarAsync(string? buscar, EstadoEquipo? estado, TipoEquipo? tipo)
    {
        var q = ConAsignacionActual().AsNoTracking();
        if (estado is not null) q = q.Where(e => e.Estado == estado);
        if (tipo is not null) q = q.Where(e => e.Tipo == tipo);
        if (!string.IsNullOrWhiteSpace(buscar))
        {
            var t = $"%{buscar.Trim()}%";
            q = q.Where(e =>
                EF.Functions.ILike(e.Codigo, t) || EF.Functions.ILike(e.Serial, t) ||
                EF.Functions.ILike(e.Marca, t) || EF.Functions.ILike(e.Modelo, t) ||
                e.Asignaciones.Any(a => a.FechaDevolucion == null && EF.Functions.ILike(a.Empleado.Nombre, t)));
        }
        var lista = await q.OrderBy(e => e.Codigo).ToListAsync();
        return lista.Select(e => e.Resumen()).ToList();
    }

    // Acepta el código (EQ-0007, lo que trae el QR) o el id
    public async Task<EquipoDetalleDto> DetalleAsync(string codigoOId)
    {
        var codigo = codigoOId.Trim().ToUpperInvariant();
        var esId = int.TryParse(codigo, out var id);
        var q = db.Equipos.AsNoTracking()
            .Include(x => x.Asignaciones).ThenInclude(a => a.Empleado)
            .Include(x => x.Asignaciones).ThenInclude(a => a.EntregadoPor)
            .Include(x => x.Mantenimientos).ThenInclude(m => m.Tecnico)
            .AsSplitQuery();
        var e = (esId ? await q.FirstOrDefaultAsync(x => x.Id == id) : await q.FirstOrDefaultAsync(x => x.Codigo == codigo))
            ?? throw new NoEncontradoException($"No existe el equipo {codigoOId}.");

        // Para los DTO de historial, cada fila necesita su equipo
        foreach (var a in e.Asignaciones) a.Equipo = e;
        foreach (var m in e.Mantenimientos) m.Equipo = e;

        int? anios = e.FechaCompra is { } f ? AniosEntre(f, Hoy()) : null;
        return new EquipoDetalleDto(
            e.Resumen(), e.Notas, anios,
            e.Asignaciones.FirstOrDefault(a => a.Activa)?.ADto(),
            e.Mantenimientos.FirstOrDefault(m => m.Abierto)?.ADto(),
            e.Asignaciones.OrderByDescending(a => a.FechaEntrega).Select(a => a.ADto()).ToList(),
            e.Mantenimientos.OrderByDescending(m => m.FechaInicio).Select(m => m.ADto()).ToList());
    }

    public async Task<EquipoDetalleDto> CrearAsync(EquipoGuardarDto dto)
    {
        ValidarFecha(dto.FechaCompra);
        var serial = dto.Serial.Trim().ToUpperInvariant();
        if (await db.Equipos.AnyAsync(e => e.Serial == serial))
            throw new ReglaNegocioException($"Ya hay un equipo registrado con el serial {serial}.");

        var e = new Equipo
        {
            Tipo = dto.Tipo, Marca = dto.Marca.Trim(), Modelo = dto.Modelo.Trim(), Serial = serial,
            FechaCompra = dto.FechaCompra, Notas = dto.Notas.Limpio(), Estado = EstadoEquipo.Disponible,
        };
        db.Equipos.Add(e);
        await db.SaveChangesAsync();
        return await DetalleAsync(e.Id.ToString());
    }

    public async Task<EquipoDetalleDto> ActualizarAsync(int id, EquipoGuardarDto dto)
    {
        ValidarFecha(dto.FechaCompra);
        var e = await db.Equipos.FindAsync(id) ?? throw new NoEncontradoException("El equipo no existe.");
        if (e.Estado == EstadoEquipo.DeBaja) throw new ReglaNegocioException("Un equipo dado de baja ya no se puede editar.");

        var serial = dto.Serial.Trim().ToUpperInvariant();
        if (serial != e.Serial && await db.Equipos.AnyAsync(x => x.Serial == serial && x.Id != id))
            throw new ReglaNegocioException($"Ya hay un equipo registrado con el serial {serial}.");

        e.Tipo = dto.Tipo; e.Marca = dto.Marca.Trim(); e.Modelo = dto.Modelo.Trim(); e.Serial = serial;
        e.FechaCompra = dto.FechaCompra; e.Notas = dto.Notas.Limpio();
        await db.SaveChangesAsync();
        return await DetalleAsync(id.ToString());
    }

    public async Task<EquipoDetalleDto> DarDeBajaAsync(int id, string motivo)
    {
        var e = await db.Equipos.FindAsync(id) ?? throw new NoEncontradoException("El equipo no existe.");
        switch (e.Estado)
        {
            case EstadoEquipo.DeBaja: throw new ReglaNegocioException("El equipo ya estaba dado de baja.");
            case EstadoEquipo.Asignado: throw new ReglaNegocioException("Primero recibe el equipo de la persona que lo tiene.");
            case EstadoEquipo.EnReparacion: throw new ReglaNegocioException("Primero cierra la reparación abierta.");
        }
        e.Estado = EstadoEquipo.DeBaja;
        var fecha = Hoy().ToString("yyyy-MM-dd");
        e.Notas = string.Join("\n", new[] { e.Notas, $"Dado de baja el {fecha}: {motivo.Trim()}" }.Where(x => !string.IsNullOrEmpty(x)));
        await db.SaveChangesAsync();
        return await DetalleAsync(id.ToString());
    }

    private DateOnly Hoy() => DateOnly.FromDateTime(reloj.GetUtcNow().UtcDateTime);

    private void ValidarFecha(DateOnly? f)
    {
        if (f is { } fecha && fecha > Hoy()) throw new ReglaNegocioException("La fecha de compra no puede ser futura.");
    }

    public static int AniosEntre(DateOnly desde, DateOnly hasta)
    {
        var anios = hasta.Year - desde.Year;
        if (hasta < desde.AddYears(anios)) anios--;
        return Math.Max(0, anios);
    }
}
