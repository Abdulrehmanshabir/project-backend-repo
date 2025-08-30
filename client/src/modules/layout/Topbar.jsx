import { useAuth } from '../auth/AuthContext';
import { useBranches } from '../branches/BranchContext';
import BranchSelector from './BranchSelector';
import './layout.css';

export default function Topbar(){
  const { user } = useAuth();
  const { branches, currentBranch, setCurrentBranch } = useBranches?.() || {};
  return (
    <header className="topbar">
      <div>Welcome{user?.name ? `, ${user.name}` : ''}</div>
      <div>
        <BranchSelector
          branches={branches || []}
          value={currentBranch}
          onChange={setCurrentBranch}
        />
      </div>
    </header>
  );
}

