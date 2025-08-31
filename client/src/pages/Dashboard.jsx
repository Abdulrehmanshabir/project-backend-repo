import React, { useEffect, useMemo, useState } from "react";
import "../styles/Dashboard.css";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import http from "../services/http";
import { jwtDecode } from "jwt-decode";
import { useSelector } from 'react-redux';

const API = import.meta?.env?.VITE_API_URL || "http://localhost:3000";

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState({ msg: "", luckyNumber: "" });
  const [overview, setOverview] = useState(null);
  const currentBranch = useSelector(s => s.branches.current) || localStorage.getItem('activeBranchId') || '';

  // Read token the same way the Login/Register screens write it
  const token = localStorage.getItem("accessToken") || "";
  const role = useMemo(() => {
    try { return jwtDecode(token)?.role || ""; } catch { return ""; }
  }, [token]);

  const fetchDashboard = async () => {
    if (!token) return; // guard
    try {
      const res = await axios.get(`${API}/auth/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Expecting { message: "..."} or { msg, secret } depending on your controller
      const msg = res.data?.message || res.data?.msg || "Welcome";
      const secret = res.data?.secret ?? "";
      setData({ msg, luckyNumber: secret });
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err.message || "Error";
      if (status === 401) {
        toast.warn("Session expired. Please log in again.");
        localStorage.removeItem("accessToken");
        navigate("/login", { replace: true });
      } else {
        toast.error(msg);
      }
    }
  };

  useEffect(() => {
    if (!token) {
      toast.warn("Please login first to access dashboard");
      navigate("/login", { replace: true });
      return;
    }
    fetchDashboard();
    // Admin/Owner overview fetch
    if (role === 'admin' || role === 'owner') {
      http.get('/api/reports/analytics/overview').then(res => setOverview(res.data)).catch(()=>setOverview(null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, role]);

  return (
    <div className="container stack">
      <div className="row" style={{justifyContent:'space-between'}}>
        <h1 style={{margin:0}}>Dashboard</h1>
        <Link to="/logout" className="btn">Logout</Link>
      </div>
      {role === 'manager' && currentBranch ? (
        <div className="card"><strong>Your Branch:</strong> {currentBranch}</div>
      ) : null}
      <div className="grid cols-3">
        <div className="card">
          <h3>Welcome</h3>
          <p>{data.msg}</p>
        </div>
        <div className="card">
          <h3>Quick Links</h3>
          <div className="row">
            <Link className="btn" to="/products">Products</Link>
            <Link className="btn" to="/stock">Stock</Link>
            <Link className="btn" to="/pos">POS</Link>
          </div>
        </div>
        <div className="card">
          <h3>Fun</h3>
          <p>{data.luckyNumber ? `Lucky number: ${data.luckyNumber}` : '—'}</p>
        </div>
      </div>
      {(role === 'admin' || role === 'owner') && overview && (
        <div className="card" style={{marginTop:16}}>
          <h3>Overview (All Branches)</h3>
          <div className="grid cols-3">
            <div>
              <strong>Today</strong>
              {Object.entries(overview.today || {}).map(([bid, v]) => (
                <div key={bid}>{bid}: Qty {v.qty} • ${Number(v.revenue||0).toFixed(2)}</div>
              ))}
            </div>
            <div>
              <strong>Last 7 Days</strong>
              {Object.entries(overview.last7d || {}).map(([bid, v]) => (
                <div key={bid}>{bid}: Qty {v.qty} • ${Number(v.revenue||0).toFixed(2)}</div>
              ))}
            </div>
            <div>
              <Link className="btn" to="/analytics">Open Analytics</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
