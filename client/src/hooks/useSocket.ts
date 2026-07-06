import { useEffect, useCallback } from 'react';
import { useSocketContext } from '../context/SocketContext';

export function useSocket<T>(event: string, handler: (data: T) => void) {
  const socket = useSocketContext();

  const stableHandler = useCallback(handler, [handler]);

  useEffect(() => {
    if (!socket) return;
    socket.on(event, stableHandler as any);
    return () => {
      socket.off(event, stableHandler as any);
    };
  }, [socket, event, stableHandler]);

  return socket;
}
