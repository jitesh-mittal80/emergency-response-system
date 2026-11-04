// Shared TypeScript types used by both frontend and backend

export type AmbulanceStatus = 'AVAILABLE' | 'ASSIGNED' | 'EN_ROUTE' | 'ON_SCENE' | 'OFFLINE';

export type EmergencyStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'EN_ROUTE'
  | 'ON_SCENE'
  | 'COMPLETED'
  | 'WAITING_FOR_AMBULANCE'
  | 'CANCELLED'
  | 'FAILED';

export type EmergencyType =
  | 'CARDIAC_ARREST'
  | 'ACCIDENT'
  | 'STROKE'
  | 'RESPIRATORY'
  | 'TRAUMA'
  | 'BURNS'
  | 'POISONING'
  | 'MATERNITY'
  | 'OTHER';

export type DispatchStatus =
  | 'ASSIGNED'
  | 'EN_ROUTE'
  | 'ON_SCENE'
  | 'COMPLETED'
  | 'CANCELLED';

export type AlgorithmType = 'ASTAR' | 'DIJKSTRA';

// ---- Coordinate ----
export interface Coordinate {
  lat: number;
  lng: number;
}

// ---- Ambulance ----
export interface Ambulance {
  id: string;
  name: string;
  vehicleNumber: string;
  latitude: number;
  longitude: number;
  status: AmbulanceStatus;
  assignedEmergencyId?: string | null;
  currentRoute?: RoutePoint[] | null;
  lastLocationUpdate: string;
  createdAt: string;
  updatedAt: string;
}

// ---- Patient ----
export interface Patient {
  id: string;
  name: string;
  phoneNumber: string;
  locationName: string;
  latitude: number;
  longitude: number;
  emergencyType: EmergencyType;
}

// ---- Emergency Request ----
export interface EmergencyRequest {
  id: string;
  patientId: string;
  patient: Patient;
  emergencyType: EmergencyType;
  latitude: number;
  longitude: number;
  status: EmergencyStatus;
  createdAt: string;
  updatedAt: string;
  dispatch?: Dispatch | null;
}

// ---- Dispatch ----
export interface Dispatch {
  id: string;
  emergencyId: string;
  ambulanceId: string;
  ambulance?: Ambulance;
  distanceKm: number;
  initialEtaMinutes: number;
  currentEtaMinutes: number;
  status: DispatchStatus;
  assignedAt: string;
  arrivedAt?: string | null;
  completedAt?: string | null;
  route?: RoutePoint[];
}

// ---- Route ----
export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface RouteResult {
  points: RoutePoint[];
  distanceKm: number;
  durationMinutes: number;
  isMock: boolean;
}

// ---- Algorithm ----
export interface AlgorithmNode {
  id: string;
  lat: number;
  lng: number;
}

export interface AlgorithmEdge {
  from: string;
  to: string;
  weight: number; // km
}

export interface AlgorithmGraph {
  nodes: AlgorithmNode[];
  edges: AlgorithmEdge[];
}

export interface AlgorithmResult {
  algorithm: AlgorithmType;
  path: string[];
  pathCoordinates: RoutePoint[];
  pathDistance: number;
  pathCost: number;
  exploredNodes: number;
  executionTimeMs: number;
}

export interface AlgorithmComparison {
  astar: AlgorithmResult;
  dijkstra: AlgorithmResult;
  winner: AlgorithmType;
  speedupPercent: number;
}

// ---- Analytics ----
export interface OverviewStats {
  totalAmbulances: number;
  availableAmbulances: number;
  busyAmbulances: number;
  offlineAmbulances: number;
  totalEmergencies: number;
  activeEmergencies: number;
  completedEmergencies: number;
  averageResponseTimeMinutes: number;
  fastestResponseTimeMinutes: number;
  slowestResponseTimeMinutes: number;
}

// ---- Socket Events ----
export interface SocketAmbulanceLocationUpdate {
  ambulanceId: string;
  latitude: number;
  longitude: number;
  status: AmbulanceStatus;
  timestamp: string;
}

export interface SocketAmbulanceStatusUpdate {
  ambulanceId: string;
  status: AmbulanceStatus;
  assignedEmergencyId?: string | null;
}

export interface SocketEmergencyNew {
  emergency: EmergencyRequest;
}

export interface SocketEmergencyStatusUpdate {
  emergencyId: string;
  status: EmergencyStatus;
}

export interface SocketDispatchAssigned {
  dispatch: Dispatch;
  emergency: EmergencyRequest;
  ambulance: Ambulance;
}

export interface SocketDispatchEtaUpdate {
  dispatchId: string;
  currentEtaMinutes: number;
  remainingDistanceKm: number;
}

export interface SocketDispatchStatusUpdate {
  dispatchId: string;
  status: DispatchStatus;
}

export interface SocketDispatchCompleted {
  dispatchId: string;
  emergencyId: string;
  ambulanceId: string;
}

// ---- Simulation ----
export interface SimulationStatus {
  running: boolean;
  speed: number;
  ambulanceCount: number;
  tickMs: number;
}
