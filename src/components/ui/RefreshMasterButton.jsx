export default function RefreshMasterButton({ refreshing, onRefresh }) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={refreshing}
      style={{
        border: 'none',
        background: 'none',
        color: 'var(--color-primary)',
        fontSize: 14,
        fontWeight: 700,
        cursor: refreshing ? 'default' : 'pointer',
        whiteSpace: 'nowrap',
        opacity: refreshing ? 0.6 : 1
      }}
    >
      {refreshing ? 'กำลังอัปเดต...' : '🔄 รีเฟรชสินค้า'}
    </button>
  )
}
