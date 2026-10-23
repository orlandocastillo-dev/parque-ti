# Compila la API y la deja en una imagen liviana. Render la construye a partir de este archivo.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS compilar
WORKDIR /src
COPY src/ParqueTI.Api/ParqueTI.Api.csproj src/ParqueTI.Api/
RUN dotnet restore src/ParqueTI.Api/ParqueTI.Api.csproj
COPY src/ParqueTI.Api/ src/ParqueTI.Api/
RUN dotnet publish src/ParqueTI.Api/ParqueTI.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=compilar /app .
ENV ASPNETCORE_ENVIRONMENT=Production
USER $APP_UID
ENTRYPOINT ["dotnet", "ParqueTI.Api.dll"]
