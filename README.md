<<<<<<< HEAD
Vape Hub – Multi‑Branch Inventory, POS, and Analytics

Overview
- Full‑stack app for managing products, stock, sales, and reports across multiple branches.
- Branch isolation is enforced: managers/admins only see and operate within their assigned branches; owners/admins can see all.
- Includes branch‑scoped analytics, investments and expenses tracking, plus an admin overview.

Tech Stack
- Backend: Node.js, Express, Mongoose (MongoDB)
- Frontend: React + Vite
- Auth: JWT (Bearer) with roles and branch scopes

Key Concepts
- Products: Global catalog (SKU, name, price, etc.). Creating a product initializes a stock row per branch.
- Branch scope: All stock, sales, and reports APIs require a `branchId` and are checked against the user’s JWT branches.
- Roles:
  - owner/admin: access all branches; extra admin endpoints enabled
  - manager: restricted to assigned branches

Getting Started
1) Prerequisites
   - Node.js 18+
   - MongoDB (Atlas or local)

2) Configure environment
   - Create `.env` in the project root. Example:
     PORT=3000
     MONGO_URI=mongodb://localhost:27017/vape_hub
     JWT_SECRET=replace-with-a-long-random-string
     CORS_ORIGIN=http://localhost:5173
   - Client env (optional): `client/.env` with `VITE_API_URL=http://localhost:3000` if needed.

3) Install deps
   - Root: `npm install`
   - Client: `cd client && npm install`

4) Run
   - Backend: `npm run dev` (or `node app.js`)
   - Frontend: `cd client && npm run dev` (opens Vite dev server)

Authentication
- Obtain a JWT via existing auth routes under `/auth` (login/register). The JWT payload should include:
  { sub, email, role, branches }
  - `role`: 'manager' | 'admin' | 'owner'
  - `branches`: '*' for owner/admin, or array of branch codes for managers
- The client stores the token in `localStorage.accessToken`.

Branch Selection
- The React app keeps the active branch in `localStorage.activeBranchId` via `BranchContext`.
- A request interceptor in `client/src/services/http.js` automatically attaches `branchId` to `/api/stock`, `/api/sales`, `/api/reports` requests.

API Highlights
- Products (global)
  - `GET /api/products` – list with optional `?q=`
  - `POST /api/products` – create product and initialize stock rows for all branches
  - `PATCH /api/products/:id`, `DELETE /api/products/:id`

- Stock (branch‑scoped)
  - `GET /api/stock?branchId=CODE` – list stock for a branch (alias: `/api/stock/list`)
  - `PATCH /api/stock/adjust` – adjust on‑hand by `delta` (also supports `POST`)

- Sales (branch‑scoped)
  - `GET /api/sales/recent?branchId=CODE` – recent sales for branch
  - `POST /api/sales` – create sale; decrements stock and records stock moves

- Reports & Analytics (branch‑scoped unless noted)
  - `GET /api/reports/low-stock?branchId=CODE&threshold=5`
  - `GET /api/reports/daily-sales?branchId=CODE`
  - `GET /api/reports/analytics?branchId=CODE[&from=ISO&to=ISO&lowThreshold=N]` – KPIs: today/last7d, low stock, top products; includes last7d expenses/investments and derived profit/ROI.
  - `GET /api/reports/analytics/overview` – admin/owner only; per‑branch totals for today/last7d.
  - Investments: `GET/POST /api/reports/investments` (branch)
  - Expenses: `GET/POST /api/reports/expenses` (branch)

- Branches
  - `GET /api/branches` – list visible branches for current user
  - `POST /api/branches` – admin/owner create branch
  - `PATCH /api/branches/:code/assign` – admin/owner assign a manager to a branch
  - `GET /api/branches/with-managers` – admin/owner: branches with assigned managers

Frontend Pages
- Login/Register – obtain and store JWT
- Dashboard – welcome, quick links; admin/owner sees analytics overview
- Products – manage catalog
- Stock – view/adjust on‑hand for the active branch
- POS – create sales for the active branch
- Reports – basic reports
- Analytics – branch KPIs with top products, low stock, and forms to add investments/expenses
- Branches – list branches; admin/owner can create branches, assign managers, and see managers per branch

Branch Isolation Details
- Middleware `auth` validates JWT; `branchScope` enforces that `branchId` in params/query/body is within the user’s allowed branches.
- Owners/admins bypass branch checks (`branches === '*'` or role elevated).

Data Models (selected)
- Product: sku, name, brand, category, unit, unitSize, price, taxRate
- Branch: code, name, address, phone
- Stock: branchId, productId, onHand
- StockMove: branchId, productId, delta, reason, refId
- Sale: branchId, items[{ productId, qty, unitPrice, taxRate, name }], totals
- Investment: branchId, amount, note, timestamps
- Expense: branchId, amount, category, note, timestamps

Common Issues & Tips
- MongoDB connection: if using Atlas, ensure `MONGO_URI` uses `mongodb+srv://...`, IP allowlist is set, and DNS works. For local dev, use `mongodb://localhost:27017/vape_hub`.
- 401 Unauthorized: token missing/expired; user is redirected to Login.
- 403 Forbidden: branch scope violation or non‑admin hitting admin endpoints.
- Ensure `activeBranchId` is selected; BranchContext picks the first branch if none is set.

Development Notes
- Keep JWT payload consistent with role/branches for branch enforcement.
- The client interceptor only auto‑adds `branchId` for `/api/stock`, `/api/sales`, `/api/reports` paths; pass `branchId` manually elsewhere.
- Profit currently computes as revenue − expenses (COGS not tracked yet). Add product cost/COGS if needed.

License
- See `LICENSE` in the repo.

=======
# Vapehubpos
>>>>>>> af30c2ce34a2ff50638348cdb7dd3bd1c21f9cab
