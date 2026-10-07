export default function AppLoading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading page content" style={{ padding: '2rem 1.5rem' }}>
      <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
        Loading page content…
      </p>
      <div aria-hidden="true" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[0, 1, 2, 3].map((item) => <div key={item} className="skeleton" style={{ height: 88 }} />)}
      </div>
      <div aria-hidden="true" className="skeleton" style={{ height: 32, width: '42%', marginBottom: '1rem' }} />
      <div aria-hidden="true" className="skeleton" style={{ height: 220, width: '100%' }} />
    </div>
  )
}
