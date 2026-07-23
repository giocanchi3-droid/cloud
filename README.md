# StockStep Cloud

Sistema CRUD de inventario de zapatos construido con React, Express, PostgreSQL y Docker Compose.

## Servicios locales

- Frontend: http://localhost:3000
- API: http://localhost:8080/api/health
- PostgreSQL: localhost:5433

## Inicio

```powershell
Copy-Item .env.example .env
docker compose --env-file .env up -d --build
```