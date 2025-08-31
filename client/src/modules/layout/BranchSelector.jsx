import './layout.css';
import { jwtDecode } from 'jwt-decode';

export default function BranchSelector({ branches=[], value, onChange }){
  let isAdmin = false;
  try {
    const token = localStorage.getItem('accessToken') || '';
    const role = token ? (jwtDecode(token)?.role || '') : '';
    isAdmin = role === 'admin' || role === 'owner';
  } catch {}

  return (
    <select className="select" value={value || ''} onChange={(e)=>onChange?.(e.target.value)}>
      <option value="">Select branch</option>
      {isAdmin && <option value="all">All branches</option>}
      {branches.map(b => (
        <option key={b.code} value={b.code}>{b.name} ({b.code})</option>
      ))}
    </select>
  );
}
