import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-dark-950">
      <Sidebar />
      <div className="ml-64">
        <Outlet />
      </div>
    </div>
  );
}
