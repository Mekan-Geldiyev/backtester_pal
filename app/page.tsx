import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="shell">
      <section className="hero-home hero-grid">
        <div>
          <p className="eyebrow">BackTPal</p>
          <h1>Trade journaling that feels like a command center.</h1>
          <p className="lede">
            Capture voice notes in seconds, keep each strategy separated, and review true day-by-day results without clutter.
          </p>
          <div className="hero-cta">
            <Link href="/register" className="btn-primary">Start free</Link>
            <Link href="/login" className="btn-secondary">Log in</Link>
          </div>
        </div>
        <aside className="hero-aside panel">
          <p className="eyebrow">Live Workflow</p>
          <div className="hero-bullets">
            <p><strong>1.</strong> Create a strategy and instrument pair.</p>
            <p><strong>2.</strong> Start a session and log trades by voice.</p>
            <p><strong>3.</strong> Review PnL heatmap on your calendar.</p>
          </div>
        </aside>
      </section>

      <section className="home-cards">
        <article className="home-card">
          <p className="home-card-icon">🎯</p>
          <h2>Single-strategy sessions</h2>
          <p>Keep your testing clean by locking each session to exactly one strategy.</p>
        </article>
        <article className="home-card">
          <p className="home-card-icon">🧠</p>
          <h2>Voice trade capture</h2>
          <p>Log outcome, date, and context quickly with less keyboard friction.</p>
        </article>
        <article className="home-card">
          <p className="home-card-icon">📈</p>
          <h2>Date-true review</h2>
          <p>Analyze your performance by the actual trade date, not log timestamp.</p>
        </article>
      </section>

      <section className="landing-features">
        <article className="feature">
          <p className="feature-icon">🧭</p>
          <h3>Focused by design</h3>
          <p>No noisy dashboards. Just strategy, session, trade, and result.</p>
        </article>
        <article className="feature">
          <p className="feature-icon">⚡</p>
          <h3>Fast enough for flow state</h3>
          <p>Capture while testing so your memory never fades before you log.</p>
        </article>
        <article className="feature">
          <p className="feature-icon">🗓️</p>
          <h3>Weekly rhythm insights</h3>
          <p>Spot profitable weeks and review what changed when your edge slipped.</p>
        </article>
      </section>

      <section className="hero-cta home-bottom-cta">
        <Link href="/register" className="btn-primary">Create your workspace</Link>
        <Link href="/strategies" className="btn-secondary">View strategies</Link>
      </section>
    </main>
  );
}
