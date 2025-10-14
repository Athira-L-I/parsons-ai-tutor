// src/pages/admin.tsx

import { useEffect, useState } from 'react';
import Head from 'next/head';

interface SessionStats {
  total_sessions: number;
  unique_students: number;
  unique_schools: number;
  avg_events_per_session: number;
  completed_sessions: number;
  completion_rate: number;
  by_school: Record<string, number>;
}

interface SessionSummary {
  sessionId: string;
  studentId: string;
  problemId: string;
  schoolId: string;
  startTime: number;
  endTime: number;
  eventCount: number;
  features: any;
}

export default function AdminPage() {
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [selectedSchool]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      // Fetch stats
      const statsRes = await fetch('/api/sessions/stats/summary');
      if (!statsRes.ok) {
        throw new Error(`Stats API error: ${statsRes.status}`);
      }
      const statsData = await statsRes.json();
      setStats(statsData);

      // Fetch sessions
      const sessionsUrl =
        selectedSchool === 'all'
          ? '/api/sessions'
          : `/api/sessions?school=${selectedSchool}`;
      const sessionsRes = await fetch(sessionsUrl);
      if (!sessionsRes.ok) {
        throw new Error(`Sessions API error: ${sessionsRes.status}`);
      }
      const sessionsData = await sessionsRes.json();

      // Ensure sessions is always an array
      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
    } catch (error) {
      console.error('Failed to load data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
      setSessions([]); // Ensure sessions is empty array on error
    } finally {
      setLoading(false);
    }
  }

  function downloadProgSnap2() {
    const url =
      selectedSchool === 'all'
        ? '/api/sessions/export/progsnap2'
        : `/api/sessions/export/progsnap2?school=${selectedSchool}`;
    window.open(url, '_blank');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-red-600 mb-4">Error Loading Data</div>
          <div className="text-gray-600 mb-4">{error}</div>
          <button
            onClick={() => loadData()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Admin Dashboard - Parsons Research</title>
      </Head>

      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Research Data Dashboard</h1>
            <button
              onClick={() => loadData()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh Data
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Sessions"
              value={stats?.total_sessions || 0}
              icon="📊"
            />
            <StatCard
              title="Unique Students"
              value={stats?.unique_students || 0}
              icon="👥"
            />
            <StatCard
              title="Schools"
              value={stats?.unique_schools || 0}
              icon="🏫"
            />
            <StatCard
              title="Avg Events"
              value={stats?.avg_events_per_session?.toFixed(1) || '0'}
              subtitle="per session"
              icon="🎯"
            />
          </div>

          {/* School Breakdown */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Sessions by School</h2>
            <div className="flex gap-4">
              {stats?.by_school &&
                Object.entries(stats.by_school).map(([school, count]) => (
                  <div key={school} className="flex-1 p-4 bg-gray-50 rounded">
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-gray-600">School {school}</div>
                  </div>
                ))}
            </div>
          </div>

          {/* Export Section */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Export Data</h2>

            <div className="flex items-center gap-4 mb-4">
              <label className="font-medium">Filter by school:</label>
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="px-3 py-2 border rounded"
              >
                <option value="all">All Schools</option>
                {stats?.by_school &&
                  Object.keys(stats.by_school).map((school) => (
                    <option key={school} value={school}>
                      School {school}
                    </option>
                  ))}
              </select>
            </div>

            <button
              onClick={downloadProgSnap2}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              📥 Download ProgSnap2 CSV
            </button>

            <div className="mt-4 text-sm text-gray-600">
              ProgSnap2 format is compatible with iSNAP dataset for transfer
              learning analysis.
            </div>
          </div>

          {/* Recent Sessions Table */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">
              Recent Sessions
              {selectedSchool !== 'all' && ` (School ${selectedSchool})`}
            </h2>

            {sessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No sessions found. Create some test data by using the main
                application.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium">Session ID</th>
                      <th className="text-left p-3 font-medium">Student</th>
                      <th className="text-left p-3 font-medium">School</th>
                      <th className="text-left p-3 font-medium">Problem</th>
                      <th className="text-right p-3 font-medium">Events</th>
                      <th className="text-right p-3 font-medium">
                        Duration (min)
                      </th>
                      <th className="text-left p-3 font-medium">Started</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.slice(0, 50).map((session) => (
                      <tr
                        key={session.sessionId}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="p-3 font-mono text-xs">
                          {session.sessionId.slice(0, 20)}...
                        </td>
                        <td className="p-3">{session.studentId}</td>
                        <td className="p-3">{session.schoolId}</td>
                        <td className="p-3">{session.problemId}</td>
                        <td className="text-right p-3">{session.eventCount}</td>
                        <td className="text-right p-3">
                          {(
                            (session.endTime - session.startTime) /
                            60000
                          ).toFixed(1)}
                        </td>
                        <td className="p-3">
                          {new Date(session.startTime).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {sessions.length > 50 && (
              <div className="mt-4 text-center text-gray-600">
                Showing 50 of {sessions.length} sessions
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({ title, value, subtitle, icon }: any) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <div className="text-gray-600 text-sm font-medium">{title}</div>
        <div className="text-2xl">{icon}</div>
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      {subtitle && <div className="text-sm text-gray-500">{subtitle}</div>}
    </div>
  );
}
