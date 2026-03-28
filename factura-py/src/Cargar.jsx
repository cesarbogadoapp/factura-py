import { useState } from 'react'
import { collection, addDoc } from 'firebase/firestore'
import { db } from './firebase'

export default function Cargar({ userId, onSuccess }) {
  const [modo, setModo] = useState(null) // 'xml' | 'ai' | 'manual'

  return (
    <div style={s.wrap}>
      {!modo && <Selector onSelect={setModo} />}
      {modo === 'xml' && <CargaXML userId={userId} onSuccess={onSuccess} onBack={() => setModo(null)} />}
      {modo === 'ai' && <CargaAI userId={userId} onSuccess={onSuccess} onBack={() => setModo(null)} />}
      {modo === 'manual' && <CargaManual userId={userId} onSuccess={onSuccess} onBack={() => setModo(null)} />}
    </div>
  )
}

function Selector({ onSelect }) {
  return (
    <div>
      <h2 style={s.title}>Cargar factura</h2>
      <div style={s.opciones}>
        <OpcionCard
          icono="📋"
          titulo="XML Electrónico"
          desc="Factura electrónica oficial de la SET. Extracción automática perfecta."
          badge="Recomendado"
          onClick={() => onSelect('xml')}
        />
        <OpcionCard
          icono="📸"
          titulo="Foto o PDF"
          desc="Fotografiá una factura en papel o subí un PDF. La IA extrae los datos automáticamente."
          badge="Con IA"
          onClick={() => onSelect('ai')}
        />
        <OpcionCard
          icono="✏️"
          titulo="Manual"
          desc="Completá los datos vos mismo. Para facturas en papel o cuando no tenés el archivo."
          onClick={() => onSelect('manual')}
        />
      </div>
    </div>
  )
}

function OpcionCard({ icono, titulo, desc, badge, onClick }) {
  return (
    <div style={s.opCard} onClick={onClick}>
      <div style={s.opIcono}>{icono}</div>
      <div style={s.opBody}>
        <div style={s.opTitulo}>
          {titulo}
          {badge && <span style={s.opBadge}>{badge}</span>}
        </div>
        <div style={s.opDesc}>{desc}</div>
      </div>
      <span style={s.opArrow}>→</span>
    </div>
  )
}

