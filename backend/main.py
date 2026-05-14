import os
from collections import Counter, defaultdict
from datetime import date, datetime
from typing import Optional
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from supabase import create_client
except Exception:  # pragma: no cover - import guard for local bootstrapping
    create_client = None


class SessionCreate(BaseModel):
    strategy_name: str = Field(..., min_length=1)
    instrument: str = Field(..., min_length=1)
    title: Optional[str] = None
    notes: Optional[str] = None


class TradeCreate(BaseModel):
    session_id: str
    trade_date: date
    description: str = Field(..., min_length=1)
    profit: float
    screenshot_url: Optional[str] = None
    outcome: Optional[str] = None


class SessionRecord(SessionCreate):
    id: str
    created_at: datetime


class TradeRecord(TradeCreate):
    id: str
    created_at: datetime


class SummaryResponse(BaseModel):
    total_trades: int
    total_pnl: float
    win_rate: float
    profitable_days: int
    profitable_weeks: int


app = FastAPI(title='BackTPal API')
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv('FRONTEND_ORIGIN', 'http://localhost:3000')],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and create_client is not None:
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
else:
    supabase = None

_sessions: list[SessionRecord] = []
_trades: list[TradeRecord] = []


def storage_name() -> str:
    return 'supabase' if supabase is not None else 'memory'


def load_sessions() -> list[SessionRecord]:
    if supabase is None:
        return _sessions
    rows = supabase.table('sessions').select('*').order('created_at', desc=True).execute().data or []
    return [SessionRecord(**row) for row in rows]


def load_trades() -> list[TradeRecord]:
    if supabase is None:
        return _trades
    rows = supabase.table('trades').select('*').order('created_at', desc=True).execute().data or []
    return [TradeRecord(**row) for row in rows]


def store_session(payload: SessionCreate) -> SessionRecord:
    record = SessionRecord(id=str(uuid4()), created_at=datetime.utcnow(), **payload.model_dump())
    if supabase is None:
        _sessions.append(record)
        return record

    result = supabase.table('sessions').insert(record.model_dump()).execute().data
    if not result:
        raise HTTPException(status_code=500, detail='Failed to create session')
    return SessionRecord(**result[0])


def store_trade(payload: TradeCreate) -> TradeRecord:
    trade = TradeRecord(id=str(uuid4()), created_at=datetime.utcnow(), **payload.model_dump())
    if supabase is None:
        _trades.append(trade)
        return trade

    result = supabase.table('trades').insert(trade.model_dump()).execute().data
    if not result:
        raise HTTPException(status_code=500, detail='Failed to create trade')
    return TradeRecord(**result[0])


@app.get('/health')
def health() -> dict[str, object]:
    return {'ok': True, 'storage': storage_name()}


@app.get('/sessions')
def list_sessions() -> dict[str, object]:
    return {'items': [session.model_dump() for session in load_sessions()]}


@app.post('/sessions')
def create_session(payload: SessionCreate) -> dict[str, object]:
    session = store_session(payload)
    return session.model_dump()


@app.get('/trades')
def list_trades() -> dict[str, object]:
    return {'items': [trade.model_dump() for trade in load_trades()]}


@app.post('/trades')
def create_trade(payload: TradeCreate) -> dict[str, object]:
    session_ids = {session.id for session in load_sessions()}
    if payload.session_id not in session_ids:
        raise HTTPException(status_code=404, detail='Session not found')
    trade = store_trade(payload)
    return trade.model_dump()


@app.get('/analytics/summary', response_model=SummaryResponse)
def analytics_summary() -> SummaryResponse:
    trades = load_trades()
    if not trades:
        return SummaryResponse(total_trades=0, total_pnl=0, win_rate=0, profitable_days=0, profitable_weeks=0)

    total_pnl = sum(trade.profit for trade in trades)
    wins = sum(1 for trade in trades if trade.profit > 0)
    win_rate = round((wins / len(trades)) * 100, 2)

    day_totals: dict[date, float] = defaultdict(float)
    week_totals: dict[tuple[int, int], float] = defaultdict(float)
    for trade in trades:
        day_totals[trade.trade_date] += trade.profit
        iso_year, iso_week, _ = trade.trade_date.isocalendar()
        week_totals[(iso_year, iso_week)] += trade.profit

    profitable_days = sum(1 for total in day_totals.values() if total > 0)
    profitable_weeks = sum(1 for total in week_totals.values() if total > 0)

    return SummaryResponse(
        total_trades=len(trades),
        total_pnl=round(total_pnl, 2),
        win_rate=win_rate,
        profitable_days=profitable_days,
        profitable_weeks=profitable_weeks,
    )
