import { useState, useCallback } from 'react';
import { useSocket } from './useSocket';
import type { ThrottleEvent } from '../types';

export function useThrottleEvents(maxItems = 20) {
  const [events, setEvents] = useState<ThrottleEvent[]>([]);

  const handler = useCallback(
    (event: ThrottleEvent) => {
      setEvents((prev) => [event, ...prev].slice(0, maxItems));
    },
    [maxItems]
  );

  useSocket<ThrottleEvent>('ratelimit:throttled', handler);

  return events;
}
