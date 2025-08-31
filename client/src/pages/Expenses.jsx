import { useEffect, useState } from 'react';
import http from '../services/http';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentBranch } from '../store/slices/branchesSlice';
import { useEffect as useEffectReact } from 'react';
import { jwtDecode } from 'jwt-decode';

export default function Expenses(){
  const dispatch = useDispatch();
  const currentBranch = useSelector(s=>s.branches.current);
  const branches = useSelector(s=>s.branches.list);
  const token = localStorage.getItem('accessToken') || '';
  let role = '';
  try { role = jwtDecode(token)?.role || ''; } catch {}
  if (role === 'manager') return <div className="container"><p>Not allowed</p></div>;
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [kind, setKind] = useState('branch'); // 'branch' | 'user'
  const [note, setNote] = useState('');
  const [mine, setMine] = useState(false);
  const [userId, setUserId] = useState('');
  const [users, setUsers] = useState([]);
  const [attributeToEmployee, setAttributeToEmployee] = useState(true);

  const load = async ()=>{
    if (!currentBranch) return;
    // All-branches view for user expenses (admin/owner only)
    if ((role === 'admin' || role === 'owner') && currentBranch === 'all' && kind === 'user' && (mine || userId)) {
      let me = '';
      try { const d = jwtDecode(token) || {}; me = d.sub || d._id || ''; } catch {}
      const params = { userId: mine ? me : userId };
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await http.get('/api/reports/expenses/by-user', { params: { ...params, branchId: 'all' } });
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
      return;
    }
    // Default per-branch
    const params = { branchId: currentBranch, from, to };
    if (mine) params.mine = true;
    if (!mine && userId) params.userId = userId;
    if (kind) params.kind = kind;
    if (subcategory) params.subcategory = subcategory;
    const res = await http.get('/api/reports/expenses', { params });
    setItems(res.data.items || []);
    setTotal(res.data.total || 0);
  };

  useEffect(()=>{ load(); }, [currentBranch, from, to, mine, userId]);

  // Admin/owner: load users for selection
  useEffect(()=>{
    (async ()=>{
      try {
        const res = await http.get('/auth/users');
        setUsers(Array.isArray(res.data?.users) ? res.data.users : []);
      } catch { setUsers([]); }
    })();
  }, []);

  const add = async (e)=>{
  e && e.preventDefault();
  if (!currentBranch) return alert('Select a branch');
  if (kind === 'user' && !mine && !userId) return alert('Please select an employee or toggle Mine');
  const payload = { branchId: currentBranch, amount: Number(amount||0), category, subcategory, note, kind };
  if (kind === 'user') {
    if (mine) payload.mine = true;
    if (!mine && userId) {
      payload.expenseUserId = userId;
      payload.attributeToEmployee = attributeToEmployee;
    }
  }
  await http.post('/api/reports/expenses', payload);
  setAmount(''); setCategory(''); setSubcategory(''); setNote('');
  await load();
};

  return (
    <div className="container stack">
      <h1>Expenses â€” {currentBranch || 'select a branch'}</h1>
      <div className="row" style={{gap:8, alignItems:'flex-end'}}>
        <div><label>From</label><input type="date" value={from} onChange={e=>setFrom(e.target.value)} /></div>
        <div><label>To</label><input type="date" value={to} onChange={e=>setTo(e.target.value)} /></div>
        <div className="row" style={{gap:8, alignItems:'center'}}>
          <label><input type="checkbox" checked={mine} onChange={e=>setMine(e.target.checked)} /> Show mine only</label>
          <div><strong>Total:</strong> ${Number(total||0).toFixed(2)}</div>
        </div>
        <div>
          <label>Branch</label>
          <select value={currentBranch || ''} onChange={e=>dispatch(setCurrentBranch(e.target.value))}>
            <option value="">Select</option>
            {(role === 'admin' || role === 'owner') && (<option value="all">All branches</option>)}
            {(branches||[]).map(b => (<option key={b.code} value={b.code}>{b.name} ({b.code})</option>))}
          </select>
        </div>
        <div>
          <label>Type</label>
          <select value={kind} onChange={e=>{ const v=e.target.value; setKind(v); if (v==='branch') setUserId(''); }}>
            <option value="branch">Branch</option>
            <option value="user">Employee</option>
          </select>
        </div>
        {(role === 'admin' || role === 'owner') && kind === 'user' && !mine && (
          <div>
            <label>Employee</label>
            <select value={userId} onChange={e=>setUserId(e.target.value)}>
              <option value="">All</option>
              {users.map(u => (<option key={u._id} value={u._id}>{u.name} ({u.email})</option>))}
            </select>
          </div>
        )}
      </div>
      <div className="card">
        <h3>Add Expense</h3>
        <form className="row" onSubmit={add} style={{gap:8}}>
          <input type="number" placeholder="Amount" value={amount} onChange={e=>setAmount(e.target.value)} />
          <input type="text" placeholder="Category" value={category} onChange={e=>setCategory(e.target.value)} />
          <input type="text" placeholder={kind==='user' ? 'Subcategory (salary, bonus, food)' : 'Subcategory (bill, rent, repair)'} value={subcategory} onChange={e=>setSubcategory(e.target.value)} />
          <input type="text" placeholder="Note" value={note} onChange={e=>setNote(e.target.value)} />
          {(role === 'admin' || role === 'owner') && kind === 'user' && !mine && (
            <label style={{display:'flex',alignItems:'center',gap:6}}>
              <input type="checkbox" checked={attributeToEmployee} onChange={e=>setAttributeToEmployee(e.target.checked)} />
              Attribute to selected employee
            </label>
          )}
          <button className="btn" type="submit">Add</button>
        </form>
      </div>
      <div className="card">
        <h3>Entries</h3><ul>
  {items.map(it => (
    <li key={it._id}>
      {new Date(it.createdAt).toLocaleString()} - ${it.amount}
      {it.category ? ` · ${it.category}` : ''}
      {it.note ? ` · ${it.note}` : ''}
      {(it.createdByName || it.createdByEmail) ? (
        <span style={{opacity:.8}}> · by {it.createdByName || ''}{it.createdByEmail ? ` <${it.createdByEmail}>` : ''}</span>
      ) : null}
    </li>
  ))}
</ul>
      </div>
    </div>
  );
}


