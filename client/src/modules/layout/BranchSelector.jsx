import './layout.css';

export default function BranchSelector({ branches=[], value, onChange }){
  return (
    <select className="select" value={value || ''} onChange={(e)=>onChange?.(e.target.value)}>
      <option value="">Select branch</option>
      {branches.map(b => (
        <option key={b.code} value={b.code}>{b.name} ({b.code})</option>
      ))}
    </select>
  );
}

