import { Link, NavLink } from 'react-router-dom';
import { useMemo, useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBranches, setCurrentBranch } from '../store/slices/branchesSlice';

export default function Navbar() {
  const token = localStorage.getItem('accessToken') || '';
  const role = useMemo(() => {
    try { return jwtDecode(token)?.role || ''; } catch { return ''; }
  }, [token]);
  const isAdmin = role === 'admin' || role === 'owner';
  const dispatch = useDispatch();
  const currentBranch = useSelector(state => state.branches.current);
  const list = useSelector(state => state.branches.list);
  const [open, setOpen] = useState(false);

  useEffect(()=>{ dispatch(fetchBranches()); }, [dispatch]);

  const linkStyle = ({ isActive }) => ({
    padding: '6px 10px',
    marginRight: 8,
    borderRadius: 6,
    textDecoration: 'none',
    background: isActive ? '#eee' : '#f7f7f7',
    color: '#222',
    border: '1px solid #ddd',
  });

  return (
    <nav className="navbar" style={{ marginBottom: 16 }}>
      <div className="row" style={{ alignItems:'center', justifyContent:'space-between', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn navbar-toggle" onClick={()=>setOpen(o=>!o)} aria-label="Toggle menu">
          ☰
        </button>
        <div className={`navbar-links row ${open ? 'open' : ''}`} style={{ gap: 8, flexWrap: 'wrap' }}>
          <NavLink to="/dashboard" style={linkStyle}>Dashboard</NavLink>
          <NavLink to="/products" style={linkStyle}>Products</NavLink>
          <NavLink to="/stock" style={linkStyle}>Stock</NavLink>
          <NavLink to="/pos" style={linkStyle}>POS</NavLink>
          <NavLink to="/reports" style={linkStyle}>Reports</NavLink>
          <NavLink to="/analytics" style={linkStyle}>Analytics</NavLink>
          <NavLink to="/investments" style={linkStyle}>Investments</NavLink>
          <NavLink to="/expenses" style={linkStyle}>Expenses</NavLink>
          {isAdmin && <NavLink to="/branches" style={linkStyle}>Branches</NavLink>}
          {isAdmin && <NavLink to="/users" style={linkStyle}>Users</NavLink>}
        </div>
        <div className="row right" style={{ gap: 10, alignItems: 'center' }}>
          <span style={{
            padding: '4px 8px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: '#111827',
            color: 'var(--text)'
          }}>
            Branch: {currentBranch || '-'}
          </span>
          <Link to="/logout" className="btn">Logout</Link>
        </div>
      </div>
    </nav>
  );
}
