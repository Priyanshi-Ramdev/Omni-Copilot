import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie
} from 'recharts';
import { useAuth } from '../hooks/useAuth';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const COLORS = ['#4285F4', '#34A853', '#FBBC05', '#EA4335', '#8E44AD', '#2ECC71', '#E67E22'];

export default function Dashboard() {
  const { getHeaders } = useAuth();
  const [data, setData] = useState({ chartData: [], counts: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/analytics`, { headers: getHeaders() })
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load analytics', err);
        setLoading(false);
      });
  }, [getHeaders]);

  if (loading) return <div className="dashboard-loading">Loading analytics...</div>;

  const totalHits = Array.isArray(data.chartData) ? data.chartData.reduce((acc, curr) => acc + (curr.value || 0), 0) : 0;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">✦ OMNI Analytics</h1>
        <p className="dashboard-sub">Tracking autonomous agent performance and tool usage</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{totalHits}</div>
          <div className="stat-label">Total Integrations Triggered</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Array.isArray(data.chartData) ? data.chartData.length : 0}</div>
          <div className="stat-label">Active Tools Utilized</div>
        </div>
      </div>

      {totalHits > 0 ? (
        <div className="dashboard-content">
          <div className="chart-section">
            <h2 className="section-title">Tool Usage Distribution</h2>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#888" 
                    angle={-45} 
                    textAnchor="end" 
                    interval={0}
                    height={85}
                  />
                  <YAxis stroke="#888" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', color: '#fff' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {data.chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-section pie-section">
            <h2 className="section-title">Popular Tools Share</h2>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={data.chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    style={{ outline: 'none' }}
                  >
                    {data.chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>🔍</div>
          <h2 style={{ color: '#fff' }}>No Action Data Yet</h2>
          <p style={{ color: 'var(--text-muted)' }}>Perform some tasks with OMNI to see your analytics dashboard come to life!</p>
        </div>
      )}
    </div>
  );
}