function CargaXML({ userId, onSuccess, onBack }) {
  const [estado, setEstado] = useState('idle') // idle | procesando | preview | guardando | error
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
        const get = (tag) => xml.querySelector(tag)?.textContent?.trim() || ''

        const factura = {
          tipo: 'Compra',
          numero: `${get('dEst')}-${get('dPunExp')}-${get('dNumDoc')}`.replace(/^-+|-+$/g, '') || get('id') || '',
          nombre: get('xNomRec') || get('xNomEmi') || '',
          ruc: get('dRucRec') || get('dRucEmi') || '',
          email: get('dEmailRec') || '',
          telefono: get('dTelRec') || '',
          direccion: get('dDirRec') || '',
          fecha: (get('dFeEmiDe') || get('dFecFirma') || '').split('T')[0] || new Date().toISOString().split('T')[0],
          condicion: get('iCondOpe') === '1' ? 'Contado' : get('iCondOpe') === '2' ? 'Crédito' : 'Contado',
          timbrado: get('dNumTim') || '',
          total: parseFloat(get('dTotGralOpe') || get('dTotImp') || 0),
          exentas: parseFloat(get('dTotExe') || 0),
          base5: parseFloat(get('dTotBas5') || 0),
          base10: parseFloat(get('dTotBas10') || 0),
          ivaTotal: parseFloat(get('dTotIVA') || get('dIVA') || 0),
          fuente: 'XML',
          userId,
          creadoEn: new Date().toISOString(),
        }

        // Si no se detectó bien el total del IVA, calcularlo
        if (!factura.ivaTotal) {
          factura.ivaTotal = Math.round(factura.base5 * 0.05) + Math.round(factura.base10 * 0.10)
        }

        setDatos(factura)
        setEstado('preview')
      } catch (err) {
        setEstado('error')
        setError('No se pudo leer el XML. Verificá que sea una factura electrónica válida.')
      }
    }
    reader.readAsText(file, 'UTF-8')
  }

  const guardar = async () => {
    setEstado('guardando')
    await addDoc(collection(db, 'facturas'), datos)
    onSuccess()
  }

  return (
    <div>
      <button style={s.backBtn} onClick={onBack}>← Volver</button>
      <h2 style={s.title}>Cargar XML electrónico</h2>

      {estado === 'idle' && (
        <label style={s.dropZone}>
          <div style={s.dropIcono}>📋</div>
          <div style={s.dropTitle}>Seleccioná el archivo XML</div>
          <div style={s.dropSub}>El archivo que te envía el proveedor o el que descargás de la SET</div>
          <input type="file" accept=".xml" onChange={procesarXML} style={{ display: 'none' }} />
        </label>
      )}

      {estado === 'procesando' && <div style={s.loading}>Procesando XML...</div>}
      {estado === 'error' && <div style={s.errorMsg}>{error}</div>}

      {estado === 'preview' && datos && (
        <div>
          <div style={s.previewCard}>
            <div style={s.previewTitle}>Vista previa — revisá los datos antes de guardar</div>
            <FormFactura datos={datos} onChange={setDatos} />
          </div>
          <div style={s.previewActions}>
            <button style={s.cancelBtn} onClick={onBack}>Cancelar</button>
            <button style={s.saveBtn} onClick={guardar}>Guardar factura</button>
          </div>
        </div>
      )}

      {estado === 'guardando' && <div style={s.loading}>Guardando...</div>}
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
      const toBase64 = (f) => new Promise((res, rej) => {
        const r = new FileReader()
        r.onload = () => res(r.result.split(',')[1])
        r.onerror = rej
        r.readAsDataURL(f)
      })

      const base64 = await toBase64(file)
      const mediaType = file.type || 'image/jpeg'
      const isPDF = file.type === 'application/pdf'

      const content = isPDF
        ? [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }, { type: 'text', text: PROMPT_EXTRACCION }]
        : [{ type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } }, { type: 'text', text: PROMPT_EXTRACCION }]

      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, messages: [{ role: 'user', content }] })
      })

      const data = await response.json()
      const text = data.content?.[0]?.text || ''
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)

      setDatos({ ...parsed, userId, fuente: isPDF ? 'PDF' : 'Foto', creadoEn: new Date().toISOString() })
      setEstado('preview')
    } catch (err) {
      setEstado('error')
      setError('No se pudieron extraer los datos. Intentá con una imagen más clara o cargála manualmente.')
    }
  }

  const guardar = async () => {
    setEstado('guardando')
    await addDoc(collection(db, 'facturas'), datos)
    onSuccess()
  }

  return (
    <div>
      <button style={s.backBtn} onClick={onBack}>← Volver</button>
      <h2 style={s.title}>Cargar con IA (foto o PDF)</h2>

      {estado === 'idle' && (
        <label style={s.dropZone}>
          <div style={s.dropIcono}>📸</div>
          <div style={s.dropTitle}>Seleccioná foto o PDF</div>
          <div style={s.dropSub}>JPG, PNG o PDF — la IA extrae todos los datos automáticamente</div>
          <input type="file" accept="image/*,.pdf" onChange={procesarArchivo} style={{ display: 'none' }} />
        </label>
      )}

      {estado === 'procesando' && (
        <div style={s.loading}>
          <div style={{ marginBottom: 8 }}>Analizando con IA...</div>
          <div style={{ fontSize: 12, color: '#aaa' }}>Esto puede tardar unos segundos</div>
        </div>
      )}

      {estado === 'error' && (
        <div>
          <div style={s.errorMsg}>{error}</div>
          <button style={s.cancelBtn} onClick={() => setEstado('idle')}>Intentar de nuevo</button>
        </div>
      )}

      {estado === 'preview' && datos && (
        <div>
          <div style={s.previewCard}>
            <div style={s.previewTitle}>Vista previa — revisá y corregí si es necesario</div>
            <FormFactura datos={datos} onChange={setDatos} />
          </div>
          <div style={s.previewActions}>
            <button style={s.cancelBtn} onClick={onBack}>Cancelar</button>
            <button style={s.saveBtn} onClick={guardar}>Guardar factura</button>
          </div>
        </div>
      )}

      {estado === 'guardando' && <div style={s.loading}>Guardando...</div>}
    </div>
  )
}

