import React, { useState, useEffect } from 'react';
import { useBoardStore } from '../store/useBoardStore';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { LayoutGrid, TrendingUp, Clock, Award } from 'lucide-react';

interface StatusDistribution {
  status: string;
  count: number;
  points: number;
}

interface TeamVelocity {
  name: string;
  completedPoints: number;
  completedTasks: number;
}

interface TimeTracking {
  name: string;
  totalEstimatedHours: number;
  totalLoggedHours: number;
  taskCount: number;
}

interface BurndownData {
  date: string;
  remainingPoints: number;
  idealPoints: number;
}

const COLORS = ['#6366f1', '#f59e0b', '#3b82f6', '#10b981'];

export const AnalyticsDashboard: React.FC = () => {
  const { activeProject } = useBoardStore();

  const [statusData, setStatusData] = useState<StatusDistribution[]>([]);
  const [velocityData, setVelocityData] = useState<TeamVelocity[]>([]);
  const [timeData, setTimeData] = useState<TimeTracking[]>([]);
  const [burndownData, setBurndownData] = useState<BurndownData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProject) return;

    const fetchAnalytics = async () => {
      setLoading(true);
      const token = localStorage.getItem('thinkbook_token');
      const headers = { Authorization: `Bearer ${token}` };

      try {
        const [statusRes, velocityRes, timeRes, burndownRes] = await Promise.all([
          fetch(`http://localhost:5000/api/analytics/status/${activeProject._id}`, { headers }),
          fetch(`http://localhost:5000/api/analytics/velocity/${activeProject._id}`, { headers }),
          fetch(`http://localhost:5000/api/analytics/time/${activeProject._id}`, { headers }),
          fetch(`http://localhost:5000/api/analytics/burndown/${activeProject._id}`, { headers }),
        ]);

        const [status, velocity, time, burndown] = await Promise.all([
          statusRes.json(),
          velocityRes.json(),
          timeRes.json(),
          burndownRes.json(),
        ]);

        if (statusRes.ok) setStatusData(status);
        if (velocityRes.ok) setVelocityData(velocity);
        if (timeRes.ok) setTimeData(time);
        if (burndownRes.ok) setBurndownData(burndown);
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [activeProject]);

  if (!activeProject) return null;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400">
        <div className="flex flex-col items-center gap-2">
          <span className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
          <span className="text-xs font-semibold">Generating velocity and burndown reports...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 max-h-screen">
      {/* Upper Grid: Status & Velocity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution Pie */}
        <div className="glass-card rounded-2xl border border-white/5 p-6 flex flex-col items-center">
          <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-4 self-start flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-indigo-400" />
            Task Status Allocation
          </h3>
          <div className="w-full h-56 flex justify-center items-center">
            {statusData.length === 0 ? (
              <span className="text-xs text-slate-500 italic">No tasks created.</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="count"
                    nameKey="status"
                  >
                    {statusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      fontSize: '11px',
                    }}
                  />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Team Velocity Bar Chart */}
        <div className="glass-card rounded-2xl border border-white/5 p-6 flex flex-col lg:col-span-2">
          <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-indigo-400" />
            Team Velocity (Story Points Completed)
          </h3>
          <div className="w-full h-56">
            {velocityData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 italic">
                No tasks marked "Done" yet. Drag tasks to Done to track velocity.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={velocityData} margin={{ left: -10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      fontSize: '11px',
                    }}
                  />
                  <Bar dataKey="completedPoints" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Burn-down Area Chart */}
      <div className="glass-card rounded-2xl border border-white/5 p-6 flex flex-col">
        <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-400" />
          Project Burn-down Chart (Story Points Remaining)
        </h3>
        <div className="w-full h-64">
          {burndownData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-500 italic">
              Seeding data history or creating tasks will populate the burndown line.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={burndownData} margin={{ left: -15, right: 10 }}>
                <defs>
                  <linearGradient id="colorRemaining" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={9} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    fontSize: '11px',
                  }}
                />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                <Area
                  name="Remaining Story Points"
                  type="monotone"
                  dataKey="remainingPoints"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRemaining)"
                />
                <Area
                  name="Ideal Burn-down"
                  type="monotone"
                  dataKey="idealPoints"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fill="none"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Time Tracking Details */}
      <div className="glass-card rounded-2xl border border-white/5 p-6 flex flex-col">
        <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-400" />
          Hours Allocation (Logged vs. Estimated)
        </h3>
        <div className="space-y-4">
          {timeData.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No time data tracked.</p>
          ) : (
            timeData.map((item) => {
              const percentage =
                item.totalEstimatedHours > 0
                  ? Math.min(100, Math.round((item.totalLoggedHours / item.totalEstimatedHours) * 100))
                  : 0;

              return (
                <div key={item.name} className="space-y-1.5 p-3.5 bg-slate-950/40 border border-slate-900/60 rounded-xl">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-200">{item.name}</span>
                    <span className="text-[10px] text-slate-400">
                      {item.totalLoggedHours}h logged / {item.totalEstimatedHours}h estimated ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        percentage > 100 ? 'bg-rose-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
