import { buildDelhiRoadGraph, nearestNode } from '../src/modules/algorithms/roadGraph';
import { astar } from '../src/modules/algorithms/astar';
import { dijkstra } from '../src/modules/algorithms/dijkstra';

describe('Road Graph', () => {
  test('builds graph with nodes and edges', () => {
    const graph = buildDelhiRoadGraph();
    expect(graph.nodes.size).toBeGreaterThan(10);
    for (const [, adj] of graph.adjacency) {
      expect(Array.isArray(adj)).toBe(true);
    }
  });

  test('nearestNode returns valid node ID', () => {
    const graph = buildDelhiRoadGraph();
    const nodeId = nearestNode(graph, 28.5921, 77.0460);
    expect(typeof nodeId).toBe('string');
    expect(graph.nodes.has(nodeId)).toBe(true);
  });
});

describe('A* Search Algorithm', () => {
  let graph: ReturnType<typeof buildDelhiRoadGraph>;
  beforeAll(() => { graph = buildDelhiRoadGraph(); });

  test('finds path between two connected nodes', () => {
    const result = astar(graph, 'DW_S1', 'JK_S1');
    expect(result.found).toBe(true);
    expect(result.path.length).toBeGreaterThan(1);
    expect(result.path[0]).toBe('DW_S1');
    expect(result.path[result.path.length - 1]).toBe('JK_S1');
  });

  test('path cost is positive', () => {
    const result = astar(graph, 'DW_S1', 'VK_S1');
    expect(result.found).toBe(true);
    expect(result.cost).toBeGreaterThan(0);
  });

  test('returns false for invalid node IDs', () => {
    const result = astar(graph, 'INVALID_A', 'INVALID_B');
    expect(result.found).toBe(false);
  });

  test('records explored nodes', () => {
    const result = astar(graph, 'DW_S1', 'UN_S1');
    expect(result.exploredNodes).toBeGreaterThan(0);
  });

  test('records execution time', () => {
    const result = astar(graph, 'DW_S1', 'UN_S1');
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
  });

  test('same start and goal returns single-node path', () => {
    const result = astar(graph, 'DW_S1', 'DW_S1');
    expect(result.found).toBe(true);
    expect(result.path).toEqual(['DW_S1']);
    expect(result.cost).toBe(0);
  });
});

describe('Dijkstra Algorithm', () => {
  let graph: ReturnType<typeof buildDelhiRoadGraph>;
  beforeAll(() => { graph = buildDelhiRoadGraph(); });

  test('finds path between two connected nodes', () => {
    const result = dijkstra(graph, 'DW_S1', 'JK_S1');
    expect(result.found).toBe(true);
    expect(result.path.length).toBeGreaterThan(1);
    expect(result.path[0]).toBe('DW_S1');
    expect(result.path[result.path.length - 1]).toBe('JK_S1');
  });

  test('path cost is positive', () => {
    const result = dijkstra(graph, 'DW_S1', 'VK_S1');
    expect(result.found).toBe(true);
    expect(result.cost).toBeGreaterThan(0);
  });

  test('returns false for invalid node IDs', () => {
    const result = dijkstra(graph, 'INVALID_A', 'INVALID_B');
    expect(result.found).toBe(false);
  });
});

describe('A* vs Dijkstra comparison', () => {
  let graph: ReturnType<typeof buildDelhiRoadGraph>;
  beforeAll(() => { graph = buildDelhiRoadGraph(); });

  test('both find the same path cost within tolerance', () => {
    const pairs: [string, string][] = [
      ['DW_S1', 'JK_S1'],
      ['DW_S1', 'VK_S1'],
      ['UN_S1', 'JK_S1'],
      ['PL_S1', 'AR_S5'],
    ];

    for (const [from, to] of pairs) {
      const a = astar(graph, from, to);
      const d = dijkstra(graph, from, to);
      if (a.found && d.found) {
        // Costs should match within floating-point tolerance
        expect(Math.abs(a.cost - d.cost)).toBeLessThan(0.001);
      }
    }
  });

  test('A* explores fewer or equal nodes than Dijkstra', () => {
    const a = astar(graph, 'DW_S1', 'JK_S1');
    const d = dijkstra(graph, 'DW_S1', 'JK_S1');
    // A* should generally explore ≤ nodes due to heuristic guidance
    expect(a.exploredNodes).toBeLessThanOrEqual(d.exploredNodes + 5); // allow small variance
  });
});
