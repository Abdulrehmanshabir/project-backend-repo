import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import http from '../../services/http';
import { jwtDecode } from 'jwt-decode';

const BranchCtx = createContext();

export function BranchProvider({ children }) {
  const [branches, setBranches] = useState([]);
  const [currentBranch, setCurrentBranch] = useState(localStorage.getItem('activeBranchId') || '');

  useEffect(() => {
    // Pre-select branch from JWT if the user has exactly one assigned branch
    try {
      const token = localStorage.getItem('accessToken') || '';
      const payload = token ? jwtDecode(token) : null;
      const claim = payload?.branches;
      if (!currentBranch && Array.isArray(claim) && claim.length === 1) {
        setCurrentBranch(claim[0]);
        localStorage.setItem('activeBranchId', claim[0]);
      }
    } catch {}

    (async () => {
      try {
        const res = await http.get('/api/branches');
        const list = Array.isArray(res.data) ? res.data : [];
        setBranches(list);
        if (!currentBranch) {
          if (list.length === 1) {
            setCurrentBranch(list[0].code);
            localStorage.setItem('activeBranchId', list[0].code);
          } else if (list[0]) {
            setCurrentBranch(list[0].code);
            localStorage.setItem('activeBranchId', list[0].code);
          }
        }
      } catch {
        setBranches([]);
      }
    })();
  }, []);

  useEffect(() => { if (currentBranch) localStorage.setItem('activeBranchId', currentBranch); }, [currentBranch]);

  const value = useMemo(() => ({ branches, currentBranch, setCurrentBranch }), [branches, currentBranch]);
  return <BranchCtx.Provider value={value}>{children}</BranchCtx.Provider>;
}

export function useBranches(){ return useContext(BranchCtx); }

// Backwards compatibility for existing imports
export function useBranch(){
  const ctx = useContext(BranchCtx);
  if (!ctx) return ctx;
  // Provide old property names too
  return {
    ...ctx,
    activeBranchId: ctx.currentBranch,
    setBranch: ctx.setCurrentBranch,
  };
}
