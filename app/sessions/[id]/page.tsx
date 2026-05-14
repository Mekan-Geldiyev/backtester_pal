'use client';

export const dynamic = 'force-dynamic';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SR = any;

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import supabase from '@/lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

type SessionDetail = {
  id: string;
  title: string | null;
  notes: string | null;
  strategy_id: string | null;
  strategies: { name: string; instrument: string } | null;
};

type Trade = {
  id: string;
  trade_date: string;
  description: string;
  profit: number;
  outcome: string | null;
  screenshot_url: string | null;
  created_at: string;
};

type FlowStep = 'idle' | 'screenshot' | 'desc' | 'date' | 'profit' | 'review' | 'saving';

type Draft = {
  description: string;
  tradeDate: string;
  profit: number | null;
  screenshotBlob: Blob | null;
  screenshotPreview: string | null;
};

// ── Audio helpers ──────────────────────────────────────────────────────────────

function beep(freq = 880, duration = 0.18, vol = 0.3) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = vol;
    osc.frequency.value = freq;
    osc.start();
    osc.stop(ctx.currentTime + duration);
    setTimeout(() => ctx.close(), 600);
  } catch {}
}

function beepReady() { beep(880, 0.15); }
function beepDone()  { beep(660, 0.15); setTimeout(() => beep(880, 0.18), 200); }

// ── Date / profit parsers ──────────────────────────────────────────────────────

const MONTHS = [
  'january','february','march','april','may','june',
  'july','august','september','october','november','december',
];

const ORDINALS: Record<string, number> = {
  first:1, second:2, third:3, fourth:4, fifth:5, sixth:6, seventh:7, eighth:8,
  ninth:9, tenth:10, eleventh:11, twelfth:12, thirteenth:13, fourteenth:14,
  fifteenth:15, sixteenth:16, seventeenth:17, eighteenth:18, nineteenth:19,
  twentieth:20, 'twenty first':21, 'twenty second':22, 'twenty third':23,
  'twenty fourth':24, 'twenty fifth':25, 'twenty sixth':26, 'twenty seventh':27,
  'twenty eighth':28, 'twenty ninth':29, thirtieth:30, 'thirty first':31,
};

const WEEKDAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

function todayStr() { return new Date().toISOString().split('T')[0]; }

function parseSpokenDate(raw: string): string | null {
  const t = raw.toLowerCase().replace(/\b(the|uh|um|a|an)\b/g, ' ').replace(/\s+/g, ' ').trim();

  if (t.includes('today')) return todayStr();
  if (t.includes('yesterday')) {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }

  const lastM = t.match(/last (\w+)/);
  if (lastM) {
    const idx = WEEKDAYS.indexOf(lastM[1]);
    if (idx !== -1) {
      const d = new Date();
      const diff = ((d.getDay() - idx + 7) % 7) || 7;
      d.setDate(d.getDate() - diff);
      return d.toISOString().split('T')[0];
    }
  }

  for (let mi = 0; mi < MONTHS.length; mi++) {
    if (!t.includes(MONTHS[mi])) continue;
    const rest = t.replace(MONTHS[mi], '').replace(/\s+/g, ' ').trim();
    const numM = rest.match(/\b(\d{1,2})\b/);
    if (numM) {
      const day = parseInt(numM[1]);
      if (day >= 1 && day <= 31)
        return new Date(new Date().getFullYear(), mi, day).toISOString().split('T')[0];
    }
    // try multi-word ordinals first, then single
    const sortedOrdinals = Object.entries(ORDINALS).sort((a, b) => b[0].length - a[0].length);
    for (const [word, num] of sortedOrdinals) {
      if (rest.includes(word))
        return new Date(new Date().getFullYear(), mi, num).toISOString().split('T')[0];
    }
  }
  return null;
}

function parseSpokenProfit(raw: string): number | null {
  const t = raw.toLowerCase();
  const negative = /\b(minus|negative|loss|lost|neg)\b/.test(t) || t.trim().startsWith('-');
  const numM = t.replace(/[^\d.]/g, ' ').trim().match(/\d+(\.\d+)?/);
  if (!numM) return null;
  const val = parseFloat(numM[0]);
  return isNaN(val) ? null : (negative ? -val : val);
}

// ── Screenshot helper ──────────────────────────────────────────────────────────

async function captureScreenshot(): Promise<Blob> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: false });
  const video = document.createElement('video');
  video.srcObject = stream;
  await new Promise<void>(r => { video.onloadedmetadata = () => r(); });
  await video.play();
  await new Promise(r => setTimeout(r, 150));
  const canvas = document.createElement('canvas');
  canvas.width  = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d')!.drawImage(video, 0, 0);
  stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
  return new Promise((res, rej) =>
    canvas.toBlob(b => b ? res(b) : rej(new Error('blob fail')), 'image/jpeg', 0.85),
  );
}

