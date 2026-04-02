import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase'

export default function Perfil({ userId, onClose }) {
  const [ruc, setRuc] = useState('')
  const [nombre, setNombre] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDoc(doc(db, 'perfiles', userId)).then(d => {
      if (d.exists()) { setRuc(d.data().ruc || ''); setNombre(d.data().nombre || '') }
      setLoading(false)
    })
  }, [userId])

  const guardar = async () => {
    if (!ruc.trim()) { alert('Ingresá tu RUC'); return }
    setGuardando(true)
    await setDoc(doc(db, 'perfiles', userId), { ruc: ruc.trim(), nombre: nombre.trim(), updatedAt: new Date().toISOString() })
    setGuardando(false)
    setGuardado(true)
    setTimeout(() => { setGuardado(false); if (onClose) onClose() }, 1200)
  }

  if (loading) return null

  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Mi perfil</h1>
        <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.6 }}>
          Ingresá tu RUC para que la app detecte automáticamente si sos emisor o receptor en cada factura XML.
        </p>
      </div>

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Tu nombre o razón social</label>
          <input style={inputStyle} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: CÉSAR JAVIER BOGADO COLMÁN" />
        </div>
        <div style={{ marginBottom: 6 }}>
          <label style={labelStyle}>Tu RUC *</label>
          <input style={inputStyle} value={ruc} onChange={e => setRuc(e.target.value)} placeholder="Ej: 5617279-6" />
        </div>
        <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 20, lineHeight: 1.6 }}>
          Con tu RUC registrado, al subir un XML la app sabrá si la factura es una Venta (vos la emitiste) o una Compra (te la emitieron), y cargará automáticamente los datos de la contraparte.
        </p>
        <button onClick={guardar} disabled={guardando} className="btn-primary" style={{ width: '100%', padding: '10px', background: guardado ? 'var(--green)' : 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontSize: 14, fontWeight: 600 }}>
          {guardado ? '✓ Guardado' : guardando ? 'Guardando...' : 'Guardar perfil'}
        </button>
      </div>

      <div style={{ marginTop: 14, background: 'var(--amber-bg)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
        <div style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 500, marginBottom: 3 }}>¿Por qué necesito esto?</div>
        <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
          En un XML electrónico paraguayo siempre hay un emisor y un receptor. Sin saber cuál es tu RUC, la app no puede saber cuál rol sos vos en cada transacción.
        </div>
      </div>
    </div>
  )
}

export async function obtenerPerfil(userId) {
  const d = await getDoc(doc(db, 'perfiles', userId))
  return d.exists() ? d.data() : null
}

const labelStyle = { display: 'block', fontSize: 11, color: 'var(--text3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }
const inputStyle = { width: '100%', padding: '9px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text)', outline: 'none' }
