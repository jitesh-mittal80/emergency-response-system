# 🚑 AI-Powered Emergency Ambulance Dispatch System

An academic prototype of a full-stack emergency ambulance dispatch system featuring A\* Search and Dijkstra's Algorithm, real-time tracking, and an intelligent dispatch engine.

> **⚠️ Academic Simulation Only** — This is NOT a real emergency service. Call 112 for actual emergencies.

---

## Screenshots / Features

| Feature | Description |
|---|---|
| 🗺️ Live Map | Real-time ambulance positions on OpenStreetMap via Leaflet |
| 🤖 AI Dispatch | A\* + Dijkstra pathfinding with automatic best-ambulance selection |
| 🚑 Ambulance Roaming | Simulated random roaming across West Delhi road network |
| 🆘 Emergency Simulation | 18 predefined patient locations in Dwarka/Janakpuri area |
| 📊 Analytics | Response times, fleet utilization, algorithm comparison charts |
| 📡 Real-Time | Socket.IO live updates for all dashboard panels |

---

## Prerequisites

- **Node.js** ≥ 18.x
- **Docker** (for PostgreSQL with PostGIS)
- **npm** or **pnpm**

---

## Quick Start

### 1. Clone / Extract
```bash
cd "emergency-respone-system"
```

### 2. Configure environment variables
```bash
cp .env.example .env
```

Edit `.env`:
- Generate a JWT secret:
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
  Paste it as `JWT_SECRET=<generated value>`
- Leave `MOCK_ROUTING=true` (no Google API key needed for local demo)
- Leave `VITE_GOOGLE_MAPS_API_KEY` empty (app auto-uses Leaflet/OSM)

### 3. Start PostgreSQL with PostGIS
```bash
docker compose up -d
```

Wait for the health check to pass (~15 seconds):
```bash
docker compose ps
```

### 4. Install backend dependencies
```bash
cd backend
npm install
```

### 5. Run database migrations
```bash
npm run prisma:migrate
```
When prompted for migration name, type: `init`

### 6. Seed the database
```bash
npm run prisma:seed
```

**Default credentials:**
- Email: `admin@dispatch.local`
- Password: `Admin@1234`

### 7. Install frontend dependencies
```bash
cd ../frontend
npm install
```

### 8. Start the application

Open two terminals:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

### 9. Open the dashboard
Navigate to: **http://localhost:5173**

Login with `admin@dispatch.local` / `Admin@1234`

---

## Running Tests

```bash
cd backend
npm test
```

Tests cover:
- A\* Search algorithm (pathfinding, costs, explored nodes)
- Dijkstra's Algorithm (pathfinding, optimality)
- A\* vs Dijkstra comparison (same path cost, A\* explores fewer nodes)
- Haversine formula (distance calculation, ETA estimation)

---

## API Documentation

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Admin login → returns JWT |
| GET | `/api/auth/me` | Get current admin |

### Ambulances
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/ambulances` | List all ambulances |
| POST | `/api/ambulances` | Register new ambulance |
| GET | `/api/ambulances/:id` | Get ambulance + history |
| PATCH | `/api/ambulances/:id` | Update ambulance |
| DELETE | `/api/ambulances/:id` | Delete ambulance |
| PATCH | `/api/ambulances/:id/status` | Update status |

### Emergencies
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/emergencies/patients` | List predefined patients |
| GET | `/api/emergencies` | List emergency requests |
| POST | `/api/emergencies/simulate` | Simulate emergency call |
| GET | `/api/emergencies/:id` | Get emergency + dispatch |
| PATCH | `/api/emergencies/:id/status` | Update status |

### Dispatches
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/dispatches` | List dispatches |
| GET | `/api/dispatches/:id` | Get dispatch details |
| POST | `/api/dispatches/:id/complete` | Mark dispatch complete |
| GET | `/api/dispatches/:id/route` | Get route polyline |

### Algorithms
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/algorithms/astar` | Run A\* search |
| POST | `/api/algorithms/dijkstra` | Run Dijkstra |
| GET | `/api/algorithms/comparison/:emergencyId` | Compare both |

### Analytics
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/analytics/overview` | Fleet + emergency stats |
| GET | `/api/analytics/response-times` | Historical response times |
| GET | `/api/analytics/algorithm-performance` | A\* vs Dijkstra stats |

### Simulation
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/simulation/start` | Start simulation |
| POST | `/api/simulation/pause` | Pause simulation |
| POST | `/api/simulation/reset` | Reset simulation |
| GET | `/api/simulation/status` | Get simulation status |

