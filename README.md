# TimeReport

Tidrapporteringsapp byggd med ASP.NET Core + React + TypeScript.

## Teknikstack

- **Backend**: ASP.NET Core .NET 9, Entity Framework Core, SQLite
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query
- **Auth**: Cookie-baserad auth (HttpOnly, SameSite=Lax)
- **Deploy**: Single-container med Vite byggt till wwwroot

## Komma igång

### Krav

- .NET 9 SDK
- Node.js 22+

### Starta i development

**Terminal 1 – Backend:**
```bash
cd src/Backend/TimeReport.Api
dotnet run
# API tillgängligt på http://localhost:5231
```

**Terminal 2 – Frontend:**
```bash
cd src/Frontend
npm install
npm run dev
# Frontend på http://localhost:5173 (proxyas /api → backend)
```

Öppna http://localhost:5173 i webbläsaren.

### Bygga för produktion

```bash
# Bygg frontend (skriver till src/Backend/TimeReport.Api/wwwroot)
cd src/Frontend && npm run build

# Kör backend (serverar frontend via wwwroot)
cd src/Backend/TimeReport.Api && dotnet run
# Öppna http://localhost:5231
```

### Docker

```bash
# Bygg och kör
docker compose up --build

# App tillgänglig på http://localhost:8080
```

Kopiera databasen till data-mappen vid första körning:
```bash
mkdir data
cp db/local.db data/timereport.db
```

## Projektstruktur

```
src/
├─ Backend/
│  ├─ TimeReport.Api/          ASP.NET Core API
│  │  ├─ Controllers/          API-endpoints
│  │  ├─ Data/
│  │  │  ├─ Entities/          EF Core entiteter
│  │  │  └─ AppDbContext.cs
│  │  ├─ Services/             DurationParser, TimeEntryResolver, JiraService
│  │  └─ wwwroot/              Vite build (auto-genererad)
│  └─ TimeReport.Api.Tests/    Unit-tester
└─ Frontend/
   └─ src/
      ├─ api/                  Fetch-wrappers per resurs
      ├─ components/           Delade UI-komponenter
      ├─ features/             Feature-moduler (dashboard, projects, tasks...)
      └─ lib/                  Hjälpfunktioner (durationParser, dateUtils...)
```

## API-endpoints

### Auth (ingen autentisering krävs)
| Method | Endpoint | Beskrivning |
|--------|----------|-------------|
| GET | /api/auth/setup-status | Finns det några användare? |
| POST | /api/auth/setup | Skapa första admin-användare |
| POST | /api/auth/login | Logga in |
| POST | /api/auth/logout | Logga ut |
| POST | /api/auth/register | Registrera ny användare |
| GET | /api/auth/me | Hämta inloggad användare |

### Tidsposter
| Method | Endpoint | Beskrivning |
|--------|----------|-------------|
| GET | /api/time-entries?date= | Hämta poster för ett datum |
| POST | /api/time-entries | Skapa post (prepend, position 0) |
| PUT | /api/time-entries/{id} | Uppdatera |
| DELETE | /api/time-entries/{id} | Ta bort |
| POST | /api/time-entries/{id}/duplicate | Duplicera |
| POST | /api/time-entries/reorder | Ändra ordning |
| GET | /api/time-entries/weekly-summary?date= | Veckoöversikt (mån-sön) |
| POST | /api/time-entries/{id}/push-to-jira | Pusha worklog till Jira |
| GET | /api/time-entries/export?from=&to= | CSV-export |

## Kända skillnader från Rails-versionen

| Rails | Ny stack | Notering |
|---|---|---|
| Turbo Streams | TanStack Query invalidering | Automatisk re-fetch vid mutation |
| Hotwire drag-and-drop | @dnd-kit/sortable | Liknande UX |
| EasyMDE markdown-editor | Enkel textarea + react-markdown | Kan utökas med react-simplemde-editor |
| I18n dagnamn | Intl.DateTimeFormat('sv-SE') | Inbyggt i webbläsaren |
| Rails flash messages | Inline felmeddelanden i formulär | |
| Server-side markdown | react-markdown (client-side) | |

## Tester

```bash
# Kör unit-tester
dotnet test src/Backend/TimeReport.Api.Tests/
```

Tester täcker:
- `DurationParser` – parsning av "1h 30m", "90m", "1.5h" etc.
- `TimeEntryResolverService` – start+end→duration, start+duration→end, etc.