function CargaManual({ userId, onSuccess, onBack }) {
  const [datos, setDatos] = useState({
    tipo: 'Compra', numero: '', nombre: '', ruc: '', email: '', telefono: '',
    direccion: '', fecha: new Date().toISOString().split('T')[0], condicion: 'Contado',
    timbrado: '', total: '', exentas: 0, base5: 0, base10: 0, ivaTotal: 0,
    fuente: 'Manual', userId, creadoEn: new Date().toISOString()
  })
  const [guardando, setGuardando] = useState(false)

  const guardar = async () => {
    if (!datos.nombre || !datos.total) { alert('Completá al menos el nombre y el total.'); return }
    setGuardando(true)
    await addDoc(collection(db, 'facturas'), { ...datos, total: parseFloat(datos.total) || 0, exentas: parseFloat(datos.exentas) || 0, base5: parseFloat(datos.base5) || 0, base10: parseFloat(datos.base10) || 0, ivaTotal: parseFloat(datos.ivaTotal) || 0 })
    onSuccess()
  }

  return (
    <div>
      <button style={s.backBtn} onClick={onBack}>← Volver</button>
      <h2 style={s.title}>Cargar factura manual</h2>
      <div style={s.previewCard}>
        <FormFactura datos={datos} onChange={setDatos} />
      </div>
      <div style={s.previewActions}>
        <button style={s.cancelBtn} onClick={onBack}>Cancelar</button>
        <button style={s.saveBtn} onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar factura'}
        </button>
      </div>
    </div>
  )
}

