import { useState, useCallback } from 'react';
import { useSocket } from './useSocket';
import type { TrafficLogSummary } from '../types';

export function useTrafficStream(maxItems = 50) {
  const [traffic, setTraffic] = useState<TrafficLogSummary[]>([]);

  const handler = useCallback(
    (log: TrafficLogSummary) => {
      setTraffic((prev) => [log, ...prev].slice(0, maxItems));
    },
    [maxItems]
  );

  useSocket<TrafficLogSummary>('traffic:new', handler);

  return traffic;
}
