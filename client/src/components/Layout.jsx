import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">💰 Our Budget</div>
          <nav className="nav">
            <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
              Dashboard
            </NavLink>
            <NavLink to="/transactions" className={({ isActive }) => (isActive ? 'active' : '')}>
              Transactions
            </NavLink>
            <NavLink to="/categories" className={({ isActive }) => (isActive ? 'active' : '')}>
              Categories
            </NavLink>
            <NavLink to="/recurring" className={({ isActive }) => (isActive ? 'active' : '')}>
              Recurring
            </NavLink>
          </nav>
          <div className="user-menu">
            <span className="user-name">{user?.name}</span>
            <button className="btn-secondary" onClick={logout}>Log out</button>
          </div>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
