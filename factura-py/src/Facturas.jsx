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
    return onSnapshot(q, snap => {
      setFacturas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
  }, [userId])

  const filtradas = facturas.filter(f => {
    const matchTipo = filtroTipo === 'Todos' || f.tipo === filtroTipo
    const matchBusq = !busqueda || f.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || f.numero?.includes(busqueda) || f.ruc?.includes(busqueda)
    return matchTipo && matchBusq
  })

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar esta factura?')) return
    await deleteDoc(doc(db, 'facturas', id))
  }

  const exportarCSV = () => {
    const headers = ['Tipo','N° Factura','Proveedor/Cliente','RUC','Fecha','Total Gs.','Exentas','Base 5%','IVA 5%','Base 10%','IVA 10%','Total IVA','Fuente']
    const rows = filtradas.map(f => [
      f.tipo, f.numero, f.nombre, f.ruc, f.fecha,
      f.total, f.exentas, f.base5, Math.round((f.base5||0)*0.05),
      f.base10, Math.round((f.base10||0)*0.10), f.ivaTotal, f.fuente
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v||''}"`).join(';')).join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv)
    a.download = `facturas_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (loading) return <div style={s.loading}>Cargando...</div>

  if (detalle) return <DetalleFactura factura={detalle} onClose={() => setDetalle(null)} onDelete={() => { eliminar(detalle.id); setDetalle(null) }} />

  return (
    <div>
      <div style={s.toolbar}>
        <div style={s.toolbarLeft}>
          <span style={s.count}>{filtradas.length} facturas</span>
        </div>
        <div style={s.toolbarRight}>
          <input
            placeholder="Buscar por nombre, RUC o N°..."
            style={s.search}
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
          <select style={s.select} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
            <option>Todos</option>
            <option>Compra</option>
            <option>Venta</option>
          </select>
          <button style={s.csvBtn} onClick={exportarCSV}>Exportar CSV</button>
        </div>
      </div>

      {filtradas.length === 0
        ? <div style={s.empty}>No hay facturas{busqueda ? ` para "${busqueda}"` : ''}.</div>
        : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['N° Factura','Proveedor/Cliente','RUC','Fecha','Tipo','IVA Total','Total Gs.',''].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtradas.map(f => (
                  <tr key={f.id} style={s.tr} onClick={() => setDetalle(f)}>
                    <td style={s.td}><span style={s.mono}>{f.numero}</span></td>
                    <td style={{ ...s.td, fontWeight: 500, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.nombre}</td>
                    <td style={s.td}><span style={s.mono}>{f.ruc}</span></td>
                    <td style={s.td}>{f.fecha}</td>
                    <td style={s.td}><Badge tipo={f.tipo} /></td>
                    <td style={s.td}>Gs. {fmt(f.ivaTotal)}</td>
                    <td style={{ ...s.td, fontWeight: 600 }}>Gs. {fmt(f.total)}</td>
                    <td style={s.td} onClick={e => { e.stopPropagation(); eliminar(f.id) }}>
                      <button style={s.delBtn}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  )
}

function DetalleFactura({ factura: f, onClose, onDelete }) {
  const fmt = (n) => Math.round(n || 0).toLocaleString('es-PY')
  const iva5 = Math.round((f.base5 || 0) * 0.05)
  const iva10 = Math.round((f.base10 || 0) * 0.10)

  return (
    <div>
      <div style={s.detailHeader}>
        <button style={s.backBtn} onClick={onClose}>← Volver</button>
        <button style={s.deleteBtn} onClick={onDelete}>Eliminar factura</button>
      </div>

      <div style={s.detailCard}>
        <div style={s.detailTop}>
          <div>
            <div style={s.detailLabel}>{f.tipo === 'Compra' ? 'Factura de compra' : 'Factura de venta'}</div>
            <div style={s.detailNum}>{f.numero}</div>
          </div>
          <Badge tipo={f.tipo} />
        </div>

        <Section title="Datos del " label={f.tipo === 'Compra' ? 'Proveedor' : 'Cliente'}>
          <Row label="Nombre / Razón social" value={f.nombre} bold />
          <Row label="RUC / CI" value={f.ruc} />
          {f.email && <Row label="Correo" value={f.email} />}
          {f.telefono && <Row label="Teléfono" value={f.telefono} />}
          {f.direccion && <Row label="Dirección" value={f.direccion} />}
        </Section>

        <Section title="Información general">
          <Row label="Fecha de emisión" value={f.fecha} />
          <Row label="Condición de venta" value={f.condicion || 'Contado'} />
          <Row label="Moneda" value="Guaraní (PYG)" />
          <Row label="Timbrado" value={f.timbrado || '—'} />
          <Row label="Fuente" value={<FuenteBadge fuente={f.fuente} />} />
        </Section>

        <Section title="Desglose de importes">
          {(f.exentas > 0) && <Row label="Exentas" value={`Gs. ${fmt(f.exentas)}`} />}
          {(f.base5 > 0) && <>
            <Row label="Base gravada 5%" value={`Gs. ${fmt(f.base5)}`} />
            <Row label="IVA 5%" value={<span style={{ color: '#5b21b6', fontWeight: 500 }}>Gs. {fmt(iva5)}</span>} />
          </>}
          {(f.base10 > 0) && <>
            <Row label="Base gravada 10%" value={`Gs. ${fmt(f.base10)}`} />
            <Row label="IVA 10%" value={<span style={{ color: '#92400e', fontWeight: 500 }}>Gs. {fmt(iva10)}</span>} />
          </>}
          <div style={s.divider} />
          <Row label="Total IVA" value={`Gs. ${fmt(f.ivaTotal)}`} bold />
        </Section>

        <div style={s.totalBar}>
          <span style={s.totalLabel}>Total a pagar</span>
          <span style={s.totalValue}>Gs. {fmt(f.total)}</span>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={s.section}>
      <div style={s.sectionTitle}>{title}</div>
      {children}
    </div>
  )
}

function Row({ label, value, bold }) {
  return (
    <div style={s.row}>
      <span style={s.rowLabel}>{label}</span>
      <span style={{ ...s.rowValue, fontWeight: bold ? 600 : 400 }}>{value}</span>
    </div>
  )
}

function Badge({ tipo }) {
  const c = tipo === 'Compra' ? { bg: '#eff6ff', color: '#1d4ed8' } : { bg: '#f0fdf4', color: '#15803d' }
  return <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, fontWeight: 500, background: c.bg, color: c.color }}>{tipo}</span>
}

function FuenteBadge({ fuente }) {
  const colors = { XML: '#1d4ed8', PDF: '#7c3aed', Foto: '#b45309', Manual: '#374151' }
  return <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#f5f5f5', color: colors[fuente] || '#555', fontWeight: 500 }}>{fuente}</span>
}

const s = {
  loading: { padding: 40, textAlign: 'center', color: '#888' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 },
  toolbarLeft: {},
  toolbarRight: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  count: { fontSize: 14, fontWeight: 600, color: '#333' },
  search: { padding: '7px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, width: 240, outline: 'none' },
  select: { padding: '7px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, background: '#fff' },
  csvBtn: { padding: '7px 14px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, background: '#fff', color: '#444' },
  empty: { textAlign: 'center', color: '#888', padding: 48, fontSize: 14 },
  tableWrap: { background: '#fff', borderRadius: 12, border: '1px solid #eee', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '10px 12px', textAlign: 'left', fontSize: 11, color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', background: '#fafafa', borderBottom: '1px solid #eee' },
  tr: { borderBottom: '1px solid #f5f5f5', cursor: 'pointer', transition: 'background 0.1s' },
  td: { padding: '11px 12px', color: '#333' },
  mono: { fontFamily: 'monospace', fontSize: 12, color: '#666' },
  delBtn: { background: 'none', border: '1px solid #eee', borderRadius: 6, color: '#ccc', padding: '2px 6px', fontSize: 11 },
  detailHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  backBtn: { fontSize: 13, color: '#1D9E75', background: 'none', border: 'none', fontWeight: 500, padding: 0 },
  deleteBtn: { fontSize: 12, color: '#dc2626', background: 'none', border: '1px solid #fecaca', borderRadius: 6, padding: '5px 12px' },
  detailCard: { background: '#fff', borderRadius: 12, border: '1px solid #eee', overflow: 'hidden', maxWidth: 600 },
  detailTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px 20px', background: '#fafafa', borderBottom: '1px solid #eee' },
  detailLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 },
  detailNum: { fontSize: 18, fontWeight: 600, color: '#111' },
  section: { padding: '14px 20px', borderBottom: '1px solid #f5f5f5' },
  sectionTitle: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, fontWeight: 500 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' },
  rowLabel: { color: '#888', fontSize: 13 },
  rowValue: { fontSize: 13, color: '#111', textAlign: 'right', maxWidth: '60%' },
  divider: { height: 1, background: '#f0f0f0', margin: '8px 0' },
  totalBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#fafafa' },
  totalLabel: { fontSize: 14, fontWeight: 500, color: '#555' },
  totalValue: { fontSize: 22, fontWeight: 700, color: '#111' },
}
