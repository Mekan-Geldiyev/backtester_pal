'use client';

import { useEffect, useMemo, useState } from 'react';
export const dynamic = 'force-dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import supabase from '@/lib/supabase';

type Strategy = { id: string; name: string; instrument: string };
type Trade = { id: string; trade_date: string; profit: number; session_id: string };
type DayStat = { profit: number; count: number };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getFirstDayOfWeek(year: number, month: number) {
  return (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function isoKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isoWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${week}`;
}

export default function CalendarPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [sessions, setSessions] = useState<{ id: string; strategy_id: string }[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('all');
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (user) load();
  }, [user, loading]);

  async function load() {
    const [{ data: stratData }, { data: sessionData }, { data: tradeData }] = await Promise.all([
      supabase.from('strategies').select('id, name, instrument').order('name'),
      supabase.from('sessions').select('id, strategy_id'),
      supabase.from('trades').select('id, trade_date, profit, session_id'),
    ]);
    setStrategies(stratData || []);
    setSessions(sessionData || []);
    setTrades(tradeData || []);
  }

  const filteredTrades = useMemo(() => {
    if (selectedStrategy === 'all') return trades;
    const ids = new Set(sessions.filter((s) => s.strategy_id === selectedStrategy).map((s) => s.id));
    return trades.filter((t) => ids.has(t.session_id));
  }, [trades, sessions, selectedStrategy]);

  const dayStats = useMemo(() => {
    const stats: Record<string, DayStat> = {};
    for (const t of filteredTrades) {
      const key = t.trade_date.slice(0, 10);
      if (!stats[key]) stats[key] = { profit: 0, count: 0 };
      stats[key].profit += Number(t.profit);
      stats[key].count++;
    }
    return stats;
  }, [filteredTrades]);

  const weeklyProfits = useMemo(() => {
    const weeks: Record<string, number> = {};
    for (const [date, stat] of Object.entries(dayStats)) {
      const key = isoWeek(date);
      weeks[key] = (weeks[key] || 0) + stat.profit;
    }
    return weeks;
  }, [dayStats]);

  const profitableWeeks = Object.values(weeklyProfits).filter((p) => p > 0).length;
  const totalWeeks = Object.keys(weeklyProfits).length;

  const monthSummary = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    let pnl = 0, wins = 0;
    for (const [date, stat] of Object.entries(dayStats)) {
      if (!date.startsWith(prefix)) continue;
      pnl += stat.profit;
      if (stat.profit > 0) wins++;
    }
    return { pnl, wins };
  }, [dayStats, year, month]);

  const cells = useMemo(() => {
    const first = getFirstDayOfWeek(year, month);
    const total = daysInMonth(year, month);
    return Array.from({ length: first + total }, (_, i) =>
      i < first ? null : i - first + 1
    );
  }, [year, month]);

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  if (loading || !user) return null;

  return (
    <main className="shell">
      <div className="page-head">
        <h1>Calendar</h1>
        <p>Performance by actual trade date — not the date you logged it.</p>
      </div>

      <div className="cal-controls">
        <select value={selectedStrategy} onChange={(e) => setSelectedStrategy(e.target.value)}>
          <option value="all">All strategies</option>
          {strategies.map((s) => (
            <option key={s.id} value={s.id}>{s.name} / {s.instrument}</option>
          ))}
        </select>
        <div className="month-nav">
          <button onClick={prevMonth}>‹</button>
          <span>{MONTHS[month]} {year}</span>
          <button onClick={nextMonth}>›</button>
        </div>
      </div>

      <div className="cal-summary">
        <div className="metric">
          <span>Month PnL</span>
          <strong className={monthSummary.pnl >= 0 ? 'positive' : 'negative'}>
            {monthSummary.pnl >= 0 ? '+' : ''}{monthSummary.pnl.toFixed(0)}
          </strong>
        </div>
        <div className="metric">
          <span>Profitable days</span>
          <strong>{monthSummary.wins}</strong>
        </div>
        <div className="metric">
          <span>Profitable weeks</span>
          <strong>{profitableWeeks} / {totalWeeks || '—'}</strong>
        </div>
      </div>

      <div className="cal-grid">
        {DAY_LABELS.map((d) => (
          <div key={d} className="cal-header">{d}</div>
        ))}
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} className="cal-empty" />;
          const key = isoKey(year, month, day);
          const stat = dayStats[key];
          const cls = stat
            ? stat.profit > 0 ? 'cal-day win' : stat.profit < 0 ? 'cal-day loss' : 'cal-day neutral'
            : 'cal-day';
          return (
            <div key={key} className={cls}>
              <span className="cal-day-num">{day}</span>
              {stat && (
                <span className="cal-day-pnl">
                  {stat.profit > 0 ? '+' : ''}{stat.profit.toFixed(0)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
