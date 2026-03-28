import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore'
import { db } from './firebase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const fmt = (n) => Math.round(n || 0).toLocaleString('es-PY')

export default function Dashboard({ userId, onNavigate }) {
  const [facturas, setFacturas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'facturas'), where('userId', '==', userId), orderBy('fecha', 'desc'))
    return onSnapshot(q, (snap) => {
      setFacturas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
  }, [userId])

  const compras = facturas.filter(f => f.tipo === 'Compra')
  const ventas = facturas.filter(f => f.tipo === 'Venta')
  const totalCompras = compras.reduce((s, f) => s + (f.total || 0), 0)
  const totalVentas = ventas.reduce((s, f) => s + (f.total || 0), 0)
  const totalIva = facturas.reduce((s, f) => s + (f.ivaTotal || 0), 0)
  const balance = totalVentas - totalCompras

  const barData = [
    { name: 'Compras', valor: totalCompras },
    { name: 'Ventas', valor: totalVentas },
  ]

  const iva5 = facturas.reduce((s, f) => s + Math.round((f.base5 || 0) * 0.05), 0)
  const iva10 = facturas.reduce((s, f) => s + Math.round((f.base10 || 0) * 0.10), 0)
  const pieData = [
    { name: 'IVA 5%', value: iva5 },
    { name: 'IVA 10%', value: iva10 },
  ].filter(d => d.value > 0)

  const recientes = facturas.slice(0, 5)

  if (loading) return <div style={s.loading}>Cargando...</div>

  return (
    <div>
      <div style={s.metrics}>
        <MetricCard label="Total ventas" value={`Gs. ${fmt(totalVentas)}`} sub={`${ventas.length} facturas`} color="#065f46" bg="#f0fdf8" />
        <MetricCard label="Total compras" value={`Gs. ${fmt(totalCompras)}`} sub={`${compras.length} facturas`} color="#92400e" bg="#fffbeb" />
        <MetricCard label="Balance" value={`Gs. ${fmt(balance)}`} sub={balance >= 0 ? 'Positivo' : 'Negativo'} color={balance >= 0 ? '#065f46' : '#991b1b'} bg={balance >= 0 ? '#f0fdf8' : '#fef2f2'} />
        <MetricCard label="Total IVA" value={`Gs. ${fmt(totalIva)}`} sub={`${facturas.length} facturas`} color="#1e40af" bg="#eff6ff" />
      </div>

      <div style={s.chartRow}>
        <div style={s.chartCard}>
          <div style={s.chartTitle}>Compras vs Ventas</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData} barSize={48}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000000).toFixed(1)}M`} axisLine={false} tickLine={false} />
              <Tooltip formatter={v => `Gs. ${fmt(v)}`} />
              <Bar dataKey="valor" fill="#1D9E75" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {pieData.length > 0 && (
          <div style={s.chartCard}>
            <div style={s.chartTitle}>Distribución IVA</div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                  <Cell fill="#7F77DD" />
                  <Cell fill="#1D9E75" />
                </Pie>
                <Legend iconType="square" iconSize={10} formatter={(v, e) => `${v}: Gs. ${fmt(e.payload.value)}`} />
                <Tooltip formatter={v => `Gs. ${fmt(v)}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div style={s.card}>
        <div style={s.cardHeader}>
          <span style={s.chartTitle}>Últimas facturas</span>
          <button style={s.linkBtn} onClick={() => onNavigate('facturas')}>Ver todas →</button>
        </div>
        {recientes.length === 0
          ? <div style={s.empty}>Todavía no cargaste facturas. <button style={s.linkBtn} onClick={() => onNavigate('cargar')}>Cargar ahora →</button></div>
          : <MiniTable facturas={recientes} />
        }
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub, color, bg }) {
  return (
    <div style={{ ...s.metric, background: bg }}>
      <div style={s.metricLabel}>{label}</div>
      <div style={{ ...s.metricValue, color }}>{value}</div>
      <div style={s.metricSub}>{sub}</div>
    </div>
  )
}

function MiniTable({ facturas }) {
  return (
    <table style={s.table}>
      <thead>
        <tr>{['N° Factura','Proveedor/Cliente','Fecha','Tipo','Total Gs.'].map(h => (
          <th key={h} style={s.th}>{h}</th>
        ))}</tr>
      </thead>
      <tbody>
        {facturas.map(f => (
          <tr key={f.id} style={s.tr}>
            <td style={s.td}><span style={s.mono}>{f.numero}</span></td>
            <td style={{ ...s.td, fontWeight: 500 }}>{f.nombre}</td>
            <td style={s.td}>{f.fecha}</td>
            <td style={s.td}><Badge tipo={f.tipo} /></td>
            <td style={{ ...s.td, fontWeight: 500 }}>Gs. {fmt(f.total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Badge({ tipo }) {
  const colors = {
    Compra: { bg: '#eff6ff', color: '#1d4ed8' },
    Venta: { bg: '#f0fdf4', color: '#15803d' },
  }
  const c = colors[tipo] || { bg: '#f5f5f5', color: '#555' }
  return <span style={{ ...s.badge, background: c.bg, color: c.color }}>{tipo}</span>
}

const s = {
  loading: { padding: 40, textAlign: 'center', color: '#888' },
  metrics: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 },
  metric: { borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(0,0,0,0.05)' },
  metricLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 },
  metricValue: { fontSize: 18, fontWeight: 600, marginBottom: 2 },
  metricSub: { fontSize: 11, color: '#999' },
  chartRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 },
  chartCard: { background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #eee' },
  chartTitle: { fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#333' },
  card: { background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #eee' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  linkBtn: { fontSize: 12, color: '#1D9E75', background: 'none', border: 'none', fontWeight: 500, padding: 0 },
  empty: { color: '#888', fontSize: 13, padding: '20px 0', textAlign: 'center' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '8px 10px', textAlign: 'left', fontSize: 11, color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #f0f0f0' },
  tr: { borderBottom: '1px solid #f9f9f9' },
  td: { padding: '10px 10px', color: '#333', fontSize: 13 },
  mono: { fontFamily: 'monospace', fontSize: 12, color: '#666' },
  badge: { fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 500 },
}
