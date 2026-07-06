import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Activity,
  Shield,
  FileText,
  AlertTriangle,
  Settings,
  Zap,
  Circle,
  Users,
} from 'lucide-react';
import { analyticsApi } from '../../api/analyticsApi';
import { clientsApi } from '../../api/clientsApi';

export default function Sidebar() {
  const { data: overview } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: analyticsApi.getOverview,
    refetchInterval: 10000,
  });

  const { data: flagged } = useQuery({
    queryKey: ['flagged'],
    queryFn: () => clientsApi.getFlagged({ limit: 1 }),
    refetchInterval: 10000,
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: clientsApi.getClients,
    refetchInterval: 30000,
  });

  const unflaggedCount = flagged?.total ?? 0;
  const trafficCount = overview?.totalRequests24h ?? 0;

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', badge: null },
    { to: '/traffic', icon: Activity, label: 'Traffic', badge: trafficCount > 0 ? String(trafficCount) : null },
    { to: '/rate-limits', icon: Shield, label: 'Rate Limits', badge: null },
    { to: '/api-docs', icon: FileText, label: 'API Docs', badge: null },
    { to: '/flagged', icon: AlertTriangle, label: 'Flagged', badge: unflaggedCount > 0 ? String(unflaggedCount) : null },
    { to: '/settings', icon: Settings, label: 'Settings', badge: null },
  ];

  return (
    <aside className="w-64 bg-dark-900 border-r border-dark-700 flex flex-col h-screen fixed left-0 top-0">
      {/* Brand */}
      <div className="p-5 border-b border-dark-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-600/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">API Gateway</h1>
            <p className="text-[11px] text-dark-400">AI-Powered Rate Limiter</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5">
        <div className="px-3 pt-2 pb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-dark-500">Menu</span>
        </div>
        {navItems.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive
                  ? 'bg-primary-600/15 text-primary-400 font-medium shadow-sm'
                  : 'text-dark-400 hover:bg-dark-800 hover:text-dark-200'
              }`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{label}</span>
            {badge && (
              <span className="min-w-[20px] h-5 flex items-center justify-center px-1.5 text-[10px] font-bold bg-primary-600/20 text-primary-400 rounded-full">
                {badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Stats Footer */}
      <div className="p-3 border-t border-dark-700 space-y-2">
        <div className="px-3 py-2.5 bg-dark-800/60 rounded-lg space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Circle className="w-2 h-2 text-green-500 fill-green-500" />
              <span className="text-[11px] text-dark-300">System Online</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 bg-green-500/10 text-green-400 rounded font-medium">
              Healthy
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] text-dark-500">Requests</div>
              <div className="text-xs font-semibold text-dark-200">{trafficCount}</div>
            </div>
            <div>
              <div className="text-[10px] text-dark-500">Clients</div>
              <div className="text-xs font-semibold text-dark-200 flex items-center gap-1">
                <Users className="w-3 h-3 text-dark-400" />
                {clients?.length ?? 0}
              </div>
            </div>
          </div>
        </div>
        <div className="px-3 py-1 text-[10px] text-dark-600 flex items-center justify-between">
          <span>v1.0.0</span>
          <span className="px-1.5 py-0.5 bg-dark-800 rounded text-dark-500 font-mono">DEV</span>
        </div>
      </div>
    </aside>
  );
}
