# Backtester Pal (Web + API)

This repository now includes both parts of the app so it can be cloned and started on any machine:

- Next.js frontend in `WEB` root
- FastAPI backend in `backend/`

## Project structure

- `app/`, `components/`, `lib/`: Next.js frontend
- `backend/main.py`: FastAPI app
- `backend/requirements.txt`: Python dependencies
- `backend/supabase_schema.sql`: database schema for Supabase

## Prerequisites

- Node.js 20+ (Node.js 18+ may also work)
- npm
- Python 3.10+

## 1) Frontend setup

Install dependencies:

```powershell
npm install
```

Create frontend env file:

```powershell
Copy-Item .env.local.example .env.local
```

Update `.env.local` values:

- `NEXT_PUBLIC_API_URL` (usually `http://localhost:8000`)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2) Backend setup

Move into backend folder:

```powershell
cd backend
```

Create and activate a virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
pip install -r requirements.txt
```

Create backend env file:

```powershell
Copy-Item .env.example .env
```

Update `.env` values:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FRONTEND_ORIGIN` (default `http://localhost:3000`)

## 3) Database schema (Supabase)

Run SQL in your Supabase SQL Editor:

- `backend/supabase_schema.sql`

## 4) Run the app

Start backend (Terminal 1, from `backend/`):

```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Start frontend (Terminal 2, from repository root):

```powershell
npm run dev
```

Open:

- Frontend: http://localhost:3000
- Backend health: http://localhost:8000/health

## Backend endpoints

- `GET /health`
- `GET /sessions`
- `POST /sessions`
- `GET /trades`
- `POST /trades`
- `GET /analytics/summary`

## Notes for portability and backup

- Do not commit secrets (`.env`, `.env.local` are ignored).
- Backend has a memory fallback if Supabase env vars are missing, useful for quick local smoke testing.
- For a fresh machine: clone repo, follow steps above, and run backend + frontend in separate terminals.
