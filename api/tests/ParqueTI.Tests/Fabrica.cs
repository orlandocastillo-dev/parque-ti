using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.Testing;
using ParqueTI.Api.Dtos;

namespace ParqueTI.Tests;

// Levanta la API completa contra el Postgres de pruebas (en GitHub Actions es un contenedor).
// Cada clase de pruebas arranca con los datos de demostración recién creados.
public class Fabrica : WebApplicationFactory<Program>
{
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    public Fabrica()
    {
        Variable("ConnectionStrings__Parque", "Host=localhost;Port=5432;Database=postgres;Username=postgres;Password=postgres");
        Variable("Jwt__Clave", "clave-de-pruebas-0123456789-0123456789");
        Environment.SetEnvironmentVariable("Demo__Habilitado", "true");
        Environment.SetEnvironmentVariable("Demo__Reiniciar", "true");
        Environment.SetEnvironmentVariable("Entrar__LimitePorMinuto", "1000");
    }

    private static void Variable(string nombre, string valorPorDefecto)
    {
        if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(nombre)))
            Environment.SetEnvironmentVariable(nombre, valorPorDefecto);
    }

    public async Task<HttpClient> ComoAsync(string rol)
    {
        var c = CreateClient();
        var r = await c.PostAsJsonAsync("/api/auth/demo", new { rol }, Json);
        r.EnsureSuccessStatusCode();
        var s = (await r.Content.ReadFromJsonAsync<SesionDto>(Json))!;
        c.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", s.Token);
        return c;
    }
}

// Las clases que comparten la base no corren en paralelo
[CollectionDefinition("api", DisableParallelization = true)]
public class ColeccionApi { }

public static class Http
{
    public static async Task<T> LeerAsync<T>(this HttpResponseMessage r)
    {
        if (!r.IsSuccessStatusCode)
            throw new Xunit.Sdk.XunitException($"{(int)r.StatusCode} {r.RequestMessage?.Method} {r.RequestMessage?.RequestUri}: {await r.Content.ReadAsStringAsync()}");
        return (await r.Content.ReadFromJsonAsync<T>(Fabrica.Json))!;
    }

    public static async Task<string> TituloAsync(this HttpResponseMessage r) =>
        JsonDocument.Parse(await r.Content.ReadAsStringAsync()).RootElement.GetProperty("title").GetString() ?? "";

    public static Task<HttpResponseMessage> PostJson(this HttpClient c, string url, object cuerpo) => c.PostAsJsonAsync(url, cuerpo, Fabrica.Json);
    public static Task<HttpResponseMessage> PutJson(this HttpClient c, string url, object cuerpo) => c.PutAsJsonAsync(url, cuerpo, Fabrica.Json);
}
