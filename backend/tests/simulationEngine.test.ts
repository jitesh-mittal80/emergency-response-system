import { Server as SocketIOServer } from 'socket.io';

const mockPrisma = {
  ambulance: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
  dispatch: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  emergencyRequest: {
    update: jest.fn(),
  },
  ambulanceLocationHistory: {
    createMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockGetRoute = jest.fn();

jest.mock('../src/utils/prisma', () => ({ prisma: mockPrisma }));
jest.mock('../src/modules/routing/routingService', () => ({ getRoute: mockGetRoute }));

process.env.SIMULATION_TICK_MS = '1000';
process.env.SIMULATION_SPEED_MULTIPLIER = '10';

const { SimulationEngine } = require('../src/modules/simulation/simulationEngine') as typeof import('../src/modules/simulation/simulationEngine');
const { SocketEvents } = require('../src/sockets/socketServer') as typeof import('../src/sockets/socketServer');
const mockIo = { emit: jest.fn() };
const simulation = SimulationEngine.getInstance(mockIo as unknown as SocketIOServer);

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockPrisma.ambulance.findMany.mockResolvedValue([]);
  mockPrisma.ambulance.update.mockResolvedValue({});
  mockPrisma.dispatch.findFirst.mockResolvedValue(null);
  mockPrisma.dispatch.findMany.mockResolvedValue([]);
  mockPrisma.dispatch.update.mockResolvedValue({});
  mockPrisma.emergencyRequest.update.mockResolvedValue({});
  mockPrisma.ambulanceLocationHistory.createMany.mockResolvedValue({});
  mockPrisma.$transaction.mockResolvedValue([]);
});

afterEach(() => {
  simulation.stop();
  simulation.stopAmbulance('roaming-ambulance');
  simulation.stopAmbulance('dispatched-ambulance');
  jest.useRealTimers();
});

describe('SimulationEngine movement', () => {
  test('keeps available ambulances moving when routing falls back to a mock route', async () => {
    mockPrisma.ambulance.findMany.mockResolvedValue([{
      id: 'roaming-ambulance',
      latitude: 28.6,
      longitude: 77.06,
      status: 'AVAILABLE',
    }]);
    mockGetRoute.mockResolvedValue({
      points: [{ lat: 28.6, lng: 77.06 }, { lat: 28.61, lng: 77.06 }],
      distanceKm: 1.1,
      durationMinutes: 2,
      isMock: true,
    });

    await simulation.start();
    await jest.advanceTimersByTimeAsync(1000);

    const locationUpdate = mockIo.emit.mock.calls.find(
      ([event]) => event === SocketEvents.AMBULANCE_LOCATION_UPDATE
    );
    expect(locationUpdate).toBeDefined();
    expect(locationUpdate?.[1].latitude).not.toBe(28.6);
  });

  test('marks a dispatched ambulance en route as soon as it starts moving', async () => {
    await simulation.start();
    simulation.pauseAmbulance(
      'dispatched-ambulance',
      [
        { lat: 28.6, lng: 77.06 },
        { lat: 28.62, lng: 77.06 },
        { lat: 28.65, lng: 77.06 },
      ],
      28.65,
      77.06
    );
    mockPrisma.dispatch.findMany.mockResolvedValue([{
      id: 'dispatch-1',
      ambulanceId: 'dispatched-ambulance',
      emergencyId: 'emergency-1',
      status: 'ASSIGNED',
      initialEtaMinutes: 10,
      emergency: { latitude: 28.65, longitude: 77.06 },
    }]);

    await jest.advanceTimersByTimeAsync(1000);

    expect(mockIo.emit).toHaveBeenCalledWith(
      SocketEvents.AMBULANCE_STATUS_UPDATE,
      expect.objectContaining({
        ambulanceId: 'dispatched-ambulance',
        status: 'EN_ROUTE',
      })
    );
    expect(mockIo.emit).toHaveBeenCalledWith(
      SocketEvents.DISPATCH_STATUS_UPDATE,
      { dispatchId: 'dispatch-1', status: 'EN_ROUTE' }
    );
  });
});
