'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import supabase from '@/lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

type Strategy = {
  id: string;
  name: string;
  instrument: string;
  description: string | null;
  created_at: string;
};

type Session = {
  id: string;
  title: string | null;
  created_at: string;
};

type Trade = {
  id: string;
  profit: number;
  trade_date: string;
  outcome: string | null;
};

// ── Stats calculation ─────────────────────────────────────────────────────────

type Stats = {
  totalPnl: number;
  tradeWinPct: number | null;
  avgWin: number | null;
  avgLoss: number | null;
  profitFactor: number | null;
  bestDayPct: number | null;
  dayWinPct: number | null;
  avgWinTrade: number | null;
  avgLossTrade: number | null;
  bestTrade: number | null;
  worstTrade: number | null;
  totalTrades: number;
  totalSessions: number;
};

function calcStats(trades: Trade[], sessions: Session[]): Stats {
  const totalTrades = trades.length;
  const totalSessions = sessions.length;

  if (totalTrades === 0) {
    return {
      totalPnl: 0, tradeWinPct: null, avgWin: null, avgLoss: null,
      profitFactor: null, bestDayPct: null, dayWinPct: null,
      avgWinTrade: null, avgLossTrade: null, bestTrade: null,
      worstTrade: null, totalTrades: 0, totalSessions,
    };
  }

  const profits = trades.map(t => Number(t.profit));
  const totalPnl = profits.reduce((s, p) => s + p, 0);

  const wins = profits.filter(p => p > 0);
  const losses = profits.filter(p => p < 0);

  const tradeWinPct = (wins.length / totalTrades) * 100;
  const avgWinTrade = wins.length > 0 ? wins.reduce((s, p) => s + p, 0) / wins.length : null;
  const avgLossTrade = losses.length > 0 ? losses.reduce((s, p) => s + p, 0) / losses.length : null;

  const grossWin = wins.reduce((s, p) => s + p, 0);
  const grossLoss = Math.abs(losses.reduce((s, p) => s + p, 0));
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : null;

  const bestTrade = Math.max(...profits);
  const worstTrade = Math.min(...profits);

  // Group by day
  const dayMap: Record<string, number> = {};
  for (const t of trades) {
    dayMap[t.trade_date] = (dayMap[t.trade_date] ?? 0) + Number(t.profit);
  }
  const dayPnls = Object.values(dayMap);
  const winDays = dayPnls.filter(d => d > 0).length;
  const dayWinPct = dayPnls.length > 0 ? (winDays / dayPnls.length) * 100 : null;

  const bestDayPnl = dayPnls.length > 0 ? Math.max(...dayPnls) : null;
  const bestDayPct = bestDayPnl !== null && totalPnl > 0 ? (bestDayPnl / totalPnl) * 100 : null;

  return {
    totalPnl, tradeWinPct,
    avgWin: grossWin > 0 ? grossWin / wins.length : null,
    avgLoss: grossLoss > 0 ? -(grossLoss / losses.length) : null,
    profitFactor, bestDayPct, dayWinPct,
    avgWinTrade, avgLossTrade,
    bestTrade, worstTrade,
    totalTrades, totalSessions,
  };
}

// ── Formatters ────────────────────────────────────────────────────────────────

