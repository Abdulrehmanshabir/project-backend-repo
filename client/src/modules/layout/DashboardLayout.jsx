import { Outlet } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Topbar from './Topbar';

export default function DashboardLayout() {
  return (
    <div className="container stack">
      <Navbar />
      <Topbar />
      <Outlet />
    </div>
  );
}
