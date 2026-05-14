import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="shell">
      <section className="hero-home">
        <p className="eyebrow">BackTPal</p>
        <h1>Voice-first trade journaling for serious backtesting.</h1>
        <p className="lede">
          Capture trades faster, keep strategies organized, and review performance by actual trade date.
        </p>
        <div className="hero-cta">
          <Link href="/register" className="btn-primary">Create account</Link>
          <Link href="/login" className="btn-secondary">Log in</Link>
        </div>
      </section>

      <section className="landing-features">
        <article className="feature">
          <p className="feature-icon">🎙️</p>
          <h3>Voice-first capture</h3>
          <p>Record trade notes fast without breaking your testing flow.</p>
        </article>
        <article className="feature">
          <p className="feature-icon">🗂️</p>
          <h3>Strategy organization</h3>
          <p>Keep sessions locked to one strategy so your data stays clean.</p>
        </article>
        <article className="feature">
          <p className="feature-icon">📅</p>
          <h3>Date-true analytics</h3>
          <p>See winning days and weeks based on the real trade date.</p>
        </article>
      </section>
    </main>
  );
}
