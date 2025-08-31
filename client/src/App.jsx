
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { Dashboard, HomeLayout, Landing, Login, Logout, Register } from "./pages";
import Products from './pages/Products';
import Stock from './pages/Stock';
import POS from './pages/POS';
import Reports from './pages/Reports';
import Analytics from './pages/Analytics';
import Investments from './pages/Investments';
import Expenses from './pages/Expenses';
import Branches from './pages/Branches';
import Users from './pages/Users';
import ProtectedRoute from './modules/auth/ProtectedRoute';
import { AuthProvider } from './modules/auth/AuthContext';
import { Provider } from 'react-redux';
import store from './store';
import DashboardLayout from './modules/layout/DashboardLayout';
import './styles/theme.css';
import ErrorBoundary from './modules/common/ErrorBoundary';
import { ToastContainer, toast } from 'react-toastify';

const router = createBrowserRouter([
  {
    path: "/",
    element: <HomeLayout />,
    children: [
      {
        index: true,
        element: <Landing />,
      },
      {
        path: "login",
        element: <Login />,
      },
      {
        path: "register",
        element: <Register />,
      },
      {
        element: (
          <ErrorBoundary>
            <AuthProvider>
              <Provider store={store}>
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              </Provider>
            </AuthProvider>
          </ErrorBoundary>
        ),
        children: [
          { path: 'dashboard', element: <Dashboard /> },
          { path: 'products', element: <Products /> },
          { path: 'stock', element: <Stock /> },
          { path: 'pos', element: <POS /> },
          { path: 'reports', element: <Reports /> },
          { path: 'analytics', element: <Analytics /> },
          { path: 'investments', element: <Investments /> },
          { path: 'expenses', element: <Expenses /> },
          { path: 'branches', element: <Branches /> },
          { path: 'users', element: <Users /> },
        ]
      },
      {
        path: "logout",
        element: <Logout />,
      }
    ],
  },
]);

function App() {


  return (
    <>
        <RouterProvider router={router} />
        <ToastContainer position='top-center' />
    </>
  )
}

export default App
