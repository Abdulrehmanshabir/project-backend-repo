import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { StockApi } from '../services/inventoryApi';
import { useSelector } from 'react-redux';

export default function Stock(){
  const activeBranchId = useSelector(s=>s.branches.current);
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [qty, setQty] = useState(1);
  const [err, setErr] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const refresh = async ()=>{
    setErr('');
    try { setRows(await StockApi.byBranch(activeBranchId)); }
    catch (e) { setErr(e.response?.data?.message || e.message); }
  };

  useEffect(()=>{ refresh(); }, [activeBranchId]);

  const parseDelta = () => {
    const n = Math.floor(Math.abs(Number(qty)));
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  const adjust = async (row, sign = 1) => {
    const base = parseDelta();
    if (!base) { toast.error('Enter a positive quantity to adjust'); return; }
    setErr('');
    setUpdatingId(row.productId);
    try {
      const payload = { branchId: activeBranchId, productId: row.productId, delta: sign * base };
      const res = await StockApi.adjust(payload);
      const newOnHand = Number(res?.onHand ?? NaN);
      const verb = sign > 0 ? 'Added' : 'Removed';
      toast.success(`${verb} ${base} ${row.unit || ''} for ${row.sku || row.name}. On hand: ${Number.isFinite(newOnHand) ? newOnHand : 'updated'}`);
      await refresh();
    } catch(e){
      const msg = e.response?.data?.message || e.message;
      setErr(msg);
      toast.error(msg || 'Stock update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = useMemo(() => {
    if (!q) return rows;
    const t = String(q).toLowerCase();
    return rows.filter(r => (r.sku||'').toLowerCase().includes(t) || (r.name||'').toLowerCase().includes(t));
  }, [rows, q]);

  return (
    <div className="card">
      <div className="row" style={{justifyContent:'space-between', gap:8}}>
        <h3>Stock - {activeBranchId}</h3>
        <div className="row" style={{gap:8}}>
          <input className="input" style={{width:220}} type="text" placeholder="Search by SKU or product name" value={q} onChange={e=>setQ(e.target.value)} />
          <input className="input" style={{width:220}} type="number" min={1} step={1} placeholder="Adjust quantity (then press +/- or Apply)" value={qty} onChange={e=>setQty(e.target.value)} onBlur={e=>{ const n = Math.floor(Math.abs(Number(e.target.value))); setQty(Number.isFinite(n) && n>0 ? n : 1); }}/>
        </div>
      </div>
      {err && <div style={{color:'salmon'}}>{err}</div>}
      <table className="table">
        <thead><tr><th>SKU</th><th>Name</th><th>On hand</th><th>Unit</th><th>Adjust</th></tr></thead>
        <tbody>
          {filtered.map(r=>(
            <tr key={r.productId}>
              <td data-label="SKU">{r.sku}</td>
              <td data-label="Name">{r.name}</td>
              <td data-label="On hand">{r.onHand}</td>
              <td data-label="Unit">{r.unit}</td>
              <td data-label="Adjust" className="row" style={{gap:6}}>
                <button className="btn" title="Remove typed quantity" disabled={updatingId===r.productId} onClick={()=>adjust(r, -1)}>-</button>
                <button className="btn" title="Add typed quantity" disabled={updatingId===r.productId} onClick={()=>adjust(r, +1)}>+</button>
                <button className="btn primary" title="Add typed quantity" disabled={updatingId===r.productId || parseDelta()<=0} onClick={()=>adjust(r, +1)}>Apply</button>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={5}>No items match your search.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}



