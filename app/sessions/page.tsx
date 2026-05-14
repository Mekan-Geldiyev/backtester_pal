'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
export const dynamic = 'force-dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import supabase from '@/lib/supabase';

type Strategy = { id: string; name: string; instrument: string };
type Session = {
  id: string;
  strategy_id: string | null;
  title: string | null;
  notes: string | null;
  created_at: string;
  strategies: Strategy | null;
};

export default function SessionsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [form, setForm] = useState({ strategy_id: '', title: '', notes: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (user) load();
  }, [user, loading]);

  async function load() {
    const [{ data: sessionData }, { data: stratData }] = await Promise.all([
      supabase
        .from('sessions')
        .select('id, strategy_id, title, notes, created_at, strategies(id, name, instrument)')
        .order('created_at', { ascending: false }),
      supabase.from('strategies').select('id, name, instrument').order('name'),
    ]);
    setSessions((sessionData as unknown as Session[]) || []);
    setStrategies(stratData || []);
    if (!form.strategy_id && stratData?.length) {
      setForm((f) => ({ ...f, strategy_id: stratData[0].id }));
    }
  }

  async function createSession(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    const strat = strategies.find((s) => s.id === form.strategy_id);
    const { error } = await supabase.from('sessions').insert({
      user_id: user!.id,
      strategy_id: form.strategy_id,
      strategy_name: strat?.name ?? '',
      instrument: strat?.instrument ?? '',
      title: form.title || null,
      notes: form.notes || null,
    });
    if (error) { setMessage(error.message); return; }
    setMessage('Session started.');
    setForm((f) => ({ ...f, title: '', notes: '' }));
    load();
  }

  if (loading || !user) return null;

  return (
    <main className="shell">
      <div className="page-head">
        <h1>Sessions</h1>
        <p>Start a session when you begin a backtest. One strategy per session.</p>
      </div>
      <section className="grid">
        <article className="panel">
          <div className="panel-head"><h2>New session</h2></div>
          {strategies.length === 0 ? (
            <p className="muted">Create a strategy first, then start a session.</p>
          ) : (
            <form onSubmit={createSession}>
              <label>
                Strategy
                <select
                  value={form.strategy_id}
                  onChange={(e) => setForm({ ...form, strategy_id: e.target.value })}
                  required
                >
                  {strategies.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} / {s.instrument}</option>
                  ))}
                </select>
              </label>
              <label>
                Session title (optional)
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Morning replay"
                />
              </label>
              <label>
                Notes (optional)
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </label>
              {message && <p className="form-message">{message}</p>}
              <button type="submit">Start session</button>
            </form>
          )}
        </article>

        <article className="panel">
          <div className="panel-head">
            <h2>All sessions</h2>
            <span>{sessions.length}</span>
          </div>
          <div className="stack">
            {sessions.length === 0 && <p className="muted">No sessions yet.</p>}
            {sessions.map((s) => (
              <Link key={s.id} href={`/sessions/${s.id}`} className="session-row row">
                <div>
                  <strong>{s.strategies?.name ?? 'Unknown'}</strong>
                  <p>{s.strategies?.instrument} · {s.title ?? 'No title'}</p>
                </div>
                <span className="muted">{new Date(s.created_at).toLocaleDateString()}</span>
              </Link>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
