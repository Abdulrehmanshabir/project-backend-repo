import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import http from "../services/http";

export default function Reports() {
  const activeBranchId = useSelector((s) => s.branches.current);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [range, setRange] = useState(1);
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  const endDate = useMemo(() => {
    if (!date) return "";
    const d = new Date(date + "T00:00:00");
    const e = new Date(d);
    e.setDate(e.getDate() + Math.max(1, Number(range || 1)) - 1);
    return e.toISOString().slice(0, 10);
  }, [date, range]);

  useEffect(() => {
    if (!activeBranchId) return;
    (async () => {
      setErr("");
      try {
        if (Number(range) === 1) {
          const res = await http.get("/api/reports/daily-transactions", {
            params: { branchId: activeBranchId, date },
          });
          setData({
            overall: res.data?.totals || {},
            days: [
              { date, totals: res.data?.totals || {}, rows: res.data?.rows || [] },
            ],
          });
        } else {
          const res = await http.get("/api/reports/range-transactions", {
            params: { branchId: activeBranchId, from: date, to: endDate },
          });
          setData(res.data);
        }
      } catch (e) {
        setErr(e.message || "Failed to load report");
      }
    })();
  }, [activeBranchId, date, range, endDate]);

  if (!activeBranchId)
    return (
      <div className="card">Select a branch from the top bar to view reports.</div>
    );

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3>Reports � {activeBranchId}</h3>
        <div className="row" style={{ gap: 12 }}>
          <select
            className="input"
            value={range}
            onChange={(e) => setRange(Number(e.target.value))}
            style={{ width: 120 }}
          >
            {[1, 5, 10, 15, 30].map((r) => (
              <option key={r} value={r}>
                {r} day{r > 1 ? "s" : ""}
              </option>
            ))}
          </select>
          <input
            className="input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ width: 160 }}
          />
          {Number(range) > 1 && (
            <input
              className="input"
              type="date"
              value={endDate}
              readOnly
              style={{ width: 160, opacity: 0.7 }}
            />
          )}
        </div>
      </div>
      {err && <div style={{ color: "salmon" }}>{err}</div>}
      <div className="card">
        <div className="row" style={{ gap: 16, flexWrap: "wrap" }}>
          <div>
            Sales Subtotal: <b>Rs {Number(data?.overall?.salesSubtotal || 0).toLocaleString()}</b>
          </div>
          <div>
            Discount: <b>Rs {Number(data?.overall?.salesDiscount || 0).toLocaleString()}</b>
          </div>
          <div>
            Sales Net: <b>Rs {Number(data?.overall?.salesNet || 0).toLocaleString()}</b>
          </div>
          <div>
            Expenses: <b>Rs {Number(data?.overall?.expensesTotal || 0).toLocaleString()}</b>
          </div>
          <div>
            Net: <b>Rs {Number(data?.overall?.net || 0).toLocaleString()}</b>
          </div>
        </div>
      </div>
      {(data?.days || []).map((d, idx) => (
        <div key={idx} className="card">
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
            <b>{d.date}</b>
            <div className="row" style={{ gap: 12 }}>
              <div>
                Sales: <b>Rs {Number(d.totals?.salesNet || 0).toLocaleString()}</b>
              </div>
              <div>
                Exp: <b>Rs {Number(d.totals?.expensesTotal || 0).toLocaleString()}</b>
              </div>
              <div>
                Net: <b>Rs {Number(d.totals?.net || 0).toLocaleString()}</b>
              </div>
            </div>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Type</th>
                <th>Details</th>
                <th style={{ textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {(d.rows || []).map((r, i) => {
                const time = new Date(r.createdAt).toLocaleTimeString();
                if (r.type === "sale") {
                  return (
                    <tr key={i}>
                      <td data-label="Time">{time}</td>
                      <td data-label="Type">Sale</td>
                      <td data-label="Details">
                        {r.sku} - {r.name} - {r.qty} @ Rs {Number(r.unitPrice || 0).toLocaleString()}
                      </td>
                      <td data-label="Amount" style={{ textAlign: "right" }}>Rs {Number(r.lineTotal || 0).toLocaleString()}</td>
                    </tr>
                  );
                }
                return (
                  <tr key={i}>
                    <td data-label="Time">{time}</td>
                    <td data-label="Type">Expense</td>
                    <td data-label="Details">
                      {r.kind || "branch"}
                      {r.subcategory ? `/${r.subcategory}` : ""} - {r.category}
                      {r.note ? ` (${r.note})` : ""}
                    </td>
                    <td data-label="Amount" style={{ textAlign: "right" }}>Rs {Number(r.amount || 0).toLocaleString()}</td>
                  </tr>
                );
              })}
              {(d.rows || []).length === 0 && (
                <tr>
                  <td colSpan={4}>No transactions.</td>
                </tr>
              )}            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}