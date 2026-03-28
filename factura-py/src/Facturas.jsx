import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, orderBy, doc, deleteDoc } from 'firebase/firestore'
import { db } from './firebase'

const fmt = (n) => Math.round(n || 0).toLocaleString('es-PY')

export default function Facturas({ userId }) {
  const [facturas, setFacturas] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('Todos')
  const [detalle, setDetalle] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'facturas'), where('userId', '==', userId), orderBy('fecha', 'desc'))
    return onSnapshot(q, snap => { setFacturas(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false) })
  }, [userId])

  const filtradas = facturas.filter(f => {
    const matchTipo = filtroTipo === 'Todos' || f.tipo === filtroTipo
    const matchBusq = !busqueda || f.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || f.numero?.includes(busqueda) || f.ruc?.includes(busqueda)
    return matchTipo && matchBusq
  })

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar esta factura?')) return
    await deleteDoc(doc(db, 'facturas', id))
    setDetalle(null)
  }

  const exportarCSV = () => {
    const headers = ['Tipo','N° Factura','Proveedor/Cliente','RUC','Fecha','Total Gs.','Exentas','Base 5%','IVA 5%','Base 10%','IVA 10%','Total IVA','Fuente']
    const rows = filtradas.map(f => [f.tipo,f.numero,f.nombre,f.ruc,f.fecha,f.total,f.exentas,f.base5,Math.round((f.base5||0)*0.05),f.base10,Math.round((f.base10||0)*0.10),f.ivaTotal,f.fuente])
    const csv = [headers,...rows].map(r => r.map(v => `"${v||''}"`).join(';')).join('\n')
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,\uFEFF'+encodeURIComponent(csv); a.download=`movimientos_${new Date().toISOString().split('T')[0]}.csv`; a.click()
  }

  if (loading) return <Loader />
  if (detalle) return <DetalleFactura factura={detalle} onClose={() => setDetalle(null)} onDelete={() => eliminar(detalle.id)} />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>Facturas</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>{filtradas.length} de {facturas.length} movimientos</p>
        </div>
        <button onClick={exportarCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 8, fontSize: 12, color: 'var(--text2)', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          CSV
        </button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#45455a" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input placeholder="Buscar por nombre, RUC o número..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 32px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text)' }} />
        </div>
        <div className="filter-row" style={{ display: 'flex', gap: 6 }}>
          {['Todos','Compra','Venta'].map(t => (
            <button key={t} onClick={() => setFiltroTipo(t)} style={{ flex: 1, padding: '7px 12px', borderRadius: 8, border: '1px solid', fontSize: 13, fontWeight: 500, borderColor: filtroTipo === t ? 'rgba(124,106,247,0.5)' : 'var(--border)', background: filtroTipo === t ? 'var(--accent-glow)' : 'var(--bg2)', color: filtroTipo === t ? 'var(--accent)' : 'var(--text2)' }}>{t}</button>
          ))}
        </div>
      </div>

      {filtradas.length === 0
        ? <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 48, fontSize: 14 }}>Sin resultados</div>
        : <>
            {/* Mobile: cards */}
            <div className="mobile-cards" style={{ display: 'none' }}>
              <style>{`@media (max-width: 768px) { .mobile-cards { display: flex !important; flex-direction: column; gap: 8px; } .desktop-table { display: none !important; } }`}</style>
              {filtradas.map(f => (
                <div key={f.id} onClick={() => setDetalle(f)} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', flex: 1, marginRight: 8 }}>{f.nombre}</div>
                    <Badge tipo={f.tipo} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'DM Mono', fontSize: 11, color: 'var(--text3)' }}>{f.numero} · {f.fecha}</span>
                    <span style={{ fontFamily: 'DM Mono', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Gs. {fmt(f.total)}</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop: table */}
            <div className="desktop-table" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 600 }}>
                  <thead>
                    <tr>{['N° Factura','Proveedor / Cliente','Fecha','Tipo','IVA','Total Gs.',''].map(h => (
                      <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 10, color: 'var(--text3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--bg3)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {filtradas.map(f => (
                      <tr key={f.id} className="row-hover" style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)' }} onClick={() => setDetalle(f)}>
                        <td style={td}><span style={{ fontFamily: 'DM Mono', fontSize: 11, color: 'var(--text3)' }}>{f.numero}</span></td>
                        <td style={{ ...td, fontWeight: 500, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.nombre}</td>
                        <td style={{ ...td, color: 'var(--text2)', whiteSpace: 'nowrap' }}>{f.fecha}</td>
                        <td style={td}><Badge tipo={f.tipo} /></td>
                        <td style={{ ...td, fontFamily: 'DM Mono', fontSize: 12, color: 'var(--text2)' }}>Gs. {fmt(f.ivaTotal)}</td>
                        <td style={{ ...td, fontWeight: 700, fontFamily: 'DM Mono', fontSize: 13 }}>Gs. {fmt(f.total)}</td>
                        <td style={td} onClick={e => { e.stopPropagation(); eliminar(f.id) }}>
                          <button style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text3)', padding: '2px 7px', fontSize: 11 }}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
      }
    </div>
  )
}

