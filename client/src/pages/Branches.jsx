import { useEffect, useState } from 'react';
import http from '../services/http';
import { useAuth } from '../modules/auth/AuthContext';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBranches } from '../store/slices/branchesSlice';

export default function Branches(){
  const { user } = useAuth();
  const dispatch = useDispatch();
  const branches = useSelector(s => s.branches.list);
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ code:'', name:'', address:'', phone:'' });
  const [assign, setAssign] = useState({ code:'', userId:'' });
  const [users, setUsers] = useState([]);

  const reload = async () => {
    const elevated = user?.role === 'admin' || user?.role === 'owner';
    const url = elevated ? '/api/branches/with-managers' : '/api/branches';
    const res = await http.get(url);
    setList(res.data || []);
  };

  useEffect(()=>{ reload(); },[]);
  useEffect(()=>{ dispatch(fetchBranches()); }, [dispatch]);
  useEffect(()=>{
    (async () => {
      try {
        const res = await http.get('/auth/users');
        setUsers(Array.isArray(res.data?.users) ? res.data.users : []);
      } catch {
        setUsers([]);
      }
    })();
  },[]);

  const create = async (e) => {
    e && e.preventDefault();
    await http.post('/api/branches', form);
    setForm({ code:'', name:'', address:'', phone:'' });
    reload();
  };

  const doAssign = async (e) => {
    e && e.preventDefault();
    if (!assign.code || !assign.userId) return;
    await http.patch(`/api/branches/${assign.code}/assign`, { userId: assign.userId });
    setAssign({ code:'', userId:'' });
    reload();
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

  return (
    <div>
      <h2>Branches</h2>
      {!isAdmin && <p>You have access to: {(branches||[]).map(b=>b.code).join(', ')}</p>}

      {isAdmin && (
        <div className="card" style={{marginBottom:16}}>
          <h3>Create Branch</h3>
          <form onSubmit={create}>
            <input placeholder="Code" value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value}))} />{' '}
            <input placeholder="Name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />{' '}
            <input placeholder="Address" value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))} />{' '}
            <input placeholder="Phone" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} />{' '}
            <button type="submit">Create</button>
          </form>
        </div>
      )}

      {isAdmin && (
        <div className="card" style={{marginBottom:16}}>
          <h3>Assign Manager to Branch</h3>
          <form onSubmit={doAssign}>
            <select value={assign.code} onChange={e=>setAssign(a=>({...a,code:e.target.value}))}>
              <option value="">Select branch</option>
              {list.map(b=> <option key={b.code} value={b.code}>{b.name} ({b.code})</option>)}
            </select>{' '}
            <select value={assign.userId} onChange={e=>setAssign(a=>({...a,userId:e.target.value}))}>
              <option value="">Select manager</option>
              {users.filter(u => u.role !== 'admin').map(u => (
                <option key={u._id} value={u._id}>{u.name} — {u.email}</option>
              ))}
            </select>{' '}
            <button type="submit">Assign</button>
          </form>
        </div>
      )}

      <div className="card">
        <h3>All Visible Branches</h3>
        <ul>
          {list.map(b => (
            <li key={b.code}>
              {b.name} — {b.code}{b.phone ? ` — ${b.phone}` : ''}
              {Array.isArray(b.managers) && b.managers.length > 0 && (
                <div style={{ marginLeft: 12, opacity: 0.85 }}>
                  Managers: {b.managers.map(m => `${m.name || 'User'} <${m.email || ''}>`).join(', ')}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
