import { useState } from 'react'
import { collection, addDoc } from 'firebase/firestore'
import { db } from './firebase'

export default function Cargar({ userId, onSuccess }) {
  const [modo, setModo] = useState(null)
  return (
    <div style={{ maxWidth: 640 }}>
      {!modo && <Selector onSelect={setModo} />}
      {modo === 'xml' && <CargaXML userId={userId} onSuccess={onSuccess} onBack={() => setModo(null)} />}
      {modo === 'ai' && <CargaAI userId={userId} onSuccess={onSuccess} onBack={() => setModo(null)} />}
      {modo === 'manual' && <CargaManual userId={userId} onSuccess={onSuccess} onBack={() => setModo(null)} />}
    </div>
  )
}

function Selector({ onSelect }) {
  const opciones = [
    { id: 'xml', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg>, titulo: 'XML Electrónico', desc: 'Factura electrónica oficial de la SET. Extracción automática perfecta.', badge: 'Recomendado', badgeColor: 'var(--green)' },
    { id: 'ai', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>, titulo: 'Foto o PDF', desc: 'Fotografiá una factura en papel o subí un PDF. La IA extrae los datos automáticamente.', badge: 'Con IA', badgeColor: 'var(--accent)' },
    { id: 'manual', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>, titulo: 'Ingreso manual', desc: 'Completá los datos vos mismo. Para facturas en papel cuando no tenés el archivo.', badge: null },
  ]
  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Cargar factura</h1>
      <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 24 }}>Elegí cómo querés registrar el movimiento</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {opciones.map(o => (
          <button key={o.id} className="op-card" onClick={() => onSelect(o.id)} style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', textAlign: 'left', width: '100%', cursor: 'pointer' }}>
            <div style={{ width: 44, height: 44, background: 'var(--bg3)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', flexShrink: 0 }}>{o.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{o.titulo}</span>
                {o.badge && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, fontWeight: 600, background: `${o.badgeColor}18`, color: o.badgeColor, letterSpacing: '0.04em' }}>{o.badge}</span>}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{o.desc}</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        ))}
      </div>
    </div>
  )
}

function CargaXML({ userId, onSuccess, onBack }) {
  const [estado, setEstado] = useState('idle')
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')

  const procesarXML = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setEstado('procesando')
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parser = new DOMParser()
        const xml = parser.parseFromString(ev.target.result, 'text/xml')
        const get = (...tags) => { for (const tag of tags) { const v = xml.querySelector(tag)?.textContent?.trim(); if (v) return v; } return '' }

        // Nombre: buscar en todos los tags posibles del estándar SET
        const nombreEmi = get('xNomEmi','dNomEmi','xRazSocEmi','dRazSocEmi','xNomFant')
        const nombreRec = get('xNomRec','dNomRec','xRazSocRec','dRazSocRec','xNombre')
        const rucEmi = get('dRucEmi','dRUCEmi')
        const rucRec = get('dRucRec','dRUCRec','dNumDocRec')
        const est = get('dEst'); const pun = get('dPunExp','dPuntoExp'); const num = get('dNumDoc','dNroDoc')
        const numeroCompleto = (est && pun && num) ? `${est}-${pun}-${num}` : get('id','dId')

        const factura = {
          tipo: 'Compra',
          numero: numeroCompleto,
          nombre: nombreEmi || nombreRec || '',
          ruc: rucEmi || rucRec || '',
          email: get('dEmailRec','dEmail'),
          telefono: get('dTelRec','dTel','dTelEmi'),
          direccion: get('dDirRec','dDirEmi','dDir'),
          fecha: get('dFeEmiDe','dFecFirma','dFecEmi').split('T')[0] || new Date().toISOString().split('T')[0],
          condicion: get('iCondOpe') === '2' ? 'Crédito' : 'Contado',
          timbrado: get('dNumTim','dTimbrado'),
          total: parseFloat(get('dTotGralOpe','dTotImp','dTotalGral') || 0),
          exentas: parseFloat(get('dTotExe','dTotExento') || 0),
          base5: parseFloat(get('dTotBas5','dBasGravIva5') || 0),
          base10: parseFloat(get('dTotBas10','dBasGravIva10') || 0),
          ivaTotal: parseFloat(get('dTotIVA','dIVA','dTotalIva') || 0),
          fuente: 'XML', userId, creadoEn: new Date().toISOString(),
        }
        if (!factura.ivaTotal) factura.ivaTotal = Math.round(factura.base5 * 0.05) + Math.round(factura.base10 * 0.10)
        // Fallback: si nombre sigue vacío buscar cualquier nodo con "Nom" o "RazSoc"
        if (!factura.nombre) {
          const node = [...xml.querySelectorAll('*')].find(n => /nom|razsoc/i.test(n.tagName) && n.children.length === 0)
          factura.nombre = node?.textContent?.trim() || ''
        }
        setDatos(factura)
        setEstado('preview')
      } catch { setEstado('error'); setError('No se pudo leer el XML. Verificá que sea una factura electrónica válida.') }
    }
    reader.readAsText(file, 'UTF-8')
  }

  const guardar = async () => { setEstado('guardando'); await addDoc(collection(db, 'facturas'), datos); onSuccess() }

  return (
    <div>
      <BackBtn onBack={onBack} />
      <h1 style={pageTitle}>Cargar XML electrónico</h1>
      {estado === 'idle' && (
        <label style={dropZone}>
          <div style={{ color: 'var(--accent)', marginBottom: 12 }}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Seleccioná el archivo XML</div>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>El archivo .xml que te envía el proveedor o descargás de la SET</div>
          <input type="file" accept=".xml" onChange={procesarXML} style={{ display: 'none' }} />
        </label>
      )}
      {estado === 'procesando' && <LoadingState text="Procesando XML..." />}
      {estado === 'error' && <ErrorMsg msg={error} onRetry={() => setEstado('idle')} />}
      {estado === 'preview' && datos && <Preview datos={datos} onChange={setDatos} onSave={guardar} onCancel={onBack} />}
      {estado === 'guardando' && <LoadingState text="Guardando..." />}
    </div>
  )
}

