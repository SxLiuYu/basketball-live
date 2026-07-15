import { io, Socket } from 'socket.io-client';

// @ts-ignore
const isProduction = import.meta.env?.MODE === 'production' || import.meta.env?.PROD;
const SOCKET_URL = isProduction
  ? window.location.origin
  : 'http://localhost:3001';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
