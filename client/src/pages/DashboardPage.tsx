import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { format } from 'date-fns';
import {
  Activity,
  Clock,
  AlertTriangle,
  Users,
  ShieldAlert,
  ShieldOff,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import Header from '../components/layout/Header';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Spinner from '../components/common/Spinner';
import { analyticsApi } from '../api/analyticsApi';
import { clientsApi } from '../api/clientsApi';

function StatusBadge({ status }: { status: number }) {
  if (status < 300) return <Badge variant="success">{status}</Badge>;
  if (status < 400) return <Badge variant="info">{status}</Badge>;
  if (status < 500) return <Badge variant="warning">{status}</Badge>;
  return <Badge variant="error">{status}</Badge>;
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'text-green-400',
    POST: 'text-blue-400',
    PUT: 'text-yellow-400',
    DELETE: 'text-red-400',
    PATCH: 'text-purple-400',
  };
  return <span className={`font-mono text-xs font-bold ${colors[method] || 'text-dark-300'}`}>{method}</span>;
}

export default function DashboardPage() {
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: analyticsApi.getOverview,
    refetchInterval: 5000,
  });

  const { data: timeseries, isLoading: tsLoading } = useQuery({
    queryKey: ['analytics', 'timeseries'],
    queryFn: () => analyticsApi.getTimeseries({ interval: '1h' }),
    refetchInterval: 30000,
  });

  const { data: recentTraffic } = useQuery({
    queryKey: ['analytics', 'recent-traffic'],
    queryFn: () => analyticsApi.getTrafficLogs({ limit: 12, offset: 0 }),
    refetchInterval: 5000,
  });

  const { data: topPaths } = useQuery({
    queryKey: ['analytics', 'top-paths'],
    queryFn: () => analyticsApi.getTopPaths(8),
    refetchInterval: 15000,
  });

  const { data: flaggedData } = useQuery({
    queryKey: ['flagged', 'dashboard'],
    queryFn: () => clientsApi.getFlagged({ limit: 5 }),
    refetchInterval: 10000,
  });

  const kpiCards = [
    {
      label: 'Requests (24h)',
      value: overview?.totalRequests24h ?? 0,
      icon: Activity,
      color: 'text-primary-400',
      bgColor: 'bg-primary-500/10',
      trend: '+12.5%',
      trendUp: true,
    },
    {
      label: 'Avg Latency',
      value: `${overview?.avgLatencyMs ?? 0}ms`,
      icon: Clock,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      trend: '-3.2%',
      trendUp: false,
    },
    {
      label: 'Error Rate',
      value: `${overview?.errorRate ?? 0}%`,
      icon: AlertTriangle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      trend: '+0.8%',
      trendUp: true,
    },
    {
      label: 'Active Clients',
      value: overview?.activeClients ?? 0,
      icon: Users,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      trend: '+2',
      trendUp: true,
    },
    {
      label: 'Flagged',
      value: overview?.totalFlagged ?? 0,
      icon: ShieldAlert,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      trend: '+5',
      trendUp: true,
    },
    {
      label: 'Throttled',
      value: overview?.totalThrottled ?? 0,
      icon: ShieldOff,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      trend: '+3',
      trendUp: true,
    },
  ];

  const recentLogs = recentTraffic?.logs ?? [];
  const flaggedItems = flaggedData?.items ?? [];

  return (
    <div>
      <Header title="Dashboard" />

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpiCards.map(({ label, value, icon: Icon, color, bgColor, trend, trendUp }) => (
            <Card key={label}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-8 h-8 ${bgColor} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div className={`flex items-center gap-0.5 text-[10px] font-medium ${
                    label === 'Avg Latency'
                      ? (trendUp ? 'text-red-400' : 'text-green-400')
                      : label === 'Requests (24h)' || label === 'Active Clients'
                        ? (trendUp ? 'text-green-400' : 'text-red-400')
                        : (trendUp ? 'text-red-400' : 'text-green-400')
                  }`}>
                    {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {trend}
                  </div>
                </div>
                <div className="text-2xl font-bold text-white">
                  {overviewLoading ? '-' : value}
                </div>
                <div className="text-[11px] text-dark-400 mt-1">{label}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Traffic Chart + Top Endpoints side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Traffic Chart (takes 2/3) */}
          <Card title="Traffic Over Time" className="lg:col-span-2">
            <div className="p-6">
              {tsLoading ? (
                <Spinner />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={timeseries || []}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorErrors" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(v) => format(new Date(v), 'HH:mm')}
                      stroke="#475569"
                      fontSize={11}
                    />
                    <YAxis stroke="#475569" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      labelFormatter={(v) => format(new Date(v), 'MMM dd, HH:mm')}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#colorCount)"
                      name="Requests"
                    />
                    <Area
                      type="monotone"
                      dataKey="errors"
                      stroke="#ef4444"
                      fillOpacity={1}
                      fill="url(#colorErrors)"
                      name="Errors"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Top Endpoints (takes 1/3) */}
          <Card
            title="Top Endpoints"
            action={
              <div className="flex items-center gap-1 text-[10px] text-dark-500">
                <TrendingUp className="w-3 h-3" />
                Last 24h
              </div>
            }
          >
            {topPaths && topPaths.length > 0 ? (
              <div className="p-4">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart
                    data={topPaths.slice(0, 6).map((p) => ({
                      ...p,
                      shortPath: p.path.length > 20 ? '...' + p.path.slice(-18) : p.path,
                    }))}
                    layout="vertical"
                    margin={{ left: 0, right: 10, top: 0, bottom: 0 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="shortPath"
                      width={120}
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        fontSize: '11px',
                      }}
                      formatter={(value: number) => [`${value} requests`, 'Count']}
                      labelFormatter={() => ''}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-1.5">
                  {topPaths.slice(0, 5).map((p, i) => (
                    <div key={p.path} className="flex items-center gap-2 text-[11px]">
                      <span className="w-4 text-dark-500 text-right">{i + 1}.</span>
                      <span className="text-dark-300 font-mono flex-1 truncate">{p.path}</span>
                      <span className="text-dark-400 font-medium">{p.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-dark-500 text-sm">
                No endpoint data yet
              </div>
            )}
          </Card>
        </div>

        {/* Recent Traffic + Recent Flagged side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Traffic (takes 2/3) */}
          <Card title="Recent Traffic" className="lg:col-span-2">
            <div className="divide-y divide-dark-700/50">
              {recentLogs.length === 0 ? (
                <div className="p-8 text-center text-dark-500">
                  No traffic yet. Send requests through the gateway to see them here.
                </div>
              ) : (
                recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="px-5 py-2.5 flex items-center gap-3 hover:bg-dark-800/30 transition-colors"
                  >
                    <span className="text-[11px] text-dark-500 w-14 flex-shrink-0">
                      {format(new Date(log.timestamp), 'HH:mm:ss')}
                    </span>
                    <span className="w-12 flex-shrink-0"><MethodBadge method={log.method} /></span>
                    <span className="text-[13px] text-dark-300 flex-1 truncate font-mono">
                      {log.path}
                    </span>
                    <StatusBadge status={log.responseStatus} />
                    <span className="text-[11px] text-dark-500 w-14 text-right flex-shrink-0">
                      {log.responseTimeMs}ms
                    </span>
                    {log.rateLimited && <Badge variant="warning">429</Badge>}
                    {log.flagged && <Badge variant="error">Flag</Badge>}
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Recent Flagged (takes 1/3) */}
          <Card title="Recent Alerts">
            {flaggedItems.length === 0 ? (
              <div className="p-6 text-center text-dark-500 text-sm">
                <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-dark-600" />
                All clear
              </div>
            ) : (
              <div className="divide-y divide-dark-700/50">
                {flaggedItems.map((item) => (
                  <div key={item.id} className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        item.severity === 'high' ? 'bg-red-500' :
                        item.severity === 'medium' ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`} />
                      <Badge variant={
                        item.severity === 'high' ? 'error' :
                        item.severity === 'medium' ? 'warning' : 'info'
                      }>
                        {item.severity.toUpperCase()}
                      </Badge>
                      <span className="text-[10px] text-dark-500 ml-auto">
                        {format(new Date(item.timestamp), 'HH:mm')}
                      </span>
                    </div>
                    <p className="text-[11px] text-dark-400 pl-3.5 leading-relaxed">
                      {item.reason}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