async function uploadScreenshot(blob: Blob, token: string): Promise<string | null> {
  try {
    const res = await fetch('/api/upload-screenshot', {
      method: 'POST',
      headers: {
        'Content-Type': 'image/jpeg',
        'Authorization': `Bearer ${token}`,
      },
      body: blob,
    });
    if (!res.ok) return null;
    const { url } = await res.json();
    return url ?? null;
  } catch {
    return null;
  }
}

// ── Page component ─────────────────────────────────────────────────────────────

export default function SessionDetailPage() {
  const { user, loading } = useAuth();
  const router    = useRouter();
  const params    = useParams();
  const sessionId = params.id as string;

  const [session,    setSession]    = useState<SessionDetail | null>(null);
  const [trades,     setTrades]     = useState<Trade[]>([]);
  const [step,       setStep]       = useState<FlowStep>('idle');
  const [transcript, setTranscript] = useState('');
  const [error,      setError]      = useState('');
  const [draft,      setDraft]      = useState<Draft>({
    description: '', tradeDate: todayStr(), profit: null,
    screenshotBlob: null, screenshotPreview: null,
  });

  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recogRef        = useRef<SR | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (user) loadData();
  }, [user, loading]);

  async function loadData() {
    const [{ data: sData }, { data: tData }] = await Promise.all([
      supabase
        .from('sessions')
        .select('id, title, notes, strategy_id, strategies(name, instrument)')
        .eq('id', sessionId)
        .single(),
      supabase
        .from('trades')
        .select('*')
        .eq('session_id', sessionId)
        .order('trade_date', { ascending: false }),
    ]);
    setSession(sData as unknown as SessionDetail);
    setTrades((tData as Trade[]) || []);
  }

  // ── Speech helper ────────────────────────────────────────────────────────────

  function listenOnce(): Promise<string> {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) { reject(new Error('Speech recognition not supported. Please use Chrome.')); return; }

      let finalText = '';
      const recog: SR = new SR();
      recog.continuous     = true;
      recog.interimResults = true;
      recog.lang           = 'en-US';
      recogRef.current     = recog;

      recog.onresult = (e: SR) => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        finalText = Array.from(e.results as SR[]).map((r: SR) => r[0].transcript).join(' ');
        setTranscript(finalText);
        silenceTimerRef.current = setTimeout(() => recog.stop(), 1200);
      };

      recog.onend   = ()        => resolve(finalText);
      recog.onerror = (e: SR)   => {
        if (e.error !== 'aborted' && e.error !== 'no-speech') reject(new Error(e.error));
        else resolve(finalText);
      };

      recog.start();
    });
  }

  // ── Main flow ────────────────────────────────────────────────────────────────

  async function startFlow() {
    setError('');
    setDraft({ description: '', tradeDate: todayStr(), profit: null, screenshotBlob: null, screenshotPreview: null });

    // 1. Screenshot
    setStep('screenshot');
    let screenshotBlob: Blob | null    = null;
    let screenshotPreview: string | null = null;
    try {
      screenshotBlob    = await captureScreenshot();
      screenshotPreview = URL.createObjectURL(screenshotBlob);
    } catch { /* user cancelled share dialog — continue without screenshot */ }

    // 2. Describe
    beepReady();
    setStep('desc');
    setTranscript('');
    let description = '';
    try { description = await listenOnce(); }
    catch (e: unknown) { setError((e as Error).message); setStep('idle'); return; }

    // 3. Date
    beepReady();
    setStep('date');
    setTranscript('');
    let dateText = '';
    try { dateText = await listenOnce(); }
    catch (e: unknown) { setError((e as Error).message); setStep('idle'); return; }
    const tradeDate = parseSpokenDate(dateText) ?? todayStr();

    // 4. Profit
    beepReady();
    setStep('profit');
    setTranscript('');
    let profitText = '';
    try { profitText = await listenOnce(); }
    catch (e: unknown) { setError((e as Error).message); setStep('idle'); return; }
    const profit = parseSpokenProfit(profitText);

    // 5. Review
    setDraft({ description, tradeDate, profit, screenshotBlob, screenshotPreview });
    beepDone();
    setStep('review');
  }

  async function saveTrade() {
    if (!user) return;
    setStep('saving');
    setError('');

    let screenshotUrl: string | null = null;
    if (draft.screenshotBlob) {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const token = authSession?.access_token ?? '';
      screenshotUrl = await uploadScreenshot(draft.screenshotBlob, token);
    }

    const profit = draft.profit ?? 0;
    const { error: err } = await supabase.from('trades').insert({
      user_id:        user.id,
      session_id:     sessionId,
      trade_date:     draft.tradeDate,
      description:    draft.description,
      profit,
      outcome:        profit >= 0 ? 'win' : 'loss',
      screenshot_url: screenshotUrl,
    });

    if (err) { setError(err.message); setStep('review'); return; }
    if (draft.screenshotPreview) URL.revokeObjectURL(draft.screenshotPreview);
    setStep('idle');
    loadData();
  }

  function cancelReview() {
    if (draft.screenshotPreview) URL.revokeObjectURL(draft.screenshotPreview);
    setDraft({ description: '', tradeDate: todayStr(), profit: null, screenshotBlob: null, screenshotPreview: null });
    setStep('idle');
  }

  if (loading || !user || !session) return null;

  const strat = session.strategies;

  return (
    <main className="shell">
      <div className="page-head">
        <Link href="/sessions" className="back-link">← Sessions</Link>
        <h1>{session.title ?? strat?.name ?? 'Session'}</h1>
        <p>{strat?.name} · {strat?.instrument}{session.notes ? ` · ${session.notes}` : ''}</p>
      </div>

      {/* Voice logger */}
      <article className="panel voice-card">
        {step === 'idle' && (
          <div className="voice-idle">
            <p className="voice-hint">Ready to log a trade.</p>
            <button className="btn-log" onClick={startFlow}>🎙 Log trade</button>
            {error && <p className="form-error" style={{ marginTop: 8 }}>{error}</p>}
          </div>
        )}

        {step === 'screenshot' && (
          <div className="voice-status-wrap">
            <div className="voice-spinner" />
            <p className="voice-status-label">Capturing screenshot…</p>
            <p className="muted">Pick your chart window in the browser share prompt</p>
          </div>
        )}

        {(step === 'desc' || step === 'date' || step === 'profit') && (
          <div className="voice-recording">
            <div className="mic-pulse-wrap">
              <span className="mic-pulse" />
              <span className="mic-icon">🎙</span>
            </div>
            <p className="voice-status-label">
              {step === 'desc'   && 'Describe the trade…'}
              {step === 'date'   && 'What date was this trade?'}
              {step === 'profit' && 'Profit or loss? (e.g. "plus 120" or "minus 45")'}
            </p>
            <p className="transcript-live">
              {transcript || <em className="muted">Listening…</em>}
            </p>
          </div>
        )}

        {step === 'review' && (
          <div className="voice-review">
            <h3>Review before saving</h3>
            <div className="draft-grid">
              {draft.screenshotPreview && (
                <div className="draft-screenshot">
                  <img src={draft.screenshotPreview} alt="Screenshot" />
                </div>
              )}
              <div className="draft-fields">
                <div className="draft-item">
                  <span className="draft-label">Description</span>
                  <input
                    value={draft.description}
                    onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                  />
                </div>
                <div className="draft-item">
                  <span className="draft-label">Date</span>
                  <input
                    type="date"
                    value={draft.tradeDate}
                    onChange={e => setDraft(d => ({ ...d, tradeDate: e.target.value }))}
                  />
                </div>
                <div className="draft-item">
                  <span className="draft-label">Profit / Loss ($)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={draft.profit ?? ''}
                    onChange={e => setDraft(d => ({ ...d, profit: parseFloat(e.target.value) || null }))}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
            {error && <p className="form-error">{error}</p>}
            <div className="review-actions">
              <button onClick={saveTrade}>Save trade</button>
              <button
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#bfcae2' }}
                onClick={cancelReview}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {step === 'saving' && (
          <div className="voice-status-wrap">
            <div className="voice-spinner" />
            <p className="voice-status-label">Saving trade…</p>
          </div>
        )}
      </article>

      {/* Trades list */}
      <article className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head">
          <h2>Trades logged</h2>
          <span>{trades.length}</span>
        </div>
        {trades.length === 0 && <p className="muted">No trades yet — log one above.</p>}
        <div className="stack">
          {trades.map(t => (
            <div key={t.id} className={`trade-item ${t.outcome ?? ''}`}>
              <div className="trade-main">
                {t.screenshot_url && (
                  <a href={t.screenshot_url} target="_blank" rel="noopener noreferrer">
                    <img className="trade-thumb" src={t.screenshot_url} alt="chart" />
                  </a>
                )}
                <div className="trade-body">
                  <p className="trade-desc">{t.description}</p>
                  <span className="trade-date muted">{t.trade_date}</span>
                </div>
              </div>
              <span className={`trade-pnl ${(t.profit ?? 0) >= 0 ? 'win' : 'loss'}`}>
                {(t.profit ?? 0) >= 0 ? '+' : ''}{t.profit}
              </span>
            </div>
          ))}
        </div>
      </article>
    </main>
  );
}
