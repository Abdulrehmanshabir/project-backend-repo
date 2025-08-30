import { useEffect, useState } from 'react';
import { ProductsApi } from '../services/inventoryApi';

export default function Products(){
  const [q, setQ] = useState('');
  const [form, setForm] = useState({ sku:'', name:'', brand:'', category:'', unit:'pcs', unitSize:1, price:0, taxRate:0.17 });
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');

  const refresh = async () => {
    setErr('');
    try { setList(await ProductsApi.list(q)); }
    catch (e){ setErr(e.response?.data?.message || e.message); }
  };

  useEffect(()=>{ refresh(); }, []);        // initial
  useEffect(()=>{ const t = setTimeout(refresh, 200); return ()=>clearTimeout(t); }, [q]); // search debounce

  const add = async (e)=> {
    e.preventDefault();
    setErr('');
    try {
      await ProductsApi.create(form);
      setForm({ sku:'', name:'', brand:'', category:'', unit:'pcs', unitSize:1, price:0, taxRate:0.17 });
      setQ(''); await refresh();
    } catch(e){ setErr(e.response?.data?.message || e.message); }
  };

  const remove = async (id)=>{
    setErr('');
    try { await ProductsApi.remove(id); await refresh(); }
    catch(e){ setErr(e.response?.data?.message || e.message); }
  };

  return (
    <div className="grid" style={{gap:16}}>
      <div className="card">
        <h3>Add product</h3>
        <form onSubmit={add} className="grid" style={{gridTemplateColumns:'repeat(6,1fr)', gap:10}}>
          <input className="input" placeholder="SKU" value={form.sku} onChange={e=>setForm({...form, sku:e.target.value})}/>
          <input className="input" placeholder="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/>
          <input className="input" placeholder="Brand" value={form.brand} onChange={e=>setForm({...form, brand:e.target.value})}/>
          <input className="input" placeholder="Category" value={form.category} onChange={e=>setForm({...form, category:e.target.value})}/>
          <select className="input" value={form.unit} onChange={e=>setForm({...form, unit:e.target.value})}>
            <option value="pcs">pcs</option><option value="ml">ml</option>
          </select>
          <input className="input" placeholder="Unit Size" type="number" min={1} step={1} value={form.unitSize} onChange={e=>setForm({...form, unitSize: Number(e.target.value)||1})}/>
          <input className="input" placeholder="Price" type="number" value={form.price} onChange={e=>setForm({...form, price:Number(e.target.value)})}/>
          <button className="btn primary" style={{gridColumn:'span 6'}}>Add</button>
        </form>
        {err && <div style={{color:'salmon', marginTop:8}}>{err}</div>}
      </div>

      <div className="card">
        <div className="row" style={{justifyContent:'space-between'}}>
          <h3>Products</h3>
          <input className="input" style={{maxWidth:240}} placeholder="Search SKU / name" value={q} onChange={e=>setQ(e.target.value)}/>
        </div>
        <table className="table">
          <thead><tr><th>SKU</th><th>Name</th><th>Brand</th><th>Category</th><th>Unit</th><th>Price</th><th/></tr></thead>
          <tbody>
            {list.map(p=>(
              <tr key={p._id}>
                <td>{p.sku}</td><td>{p.name}</td><td>{p.brand}</td><td>{p.category}</td><td>{(p.unitSize||1)+' '+p.unit}</td>
                <td>Rs {Number(p.price||0).toLocaleString()}</td>
                <td><button className="btn danger" onClick={()=>remove(p._id)}>Delete</button></td>
              </tr>
            ))}
            {list.length===0 && <tr><td colSpan={7}>No products yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
