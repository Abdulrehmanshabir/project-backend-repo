import { useAuth } from '../auth/AuthContext';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBranches, setCurrentBranch } from '../../store/slices/branchesSlice';
import BranchSelector from './BranchSelector';
import './layout.css';

export default function Topbar(){
  const { user } = useAuth();
  const dispatch = useDispatch();
  const branches = useSelector(state => state.branches.list);
  const currentBranch = useSelector(state => state.branches.current);
  const onChange = (val)=> dispatch(setCurrentBranch(val));
  
  // ensure branches loaded
  // Note: Navbar also dispatches fetch, but this is safe/ idempotent
  // and keeps Topbar standalone if used elsewhere
  
  return (
    <header className="topbar">
      <div>Welcome{user?.name ? `, ${user.name}` : ''}</div>
      <div>
        <BranchSelector branches={branches || []} value={currentBranch} onChange={onChange} />
      </div>
    </header>
  );
}
