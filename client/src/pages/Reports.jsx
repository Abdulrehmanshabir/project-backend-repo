import { useEffect, useState } from 'react';
import { ReportsApi, SalesApi } from '../services/inventoryApi';
import { useBranch } from '../modules/branches/BranchContext';

export default function Reports(){
  const { activeBranchId } = useBranch();
  const [recent, setRecent] = useState([]);
  const [low, setLow] = useState([]);

  useEffect(()=>{
    if (!activeBranchId) return;
    (async ()=>{
      setRecent(await SalesApi.recent(activeBranchId));
      setLow(await ReportsApi.lowStock(activeBranchId, 5));
    })();
  }, [activeBranchId]);

  if (!activeBranchId) {
    return (<div className="card">Select a branch from the top bar to view reports.</div>);
  }

  return (
    <div className="grid">
      <div className="card">
        <h3>Recent sales</h3>
        <table className="table">
          <thead><tr><th>Time</th><th>Items</th><th>Total</th></tr></thead>
          <tbody>
            {recent.map(s=>(
              <tr key={s._id}>
                <td>{new Date(s.createdAt).toLocaleString()}</td>
                <td>{s.items.map(i=>`${i.name}×${i.qty}`).join(', ')}</td>
                <td>Rs {s.totals.grand.toLocaleString()}</td>
              </tr>
            ))}
            {recent.length===0 && <tr><td colSpan={3}>No sales yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Low stock (≤5)</h3>
        <table className="table">
          <thead><tr><th>SKU</th><th>Name</th><th>On hand</th></tr></thead>
          <tbody>
            {low.map(r=>(
              <tr key={r.productId}><td>{r.sku}</td><td>{r.name}</td><td>{r.onHand}</td></tr>
            ))}
            {low.length===0 && <tr><td colSpan={3}>All good.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
