using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ParqueTI.Api;
using ParqueTI.Api.Datos;
using ParqueTI.Api.Modelos;
using ParqueTI.Api.Servicios;

var builder = WebApplication.CreateBuilder(args);

// Render indica el puerto en la variable PORT
if (Environment.GetEnvironmentVariable("PORT") is { Length: > 0 } puerto)
    builder.WebHost.UseUrls($"http://0.0.0.0:{puerto}");

var conexion = builder.Configuration.GetConnectionString("Parque")
    ?? throw new InvalidOperationException("Falta la cadena de conexión ConnectionStrings:Parque");
builder.Services.AddDbContext<ParqueContext>(o => o.UseNpgsql(conexion));

var jwt = builder.Configuration.GetSection("Jwt").Get<OpcionesJwt>() ?? new OpcionesJwt();
if (jwt.Clave.Length < 32) throw new InvalidOperationException("Jwt:Clave debe tener al menos 32 caracteres");
builder.Services.AddSingleton(jwt);

builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<IPasswordHasher<Usuario>, PasswordHasher<Usuario>>();
builder.Services.AddScoped<TokenServicio>();
builder.Services.AddScoped<EquiposServicio>();
builder.Services.AddScoped<EmpleadosServicio>();
builder.Services.AddScoped<AsignacionesServicio>();
builder.Services.AddScoped<MantenimientosServicio>();
builder.Services.AddScoped<ResumenServicio>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
{
    o.MapInboundClaims = false;
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidIssuer = OpcionesJwt.Emisor,
        ValidAudience = OpcionesJwt.Audiencia,
        IssuerSigningKey = jwt.Llave(),
        NameClaimType = "nombre",
        RoleClaimType = "rol",
        ClockSkew = TimeSpan.FromMinutes(1),
    };
});
builder.Services.AddAuthorization();

builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ManejadorErrores>();

var origenes = (builder.Configuration["Cors:Origenes"] ?? "")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .SetIsOriginAllowed(origen => origenes.Contains(origen) || (Uri.TryCreate(origen, UriKind.Absolute, out var u) && u.Host == "localhost"))
    .AllowAnyHeader().AllowAnyMethod()));

// Máximo 10 intentos de entrar por minuto desde la misma IP
var limiteEntrar = builder.Configuration.GetValue("Entrar:LimitePorMinuto", 10);
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy("entrar", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "?",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = limiteEntrar, Window = TimeSpan.FromMinutes(1) }));
});

builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    o.KnownNetworks.Clear();
    o.KnownProxies.Clear();
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ParqueContext>();
    await Esquema.AplicarAsync(db);
    if (app.Configuration.GetValue<bool>("Demo:Reiniciar"))
        await SemillaDemo.ReiniciarAsync(db, scope.ServiceProvider.GetRequiredService<IPasswordHasher<Usuario>>(), TimeProvider.System);
}

app.UseForwardedHeaders();
app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/", () => Results.Redirect("/salud"));
app.MapGet("/salud", () => Results.Ok(new { estado = "ok" }));
app.MapControllers();

app.Run();

// Para las pruebas de integración (WebApplicationFactory)
public partial class Program { }
