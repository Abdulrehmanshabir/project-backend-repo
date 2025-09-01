import { useEffect, useMemo, useState } from 'react';
import { ProductsApi, SalesApi, StockApi } from '../services/inventoryApi';
import { useSelector } from 'react-redux';

export default function POS(){
  const activeBranchId = useSelector(s=>s.branches.current);
  // Printing toggle: set to true to enable receipt printing
  const ENABLE_PRINT = false;
  const [receiptStyle, setReceiptStyle] = useState(()=> localStorage.getItem('receiptStyle') || 'thermal-80');
  const [q, setQ] = useState('');
  const [matches, setMatches] = useState([]);
  const [cart, setCart] = useState([]);
  const [err, setErr] = useState('');
  const [discountRs, setDiscountRs] = useState(0);
  const [stockById, setStockById] = useState({});

  const loadProds = async (query='')=>{
    try { setMatches(await ProductsApi.list(query)); } catch(e){ setErr(e.response?.data?.message || e.message); }
  };

  useEffect(()=>{ loadProds(''); }, []);
  useEffect(()=>{ const t=setTimeout(()=>loadProds(q),200); return ()=>clearTimeout(t); }, [q]);
  // load stock for active branch and map by productId
  useEffect(()=>{
    (async ()=>{
      setErr('');
      try {
        if (!activeBranchId) { setStockById({}); return; }
        const rows = await StockApi.byBranch(activeBranchId);
        const map = {};
        for (const r of rows) map[r.productId] = Number(r.onHand)||0;
        setStockById(map);
      } catch(e){ setErr(e.response?.data?.message || e.message); setStockById({}); }
    })();
  }, [activeBranchId]);

  // helper to refresh stock for current branch (used after checkout)
  const refreshStock = async () => {
    if (!activeBranchId) return;
    try {
      const rows = await StockApi.byBranch(activeBranchId);
      const map = {};
      for (const r of rows) map[r.productId] = Number(r.onHand)||0;
      setStockById(map);
    } catch(e) {
      // surface error but keep UI responsive
      setErr(e.response?.data?.message || e.message);
    }
  };

  const addItem = (p) => {
    setCart(c=>{
      const i = c.findIndex(x=>x.productId===p._id);
      if (i>=0){ const copy=[...c]; copy[i].qty+=1; return copy; }
      return [...c, { productId:p._id, name:p.name, qty:1, unitPrice:p.price }];
    });
  };

  const subtotal = cart.reduce((a,it)=>a+it.unitPrice*it.qty,0);
  const grand = Math.max(0, subtotal - (Number(discountRs)||0));

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
      const sale = await SalesApi.create({ branchId: activeBranchId, items: cart, discountRs: Number(discountRs)||0 });
      setCart([]);
      setDiscountRs(0);
      // immediately refresh stock to reflect decremented on-hand
      await refreshStock();
      // Print receipt for the sale (disabled by default)
      if (ENABLE_PRINT) {
        printReceipt(sale, receiptStyle);
      } else {
        alert(`Sale complete! #${sale._id}\nGrand: Rs ${sale.totals.grand.toLocaleString()}`);
      }
    } catch(e){ setErr(e.response?.data?.message || e.message); }
  };

  useEffect(()=>{ if (ENABLE_PRINT) localStorage.setItem('receiptStyle', receiptStyle); }, [receiptStyle]);

  const printReceipt = (sale, style='thermal-80') => {
    if (!sale) return;
    const store = import.meta?.env?.VITE_STORE_NAME || 'Vape Hub';
    const address = import.meta?.env?.VITE_STORE_ADDRESS || '';
    const dt = new Date(sale.createdAt || Date.now());
    const date = dt.toLocaleString();
    const lines = (sale.items||[]).map(it => ({
      name: it.name || 'Item',
      qty: Number(it.qty||0),
      unit: Number(it.unitPrice||0),
      total: Number(it.unitPrice||0) * Number(it.qty||0)
    }));
    const subtotal = Number(sale.totals?.subtotal||0);
    const discount = Number(sale.totals?.discount||0);
    const grand = Number(sale.totals?.grand||0);

    const styles = `
      <style>
        @page { size: auto; margin: ${style.startsWith('thermal') ? '4mm' : '10mm'}; }
        body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; }
        .receipt { width: ${style==='thermal-58' ? '58mm' : style==='thermal-80' ? '80mm' : '100%'}; margin: 0 auto; }
        .center { text-align: center; }
        .right { text-align: right; }
        .row { display: flex; justify-content: space-between; gap: 8px; }
        .muted { opacity: .8; }
        h1 { font-size: ${style.startsWith('thermal') ? '14px' : '20px'}; margin: 0 0 4px; }
        .meta { font-size: ${style.startsWith('thermal') ? '11px' : '12px'}; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; font-size: ${style.startsWith('thermal') ? '12px' : '14px'}; }
        th, td { padding: ${style.startsWith('thermal') ? '2px 0' : '4px 0'}; }
        .totals td { padding-top: ${style.startsWith('thermal') ? '4px' : '6px'}; }
        .divider { border-top: 1px dashed #999; margin: 6px 0; }
        .footer { margin-top: 8px; font-size: ${style.startsWith('thermal') ? '11px' : '12px'}; }
      </style>`;

    const itemsHtml = lines.map(l => `
      <tr>
        <td>${l.name}</td>
        <td class="right">${l.qty}</td>
        <td class="right">${l.unit.toLocaleString()}</td>
        <td class="right">${l.total.toLocaleString()}</td>
      </tr>
    `).join('');

    const html = `<!doctype html><html><head><meta charset="utf-8"/>${styles}</head>
      <body onload="window.print(); setTimeout(()=>window.close(), 300);">
        <div class="receipt">
          <div class="center">
            <h1>${store}</h1>
            ${address ? `<div class="meta">${address}</div>` : ''}
          </div>
          <div class="meta">Branch: ${sale.branchId || ''} • ${date} • Sale #${sale._id || ''}</div>
          <div class="divider"></div>
          <table>
            <thead><tr><th style="text-align:left">Item</th><th class="right">Qty</th><th class="right">Unit</th><th class="right">Total</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div class="divider"></div>
          <table class="totals">
            <tr><td>Subtotal</td><td class="right" style="width:40%">Rs ${subtotal.toLocaleString()}</td></tr>
            <tr><td>Discount</td><td class="right">Rs ${discount.toLocaleString()}</td></tr>
            <tr><td><b>Grand</b></td><td class="right"><b>Rs ${grand.toLocaleString()}</b></td></tr>
          </table>
          <div class="footer center">Thank you! No refunds without receipt.</div>
        </div>
      </body></html>`;

    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w) {
      alert('Please allow popups to print receipt.');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  return (
    <div className="grid" style={{gridTemplateColumns:'1.4fr 1.6fr'}}>
      <div className="card">
        <div className="row" style={{justifyContent:'space-between'}}>
          <h3>Products</h3>
          <input className="input" placeholder="Search by SKU or name" value={q} onChange={e=>setQ(e.target.value)} style={{maxWidth:260}}/>
        </div>
        {err && <div style={{color:'salmon'}}>{err}</div>}
        <table className="table">
          <thead><tr><th>SKU</th><th>Name</th><th>On hand</th><th>Price</th><th/></tr></thead>
          <tbody>
            {matches.map(p=>(
              <tr key={p._id}>
                <td data-label="SKU">{p.sku}</td>
                <td data-label="Name">{p.name}</td>
                <td data-label="On hand">{stockById[p._id] ?? 0}</td>
                <td data-label="Price">Rs {Number(p.price||0).toLocaleString()}</td>
                <td data-label="Actions"><button className="btn" onClick={()=>addItem(p)}>Add</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Cart - {activeBranchId}</h3>
        {err && <div style={{color:'salmon'}}>{err}</div>}
        {ENABLE_PRINT && (
          <div className="row" style={{justifyContent:'space-between', marginBottom:8}}>
            <div className="row" style={{gap:8}}>
              <label>Receipt style</label>
              <select className="input" style={{width:160}} value={receiptStyle} onChange={e=>setReceiptStyle(e.target.value)}>
                <option value="thermal-80">Thermal 80mm</option>
                <option value="thermal-58">Thermal 58mm</option>
                <option value="a4">Normal (A4)</option>
              </select>
            </div>
          </div>
        )}
        <table className="table">
          <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Total</th><th/></tr></thead>
          <tbody>
            {cart.map((it,i)=>(
              <tr key={i}>
                <td data-label="Item">{it.name}</td>
                <td data-label="Qty">
                  <div className="row">
                    <button className="btn" onClick={()=>setCart(c=>c.map((x,xi)=>xi===i?{...x, qty:Math.max(1,x.qty-1)}:x))}>-</button>
                    <span className="badge">{it.qty}</span>
                    <button className="btn" onClick={()=>setCart(c=>c.map((x,xi)=>xi===i?{...x, qty:x.qty+1}:x))}>+</button>
                  </div>
                </td>
                <td data-label="Unit">Rs {it.unitPrice.toLocaleString()}</td>
                <td data-label="Total">Rs {(it.unitPrice*it.qty).toLocaleString()}</td>
                <td data-label="Actions"><button className="btn danger" onClick={()=>setCart(c=>c.filter((_,xi)=>xi!==i))}>x</button></td>
              </tr>
            ))}
            {cart.length===0 && <tr><td colSpan={5}>Cart empty.</td></tr>}
          </tbody>
        </table>
        <div className="row" style={{justifyContent:'space-between', marginTop:12}}>
          <div>
            <div>Subtotal: <b>Rs {subtotal.toLocaleString()}</b></div>
            <div style={{marginTop:6}}>
              <label style={{marginRight:8}}>Discount (Rs):</label>
              <input className="input" style={{width:180, display:'inline-block'}} type="number" min={0}
                     placeholder="Enter discount amount in Rs"
                     value={discountRs}
                     onChange={e=>setDiscountRs(Math.max(0, Number(e.target.value)||0))}/>
            </div>
            <div style={{marginTop:6}}>Grand: <b>Rs {grand.toLocaleString()}</b></div>
          </div>
          <button className="btn primary" onClick={checkout} disabled={!cart.length}>Checkout</button>
        </div>
      </div>
    </div>
  );
}


