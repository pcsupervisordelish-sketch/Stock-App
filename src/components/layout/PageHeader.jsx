export default function PageHeader({ title, subtitle, right }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
      <div>
        <h1 style={{ marginBottom: subtitle ? 4 : 0 }}>{title}</h1>
        {subtitle && <p style={{ color: 'var(--color-text-muted)', fontSize: 16, margin: 0 }}>{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}
