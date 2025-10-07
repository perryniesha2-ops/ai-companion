// app/page.tsx
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="landing-shell">
      {/* Gradient icon badge */}
      <div style={{ display: 'grid', placeItems: 'center' }}>
        <div
          aria-hidden
          style={{
            width: 84,
            height: 84,
            borderRadius: 999,
            background: 'linear-gradient(135deg, var(--grad-from), var(--grad-to))',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            boxShadow: '0 10px 30px rgba(124,58,237,.25)',
            border: '6px solid #fff',
          }}
        >
          <span style={{ fontSize: 30, transform: 'translateY(-1px)' }}>♡</span>
        </div>
      </div>

      <h1 className="hero-title">Your AI Companion</h1>
      <p className="hero-sub">
        An AI companion that remembers, grows with you, and helps
        you become your best self
      </p>

      {/* Feature cards */}
      <section className="features">
        <div className="card center" style={{ padding: '26px 18px' }}>
          <div className="icon" aria-hidden>🧠</div>
          <h3 style={{ margin: '6px 0 4px' }}>Remembers Everything</h3>
          <p className="muted">Builds genuine connection through memory</p>
        </div>

        <div className="card center" style={{ padding: '26px 18px' }}>
          <div className="icon" aria-hidden>🌱</div>
          <h3 style={{ margin: '6px 0 4px' }}>Helps You Grow</h3>
          <p className="muted">Personal development through conversation</p>
        </div>

        <div className="card center" style={{ padding: '26px 18px' }}>
          <div className="icon" aria-hidden>💛</div>
          <h3 style={{ margin: '6px 0 4px' }}>Always There</h3>
          <p className="muted">24/7 companionship and support</p>
        </div>
      </section>

      {/* CTA */}
      <Link href="/auth/signup" className="btn-grad" style={{ fontSize: 18, padding: '14px 28px' }}>
        Get Started Free
      </Link>
    </main>
  );
}
