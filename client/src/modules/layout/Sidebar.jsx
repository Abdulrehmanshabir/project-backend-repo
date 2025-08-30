import { NavLink } from 'react-router-dom';
import './layout.css';

export default function Sidebar({ role }){
  const isAdmin = role === 'admin';
  return (
    <aside className="sidebar">
      <div className="brand">Vape Hub</div>
      <nav className="nav">
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/products">Products</NavLink>
        <NavLink to="/stock">Stock</NavLink>
        <NavLink to="/pos">POS</NavLink>
        <NavLink to="/reports">Reports</NavLink>
        {isAdmin && <NavLink className="admin" to="/branches">Branches</NavLink>}
        {isAdmin && <NavLink className="admin" to="/users">Users</NavLink>}
        <NavLink to="/logout">Logout</NavLink>
      </nav>
    </aside>
  );
}

