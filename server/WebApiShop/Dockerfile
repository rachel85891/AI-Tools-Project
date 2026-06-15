# Multi-stage build for .NET 9 Web API
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy csproj and restore as distinct layers
COPY ["WebApiShop/WebApiShop.csproj", "WebApiShop/"]
COPY ["Entities/Entities.csproj", "Entities/"]
COPY ["Repositories/Repositories.csproj", "Repositories/"]
COPY ["Services/Services.csproj", "Services/"]
COPY ["DTOs/DTOs.csproj", "DTOs/"]
COPY ["Tests/Tests.csproj", "Tests/"]

RUN dotnet restore "WebApiShop/WebApiShop.csproj"

# Copy everything else and build
COPY . .
WORKDIR /src/WebApiShop
RUN dotnet publish "WebApiShop.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:80
EXPOSE 80

COPY --from=build /app/publish ./

ENTRYPOINT ["dotnet", "WebApiShop.dll"]
