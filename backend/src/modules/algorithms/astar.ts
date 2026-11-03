import { Graph, GraphNode } from './roadGraph';
import { haversineDistance } from '../../utils/haversine';

export interface AStarResult {
  path: string[];
  cost: number;
  exploredNodes: number;
  executionTimeMs: number;
  found: boolean;
}

/**
 * A* Search Algorithm
 *
 * f(n) = g(n) + h(n)
 *  g(n) — actual accumulated cost from start to n
 *  h(n) — admissible heuristic: Haversine distance from n to goal
 *  f(n) — estimated total cost
 *
 * Uses a min-heap priority queue (implemented as a sorted array for clarity).
 */
export function astar(graph: Graph, startId: string, goalId: string): AStarResult {
  const startTime = performance.now();
  let exploredNodes = 0;

  const startNode = graph.nodes.get(startId);
  const goalNode = graph.nodes.get(goalId);

  if (!startNode || !goalNode) {
    return { path: [], cost: 0, exploredNodes: 0, executionTimeMs: 0, found: false };
  }

  // Priority queue entries: [f, nodeId]
  const openSet: Array<[number, string]> = [];
  const gScore = new Map<string, number>(); // cost from start to node
  const fScore = new Map<string, number>(); // g + h
  const cameFrom = new Map<string, string>();
  const closedSet = new Set<string>();

  gScore.set(startId, 0);
  fScore.set(startId, heuristic(startNode, goalNode));
  openSet.push([fScore.get(startId)!, startId]);

  while (openSet.length > 0) {
    // Extract node with lowest f-score
    openSet.sort((a, b) => a[0] - b[0]);
    const [, currentId] = openSet.shift()!;

    if (currentId === goalId) {
      const path = reconstructPath(cameFrom, currentId);
      const executionTimeMs = performance.now() - startTime;
      return { path, cost: gScore.get(goalId) || 0, exploredNodes, executionTimeMs, found: true };
    }

    if (closedSet.has(currentId)) continue;
    closedSet.add(currentId);
    exploredNodes++;

    const neighbors = graph.adjacency.get(currentId) || [];

    for (const { nodeId: neighborId, weight } of neighbors) {
      if (closedSet.has(neighborId)) continue;

      const tentativeG = (gScore.get(currentId) || 0) + weight;

      if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
        cameFrom.set(neighborId, currentId);
        gScore.set(neighborId, tentativeG);

        const neighborNode = graph.nodes.get(neighborId)!;
        const h = heuristic(neighborNode, goalNode);
        const f = tentativeG + h;
        fScore.set(neighborId, f);
        openSet.push([f, neighborId]);
      }
    }
  }

  const executionTimeMs = performance.now() - startTime;
  return { path: [], cost: 0, exploredNodes, executionTimeMs, found: false };
}

/** Admissible heuristic — straight-line (Haversine) distance to goal */
function heuristic(node: GraphNode, goal: GraphNode): number {
  return haversineDistance(node.lat, node.lng, goal.lat, goal.lng);
}

function reconstructPath(cameFrom: Map<string, string>, current: string): string[] {
  const path: string[] = [current];
  while (cameFrom.has(current)) {
    current = cameFrom.get(current)!;
    path.unshift(current);
  }
  return path;
}
