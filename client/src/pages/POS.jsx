import { useEffect, useMemo, useState } from 'react';
import { ProductsApi, SalesApi, StockApi } from '../services/inventoryApi';
import { useBranch } from '../modules/branches/BranchContext';

export default function POS(){
  const { activeBranchId } = useBranch();
  const [q, setQ] = useState('');
  const [matches, setMatches] = useState([]);
  const [cart, setCart] = useState([]);
  const [err, setErr] = useState('');

  const loadProds = async (query='')=>{
    try { setMatches(await ProductsApi.list(query)); } catch(e){ setErr(e.response?.data?.message || e.message); }
  };

  useEffect(()=>{ loadProds(''); }, []);
  useEffect(()=>{ const t=setTimeout(()=>loadProds(q),200); return ()=>clearTimeout(t); }, [q]);

  const addItem = (p) => {
    setCart(c=>{
      const i = c.findIndex(x=>x.productId===p._id);
      if (i>=0){ const copy=[...c]; copy[i].qty+=1; return copy; }
      return [...c, { productId:p._id, name:p.name, qty:1, unitPrice:p.price, taxRate:p.taxRate||0 }];
    });
  };

  const subtotal = cart.reduce((a,it)=>a+it.unitPrice*it.qty,0);
  const tax = cart.reduce((a,it)=>a+(it.taxRate||0)*it.unitPrice*it.qty,0);
  const grand = subtotal + tax;

  const checkout = async ()=>{
    setErr('');
    if (!cart.length) return;
    try {
      // verify stock quickly
      const stock = await StockApi.byBranch(activeBranchId);
      for (const it of cart){
        const onHand = stock.find(r=>r.productId===it.productId)?.onHand || 0;
        if (onHand < it.qty) { setErr(`Insufficient stock for ${it.name}`); return; }
      }
      const sale = await SalesApi.create({ branchId: activeBranchId, items: cart });
      setCart([]);
      alert(`Sale complete! #${sale._id}\nGrand: Rs ${sale.totals.grand.toLocaleString()}`);
    } catch(e){ setErr(e.response?.data?.message || e.message); }
  };

  return (
    <div className="grid" style={{gridTemplateColumns:'2fr 1fr'}}>
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
                <td>{p.sku}</td>
                <td>{p.name}</td>
                <td>Rs {Number(p.price||0).toLocaleString()}</td>
                <td><button className="btn" onClick={()=>addItem(p)}>Add</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Cart — {activeBranchId}</h3>
        {err && <div style={{color:'salmon'}}>{err}</div>}
        <table className="table">
          <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Total</th><th/></tr></thead>
          <tbody>
            {cart.map((it,i)=>(
              <tr key={i}>
                <td>{it.name}</td>
                <td>
                  <div className="row">
                    <button className="btn" onClick={()=>setCart(c=>c.map((x,xi)=>xi===i?{...x, qty:Math.max(1,x.qty-1)}:x))}>-</button>
                    <span className="badge">{it.qty}</span>
                    <button className="btn" onClick={()=>setCart(c=>c.map((x,xi)=>xi===i?{...x, qty:x.qty+1}:x))}>+</button>
                  </div>
                </td>
                <td>Rs {it.unitPrice.toLocaleString()}</td>
                <td>Rs {(it.unitPrice*it.qty).toLocaleString()}</td>
                <td><button className="btn danger" onClick={()=>setCart(c=>c.filter((_,xi)=>xi!==i))}>x</button></td>
              </tr>
            ))}
            {cart.length===0 && <tr><td colSpan={5}>Cart empty.</td></tr>}
          </tbody>
        </table>
        <div className="row" style={{justifyContent:'space-between', marginTop:12}}>
          <div>
            <div>Subtotal: <b>Rs {subtotal.toLocaleString()}</b></div>
            <div>Tax: <b>Rs {tax.toLocaleString()}</b></div>
            <div>Grand: <b>Rs {grand.toLocaleString()}</b></div>
          </div>
          <button className="btn primary" onClick={checkout} disabled={!cart.length}>Checkout</button>
        </div>
      </div>
    </div>
  );
}
