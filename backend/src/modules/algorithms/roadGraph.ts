import { haversineDistance } from '../../utils/haversine';

export interface GraphNode {
  id: string;
  lat: number;
  lng: number;
  name?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  weight: number; // km
}

export interface Graph {
  nodes: Map<string, GraphNode>;
  adjacency: Map<string, Array<{ nodeId: string; weight: number }>>;
}

/**
 * Build a road graph for the West Delhi area (Dwarka, Janakpuri, Uttam Nagar, Palam, Vikaspuri).
 * Nodes represent major road intersections; edges represent road segments with realistic distances.
 */
export function buildDelhiRoadGraph(): Graph {
  const rawNodes: GraphNode[] = [
    // Dwarka Sector nodes
    { id: 'DW_S1',  lat: 28.5921, lng: 77.0460, name: 'Dwarka Sector 6 Metro' },
    { id: 'DW_S2',  lat: 28.5805, lng: 77.0590, name: 'Dwarka Sector 10' },
    { id: 'DW_S3',  lat: 28.5753, lng: 77.0460, name: 'Dwarka Sector 14' },
    { id: 'DW_S4',  lat: 28.5645, lng: 77.0523, name: 'Dwarka Sector 18' },
    { id: 'DW_S5',  lat: 28.5540, lng: 77.0580, name: 'Dwarka Sector 21' },
    { id: 'DW_S6',  lat: 28.5700, lng: 77.0800, name: 'Palam Village Road' },
    { id: 'DW_S7',  lat: 28.5850, lng: 77.0550, name: 'Dwarka Mor' },
    // Janakpuri nodes
    { id: 'JK_S1',  lat: 28.6282, lng: 77.0862, name: 'Janakpuri District Centre' },
    { id: 'JK_S2',  lat: 28.6330, lng: 77.0820, name: 'Janakpuri C Block' },
    { id: 'JK_S3',  lat: 28.6250, lng: 77.0895, name: 'Janakpuri A-1 Block' },
    { id: 'JK_S4',  lat: 28.6195, lng: 77.0880, name: 'Janakpuri West Metro' },
    // Uttam Nagar nodes
    { id: 'UN_S1',  lat: 28.6208, lng: 77.0573, name: 'Uttam Nagar East Metro' },
    { id: 'UN_S2',  lat: 28.6190, lng: 77.0490, name: 'Uttam Nagar West' },
    { id: 'UN_S3',  lat: 28.6120, lng: 77.0620, name: 'Bindapur Road' },
    // Vikaspuri nodes
    { id: 'VK_S1',  lat: 28.6450, lng: 77.0713, name: 'Vikaspuri Main Market' },
    { id: 'VK_S2',  lat: 28.6395, lng: 77.0650, name: 'Vikaspuri Sector C' },
    { id: 'VK_S3',  lat: 28.6480, lng: 77.1040, name: 'Subhash Nagar' },
    // Palam nodes
    { id: 'PL_S1',  lat: 28.5897, lng: 77.0793, name: 'Palam Airport Road' },
    { id: 'PL_S2',  lat: 28.5810, lng: 77.0710, name: 'Palam Dabri Road' },
    // Connecting / arterial nodes
    { id: 'AR_S1',  lat: 28.6013, lng: 77.0690, name: 'Dwarka Expressway' },
    { id: 'AR_S2',  lat: 28.6100, lng: 77.0350, name: 'Uttam Nagar SW' },
    { id: 'AR_S3',  lat: 28.6070, lng: 77.0780, name: 'Nawada Metro' },
    { id: 'AR_S4',  lat: 28.6200, lng: 77.0580, name: 'Uttam Nagar Centre' },
    { id: 'AR_S5',  lat: 28.6410, lng: 77.0990, name: 'Tilak Nagar' },
    { id: 'AR_S6',  lat: 28.5921, lng: 77.0700, name: 'Dwarka SE Junction' },
    { id: 'AR_S7',  lat: 28.6150, lng: 77.0900, name: 'Janakpuri South' },
    { id: 'AR_S8',  lat: 28.6300, lng: 77.0700, name: 'Vikaspuri SW' },
  ];

  // Edges: [from, to] — bidirectional; weight is Haversine distance × road factor
  const rawEdges: [string, string][] = [
    // Dwarka internal
    ['DW_S1', 'DW_S7'], ['DW_S7', 'DW_S2'], ['DW_S2', 'DW_S3'],
    ['DW_S3', 'DW_S4'], ['DW_S4', 'DW_S5'], ['DW_S2', 'DW_S6'],
    ['DW_S6', 'PL_S1'], ['DW_S1', 'AR_S6'],
    // Palam
    ['PL_S1', 'PL_S2'], ['PL_S2', 'DW_S6'],
    // Arterials connecting Dwarka → Uttam Nagar
    ['AR_S6', 'AR_S1'], ['AR_S1', 'UN_S3'], ['AR_S1', 'AR_S4'],
    ['DW_S7', 'AR_S1'], ['AR_S2', 'UN_S2'],
    // Uttam Nagar internal
    ['UN_S1', 'UN_S2'], ['UN_S1', 'UN_S3'], ['UN_S3', 'AR_S3'],
    ['AR_S4', 'UN_S1'], ['AR_S4', 'UN_S3'],
    // Janakpuri
    ['JK_S1', 'JK_S2'], ['JK_S2', 'JK_S3'], ['JK_S3', 'JK_S4'],
    ['JK_S4', 'AR_S7'], ['AR_S7', 'AR_S3'], ['AR_S7', 'JK_S1'],
    ['JK_S1', 'AR_S8'],
    // Vikaspuri
    ['VK_S1', 'VK_S2'], ['VK_S2', 'AR_S8'], ['AR_S8', 'UN_S1'],
    ['VK_S1', 'VK_S3'], ['VK_S3', 'AR_S5'],
    ['AR_S5', 'JK_S1'],
    // Long connections
    ['AR_S3', 'JK_S4'], ['AR_S4', 'AR_S3'],
    ['DW_S1', 'AR_S4'],
  ];

  const nodes = new Map<string, GraphNode>();
  for (const n of rawNodes) nodes.set(n.id, n);

  const adjacency = new Map<string, Array<{ nodeId: string; weight: number }>>();
  for (const n of rawNodes) adjacency.set(n.id, []);

  const addEdge = (from: string, to: string) => {
    const a = nodes.get(from);
    const b = nodes.get(to);
    if (!a || !b) return;
    // Road factor 1.35 to simulate actual road distance vs straight line
    const weight = haversineDistance(a.lat, a.lng, b.lat, b.lng) * 1.35;
    adjacency.get(from)!.push({ nodeId: to, weight });
    adjacency.get(to)!.push({ nodeId: from, weight }); // bidirectional
  };

  for (const [from, to] of rawEdges) addEdge(from, to);

  return { nodes, adjacency };
}

/**
 * Find the nearest graph node to a given coordinate.
 */
export function nearestNode(graph: Graph, lat: number, lng: number): string {
  let bestId = '';
  let bestDist = Infinity;

  for (const [id, node] of graph.nodes) {
    const d = haversineDistance(lat, lng, node.lat, node.lng);
    if (d < bestDist) {
      bestDist = d;
      bestId = id;
    }
  }

  return bestId;
}