function FormFactura({ datos, onChange }) {
  const set = (k, v) => onChange(prev => ({ ...prev, [k]: v }))
  return (
    <div style={s.form}>
      <div style={s.formRow2}>
        <Field label="Tipo *" required>
          <select style={s.input} value={datos.tipo} onChange={e => set('tipo', e.target.value)}>
            <option>Compra</option>
            <option>Venta</option>
          </select>
        </Field>
        <Field label="N° Factura">
          <input style={s.input} value={datos.numero} onChange={e => set('numero', e.target.value)} placeholder="001-001-000001" />
        </Field>
      </div>
      <Field label="Proveedor / Cliente *" required>
        <input style={s.input} value={datos.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Nombre o Razón Social" />
      </Field>
      <div style={s.formRow2}>
        <Field label="RUC / CI">
          <input style={s.input} value={datos.ruc} onChange={e => set('ruc', e.target.value)} placeholder="12345678-9" />
        </Field>
        <Field label="Timbrado">
          <input style={s.input} value={datos.timbrado} onChange={e => set('timbrado', e.target.value)} placeholder="12345678" />
        </Field>
      </div>
      <div style={s.formRow2}>
        <Field label="Fecha *">
          <input style={s.input} type="date" value={datos.fecha} onChange={e => set('fecha', e.target.value)} />
        </Field>
        <Field label="Condición">
          <select style={s.input} value={datos.condicion} onChange={e => set('condicion', e.target.value)}>
            <option>Contado</option>
            <option>Crédito</option>
          </select>
        </Field>
      </div>
      <div style={s.divider} />
      <div style={s.formRow2}>
        <Field label="Exentas (Gs.)">
          <input style={s.input} type="number" value={datos.exentas} onChange={e => set('exentas', e.target.value)} placeholder="0" />
        </Field>
        <Field label="Base gravada 5% (Gs.)">
          <input style={s.input} type="number" value={datos.base5} onChange={e => set('base5', e.target.value)} placeholder="0" />
        </Field>
      </div>
      <div style={s.formRow2}>
        <Field label="Base gravada 10% (Gs.)">
          <input style={s.input} type="number" value={datos.base10} onChange={e => set('base10', e.target.value)} placeholder="0" />
        </Field>
        <Field label="Total IVA (Gs.)">
          <input style={s.input} type="number" value={datos.ivaTotal} onChange={e => set('ivaTotal', e.target.value)} placeholder="0" />
        </Field>
      </div>
      <Field label="Total a pagar (Gs.) *" required>
        <input style={{ ...s.input, fontWeight: 600, fontSize: 15 }} type="number" value={datos.total} onChange={e => set('total', e.target.value)} placeholder="0" />
      </Field>
    </div>
  )
}

function Field({ label, children, required }) {
  return (
    <div style={s.field}>
      <label style={s.label}>{label}{required && <span style={{ color: '#dc2626' }}> *</span>}</label>
      {children}
    </div>
  )
}

const PROMPT_EXTRACCION = `Analizá esta factura paraguaya y extraé los datos en formato JSON.
Respondé ÚNICAMENTE con el JSON, sin texto adicional ni backticks.

{
  "tipo": "Compra o Venta (si no podés determinarlo, usá Compra)",
  "numero": "número de factura ej: 001-002-0001234",
  "nombre": "nombre o razón social del emisor",
  "ruc": "RUC o CI del emisor",
  "email": "correo si aparece, sino vacío",
  "telefono": "teléfono si aparece, sino vacío",
  "direccion": "dirección si aparece, sino vacío",
  "fecha": "fecha en formato YYYY-MM-DD",
  "condicion": "Contado o Crédito",
  "timbrado": "número de timbrado si aparece",
  "total": número total sin puntos ni comas,
  "exentas": número monto exento (0 si no hay),
  "base5": número base gravada al 5% (0 si no hay),
  "base10": número base gravada al 10% (0 si no hay),
  "ivaTotal": número total IVA
}`

const s = {
  wrap: { maxWidth: 680 },
  title: { fontSize: 18, fontWeight: 600, marginBottom: 20, color: '#111' },
  backBtn: { fontSize: 13, color: '#1D9E75', background: 'none', border: 'none', fontWeight: 500, padding: 0, marginBottom: 16, display: 'block' },
  opciones: { display: 'flex', flexDirection: 'column', gap: 10 },
  opCard: { display: 'flex', alignItems: 'center', gap: 14, background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '16px 18px', cursor: 'pointer', transition: 'border-color 0.15s' },
  opIcono: { fontSize: 24, flexShrink: 0 },
  opBody: { flex: 1 },
  opTitulo: { fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 8 },
  opBadge: { fontSize: 10, padding: '2px 7px', borderRadius: 99, background: '#f0fdf8', color: '#065f46', fontWeight: 500 },
  opDesc: { fontSize: 13, color: '#888', lineHeight: 1.5 },
  opArrow: { color: '#ccc', fontSize: 16 },
  dropZone: { display: 'block', border: '2px dashed #ddd', borderRadius: 12, padding: '40px 20px', textAlign: 'center', cursor: 'pointer', background: '#fafafa', transition: 'border-color 0.15s' },
  dropIcono: { fontSize: 32, marginBottom: 10 },
  dropTitle: { fontSize: 15, fontWeight: 600, color: '#333', marginBottom: 6 },
  dropSub: { fontSize: 13, color: '#888' },
  loading: { textAlign: 'center', padding: '48px 20px', color: '#666', fontSize: 14 },
  errorMsg: { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '14px 16px', color: '#dc2626', fontSize: 13, marginBottom: 12 },
  previewCard: { background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '20px', marginBottom: 16 },
  previewTitle: { fontSize: 12, color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 16, padding: '0 0 12px', borderBottom: '1px solid #f0f0f0' },
  previewActions: { display: 'flex', justifyContent: 'flex-end', gap: 10 },
  form: {},
  formRow2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 0 },
  field: { marginBottom: 12 },
  label: { display: 'block', fontSize: 12, color: '#666', fontWeight: 500, marginBottom: 4 },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, background: '#fff', outline: 'none', color: '#111' },
  divider: { height: 1, background: '#f0f0f0', margin: '8px 0 16px' },
  cancelBtn: { padding: '8px 18px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', color: '#666', fontSize: 13 },
  saveBtn: { padding: '8px 20px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600 },
}
