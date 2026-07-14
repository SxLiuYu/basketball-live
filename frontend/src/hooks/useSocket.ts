import { useEffect, useRef, useCallback } from 'react';
import { getSocket } from '../utils/socket';

interface UseSocketProps {
  matchId: number | null;
  onMatchUpdate?: (data: any) => void;
  onPlayerStatsUpdate?: (data: any) => void;
  onEventAdded?: (data: any) => void;
  onEventCancelled?: (data: any) => void;
}

export function useSocket({ matchId, onMatchUpdate, onPlayerStatsUpdate, onEventAdded, onEventCancelled }: UseSocketProps) {
  const socketRef = useRef(getSocket());

  useEffect(() => {
    const socket = socketRef.current;

    if (matchId) {
      socket.emit('join-match', { matchId });
    }

    if (onMatchUpdate) socket.on('match-update', onMatchUpdate);
    if (onPlayerStatsUpdate) socket.on('player-stats-update', onPlayerStatsUpdate);
    if (onEventAdded) socket.on('event-added', onEventAdded);
    if (onEventCancelled) socket.on('event-cancelled', onEventCancelled);

    return () => {
      if (matchId) {
        socket.emit('leave-match', { matchId });
      }
      if (onMatchUpdate) socket.off('match-update', onMatchUpdate);
      if (onPlayerStatsUpdate) socket.off('player-stats-update', onPlayerStatsUpdate);
      if (onEventAdded) socket.off('event-added', onEventAdded);
      if (onEventCancelled) socket.off('event-cancelled', onEventCancelled);
    };
  }, [matchId, onMatchUpdate, onPlayerStatsUpdate, onEventAdded, onEventCancelled]);

  const emit = useCallback((event: string, data: any) => {
    socketRef.current.emit(event, data);
  }, []);

  return { emit, socket: socketRef.current };
}
