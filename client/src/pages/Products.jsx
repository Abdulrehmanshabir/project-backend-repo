import { useEffect, useState } from 'react';
import { ProductsApi } from '../services/inventoryApi';

export default function Products(){
  const [q, setQ] = useState('');
  const [form, setForm] = useState({ sku:'', name:'', brand:'', category:'', unit:'pcs', unitSize:1, price:0, retailPrice:'' });
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

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
      setForm({ sku:'', name:'', brand:'', category:'', unit:'pcs', unitSize:1, price:0, retailPrice:'' });
      setQ(''); await refresh();
    } catch(e){ setErr(e.response?.data?.message || e.message); }
  };

  const remove = async (id)=>{
    setErr('');
    try { await ProductsApi.remove(id); await refresh(); }
    catch(e){ setErr(e.response?.data?.message || e.message); }
  };

  const startEdit = (p)=>{
    setEditing(p);
    setEditForm({
      sku: p.sku || '',
      name: p.name || '',
      brand: p.brand || '',
      category: p.category || '',
      unit: p.unit || 'pcs',
      unitSize: p.unitSize ?? 1,
      price: p.price ?? 0,
      retailPrice: p.retailPrice ?? '',
      
    });
  };

  const cancelEdit = ()=>{ setEditing(null); setEditForm(null); };

  const saveEdit = async (e)=>{
    e && e.preventDefault();
    if (!editing || !editForm) return;
    try {
      await ProductsApi.update(editing._id, { ...editForm });
      cancelEdit();
      refresh();
    } catch(e){ setErr(e.response?.data?.message || e.message); }
  };

  return (
    <div className="grid" style={{gap:16}}>
      <div className="card" onClick={()=>setShowAdd(v=>!v)}>
        <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
          <h3 style={{margin:0}}>Add product</h3>
          <span className="badge">{showAdd ? 'Hide' : 'Add Product'}</span>
        </div>
        {showAdd && (
          <div onClick={e=>e.stopPropagation()}>
            <form onSubmit={add} className="grid" style={{gridTemplateColumns:'repeat(6,1fr)', gap:10, marginTop:10}}>
              <input className="input" placeholder="SKU" value={form.sku} onChange={e=>setForm({...form, sku:e.target.value})}/>
              <input className="input" placeholder="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/>
              <input className="input" placeholder="Brand" value={form.brand} onChange={e=>setForm({...form, brand:e.target.value})}/>
              <input className="input" placeholder="Category" value={form.category} onChange={e=>setForm({...form, category:e.target.value})}/>
              <select className="input" value={form.unit} onChange={e=>setForm({...form, unit:e.target.value})}>
                <option value="pcs">pcs</option><option value="ml">ml</option>
              </select>
              <input className="input" placeholder="Unit Size" type="number" min={1} step={1} value={form.unitSize} onChange={e=>setForm({...form, unitSize: Number(e.target.value)||1})}/>
              <input className="input" placeholder="Price (Sale)" type="number" min={0} step={0.01} value={form.price} onChange={e=>setForm({...form, price:Number(e.target.value)})}/>
              <input className="input" placeholder="Retail Price (optional)" type="number" min={0} step={0.01} value={form.retailPrice}
                     onChange={e=>setForm({...form, retailPrice: e.target.value === '' ? '' : Number(e.target.value)})}/>
              <button className="btn primary" style={{gridColumn:'span 6'}}>Add</button>
            </form>
            {err && <div style={{color:'salmon', marginTop:8}}>{err}</div>}
          </div>
        )}
      </div>

      <div className="card">
        <div className="row" style={{justifyContent:'space-between'}}>
          <h3>Products</h3>
          <input className="input" style={{maxWidth:240}} placeholder="Search SKU / name" value={q} onChange={e=>setQ(e.target.value)}/>
        </div>
        <div style={{ maxHeight: 520, overflow: 'auto', marginTop: 8 }}>
          <table className="table">
            <thead><tr><th>SKU</th><th>Name</th><th>Brand</th><th>Category</th><th>Unit</th><th>Price</th><th/></tr></thead>
            <tbody>
              {list.map(p=>(
                <tr key={p._id}>
                  <td data-label="SKU">{p.sku}</td>
                  <td data-label="Name">{p.name}</td>
                  <td data-label="Brand">{p.brand}</td>
                  <td data-label="Category">{p.category}</td>
                  <td data-label="Unit">{(p.unitSize||1)+' '+p.unit}</td>
                  <td data-label="Price">Rs {Number(p.price||0).toLocaleString()}</td>
                  <td data-label="Actions">
                    <div className="row" style={{gap:8}}>
                      <button className="btn" onClick={()=>startEdit(p)}>Edit</button>
                      <button className="btn danger" onClick={()=>remove(p._id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length===0 && <tr><td colSpan={7}>No products yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {editing && editForm && (
        <div className="card">
          <h3>Edit Product - {editing.sku}</h3>
          <form onSubmit={saveEdit} className="grid" style={{gridTemplateColumns:'repeat(6,1fr)', gap:10}}>
            <input className="input" placeholder="SKU" value={editForm.sku} onChange={e=>setEditForm({...editForm, sku:e.target.value})}/>
            <input className="input" placeholder="Name" value={editForm.name} onChange={e=>setEditForm({...editForm, name:e.target.value})}/>
            <input className="input" placeholder="Brand" value={editForm.brand} onChange={e=>setEditForm({...editForm, brand:e.target.value})}/>
            <input className="input" placeholder="Category" value={editForm.category} onChange={e=>setEditForm({...editForm, category:e.target.value})}/>
            <select className="input" value={editForm.unit} onChange={e=>setEditForm({...editForm, unit:e.target.value})}>
              <option value="pcs">pcs</option><option value="ml">ml</option>
            </select>
            <input className="input" placeholder="Unit Size" type="number" min={1} step={1} value={editForm.unitSize} onChange={e=>setEditForm({...editForm, unitSize: Number(e.target.value)||1})}/>
            <input className="input" placeholder="Price (Sale)" type="number" min={0} step={0.01} value={editForm.price} onChange={e=>setEditForm({...editForm, price:Number(e.target.value)})}/>
            <input className="input" placeholder="Retail Price (optional)" type="number" min={0} step={0.01} value={editForm.retailPrice ?? ''} onChange={e=>setEditForm({...editForm, retailPrice: e.target.value === '' ? null : Number(e.target.value)})}/>
            <div style={{gridColumn:'span 6'}} className="row">
              <button className="btn primary" type="submit">Save</button>
              <button className="btn" type="button" onClick={cancelEdit}>Cancel</button>
            </div>
          </form>
          {err && <div style={{color:'salmon', marginTop:8}}>{err}</div>}
        </div>
      )}
    </div>
  );
}
