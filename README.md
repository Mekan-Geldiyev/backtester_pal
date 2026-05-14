# BackTPal Web (Next.js)

## Quick start

1. Install dependencies:

```powershell
npm install
```

2. Configure API URL:

```powershell
Copy-Item .env.local.example .env.local
```

3. Run dev server:

```powershell
npm run dev
```

Open http://localhost:3000

This UI talks to the FastAPI backend and includes:
- Session creation
- Trade logging (with explicit trade date)
- Quick PnL/win-rate stats
- Session and trade lists
