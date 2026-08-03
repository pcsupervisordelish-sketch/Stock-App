export default function Card({ children, style, onClick, as: As = 'div', ...rest }) {
  return (
    <As
      onClick={onClick}
      style={{
        background: 'white',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)',
        padding: 18,
        boxShadow: 'var(--shadow-card)',
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
      {...rest}
    >
      {children}
    </As>
  )
}