function fmt$(val: number | null): string {
  if (val === null) return 'N/A';
  return (val < 0 ? '-$' : '$') + Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(val: number | null): string {
  if (val === null) return 'N/A';
  return val.toFixed(2) + '%';
}

function pnlClass(val: number | null): string {
  if (val === null || val === 0) return '';
  return val > 0 ? 'positive' : 'negative';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function StrategyDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const strategyId = params.id as string;

  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (user) loadData();
  }, [user, loading]);

  async function loadData() {
    setDataLoading(true);

    // Load strategy
    const { data: stratData } = await supabase
      .from('strategies')
      .select('*')
      .eq('id', strategyId)
      .single();

    if (!stratData) { router.push('/strategies'); return; }
    setStrategy(stratData);

    // Load sessions for this strategy
    const { data: sessionData } = await supabase
      .from('sessions')
      .select('id, title, created_at')
      .eq('strategy_id', strategyId)
      .order('created_at', { ascending: false });

    const sess = sessionData || [];
    setSessions(sess);

    // Load all trades from those sessions
    if (sess.length > 0) {
      const sessionIds = sess.map(s => s.id);
      const { data: tradeData } = await supabase
        .from('trades')
        .select('id, profit, trade_date, outcome')
        .in('session_id', sessionIds);
      setTrades(tradeData || []);
    }

    setDataLoading(false);
  }

  if (loading || !user || dataLoading) return null;
  if (!strategy) return null;

  const stats = calcStats(trades, sessions);

  return (
    <main className="shell">
      <Link href="/strategies" className="back-link">← Strategies</Link>

      <div className="page-head">
        <p className="eyebrow">{strategy.instrument}</p>
        <h1>{strategy.name}</h1>
        {strategy.description && <p className="lede">{strategy.description}</p>}
      </div>

      {/* ── Stat tiles ── */}
      <section className="strat-stats-grid">

        {/* Row 1 */}
        <div className="stat-tile">
          <span className="stat-label">Total P&L</span>
          <span className={`stat-value ${pnlClass(stats.totalPnl)}`}>{fmt$(stats.totalPnl)}</span>
        </div>

        <div className="stat-tile">
          <span className="stat-label">Trade Win %</span>
          <span className="stat-value">{stats.tradeWinPct !== null ? fmtPct(stats.tradeWinPct) : <span className="muted">No trades</span>}</span>
        </div>

        <div className="stat-tile stat-tile--wide">
          <span className="stat-label">Avg Win / Avg Loss</span>
          <div className="stat-split">
            <span className={`stat-value ${pnlClass(stats.avgWin)}`}>{fmt$(stats.avgWin)}</span>
            <span className="stat-sep">/</span>
            <span className={`stat-value ${pnlClass(stats.avgLoss)}`}>{fmt$(stats.avgLoss)}</span>
          </div>
        </div>

        {/* Row 2 */}
        <div className="stat-tile">
          <span className="stat-label">Day Win %</span>
          <span className="stat-value">{stats.dayWinPct !== null ? fmtPct(stats.dayWinPct) : <span className="muted">No trades</span>}</span>
        </div>

        <div className="stat-tile">
          <span className="stat-label">Profit Factor</span>
          <span className="stat-value">
            {stats.profitFactor !== null ? stats.profitFactor.toFixed(2) : <span className="muted">N/A</span>}
          </span>
        </div>

        <div className="stat-tile">
          <span className="stat-label">Best Day % of Total Profit</span>
          <span className="stat-value">{stats.bestDayPct !== null ? fmtPct(stats.bestDayPct) : <span className="muted">N/A</span>}</span>
        </div>

        {/* Row 3 */}
        <div className="stat-tile">
          <span className="stat-label">Avg Winning Trade</span>
          <span className={`stat-value ${pnlClass(stats.avgWinTrade)}`}>{fmt$(stats.avgWinTrade)}</span>
        </div>

        <div className="stat-tile">
          <span className="stat-label">Avg Losing Trade</span>
          <span className={`stat-value ${pnlClass(stats.avgLossTrade)}`}>{fmt$(stats.avgLossTrade)}</span>
        </div>

        <div className="stat-tile">
          <span className="stat-label">Total Trades</span>
          <span className="stat-value">{stats.totalTrades}</span>
        </div>

        {/* Row 4 */}
        <div className="stat-tile stat-tile--half">
          <span className="stat-label">Best Trade</span>
          <span className={`stat-value ${pnlClass(stats.bestTrade)}`}>{fmt$(stats.bestTrade)}</span>
        </div>

        <div className="stat-tile stat-tile--half">
          <span className="stat-label">Worst Trade</span>
          <span className={`stat-value ${pnlClass(stats.worstTrade)}`}>{fmt$(stats.worstTrade)}</span>
        </div>

      </section>

      {/* ── Sessions list ── */}
      <section style={{ marginTop: '32px' }}>
        <div className="panel-head" style={{ marginBottom: '14px' }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>Sessions</h2>
          <span>{stats.totalSessions}</span>
        </div>

        {sessions.length === 0 ? (
          <p className="muted">No sessions yet for this strategy.</p>
        ) : (
          <div className="stack">
            {sessions.map(s => {
              const sessionTrades = trades.filter(() => true); // placeholder — we load all trades already
              return (
                <Link
                  key={s.id}
                  href={`/sessions/${s.id}`}
                  className="row session-row"
                >
                  <div>
                    <strong>{s.title || 'Untitled session'}</strong>
                    <p style={{ margin: '2px 0 0', fontSize: '0.88rem' }}>
                      {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <span className="muted" style={{ fontSize: '0.85rem' }}>View →</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
