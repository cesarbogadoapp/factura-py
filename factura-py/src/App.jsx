import { useState, useEffect } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider } from './firebase'
import Dashboard from './Dashboard'
import Facturas from './Facturas'
import Cargar from './Cargar'
import Perfil from './Perfil'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('dashboard')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false) })
  }, [])

  const login = async () => {
    try { await signInWithPopup(auth, googleProvider) } catch (e) { console.error(e) }
  }

  const navigate = (v) => { setView(v); setMenuOpen(false) }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, border: '2px solid #1f1f28', borderTop: '2px solid #7c6af7', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (!user) return <LoginScreen onLogin={login} />

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-8px) } to { opacity: 1; transform: translateY(0) } }
        .nav-item { transition: color 0.15s, background 0.15s; }
        .nav-item:hover { color: #f0f0f5 !important; background: rgba(255,255,255,0.05) !important; }
        .card-hover { transition: border-color 0.2s, transform 0.15s; }
        .card-hover:hover { border-color: rgba(255,255,255,0.14) !important; transform: translateY(-1px); }
        .row-hover:hover td { background: rgba(255,255,255,0.025) !important; }
        .btn-primary { transition: background 0.15s, box-shadow 0.15s; }
        .btn-primary:hover { background: #6b5ae0 !important; box-shadow: 0 0 20px rgba(124,106,247,0.3) !important; }
        .op-card { transition: border-color 0.2s, background 0.2s; }
        .op-card:hover { border-color: rgba(124,106,247,0.4) !important; background: rgba(124,106,247,0.05) !important; }
        input:focus, select:focus { outline: none; border-color: rgba(124,106,247,0.5) !important; }
        .mobile-menu { animation: slideDown 0.2s ease; }
        .desktop-nav { display: flex; }
        .mobile-hamburger { display: none; }
        .bottom-nav { display: none; }
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-hamburger { display: flex !important; }
          .bottom-nav { display: flex !important; }
          .metrics-grid { grid-template-columns: 1fr 1fr !important; }
          .chart-grid { grid-template-columns: 1fr !important; }
          .form-grid { grid-template-columns: 1fr !important; }
          .table-wrap { overflow-x: auto; }
          .hide-mobile { display: none !important; }
          .detail-card { max-width: 100% !important; }
        }
        @media (max-width: 480px) {
          .metrics-grid { grid-template-columns: 1fr !important; }
          .filter-row { flex-direction: column !important; }
          .filter-row button { width: 100% !important; }
        }
      `}</style>

      {/* Header */}
      <header style={{ background: 'rgba(12,12,15,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', padding: '0 16px', display: 'flex', alignItems: 'center', height: 56, gap: 12, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <div style={{ width: 28, height: 28, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text)', textTransform: 'uppercase' }}>Gestión de Movimientos</span>
        </div>

        {/* Desktop nav */}
        <nav className="desktop-nav" style={{ gap: 2 }}>
          {[['dashboard','Dashboard'],['facturas','Facturas'],['cargar','Cargar'],['perfil','Perfil']].map(([v, label]) => (
            <button key={v} className="nav-item" onClick={() => navigate(v)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 500, background: view === v ? 'rgba(124,106,247,0.15)' : 'transparent', color: view === v ? 'var(--accent)' : 'var(--text2)' }}>{label}</button>
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src={user.photoURL} alt="" style={{ width: 28, height: 28, borderRadius: '50%', border: '1.5px solid var(--border2)' }} />
          <button onClick={() => signOut(auth)} className="hide-mobile" style={{ fontSize: 12, color: 'var(--text3)', background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px' }}>Salir</button>
          {/* Hamburger */}
          <button className="mobile-hamburger" onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'none', border: 'none', color: 'var(--text2)', padding: 4, display: 'none', alignItems: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {menuOpen ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="mobile-menu" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderTop: 'none', padding: '8px 12px 12px', position: 'sticky', top: 56, zIndex: 99 }}>
          {[['dashboard','Dashboard'],['facturas','Facturas'],['cargar','Cargar'],['perfil','Perfil']].map(([v, label]) => (
            <button key={v} onClick={() => navigate(v)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', background: view === v ? 'rgba(124,106,247,0.1)' : 'transparent', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, color: view === v ? 'var(--accent)' : 'var(--text2)', marginBottom: 2 }}>{label}</button>
          ))}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8 }}>
            <button onClick={() => signOut(auth)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', background: 'transparent', border: 'none', borderRadius: 8, fontSize: 14, color: 'var(--text3)' }}>Cerrar sesión</button>
          </div>
        </div>
      )}

      <main style={{ flex: 1, padding: '20px 16px', maxWidth: 1100, width: '100%', margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>
        {view === 'dashboard' && <Dashboard userId={user.uid} onNavigate={navigate} />}
        {view === 'facturas' && <Facturas userId={user.uid} />}
        {view === 'cargar' && <Cargar userId={user.uid} onSuccess={() => navigate('facturas')} />}
        {view === 'perfil' && <Perfil userId={user.uid} onClose={() => navigate('dashboard')} />}
      </main>

      {/* Bottom nav mobile */}
      <nav className="bottom-nav" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(17,17,21,0.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid var(--border)', padding: '8px 0 max(8px, env(safe-area-inset-bottom))', zIndex: 100, justifyContent: 'space-around', display: 'none' }}>
        {[['dashboard', 'Dashboard', <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>],
          ['facturas', 'Facturas', <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>],
          ['cargar', 'Cargar', <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>],
          ['perfil', 'Perfil', <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>]
        ].map(([v, label, icon]) => (
          <button key={v} onClick={() => navigate(v)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', color: view === v ? 'var(--accent)' : 'var(--text3)', fontSize: 10, fontWeight: 500, padding: '4px 20px', fontFamily: 'inherit' }}>
            {icon}
            {label}
          </button>
        ))}
      </nav>

      {/* Spacer for bottom nav on mobile */}
      <div className="bottom-nav-spacer" style={{ height: 0 }} />
      <style>{`.bottom-nav { display: none; } @media (max-width: 768px) { .bottom-nav { display: flex !important; } .bottom-nav-spacer { height: 70px !important; } }`}</style>
    </div>
  )
}

function LoginScreen({ onLogin }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 16 }}>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }`}</style>
      <div style={{ position: 'absolute', width: '90vw', maxWidth: 500, height: 500, background: 'radial-gradient(circle, rgba(124,106,247,0.08) 0%, transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }} />
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 20, padding: '40px 32px', textAlign: 'center', width: '100%', maxWidth: 340, animation: 'fadeIn 0.4s ease', position: 'relative' }}>
        <div style={{ width: 48, height: 48, background: 'var(--accent)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase' }}>Bienvenido</div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Gestión de Movimientos</h1>
        <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 28, lineHeight: 1.6 }}>Administrá tus facturas de compra y venta en un solo lugar</p>
        <button onClick={onLogin} style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', width: '100%', padding: '12px 20px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 10, fontSize: 14, fontWeight: 500, color: 'var(--text)', cursor: 'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.29-8.16 2.29-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Continuar con Google
        </button>
      </div>
    </div>
  )
}
