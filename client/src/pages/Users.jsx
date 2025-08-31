import { useEffect, useState } from 'react';
import http from '../services/http';
import { useAuth } from '../modules/auth/AuthContext';

export default function Users(){
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true); setErr('');
    http.get('/auth/users')
      .then(r => setRows(r.data?.users || []))
      .catch(e => setErr(e?.response?.data?.message || e.message))
      .finally(()=> setLoading(false));
  }, [isAdmin]);

  if (!isAdmin) {
    return (<div className="container"><div className="card">Forbidden: admin only.</div></div>);
  }

  return (
    <div className="container">
      <div className="card">
        <div className="row" style={{justifyContent:'space-between'}}>
          <h3>Users</h3>
          {loading && <span>Loading…</span>}
        </div>
        {err && <div style={{color:'salmon'}}>{err}</div>}
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Branches</th></tr>
          </thead>
          <tbody>
            {rows.map(u => (
              <tr key={u._id}>
                <td data-label="Name">{u.name}</td>
                <td data-label="Email">{u.email}</td>
                <td data-label="Role">{u.role || 'manager'}</td>
                <td data-label="Branches">{Array.isArray(u.branches) ? u.branches.join(', ') : (u.branches || '*')}</td>
              </tr>
            ))}
            {rows.length===0 && !loading && <tr><td colSpan={4}>No users.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
