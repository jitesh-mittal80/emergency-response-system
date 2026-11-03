import { Graph } from './roadGraph';

export interface DijkstraResult {
  path: string[];
  cost: number;
  exploredNodes: number;
  executionTimeMs: number;
  found: boolean;
}

/**
 * Dijkstra's Shortest Path Algorithm
 *
 * Uses a min-priority-queue (simulated with a sorted array).
 * Guarantees the minimum-cost path without a heuristic.
 * Explores more nodes than A* because it lacks directional guidance.
 */
export function dijkstra(graph: Graph, startId: string, goalId: string): DijkstraResult {
  const startTime = performance.now();
  let exploredNodes = 0;

  if (!graph.nodes.has(startId) || !graph.nodes.has(goalId)) {
    return { path: [], cost: 0, exploredNodes: 0, executionTimeMs: 0, found: false };
  }

  // dist[nodeId] = shortest known distance from start
  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  const visited = new Set<string>();

  // Initialize all distances to Infinity
  for (const nodeId of graph.nodes.keys()) {
    dist.set(nodeId, Infinity);
  }
  dist.set(startId, 0);

  // Priority queue: [distance, nodeId]
  const pq: Array<[number, string]> = [[0, startId]];

  while (pq.length > 0) {
    // Pop minimum-distance node
    pq.sort((a, b) => a[0] - b[0]);
    const [currentDist, currentId] = pq.shift()!;

    if (visited.has(currentId)) continue;
    visited.add(currentId);
    exploredNodes++;

    if (currentId === goalId) break;

    // Skip if we've found a better path already
    if (currentDist > (dist.get(currentId) ?? Infinity)) continue;

    const neighbors = graph.adjacency.get(currentId) || [];

    for (const { nodeId: neighborId, weight } of neighbors) {
      if (visited.has(neighborId)) continue;

      const newDist = currentDist + weight;

      if (newDist < (dist.get(neighborId) ?? Infinity)) {
        dist.set(neighborId, newDist);
        prev.set(neighborId, currentId);
        pq.push([newDist, neighborId]);
      }
    }
  }

  const executionTimeMs = performance.now() - startTime;

  if (!visited.has(goalId) && dist.get(goalId) === Infinity) {
    return { path: [], cost: 0, exploredNodes, executionTimeMs, found: false };
  }

  // Reconstruct path
  const path: string[] = [];
  let current: string | undefined = goalId;
  while (current !== undefined) {
    path.unshift(current);
    current = prev.get(current);
  }

  return {
    path,
    cost: dist.get(goalId) || 0,
    exploredNodes,
    executionTimeMs,
    found: path[0] === startId,
  };
}
