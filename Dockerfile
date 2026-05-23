# Stage 1: Build frontend
FROM node:22-alpine AS frontend-build
WORKDIR /frontend
COPY src/Frontend/package*.json ./
RUN npm ci
COPY src/Frontend/ ./
# Override outDir to write to /wwwroot (not relative to source tree)
RUN npm run build -- --outDir /wwwroot

# Stage 2: Build backend
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS backend-build
WORKDIR /app
COPY TimeReport.slnx ./
COPY src/Backend/TimeReport.Api/TimeReport.Api.csproj src/Backend/TimeReport.Api/
RUN dotnet restore src/Backend/TimeReport.Api/TimeReport.Api.csproj
COPY src/Backend/TimeReport.Api/ src/Backend/TimeReport.Api/
COPY --from=frontend-build /wwwroot src/Backend/TimeReport.Api/wwwroot/
RUN dotnet publish src/Backend/TimeReport.Api/TimeReport.Api.csproj \
    -c Release -o /publish --no-restore

# Stage 3: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
RUN adduser --disabled-password --gecos "" appuser && chown appuser /app
USER appuser
COPY --from=backend-build /publish ./
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "TimeReport.Api.dll"]