function DetalleFactura({ factura: f, onClose, onDelete }) {
  const iva5 = Math.round((f.base5 || 0) * 0.05)
  const iva10 = Math.round((f.base10 || 0) * 0.10)
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button onClick={onClose} style={{ fontSize: 13, color: 'var(--text2)', background: 'none', border: 'none', fontWeight: 500 }}>← Volver</button>
        <button onClick={onDelete} style={{ fontSize: 12, color: 'var(--red)', background: 'var(--red-bg)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 7, padding: '6px 12px' }}>Eliminar</button>
      </div>
      <div className="detail-card" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', maxWidth: 560 }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{f.tipo === 'Compra' ? 'Factura de compra' : 'Factura de venta'}</div>
            <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'DM Mono', color: 'var(--text)', wordBreak: 'break-all' }}>{f.numero}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
            <Badge tipo={f.tipo} />
            <FuenteBadge fuente={f.fuente} />
          </div>
        </div>
        <Section title="Proveedor / Cliente">
          <Row label="Nombre" value={f.nombre} bold />
          <Row label="RUC / CI" value={f.ruc} mono />
          {f.email && <Row label="Correo" value={f.email} />}
          {f.telefono && <Row label="Teléfono" value={f.telefono} />}
        </Section>
        <Section title="Información">
          <Row label="Fecha" value={f.fecha} />
          <Row label="Condición" value={f.condicion || 'Contado'} />
          {f.timbrado && <Row label="Timbrado" value={f.timbrado} mono />}
        </Section>
        <Section title="Impuestos">
          {f.exentas > 0 && <Row label="Exentas" value={`Gs. ${fmt(f.exentas)}`} />}
          {f.base5 > 0 && <><Row label="Base 5%" value={`Gs. ${fmt(f.base5)}`} /><Row label="IVA 5%" value={`Gs. ${fmt(iva5)}`} accent="#7c6af7" /></>}
          {f.base10 > 0 && <><Row label="Base 10%" value={`Gs. ${fmt(f.base10)}`} /><Row label="IVA 10%" value={`Gs. ${fmt(iva10)}`} accent="#fbbf24" /></>}
          <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
          <Row label="Total IVA" value={`Gs. ${fmt(f.ivaTotal)}`} bold />
        </Section>
        <div style={{ padding: '16px 20px', background: 'var(--bg3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--text2)' }}>Total a pagar</span>
          <span style={{ fontSize: 22, fontWeight: 700, fontFamily: 'DM Mono', color: 'var(--text)' }}>Gs. {fmt(f.total)}</span>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}><div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, marginBottom: 8 }}>{title}</div>{children}</div>
}
function Row({ label, value, bold, mono, accent }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', gap: 12 }}><span style={{ color: 'var(--text2)', fontSize: 13, flexShrink: 0 }}>{label}</span><span style={{ fontSize: 13, fontWeight: bold ? 600 : 400, color: accent || 'var(--text)', fontFamily: mono ? 'DM Mono' : 'inherit', textAlign: 'right', wordBreak: 'break-word' }}>{value}</span></div>
}
function Badge({ tipo }) {
  const c = tipo === 'Compra' ? { bg: 'var(--blue-bg)', color: 'var(--blue)' } : { bg: 'var(--green-bg)', color: 'var(--green)' }
  return <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 99, fontWeight: 500, background: c.bg, color: c.color, whiteSpace: 'nowrap' }}>{tipo}</span>
}
function FuenteBadge({ fuente }) {
  return <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'var(--bg4)', color: 'var(--text3)', fontWeight: 500 }}>{fuente}</span>
}
function Loader() {
  return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div style={{ width: 24, height: 24, border: '2px solid var(--bg4)', borderTop: '2px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /></div>
}
const td = { padding: '11px 14px', color: 'var(--text)' }
