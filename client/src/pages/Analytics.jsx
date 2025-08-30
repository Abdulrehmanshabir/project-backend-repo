import { useEffect, useState } from 'react';
import http from '../services/http';
import { useBranches } from '../modules/branches/BranchContext';

export default function Analytics() {
  const { currentBranch } = useBranches() || {};
  const [data, setData] = useState(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [lowThreshold, setLowThreshold] = useState(5);
  const [invForm, setInvForm] = useState({ amount: '', note: '' });
  const [expForm, setExpForm] = useState({ amount: '', category: '', note: '' });
  const [investments, setInvestments] = useState({ total: 0, items: [] });
  const [expenses, setExpenses] = useState({ total: 0, items: [] });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!currentBranch) return;
    setLoading(true); setErr('');
    const params = { branchId: currentBranch };
    if (from) params.from = from; if (to) params.to = to; if (lowThreshold) params.lowThreshold = lowThreshold;
    http.get('/api/reports/analytics', { params })
      .then(res => setData(res.data))
      .catch(e => setErr(e?.response?.data?.message || e.message))
      .finally(() => setLoading(false));
    // fetch investments/expenses in same range
    http.get('/api/reports/investments', { params: { branchId: currentBranch, from, to } })
      .then(res => setInvestments(res.data))
      .catch(()=>setInvestments({ total:0, items:[] }));
    http.get('/api/reports/expenses', { params: { branchId: currentBranch, from, to } })
      .then(res => setExpenses(res.data))
      .catch(()=>setExpenses({ total:0, items:[] }));
  }, [currentBranch, from, to, lowThreshold]);

  if (!currentBranch) return <div className="container"><p>Select a branch first.</p></div>;
  if (loading) return <div className="container"><p>Loading analytics…</p></div>;
  if (err) return <div className="container"><p style={{color:'crimson'}}>Error: {err}</p></div>;

  return (
    <div className="container stack">
      <h1>Analytics — {data?.branchId}</h1>
      <div className="row" style={{ gap: 8, alignItems:'flex-end' }}>
        <div>
          <label>From</label>
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)} />
        </div>
        <div>
          <label>To</label>
          <input type="date" value={to} onChange={e=>setTo(e.target.value)} />
        </div>
        <div>
          <label>Low stock threshold</label>
          <input type="number" min={0} value={lowThreshold} onChange={e=>setLowThreshold(Number(e.target.value||0))} />
        </div>
        <button className="btn" onClick={()=>setFrom(from)}>Refresh</button>
      </div>
      <div className="grid cols-3">
        <div className="card">
          <h3>Today</h3>
          <p>Qty: {data?.today?.qty || 0}</p>
          <p>Revenue: ${Number(data?.today?.revenue || 0).toFixed(2)}</p>
        </div>
        <div className="card">
          <h3>Last 7 Days</h3>
          <p>Qty: {data?.last7d?.qty || 0}</p>
          <p>Revenue: ${Number(data?.last7d?.revenue || 0).toFixed(2)}</p>
          <p>Expenses: ${Number(data?.last7d?.expenses || 0).toFixed(2)}</p>
          <p>Profit: ${Number(data?.last7d?.profit || 0).toFixed(2)}</p>
          <p>ROI: {data?.last7d?.roi != null ? `${(data.last7d.roi*100).toFixed(1)}%` : '—'}</p>
        </div>
        <div className="card">
          <h3>Low Stock</h3>
          <p>Items at/below threshold: {data?.lowStockCount || 0}</p>
        </div>
      </div>
      <div className="card" style={{marginTop:16}}>
        <h3>Top Products (7d)</h3>
        {(data?.topProducts || []).length === 0 && <p>No data</p>}
        {(data?.topProducts || []).map((p) => (
          <div key={p.productId} className="row" style={{justifyContent:'space-between'}}>
            <span>{p.sku} — {p.name}</span>
            <span>Qty {p.qty}</span>
          </div>
        ))}
      </div>
      <div className="grid cols-2" style={{marginTop:16}}>
        <div className="card">
          <h3>Investment</h3>
          <form className="stack" onSubmit={(e)=>{e.preventDefault(); http.post('/api/reports/investments', { amount: Number(invForm.amount||0), note: invForm.note, branchId: currentBranch }).then(()=>{ setInvForm({ amount:'', note:'' }); setFrom(from); });}}>
            <input type="number" placeholder="Amount" value={invForm.amount} onChange={e=>setInvForm(f=>({...f, amount:e.target.value}))} />
            <input type="text" placeholder="Note" value={invForm.note} onChange={e=>setInvForm(f=>({...f, note:e.target.value}))} />
            <button className="btn" type="submit">Add Investment</button>
          </form>
          <p>Total in range: ${Number(investments.total||0).toFixed(2)}</p>
          <div style={{maxHeight:180, overflow:'auto'}}>
            {investments.items.map(it=> (<div key={it._id}>{new Date(it.createdAt).toLocaleString()} — ${it.amount} {it.note&&`• ${it.note}`}</div>))}
          </div>
        </div>
        <div className="card">
          <h3>Expenditure</h3>
          <form className="stack" onSubmit={(e)=>{e.preventDefault(); http.post('/api/reports/expenses', { amount: Number(expForm.amount||0), category: expForm.category, note: expForm.note, branchId: currentBranch }).then(()=>{ setExpForm({ amount:'', category:'', note:'' }); setFrom(from); });}}>
            <input type="number" placeholder="Amount" value={expForm.amount} onChange={e=>setExpForm(f=>({...f, amount:e.target.value}))} />
            <input type="text" placeholder="Category" value={expForm.category} onChange={e=>setExpForm(f=>({...f, category:e.target.value}))} />
            <input type="text" placeholder="Note" value={expForm.note} onChange={e=>setExpForm(f=>({...f, note:e.target.value}))} />
            <button className="btn" type="submit">Add Expense</button>
          </form>
          <p>Total in range: ${Number(expenses.total||0).toFixed(2)}</p>
          <div style={{maxHeight:180, overflow:'auto'}}>
            {expenses.items.map(it=> (<div key={it._id}>{new Date(it.createdAt).toLocaleString()} — ${it.amount} {it.category&&`• ${it.category}`} {it.note&&`• ${it.note}`}</div>))}
          </div>
        </div>
      </div>
    </div>
  );
}
