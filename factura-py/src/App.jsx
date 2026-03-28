import { useState, useEffect } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider } from './firebase'
import Dashboard from './Dashboard'
import Facturas from './Facturas'
import Cargar from './Cargar'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('dashboard')

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  const login = async () => {
    try { await signInWithPopup(auth, googleProvider) }
    catch (e) { console.error(e) }
  }

  if (loading) return (
    <div style={styles.center}>
      <div style={styles.spinner} />
    </div>
  )

  if (!user) return (
    <div style={styles.center}>
      <div style={styles.loginCard}>
        <div style={styles.loginLogo}>📄</div>
        <h1 style={styles.loginTitle}>FacturaPY</h1>
        <p style={styles.loginSub}>Gestión de facturas electrónicas</p>
        <button style={styles.googleBtn} onClick={login}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.29-8.16 2.29-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Iniciar sesión con Google
        </button>
      </div>
    </div>
  )

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>📄 FacturaPY</span>
        </div>
        <nav style={styles.nav}>
          {['dashboard','facturas','cargar'].map(v => (
            <button
              key={v}
              style={{ ...styles.navBtn, ...(view === v ? styles.navBtnActive : {}) }}
              onClick={() => setView(v)}
            >
              {{ dashboard: 'Dashboard', facturas: 'Facturas', cargar: 'Cargar' }[v]}
            </button>
          ))}
        </nav>
        <div style={styles.headerRight}>
          <img src={user.photoURL} alt="" style={styles.avatar} />
          <button style={styles.logoutBtn} onClick={() => signOut(auth)}>Salir</button>
        </div>
      </header>

      <main style={styles.main}>
        {view === 'dashboard' && <Dashboard userId={user.uid} onNavigate={setView} />}
        {view === 'facturas' && <Facturas userId={user.uid} />}
        {view === 'cargar' && <Cargar userId={user.uid} onSuccess={() => setView('facturas')} />}
      </main>
    </div>
  )
}

const styles = {
  app: { minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  center: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' },
  spinner: { width: 32, height: 32, border: '3px solid #e0e0e0', borderTop: '3px solid #1D9E75', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  loginCard: { background: '#fff', borderRadius: 16, padding: '40px 36px', textAlign: 'center', boxShadow: '0 2px 20px rgba(0,0,0,0.08)', width: 320 },
  loginLogo: { fontSize: 40, marginBottom: 12 },
  loginTitle: { fontSize: 24, fontWeight: 600, marginBottom: 6 },
  loginSub: { color: '#666', marginBottom: 28, fontSize: 14 },
  googleBtn: { display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', width: '100%', padding: '11px 20px', background: '#fff', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#333', transition: 'background 0.15s' },
  header: { background: '#fff', borderBottom: '1px solid #eee', padding: '0 20px', display: 'flex', alignItems: 'center', height: 56, gap: 16, position: 'sticky', top: 0, zIndex: 100 },
  headerLeft: { flex: 1 },
  logo: { fontSize: 16, fontWeight: 600, color: '#1a1a1a' },
  nav: { display: 'flex', gap: 4 },
  navBtn: { padding: '6px 14px', borderRadius: 8, border: '1px solid transparent', background: 'transparent', color: '#666', fontSize: 13, fontWeight: 500, transition: 'all 0.15s' },
  navBtnActive: { background: '#f0fdf8', border: '1px solid #a7f3d0', color: '#065f46' },
  headerRight: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 },
  avatar: { width: 30, height: 30, borderRadius: '50%', border: '2px solid #eee' },
  logoutBtn: { fontSize: 12, color: '#999', background: 'none', border: 'none', padding: '4px 8px' },
  main: { flex: 1, padding: '20px', maxWidth: 1100, width: '100%', margin: '0 auto' },
}
