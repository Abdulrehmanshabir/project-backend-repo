import { useEffect, useState } from 'react';
import { StockApi } from '../services/inventoryApi';
import { useSelector } from 'react-redux';

export default function Stock(){
  const activeBranchId = useSelector(s=>s.branches.current);
  const [rows, setRows] = useState([]);
  const [qty, setQty] = useState(0);
  const [err, setErr] = useState('');

  const refresh = async ()=>{
    setErr('');
    try { setRows(await StockApi.byBranch(activeBranchId)); }
    catch (e) { setErr(e.response?.data?.message || e.message); }
  };

  useEffect(()=>{ refresh(); }, [activeBranchId]);

  const inc = async (pid)=>{ try { await StockApi.adjust({ branchId: activeBranchId, productId: pid, delta: Math.abs(Number(qty))||0 }); refresh(); } catch(e){ setErr(e.response?.data?.message || e.message);} };
  const dec = async (pid)=>{ try { await StockApi.adjust({ branchId: activeBranchId, productId: pid, delta: -Math.abs(Number(qty))||0 }); refresh(); } catch(e){ setErr(e.response?.data?.message || e.message);} };

  return (
    <div className="card">
      <div className="row" style={{justifyContent:'space-between'}}>
        <h3>Stock - {activeBranchId}</h3>
        <input className="input" style={{width:120}} type="number" placeholder="Qty" value={qty} onChange={e=>setQty(e.target.value)}/>
      </div>
      {err && <div style={{color:'salmon'}}>{err}</div>}
      <table className="table">
        <thead><tr><th>SKU</th><th>Name</th><th>On hand</th><th>Unit</th><th>Adjust</th></tr></thead>
        <tbody>
          {rows.map(r=>(
            <tr key={r.productId}>
              <td data-label="SKU">{r.sku}</td>
              <td data-label="Name">{r.name}</td>
              <td data-label="On hand">{r.onHand}</td>
              <td data-label="Unit">{r.unit}</td>
              <td data-label="Adjust" className="row">
                <button className="btn" onClick={()=>dec(r.productId)}>-</button>
                <button className="btn" onClick={()=>inc(r.productId)}>+</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}



