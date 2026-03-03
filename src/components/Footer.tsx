export default function Footer() {
  return (
    <>
      <footer className="site-footer" style={{
        borderTop: '1px solid var(--border)',
        padding: '28px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.73rem', color: 'var(--text-dim)' }}>
          <span style={{ color: 'var(--accent)' }}>~/</span>dhruv - built with a lot of coffee
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', color: 'var(--text-dim)' }}>
          © {new Date().getFullYear()} Dhruv Choudhary
        </span>
      </footer>
      <style>{`
        @media (max-width: 480px) {
          .site-footer { padding: 22px 16px !important; }
        }
      `}</style>
    </>
  );
}
