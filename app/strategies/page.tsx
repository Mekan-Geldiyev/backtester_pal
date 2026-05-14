'use client';

import { useEffect, useState } from 'react';
export const dynamic = 'force-dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import supabase from '@/lib/supabase';

type Strategy = {
  id: string;
  name: string;
  instrument: string;
  description: string | null;
  created_at: string;
};

export default function StrategiesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [form, setForm] = useState({ name: '', instrument: 'MNQ', description: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (user) load();
  }, [user, loading]);

  async function load() {
    const { data } = await supabase
      .from('strategies')
      .select('*')
      .order('created_at', { ascending: false });
    setStrategies(data || []);
  }

  async function createStrategy(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    const { error } = await supabase.from('strategies').insert({
      ...form,
      user_id: user!.id,
    });
    if (error) { setMessage(error.message); return; }
    setMessage('Strategy added.');
    setForm({ name: '', instrument: 'MNQ', description: '' });
    load();
  }

  if (loading || !user) return null;

  return (
    <main className="shell">
      <div className="page-head">
        <h1>Strategies</h1>
        <p>Each session is locked to one strategy — no mixing.</p>
      </div>
      <section className="grid">
        <article className="panel">
          <div className="panel-head"><h2>New strategy</h2></div>
          <form onSubmit={createStrategy}>
            <label>
              Strategy name
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="Opening range breakout"
              />
            </label>
            <label>
              Instrument
              <input
                value={form.instrument}
                onChange={(e) => setForm({ ...form, instrument: e.target.value })}
                required
                placeholder="MNQ"
              />
            </label>
            <label>
              Notes (optional)
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Briefly describe the setup…"
              />
            </label>
            {message && <p className="form-message">{message}</p>}
            <button type="submit">Add strategy</button>
          </form>
        </article>

        <article className="panel">
          <div className="panel-head">
            <h2>Your strategies</h2>
            <span>{strategies.length}</span>
          </div>
          <div className="stack">
            {strategies.length === 0 && <p className="muted">No strategies yet.</p>}
            {strategies.map((s) => (
              <div key={s.id} className="row">
                <div>
                  <strong>{s.name}</strong>
                  <p>{s.instrument}</p>
                </div>
                {s.description && <span className="muted">{s.description}</span>}
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
