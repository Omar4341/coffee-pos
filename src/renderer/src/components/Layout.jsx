import { NavLink, Outlet } from 'react-router-dom'
import logoImg from '../assets/logo.png'
import './Layout.css'

const navItems = [
  { path: '/inventory', label: 'المخزون', icon: '📦' },
  { path: '/orders', label: 'الطلبات', icon: '🛒' },
  { path: '/finance', label: 'المالية', icon: '💰' },
  { path: '/customers', label: 'العملاء', icon: '👥' }
]

function Layout() {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src={logoImg} alt="بن العريشي" className="sidebar-logo" />
          <span className="subtitle">سيستم بن العريشي</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
