import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { analyticsService } from '../services/analyticsService';

const COLORS = ['#16A34A', '#DC2626', '#1D4ED8', '#EA580C', '#7C3AED'];

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<any>(null);
  const [responseTimes, setResponseTimes] = useState<any[]>([]);
  const [algoPerf, setAlgoPerf] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsService.overview(),
      analyticsService.responseTimes(),
      analyticsService.algorithmPerformance(),
    ])
      .then(([o, r, a]) => {
        setOverview(o.data.stats);
        setResponseTimes(r.data.data || []);
        setAlgoPerf(a.data.performance);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-20 text-gray-500">Loading analytics...</div>;
  }

  const statusPie = overview
    ? [
        { name: 'Available', value: overview.availableAmbulances },
        { name: 'Busy', value: overview.busyAmbulances },
        { name: 'Offline', value: overview.offlineAmbulances },
      ]
    : [];

  const algoCompareData = algoPerf
    ? [
        { name: 'Execution Time (ms)', 'A*': algoPerf.astar.avgExecutionTimeMs, Dijkstra: algoPerf.dijkstra.avgExecutionTimeMs },
        { name: 'Explored Nodes', 'A*': algoPerf.astar.avgExploredNodes, Dijkstra: algoPerf.dijkstra.avgExploredNodes },
      ]
    : [];

  const responseTimeChart = responseTimes.slice(0, 15).map((d, i) => ({
    name: `#${responseTimes.length - i}`,
    time: d.responseTimeMinutes || 0,
    eta: d.initialEtaMinutes || 0,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Analytics Dashboard</h1>

      {/* KPI row */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Total Emergencies" value={overview.totalEmergencies} icon="🆘" />
          <KpiCard label="Completed" value={overview.completedEmergencies} icon="✅" color="text-green-400" />
          <KpiCard label="Avg Response" value={`${overview.averageResponseTimeMinutes} min`} icon="⏱️" color="text-yellow-400" />
          <KpiCard label="Fastest Response" value={`${overview.fastestResponseTimeMinutes} min`} icon="⚡" color="text-purple-400" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response time chart */}
        <div className="bg-dispatch-card border border-dispatch-border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-white mb-4">Response Times (Recent)</h2>
          {responseTimeChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={responseTimeChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} unit=" min" />
                <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 8 }} />
                <Line type="monotone" dataKey="time" stroke="#16A34A" name="Actual" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="eta" stroke="#1D4ED8" name="Initial ETA" strokeWidth={2} strokeDasharray="4 2" dot={false} />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-16 text-gray-500 text-sm">No completed dispatches yet</div>
          )}
        </div>

        {/* Ambulance status pie */}
        <div className="bg-dispatch-card border border-dispatch-border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-white mb-4">Ambulance Fleet Distribution</h2>
          {overview && (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusPie} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {statusPie.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 8 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Algorithm comparison */}
        <div className="bg-dispatch-card border border-dispatch-border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-white mb-4">A* vs Dijkstra — Average Performance</h2>
          {algoPerf && algoPerf.astar.count > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={algoCompareData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={10} />
                  <YAxis stroke="#64748B" fontSize={10} />
                  <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 8 }} />
                  <Bar dataKey="A*" fill="#16A34A" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Dijkstra" fill="#1D4ED8" radius={[4, 4, 0, 0]} />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                <AlgoStat title="A* Search" data={algoPerf.astar} color="text-green-400" />
                <AlgoStat title="Dijkstra" data={algoPerf.dijkstra} color="text-blue-400" />
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-gray-500 text-sm">No algorithm executions yet. Simulate an emergency first.</div>
          )}
        </div>

        {/* Recent algorithm runs */}
        <div className="bg-dispatch-card border border-dispatch-border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-white mb-4">Recent Algorithm Executions</h2>
          {algoPerf?.recent?.length > 0 ? (
            <div className="overflow-y-auto max-h-[250px] space-y-1">
              {algoPerf.recent.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between bg-dispatch-dark rounded px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={r.algorithm === 'ASTAR' ? 'text-green-400' : 'text-blue-400'}>
                      {r.algorithm === 'ASTAR' ? 'A*' : 'Dijkstra'}
                    </span>
                    <span className="text-gray-500">{r.exploredNodes} nodes</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-400">
                    <span>{r.executionTimeMs?.toFixed(3)} ms</span>
                    <span>{r.pathDistance?.toFixed(2)} km</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500 text-sm">No executions yet</div>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon, color = 'text-white' }: any) {
  return (
    <div className="kpi-card">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xl">{icon}</span>
        <span className={`text-2xl font-bold ${color}`}>{value}</span>
      </div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}

function AlgoStat({ title, data, color }: { title: string; data: any; color: string }) {
  return (
    <div className="bg-dispatch-dark rounded-lg p-3 border border-dispatch-border">
      <div className={`font-semibold mb-1.5 ${color}`}>{title}</div>
      <div className="space-y-0.5 text-gray-400">
        <div>Executions: {data.count}</div>
        <div>Avg time: {data.avgExecutionTimeMs?.toFixed(3)} ms</div>
        <div>Avg nodes: {data.avgExploredNodes?.toFixed(0)}</div>
        <div>Avg dist: {data.avgPathDistance?.toFixed(2)} km</div>
      </div>
    </div>
  );
}
