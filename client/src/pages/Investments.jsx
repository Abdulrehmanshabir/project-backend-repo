import { useEffect, useState } from 'react';
import http from '../services/http';
import { useSelector } from 'react-redux';
import { jwtDecode } from 'jwt-decode';

export default function Investments(){
  const currentBranch = useSelector(s=>s.branches.current);
  const token = localStorage.getItem('accessToken') || '';
  let role = '';
  try { role = jwtDecode(token)?.role || ''; } catch {}
  if (role === 'manager') return <div className="container"><p>Not allowed</p></div>;
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const load = async ()=>{
    if (!currentBranch) return;
    const res = await http.get('/api/reports/investments', { params: { branchId: currentBranch, from, to } });
    setItems(res.data.items || []);
    setTotal(res.data.total || 0);
  };

  useEffect(()=>{ load(); }, [currentBranch, from, to]);

  const add = async (e)=>{
    e && e.preventDefault();
    await http.post('/api/reports/investments', { amount: Number(amount||0), note, branchId: currentBranch });
    setAmount(''); setNote('');
    load();
  };

  return (
    <div className="container stack">
      <h1>Investments — {currentBranch || 'select a branch'}</h1>
      <div className="row" style={{gap:8, alignItems:'flex-end'}}>
        <div><label>From</label><input type="date" value={from} onChange={e=>setFrom(e.target.value)} /></div>
        <div><label>To</label><input type="date" value={to} onChange={e=>setTo(e.target.value)} /></div>
        <div><strong>Total:</strong> ${Number(total||0).toFixed(2)}</div>
      </div>
      <div className="card">
        <h3>Add Investment</h3>
        <form className="row" onSubmit={add} style={{gap:8}}>
          <input type="number" placeholder="Amount" value={amount} onChange={e=>setAmount(e.target.value)} />
          <input type="text" placeholder="Note" value={note} onChange={e=>setNote(e.target.value)} />
          <button className="btn" type="submit">Add</button>
        </form>
      </div>
      <div className="card">
        <h3>Entries</h3>
        <ul>
          {items.map(it => (
            <li key={it._id}>{new Date(it.createdAt).toLocaleString()} — ${it.amount} {it.note && `• ${it.note}`}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
