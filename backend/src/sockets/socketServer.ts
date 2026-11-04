import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';

let ioInstance: SocketIOServer | null = null;

export function initializeSocket(server: HttpServer): SocketIOServer {
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket: Socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Client requests full current state on reconnect
    socket.on('request:state', async () => {
      socket.emit('state:request-ack', { message: 'State broadcast will follow' });
    });

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} — ${reason}`);
    });

    socket.on('error', (err) => {
      logger.error(`Socket error [${socket.id}]:`, err);
    });
  });

  ioInstance = io;
  return io;
}

export function getIO(): SocketIOServer {
  if (!ioInstance) {
    throw new Error('Socket.IO not initialized. Call initializeSocket first.');
  }
  return ioInstance;
}

// ---- Typed emit helpers ----
export const SocketEvents = {
  AMBULANCE_LOCATION_UPDATE: 'ambulance:location-update',
  AMBULANCE_STATUS_UPDATE: 'ambulance:status-update',
  EMERGENCY_NEW: 'emergency:new-request',
  EMERGENCY_STATUS_UPDATE: 'emergency:status-update',
  DISPATCH_ASSIGNED: 'dispatch:assigned',
  DISPATCH_STATUS_UPDATE: 'dispatch:status-update',
  DISPATCH_ETA_UPDATE: 'dispatch:eta-update',
  DISPATCH_COMPLETED: 'dispatch:completed',
  SIMULATION_STATUS: 'simulation:status',
} as const;
