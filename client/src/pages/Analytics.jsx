import { useEffect, useMemo, useState } from 'react';
import http from '../services/http';
import { useSelector } from 'react-redux';
import { jwtDecode } from 'jwt-decode';

export default function Analytics() {
  const currentBranch = useSelector(s=>s.branches.current);
  const token = localStorage.getItem('accessToken') || '';
  let role = '';
  try { role = jwtDecode(token)?.role || ''; } catch {}
  if (role === 'manager') return <div className="container"><p>Not allowed</p></div>;
  const [data, setData] = useState(null);
  const [start, setStart] = useState(()=> new Date().toISOString().slice(0,10));
  const [range, setRange] = useState(5);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const end = useMemo(()=>{
    const d = new Date(start + 'T00:00:00');
    const e = new Date(d);
    e.setDate(e.getDate() + Math.max(1, Number(range||1)) - 1);
    return e.toISOString().slice(0,10);
  }, [start, range]);

  useEffect(() => {
    if (!currentBranch) return;
    setLoading(true); setErr('');
    http.get('/api/reports/range-analytics', { params: { branchId: currentBranch, from: start, to: end } })
      .then(res => setData(res.data))
      .catch(e => setErr(e?.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  }, [currentBranch, start, end]);

  if (!currentBranch) return <div className="container"><p>Select a branch first.</p></div>;
  if (loading) return <div className="container"><p>Loading analytics…</p></div>;
  if (err) return <div className="container"><p style={{color:'crimson'}}>Error: {err}</p></div>;

  return (
    <div className="container stack">
      <h1>Analytics — {data?.branchId}</h1>
      <div className="row" style={{ gap: 12, alignItems:'center' }}>
        <select className="input" value={range} onChange={e=>setRange(Number(e.target.value))} style={{width:120}}>
          {[1,5,10,15,30].map(r => <option key={r} value={r}>{r} day{r>1?'s':''}</option>)}
        </select>
        <input className="input" type="date" value={start} onChange={e=>setStart(e.target.value)} style={{width:160}} />
        {Number(range)>1 && <input className="input" type="date" value={end} readOnly style={{width:160, opacity:0.7}} />}
      </div>
      <div className="grid cols-3" style={{marginTop:12}}>
        <div className="card"><div>Orders</div><b>{data?.overall?.orders||0}</b></div>
        <div className="card"><div>Sales</div><b>Rs {Number(data?.overall?.sales||0).toLocaleString()}</b></div>
        <div className="card"><div>Discount</div><b>Rs {Number(data?.overall?.discount||0).toLocaleString()}</b></div>
        <div className="card"><div>Expenses</div><b>Rs {Number(data?.overall?.expenses||0).toLocaleString()}</b></div>
        <div className="card"><div>Net</div><b>Rs {Number(data?.overall?.net||0).toLocaleString()}</b></div>
        <div className="card"><div>Product Profit</div><b>Rs {Number(data?.overall?.productProfit||0).toLocaleString()}</b></div>
      </div>
      <div className="stack" style={{marginTop:16}}>
        {(data?.days||[]).map(d => (
          <div key={d.date} className="card stack" style={{gap:8}}>
            <div className="row" style={{justifyContent:'space-between'}}>
              <b>{d.date}</b>
              <div className="row" style={{gap:12}}>
                <span>Orders: {d.orders}</span>
                <span>Sales: Rs {Number(d.sales||0).toLocaleString()}</span>
                <span>Disc: Rs {Number(d.discount||0).toLocaleString()}</span>
                <span>Exp: Rs {Number(d.expenses||0).toLocaleString()}</span>
                <span>Net: Rs {Number(d.net||0).toLocaleString()}</span>
                <span>Profit: Rs {Number(d.productProfit||0).toLocaleString()}</span>
              </div>
            </div>
            <div style={{height:8, background:'#eee', borderRadius:4, overflow:'hidden'}}>
              {(() => { const sales = Number(d.sales||0)||0; const exp = Number(d.expenses||0)||0; const max = Math.max(1, sales, exp); return (
                <div className="row" style={{height:'100%', width:'100%'}}>
                  <div style={{width: (sales/max*100)+'%', background:'#6ee7b7'}} />
                  <div style={{width: (exp/max*100)+'%', background:'#fca5a5'}} />
                </div>
              ); })()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}