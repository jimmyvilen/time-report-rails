# TimeReport

Time reporting app built with ASP.NET Core + React + TypeScript.

## Tech Stack

- **Backend**: ASP.NET Core .NET 10, Entity Framework Core, SQLite
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query
- **Auth**: Cookie-based auth (HttpOnly, SameSite=Lax)
- **Deploy**: Single-container with Vite built to wwwroot

## Getting Started

### Requirements

- .NET 10 SDK
- Node.js 22+

### Running in Development

**Terminal 1 – Backend:**
```bash
cd src/Backend/TimeReport.Api
dotnet run
# API available at http://localhost:5231
```

**Terminal 2 – Frontend:**
```bash
cd src/Frontend
npm install
npm run dev
# Frontend at http://localhost:5173 (proxies /api → backend)
```

Open http://localhost:5173 in your browser.

### Building for Production

```bash
# Build frontend (writes to src/Backend/TimeReport.Api/wwwroot)
cd src/Frontend && npm run build

# Run backend (serves frontend via wwwroot)
cd src/Backend/TimeReport.Api && dotnet run
# Open http://localhost:5231
```

### Docker

```bash
# Build and run
docker compose up --build

# App available at http://localhost:8080
```

Copy the database to the data folder on first run:
```bash
mkdir data
cp db/local.db data/timereport.db
```

## Project Structure

```
src/
├─ Backend/
│  ├─ TimeReport.Api/          ASP.NET Core API
│  │  ├─ Controllers/          API endpoints
│  │  ├─ Data/
│  │  │  ├─ Entities/          EF Core entities
│  │  │  └─ AppDbContext.cs
│  │  ├─ Services/             DurationParser, TimeEntryResolver, JiraService
│  │  └─ wwwroot/              Vite build (auto-generated)
│  └─ TimeReport.Api.Tests/    Unit tests
└─ Frontend/
   └─ src/
      ├─ api/                  Fetch wrappers per resource
      ├─ components/           Shared UI components
      ├─ features/             Feature modules (dashboard, projects, tasks...)
      └─ lib/                  Helper functions (durationParser, dateUtils...)
```

## API Endpoints

### Auth (no authentication required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/auth/setup-status | Are there any users? |
| POST | /api/auth/setup | Create first admin user |
| POST | /api/auth/login | Log in |
| POST | /api/auth/logout | Log out |
| POST | /api/auth/register | Register new user |
| GET | /api/auth/me | Get current user |

### Time Entries
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/time-entries?date= | Get entries for a date |
| POST | /api/time-entries | Create entry (prepend, position 0) |
| PUT | /api/time-entries/{id} | Update |
| DELETE | /api/time-entries/{id} | Delete |
| POST | /api/time-entries/{id}/duplicate | Duplicate |
| POST | /api/time-entries/reorder | Reorder |
| GET | /api/time-entries/weekly-summary?date= | Weekly summary (Mon–Sun) |
| POST | /api/time-entries/{id}/push-to-jira | Push worklog to Jira |
| GET | /api/time-entries/export?from=&to= | CSV export |

## Known Differences from Rails Version

| Rails | New Stack | Notes |
|---|---|---|
| Turbo Streams | TanStack Query invalidation | Automatic re-fetch on mutation |
| Hotwire drag-and-drop | @dnd-kit/sortable | Similar UX |
| EasyMDE markdown editor | Simple textarea + react-markdown | Can be extended with react-simplemde-editor |
| I18n day names | Intl.DateTimeFormat('sv-SE') | Built into the browser |
| Rails flash messages | Inline error messages in forms | |
| Server-side markdown | react-markdown (client-side) | |

## Tests

```bash
# Run unit tests
dotnet test src/Backend/TimeReport.Api.Tests/
```

Tests cover:
- `DurationParser` – parsing "1h 30m", "90m", "1.5h" etc.
- `TimeEntryResolverService` – start+end→duration, start+duration→end, etc.
