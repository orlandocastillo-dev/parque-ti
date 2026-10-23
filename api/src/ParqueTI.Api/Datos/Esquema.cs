using Microsoft.EntityFrameworkCore;

namespace ParqueTI.Api.Datos;

public static class Esquema
{
    // Corre esquema.sql (viene dentro del .dll)
    public static async Task AplicarAsync(ParqueContext db)
    {
        await using var s = typeof(Esquema).Assembly.GetManifestResourceStream("ParqueTI.Api.Datos.esquema.sql")
            ?? throw new InvalidOperationException("No se encontró esquema.sql");
        using var lector = new StreamReader(s);
        var sql = await lector.ReadToEndAsync();
        // En Supabase el esquema ya existe y pertenece al usuario de la API, que no puede crear esquemas nuevos
        var existe = await db.Database.SqlQueryRaw<bool>("select exists (select 1 from pg_namespace where nspname = 'parque') as \"Value\"").SingleAsync();
        if (!existe) await db.Database.ExecuteSqlRawAsync("create schema parque");
        await db.Database.ExecuteSqlRawAsync(sql);
    }
}
