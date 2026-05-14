# BackTPal API (FastAPI + Supabase)

## Quick start

From repository root, enter the backend folder first:

```powershell
cd backend
```

1. Create and activate a virtualenv:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2. Install dependencies:

```powershell
pip install -r requirements.txt
```

3. Configure environment:

```powershell
Copy-Item .env.example .env
```

Fill in `.env` values for your Supabase project.

4. Apply DB schema in Supabase SQL editor:

- Run `supabase_schema.sql`

5. Start API:

```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Endpoints

- `GET /health`
- `GET /sessions`
- `POST /sessions`
- `GET /trades`
- `POST /trades`
- `GET /analytics/summary`

If Supabase env vars are missing, API falls back to in-memory storage for quick local testing.
