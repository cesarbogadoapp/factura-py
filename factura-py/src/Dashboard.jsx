import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore'
import { db } from './firebase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const fmt = (n) => Math.round(n || 0).toLocaleString('es-PY')

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1f1f28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: '#8888a0', marginBottom: 2 }}>{label}</div>
      <div style={{ color: '#f0f0f5', fontWeight: 600 }}>Gs. {fmt(payload[0].value)}</div>
    </div>
  )
}

export default function Dashboard({ userId, onNavigate }) {
  const [facturas, setFacturas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'facturas'), where('userId', '==', userId), orderBy('fecha', 'desc'))
    return onSnapshot(q, (snap) => { setFacturas(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false) })
  }, [userId])

  const compras = facturas.filter(f => f.tipo === 'Compra')
  const ventas = facturas.filter(f => f.tipo === 'Venta')
  const totalCompras = compras.reduce((s, f) => s + (f.total || 0), 0)
  const totalVentas = ventas.reduce((s, f) => s + (f.total || 0), 0)
  const totalIva = facturas.reduce((s, f) => s + (f.ivaTotal || 0), 0)
  const balance = totalVentas - totalCompras
  const iva5 = facturas.reduce((s, f) => s + Math.round((f.base5 || 0) * 0.05), 0)
  const iva10 = facturas.reduce((s, f) => s + Math.round((f.base10 || 0) * 0.10), 0)
  const barData = [{ name: 'Compras', valor: totalCompras }, { name: 'Ventas', valor: totalVentas }]
  const pieData = [{ name: 'IVA 5%', value: iva5 }, { name: 'IVA 10%', value: iva10 }].filter(d => d.value > 0)

  if (loading) return <Loader />

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>Dashboard</h1>
        <p style={{ color: 'var(--text2)', fontSize: 13 }}>{facturas.length} movimientos registrados</p>
      </div>

      <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        <MetricCard icon="↑" label="Ventas" value={`Gs. ${fmt(totalVentas)}`} sub={`${ventas.length} facturas`} color="var(--green)" bg="var(--green-bg)" />
        <MetricCard icon="↓" label="Compras" value={`Gs. ${fmt(totalCompras)}`} sub={`${compras.length} facturas`} color="var(--red)" bg="var(--red-bg)" />
        <MetricCard icon="=" label="Balance" value={`Gs. ${fmt(balance)}`} sub={balance >= 0 ? 'Positivo' : 'Negativo'} color={balance >= 0 ? 'var(--green)' : 'var(--red)'} bg={balance >= 0 ? 'var(--green-bg)' : 'var(--red-bg)'} />
        <MetricCard icon="%" label="IVA total" value={`Gs. ${fmt(totalIva)}`} sub="acumulado" color="var(--accent)" bg="var(--accent-glow)" />
      </div>

      <div className="chart-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div style={card}>
          <div style={cardTitle}>Compras vs Ventas</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={barData} barSize={36}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#8888a0' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#8888a0' }} tickFormatter={v => `${(v/1000000).toFixed(1)}M`} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="valor" radius={[5,5,0,0]}><Cell fill="#3ecf8e" /><Cell fill="#f87171" /></Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={card}>
          <div style={cardTitle}>Distribución IVA</div>
          {pieData.length === 0
            ? <div style={{ color: 'var(--text3)', fontSize: 13, padding: '32px 0', textAlign: 'center' }}>Sin datos aún</div>
            : <>
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={58} dataKey="value" paddingAngle={3}><Cell fill="#7c6af7" /><Cell fill="#3ecf8e" /></Pie><Tooltip content={<CustomTooltip />} /></PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 4 }}>
                  {pieData.map((d, i) => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text2)' }}>
                      <div style={{ width: 7, height: 7, borderRadius: 2, background: i === 0 ? '#7c6af7' : '#3ecf8e' }} />
                      {d.name}
                    </div>
                  ))}
                </div>
              </>
          }
        </div>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={cardTitle}>Últimos movimientos</div>
          <button onClick={() => onNavigate('facturas')} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', fontWeight: 500 }}>Ver todos →</button>
        </div>
        {facturas.length === 0 ? <EmptyState onNavigate={onNavigate} /> : <MiniTable facturas={facturas.slice(0, 5)} />}
      </div>
    </div>
  )
}

function MetricCard({ icon, label, value, sub, color, bg }) {
  return (
    <div className="card-hover" style={{ background: bg, border: `1px solid ${color}22`, borderRadius: 'var(--radius-lg)', padding: '14px 16px', cursor: 'default' }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color, marginBottom: 3, wordBreak: 'break-word' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{sub}</div>
    </div>
  )
}

function MiniTable({ facturas }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 400 }}>
        <thead>
          <tr>{['N° Factura','Proveedor','Fecha','Tipo','Total'].map(h => (
            <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, color: 'var(--text3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
          ))}</tr>
        </thead>
        <tbody>
          {facturas.map(f => (
            <tr key={f.id} className="row-hover">
              <td style={td}><span style={{ fontFamily: 'DM Mono', fontSize: 11, color: 'var(--text3)' }}>{f.numero}</span></td>
              <td style={{ ...td, fontWeight: 500, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.nombre}</td>
              <td style={{ ...td, color: 'var(--text2)', whiteSpace: 'nowrap' }}>{f.fecha}</td>
              <td style={td}><Badge tipo={f.tipo} /></td>
              <td style={{ ...td, fontWeight: 600, fontFamily: 'DM Mono', fontSize: 12, whiteSpace: 'nowrap' }}>Gs. {fmt(f.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EmptyState({ onNavigate }) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 20px' }}>
      <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.3 }}>📄</div>
      <div style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 14 }}>Todavía no cargaste facturas</div>
      <button onClick={() => onNavigate('cargar')} style={{ fontSize: 13, color: 'var(--accent)', background: 'var(--accent-glow)', border: '1px solid rgba(124,106,247,0.3)', borderRadius: 8, padding: '8px 16px', fontWeight: 500 }}>Cargar primera factura →</button>
    </div>
  )
}

function Badge({ tipo }) {
  const c = tipo === 'Compra' ? { bg: 'var(--blue-bg)', color: 'var(--blue)' } : { bg: 'var(--green-bg)', color: 'var(--green)' }
  return <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 99, fontWeight: 500, background: c.bg, color: c.color, whiteSpace: 'nowrap' }}>{tipo}</span>
}

function Loader() {
  return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div style={{ width: 24, height: 24, border: '2px solid var(--bg4)', borderTop: '2px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /></div>
}

const card = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }
const cardTitle = { fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }
const td = { padding: '10px 10px', color: 'var(--text)', borderBottom: '1px solid var(--border)' }
