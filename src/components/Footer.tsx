export default function Footer() {
  return (
    <footer style={{
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
        <span style={{ color: 'var(--accent)' }}>~/</span>dhruv - Vite + React + TypeScript
      </span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', color: 'var(--text-dim)' }}>
        © {new Date().getFullYear()} Dhruv Choudhary
      </span>
    </footer>
  );
}
