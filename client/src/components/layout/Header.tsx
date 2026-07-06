import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Activity, Wifi, WifiOff, Clock } from 'lucide-react';
import { analyticsApi } from '../../api/analyticsApi';
import { useTrafficStream } from '../../hooks/useTrafficStream';

export default function Header({ title }: { title: string }) {
  const traffic = useTrafficStream(1);
  const isLive = traffic.length > 0;
  const [now, setNow] = useState(new Date());

  const { data: overview } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: analyticsApi.getOverview,
    refetchInterval: 10000,
  });

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 border-b border-dark-700 bg-dark-900/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-30">
      <h2 className="text-base font-semibold text-white">{title}</h2>

      <div className="flex items-center gap-3">
        {/* Quick stats */}
        <div className="hidden md:flex items-center gap-4 mr-2">
          <div className="flex items-center gap-1.5 text-[11px] text-dark-400">
            <Activity className="w-3.5 h-3.5 text-primary-400" />
            <span className="text-dark-300 font-medium">{overview?.totalRequests24h ?? 0}</span>
            <span>reqs/24h</span>
          </div>
          <div className="w-px h-4 bg-dark-700" />
          <div className="flex items-center gap-1.5 text-[11px] text-dark-400">
            <span className="text-dark-300 font-medium">{overview?.avgLatencyMs ?? 0}ms</span>
            <span>avg</span>
          </div>
          <div className="w-px h-4 bg-dark-700" />
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className={`font-medium ${(overview?.errorRate ?? 0) > 10 ? 'text-red-400' : 'text-green-400'}`}>
              {overview?.errorRate ?? 0}%
            </span>
            <span className="text-dark-400">errors</span>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px h-4 bg-dark-700" />

        {/* Connection status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-dark-800/80 rounded-md border border-dark-700">
          {isLive ? (
            <Wifi className="w-3.5 h-3.5 text-green-400" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-dark-500" />
          )}
          <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-dark-500'}`} />
          <span className="text-[11px] text-dark-400">
            {isLive ? 'Live' : 'Idle'}
          </span>
        </div>

        {/* Clock */}
        <div className="flex items-center gap-1.5 text-[11px] text-dark-500">
          <Clock className="w-3 h-3" />
          <span className="font-mono">{format(now, 'HH:mm:ss')}</span>
        </div>
      </div>
    </header>
  );
}
