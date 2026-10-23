using System.Text;
using Microsoft.EntityFrameworkCore;
using ParqueTI.Api.Modelos;

namespace ParqueTI.Api.Datos;

public class ParqueContext(DbContextOptions<ParqueContext> opciones) : DbContext(opciones)
{
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Empleado> Empleados => Set<Empleado>();
    public DbSet<Equipo> Equipos => Set<Equipo>();
    public DbSet<Asignacion> Asignaciones => Set<Asignacion>();
    public DbSet<Mantenimiento> Mantenimientos => Set<Mantenimiento>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.HasDefaultSchema("parque");

        mb.Entity<Usuario>(e =>
        {
            e.ToTable("usuarios");
            e.Property(u => u.Rol).HasConversion<string>();
            e.Property(u => u.Creado).HasDefaultValueSql("now()");
        });

        mb.Entity<Empleado>(e =>
        {
            e.ToTable("empleados");
            e.Property(x => x.Creado).HasDefaultValueSql("now()");
        });

        mb.Entity<Equipo>(e =>
        {
            e.ToTable("equipos");
            e.Property(x => x.Codigo).HasDefaultValueSql("('EQ-' || lpad(nextval('parque.equipos_codigo_seq')::text, 4, '0'))");
            e.Property(x => x.Tipo).HasConversion<string>();
            e.Property(x => x.Estado).HasConversion<string>();
            e.Property(x => x.Creado).HasDefaultValueSql("now()");
            e.Property(x => x.Version).IsRowVersion();
            e.HasIndex(x => x.Codigo).IsUnique();
            e.HasIndex(x => x.Serial).IsUnique();
        });

        mb.Entity<Asignacion>(e =>
        {
            e.ToTable("asignaciones");
            e.Ignore(a => a.Activa);
            e.HasOne(a => a.Equipo).WithMany(q => q.Asignaciones).HasForeignKey(a => a.EquipoId);
            e.HasOne(a => a.Empleado).WithMany(p => p.Asignaciones).HasForeignKey(a => a.EmpleadoId);
            e.HasOne(a => a.EntregadoPor).WithMany().HasForeignKey(a => a.EntregadoPorId);
        });

        mb.Entity<Mantenimiento>(e =>
        {
            e.ToTable("mantenimientos");
            e.Ignore(m => m.Abierto);
            e.Property(m => m.Tipo).HasConversion<string>();
            e.HasOne(m => m.Equipo).WithMany(q => q.Mantenimientos).HasForeignKey(m => m.EquipoId);
            e.HasOne(m => m.Tecnico).WithMany().HasForeignKey(m => m.TecnicoId);
        });

        // Columnas en snake_case, igual que en esquema.sql (FechaCompra -> fecha_compra)
        foreach (var entidad in mb.Model.GetEntityTypes())
            foreach (var propiedad in entidad.GetProperties())
                if (propiedad.Name != nameof(Equipo.Version))
                    propiedad.SetColumnName(ASnake(propiedad.Name));
    }

    private static string ASnake(string nombre)
    {
        var sb = new StringBuilder();
        for (var i = 0; i < nombre.Length; i++)
        {
            var c = nombre[i];
            if (char.IsUpper(c) && i > 0) sb.Append('_');
            sb.Append(char.ToLowerInvariant(c));
        }
        return sb.ToString();
    }
}