---

## Socket.IO Events

| Event | Direction | Payload |
|---|---|---|
| `ambulance:location-update` | Server → Client | `{ ambulanceId, latitude, longitude, timestamp }` |
| `ambulance:status-update` | Server → Client | `{ ambulanceId, status, assignedEmergencyId }` |
| `emergency:new-request` | Server → Client | `{ emergency }` |
| `emergency:status-update` | Server → Client | `{ emergencyId, status }` |
| `dispatch:assigned` | Server → Client | `{ dispatch, emergency, ambulance }` |
| `dispatch:eta-update` | Server → Client | `{ dispatchId, currentEtaMinutes, remainingDistanceKm }` |
| `dispatch:completed` | Server → Client | `{ dispatchId, emergencyId, ambulanceId }` |
| `simulation:status` | Server → Client | `{ running, speed, ambulanceCount, tickMs }` |

---

## Architecture Overview

```
Admin Dashboard (React + Leaflet)
        ↕ REST API + Socket.IO
Express Backend
    ├── Auth Module (JWT + bcrypt)
    ├── Emergency Module
    │     └── Dispatch Engine
    │           ├── Haversine nearest-candidate filter
    │           ├── Road routing (Mock / Google Routes API)
    │           └── A* + Dijkstra comparison
    ├── Ambulance Module
    ├── Simulation Engine (random roaming + dispatch tracking)
    ├── Analytics Module
    └── Socket.IO (real-time events)
        ↕ Prisma ORM
PostgreSQL + PostGIS
```

---

## Project Structure

```
emergency-respone-system/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Database schema
│   │   ├── seed.ts              # Seed data (admin + ambulances + patients)
│   │   └── init.sql             # PostGIS extension
│   ├── src/
│   │   ├── index.ts             # Server entry point
│   │   ├── app.ts               # Express app
│   │   ├── modules/
│   │   │   ├── auth/            # JWT authentication
│   │   │   ├── ambulance/       # Fleet management
│   │   │   ├── emergency/       # Emergency requests + simulation
│   │   │   ├── dispatch/        # Dispatch engine (AI selection)
│   │   │   ├── simulation/      # Random ambulance roaming
│   │   │   ├── routing/         # Google Routes API + mock routing
│   │   │   ├── algorithms/      # A* + Dijkstra + road graph
│   │   │   └── analytics/       # Stats + reports
│   │   ├── middleware/          # Auth, error handler, logger
│   │   ├── sockets/             # Socket.IO server
│   │   └── utils/               # Prisma, haversine, logger
│   └── tests/                   # Jest tests
├── frontend/
│   └── src/
│       ├── App.tsx
│       ├── pages/               # 8 dashboard pages
│       ├── layouts/             # Sidebar + top nav
│       ├── components/          # StatusBadge etc.
│       ├── maps/                # DispatchMap (Leaflet)
│       ├── context/             # Auth, Socket, Dispatch providers
│       ├── services/            # Axios API services
│       └── types/               # TypeScript types
├── shared/
│   └── types/                   # Shared TS types
├── docker-compose.yml
├── .env.example
├── API_KEY_INSTRUCTIONS.txt
└── README.md
```

---

## AI Algorithms

### A\* Search
- **Heuristic:** Haversine (straight-line) distance to goal — admissible
- **Formula:** `f(n) = g(n) + h(n)` where g = actual cost, h = heuristic
- **Advantage:** Directionally guided, explores fewer nodes

### Dijkstra's Algorithm
- **No heuristic** — explores all equally-distant nodes
- **Guarantee:** Optimal shortest path
- **Use:** Baseline comparison with A\*

### Road Graph
- 28 nodes representing major intersections in West Delhi
- Bidirectional edges with Haversine × 1.35 road factor weights
- Area: Dwarka, Janakpuri, Uttam Nagar, Palam, Vikaspuri

---

## Optional: Add Google Maps

See `API_KEY_INSTRUCTIONS.txt` for step-by-step instructions to add:
1. `GOOGLE_MAPS_API_KEY` — server-side Routes API (real road routing)
2. `VITE_GOOGLE_MAPS_API_KEY` — browser Maps JavaScript API

Set `MOCK_ROUTING=false` in `.env` after adding the server key.

---

## License

Academic prototype. All patient data is fictional.
