import { useEffect, useMemo, useState } from 'react';
import { ProductsApi, ReturnsApi, StockApi } from '../services/inventoryApi';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';

export default function Returns(){
  const activeBranchId = useSelector(s=>s.branches.current);
  const [q, setQ] = useState('');
  const [matches, setMatches] = useState([]);
  const [items, setItems] = useState([]);
  const [saleId, setSaleId] = useState('');
  const [err, setErr] = useState('');

  useEffect(()=>{ const t=setTimeout(async()=>{
    try { setMatches(await ProductsApi.list(q)); } catch(e){ setErr(e.response?.data?.message || e.message); }
  }, 200); return ()=>clearTimeout(t); }, [q]);

  const addItem = (p) => {
    setItems(arr => {
      const i = arr.findIndex(x=>x.productId===p._id);
      if (i>=0){ const copy=[...arr]; copy[i].qty+=1; return copy; }
      return [...arr, { productId:p._id, name:p.name, qty:1, unitPrice:p.price }];
    });
  };

  const subtotal = items.reduce((a,it)=>a+Number(it.unitPrice||0)*Number(it.qty||0),0);

  const remove = (idx) => setItems(arr => arr.filter((_,i)=>i!==idx));

  const submit = async ()=>{
    setErr('');
    if (!activeBranchId) { toast.error('Select a branch first'); return; }
    if (!items.length) return;
    try {
      const payload = { branchId: activeBranchId, saleId: saleId || undefined, items: items.map(it => ({ productId: it.productId, qty: it.qty, unitPrice: it.unitPrice, name: it.name })) };
      const doc = await ReturnsApi.create(payload);
      toast.success(`Return saved. Refund Rs ${Number(doc?.totals?.refund||0).toLocaleString()}`);
      setItems([]); setSaleId(''); setQ('');
    } catch(e){ setErr(e.response?.data?.message || e.message); toast.error(err); }
  };

  return (
    <div className="grid" style={{gridTemplateColumns:'1.4fr 1.6fr'}}>
      <div className="card">
        <div className="row" style={{justifyContent:'space-between'}}>
          <h3>Products</h3>
          <input className="input" placeholder="Search SKU / name" value={q} onChange={e=>setQ(e.target.value)} style={{maxWidth:260}}/>
        </div>
        {err && <div style={{color:'salmon'}}>{err}</div>}
        <table className="table">
          <thead><tr><th>SKU</th><th>Name</th><th>Price</th><th/></tr></thead>
          <tbody>
            {matches.map(p=>(
              <tr key={p._id}>
                <td data-label="SKU">{p.sku}</td>
                <td data-label="Name">{p.name}</td>
                <td data-label="Price">Rs {Number(p.price||0).toLocaleString()}</td>
                <td data-label="Actions"><button className="btn" onClick={()=>addItem(p)}>Return</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card">
        <div className="row" style={{justifyContent:'space-between'}}>
          <h3>Return Cart - {activeBranchId}</h3>
          <input className="input" style={{width:220}} placeholder="Sale ID (optional)" value={saleId} onChange={e=>setSaleId(e.target.value)} />
        </div>
        <table className="table">
          <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Total</th><th/></tr></thead>
          <tbody>
            {items.map((it,i)=>(
              <tr key={i}>
                <td data-label="Item">{it.name}</td>
                <td data-label="Qty">
                  <div className="row">
                    <button className="btn" onClick={()=>setItems(c=>c.map((x,xi)=>xi===i?{...x, qty:Math.max(1,x.qty-1)}:x))}>-</button>
                    <span className="badge">{it.qty}</span>
                    <button className="btn" onClick={()=>setItems(c=>c.map((x,xi)=>xi===i?{...x, qty:x.qty+1}:x))}>+</button>
                  </div>
                </td>
                <td data-label="Unit">Rs {Number(it.unitPrice||0).toLocaleString()}</td>
                <td data-label="Total">Rs {(Number(it.unitPrice||0)*Number(it.qty||0)).toLocaleString()}</td>
                <td data-label="Actions"><button className="btn danger" onClick={()=>remove(i)}>x</button></td>
              </tr>
            ))}
            {items.length===0 && <tr><td colSpan={5}>No items.</td></tr>}
          </tbody>
        </table>
        <div className="row" style={{justifyContent:'space-between', marginTop:12}}>
          <div>Refund subtotal: <b>Rs {subtotal.toLocaleString()}</b></div>
          <button className="btn primary" onClick={submit} disabled={!items.length}>Save Return</button>
        </div>
      </div>
    </div>
  );
}