function CargaAI({ userId, onSuccess, onBack }) {
  const [estado, setEstado] = useState('idle')
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')

  const procesarArchivo = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setEstado('procesando')
    try {
      const toBase64 = (f) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.onerror = rej; r.readAsDataURL(f) })
      const base64 = await toBase64(file)
      const isPDF = file.type === 'application/pdf'
      const content = isPDF
        ? [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }, { type: 'text', text: PROMPT }]
        : [{ type: 'image', source: { type: 'base64', media_type: file.type || 'image/jpeg', data: base64 } }, { type: 'text', text: PROMPT }]
      const response = await fetch('/api/claude', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, messages: [{ role: 'user', content }] }) })
      const data = await response.json()
      const text = data.content?.[0]?.text || ''
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
      setDatos({ ...parsed, userId, fuente: isPDF ? 'PDF' : 'Foto', creadoEn: new Date().toISOString() })
      setEstado('preview')
    } catch { setEstado('error'); setError('No se pudieron extraer los datos. Intentá con una imagen más clara o cargala manualmente.') }
  }

  const guardar = async () => { setEstado('guardando'); await addDoc(collection(db, 'facturas'), datos); onSuccess() }

  return (
    <div>
      <BackBtn onBack={onBack} />
      <h1 style={pageTitle}>Cargar con IA</h1>
      {estado === 'idle' && (
        <label style={dropZone}>
          <div style={{ color: 'var(--accent)', marginBottom: 12 }}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Seleccioná foto o PDF</div>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>JPG, PNG o PDF — la IA extrae todos los datos</div>
          <input type="file" accept="image/*,.pdf" onChange={procesarArchivo} style={{ display: 'none' }} />
        </label>
      )}
      {estado === 'procesando' && <LoadingState text="Analizando con IA..." sub="Esto puede tardar unos segundos" />}
      {estado === 'error' && <ErrorMsg msg={error} onRetry={() => setEstado('idle')} />}
      {estado === 'preview' && datos && <Preview datos={datos} onChange={setDatos} onSave={guardar} onCancel={onBack} />}
      {estado === 'guardando' && <LoadingState text="Guardando..." />}
    </div>
  )
}

function CargaManual({ userId, onSuccess, onBack }) {
  const [datos, setDatos] = useState({ tipo: 'Compra', numero: '', nombre: '', ruc: '', email: '', telefono: '', direccion: '', fecha: new Date().toISOString().split('T')[0], condicion: 'Contado', timbrado: '', total: '', exentas: 0, base5: 0, base10: 0, ivaTotal: 0, fuente: 'Manual', userId, creadoEn: new Date().toISOString() })
  const [guardando, setGuardando] = useState(false)
  const guardar = async () => {
    if (!datos.nombre || !datos.total) { alert('Completá al menos el nombre y el total.'); return }
    setGuardando(true)
    await addDoc(collection(db, 'facturas'), { ...datos, total: parseFloat(datos.total)||0, exentas: parseFloat(datos.exentas)||0, base5: parseFloat(datos.base5)||0, base10: parseFloat(datos.base10)||0, ivaTotal: parseFloat(datos.ivaTotal)||0 })
    onSuccess()
  }
  return (
    <div>
      <BackBtn onBack={onBack} />
      <h1 style={pageTitle}>Ingreso manual</h1>
      <div style={formCard}><FormFactura datos={datos} onChange={setDatos} /></div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <button onClick={onBack} style={btnCancel}>Cancelar</button>
        <button onClick={guardar} disabled={guardando} style={btnPrimary} className="btn-primary">{guardando ? 'Guardando...' : 'Guardar factura'}</button>
      </div>
    </div>
  )
}

