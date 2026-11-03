import 'dotenv/config';
import http from 'http';
import app from './app';
import { initializeSocket } from './sockets/socketServer';
import { SimulationEngine } from './modules/simulation/simulationEngine';
import { prisma } from './utils/prisma';

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocket(server);

// Start ambulance simulation
const simulation = SimulationEngine.getInstance(io);

server.listen(PORT, async () => {
  console.log(`🚑 Emergency Dispatch Backend running on port ${PORT}`);
  console.log(`📡 Socket.IO ready`);
  console.log(`🗄️  Database: ${process.env.DATABASE_URL?.split('@')[1] ?? 'connected'}`);
  console.log(`🗺️  Routing mode: ${process.env.MOCK_ROUTING === 'false' ? 'Google Routes API' : 'Mock (simulated)'}`);

  // Auto-start simulation
  try {
    await simulation.start();
    console.log('🏃 Ambulance roaming simulation started');
  } catch (err) {
    console.error('⚠️  Simulation start error:', err);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  simulation.stop();
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});

process.on('SIGINT', async () => {
  simulation.stop();
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});
