import { useEffect, useState } from 'react';
import http from '../services/http';
import { useBranches } from '../modules/branches/BranchContext';

export default function Expenses(){
  const { currentBranch } = useBranches() || {};
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [mine, setMine] = useState(false);

  const load = async ()=>{
    if (!currentBranch) return;
    const res = await http.get('/api/reports/expenses', { params: { branchId: currentBranch, from, to, mine } });
    setItems(res.data.items || []);
    setTotal(res.data.total || 0);
  };

  useEffect(()=>{ load(); }, [currentBranch, from, to, mine]);

  const add = async (e)=>{
    e && e.preventDefault();
    await http.post('/api/reports/expenses', { amount: Number(amount||0), category, note, branchId: currentBranch });
    setAmount(''); setCategory(''); setNote('');
    load();
  };

  return (
    <div className="container stack">
      <h1>Expenses — {currentBranch || 'select a branch'}</h1>
      <div className="row" style={{gap:8, alignItems:'flex-end'}}>
        <div><label>From</label><input type="date" value={from} onChange={e=>setFrom(e.target.value)} /></div>
        <div><label>To</label><input type="date" value={to} onChange={e=>setTo(e.target.value)} /></div>
        <div className="row" style={{gap:8, alignItems:'center'}}>
          <label><input type="checkbox" checked={mine} onChange={e=>setMine(e.target.checked)} /> Show mine only</label>
          <div><strong>Total:</strong> ${Number(total||0).toFixed(2)}</div>
        </div>
      </div>
      <div className="card">
        <h3>Add Expense</h3>
        <form className="row" onSubmit={add} style={{gap:8}}>
          <input type="number" placeholder="Amount" value={amount} onChange={e=>setAmount(e.target.value)} />
          <input type="text" placeholder="Category" value={category} onChange={e=>setCategory(e.target.value)} />
          <input type="text" placeholder="Note" value={note} onChange={e=>setNote(e.target.value)} />
          <button className="btn" type="submit">Add</button>
        </form>
      </div>
      <div className="card">
        <h3>Entries</h3>
        <ul>
          {items.map(it => (
            <li key={it._id}>
              {new Date(it.createdAt).toLocaleString()} — ${it.amount}
              {it.category && ` • ${it.category}`}
              {it.note && ` • ${it.note}`}
              {(it.createdByName || it.createdByEmail) && (
                <span style={{opacity:.8}}> • by {it.createdByName || ''} {it.createdByEmail ? `<${it.createdByEmail}>` : ''}</span>
              )}
            </li>
          ))}
      </ul>
      </div>
    </div>
  );
}