function Preview({ datos, onChange, onSave, onCancel }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Revisá y corregí los datos antes de guardar
      </div>
      <div style={formCard}><FormFactura datos={datos} onChange={onChange} /></div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <button onClick={onCancel} style={btnCancel}>Cancelar</button>
        <button onClick={onSave} style={btnPrimary} className="btn-primary">Guardar factura</button>
      </div>
    </div>
  )
}

function FormFactura({ datos, onChange }) {
  const set = (k, v) => onChange(prev => ({ ...prev, [k]: v }))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <Field label="Tipo"><select style={input} value={datos.tipo} onChange={e => set('tipo', e.target.value)}><option>Compra</option><option>Venta</option></select></Field>
        <Field label="N° Factura"><input style={input} value={datos.numero} onChange={e => set('numero', e.target.value)} placeholder="001-001-000001" /></Field>
      </div>
      <Field label="Proveedor / Cliente *"><input style={input} value={datos.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Nombre o Razón Social" /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
        <Field label="RUC / CI"><input style={input} value={datos.ruc} onChange={e => set('ruc', e.target.value)} placeholder="12345678-9" /></Field>
        <Field label="Timbrado"><input style={input} value={datos.timbrado} onChange={e => set('timbrado', e.target.value)} placeholder="12345678" /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
        <Field label="Fecha"><input style={input} type="date" value={datos.fecha} onChange={e => set('fecha', e.target.value)} /></Field>
        <Field label="Condición"><select style={input} value={datos.condicion} onChange={e => set('condicion', e.target.value)}><option>Contado</option><option>Crédito</option></select></Field>
      </div>
      <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Exentas (Gs.)"><input style={input} type="number" value={datos.exentas} onChange={e => set('exentas', e.target.value)} placeholder="0" /></Field>
        <Field label="Base gravada 5% (Gs.)"><input style={input} type="number" value={datos.base5} onChange={e => set('base5', e.target.value)} placeholder="0" /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
        <Field label="Base gravada 10% (Gs.)"><input style={input} type="number" value={datos.base10} onChange={e => set('base10', e.target.value)} placeholder="0" /></Field>
        <Field label="Total IVA (Gs.)"><input style={input} type="number" value={datos.ivaTotal} onChange={e => set('ivaTotal', e.target.value)} placeholder="0" /></Field>
      </div>
      <div style={{ marginTop: 12 }}>
        <Field label="Total a pagar (Gs.) *"><input style={{ ...input, fontFamily: 'DM Mono', fontSize: 15, fontWeight: 600 }} type="number" value={datos.total} onChange={e => set('total', e.target.value)} placeholder="0" /></Field>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return <div><label style={{ display: 'block', fontSize: 11, color: 'var(--text3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>{label}</label>{children}</div>
}

function BackBtn({ onBack }) {
  return <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text2)', background: 'none', border: 'none', marginBottom: 20, fontWeight: 500 }}>← Volver</button>
}

function LoadingState({ text, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--bg4)', borderTop: '2px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
      <div style={{ color: 'var(--text2)', fontSize: 14 }}>{text}</div>
      {sub && <div style={{ color: 'var(--text3)', fontSize: 12, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function ErrorMsg({ msg, onRetry }) {
  return (
    <div style={{ background: 'var(--red-bg)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
      <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 10 }}>{msg}</div>
      <button onClick={onRetry} style={{ fontSize: 12, color: 'var(--text2)', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 12px' }}>Intentar de nuevo</button>
    </div>
  )
}

const PROMPT = `Analizá esta factura paraguaya y extraé los datos en formato JSON.
Respondé ÚNICAMENTE con el JSON, sin texto adicional ni backticks.
{"tipo":"Compra o Venta","numero":"001-002-0001234","nombre":"nombre del emisor","ruc":"RUC o CI","email":"correo o vacío","telefono":"tel o vacío","direccion":"dir o vacío","fecha":"YYYY-MM-DD","condicion":"Contado o Crédito","timbrado":"número o vacío","total":0,"exentas":0,"base5":0,"base10":0,"ivaTotal":0}`

const pageTitle = { fontSize: 22, fontWeight: 600, color: 'var(--text)', marginBottom: 20 }
const formCard = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }
const dropZone = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1.5px dashed rgba(124,106,247,0.3)', borderRadius: 'var(--radius-lg)', padding: '48px 24px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg2)', transition: 'border-color 0.2s', marginBottom: 16 }
const input = { width: '100%', padding: '9px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text)', outline: 'none' }
const btnPrimary = { padding: '9px 20px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600 }
const btnCancel = { padding: '9px 16px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg2)', color: 'var(--text2)', fontSize: 13 }
