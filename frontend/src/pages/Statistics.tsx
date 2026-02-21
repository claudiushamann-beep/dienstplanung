import { useEffect, useState } from 'react';
import { statisticsApi, employeesApi } from '../services/api';
import { Statistics, Employee } from '../types';

export default function StatisticsPage() {
  const [statistics, setStatistics] = useState<Statistics[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const fetchData = async () => {
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const [statsRes, empRes] = await Promise.all([
        statisticsApi.getAll({ month, year }),
        employeesApi.getAll(),
      ]);
      setStatistics(statsRes.data);
      setEmployees(empRes.data);
    } catch (err) {
      console.error('Fehler beim Laden:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    try {
      await statisticsApi.calculate(month, year);
      fetchData();
      alert('Statistiken berechnet!');
    } catch (err) {
      console.error('Fehler:', err);
    }
  };

  const getEmployeeName = (employeeId: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    return emp ? `${emp.firstName} ${emp.lastName}` : 'Unbekannt';
  };

  const totalStats = statistics.reduce(
    (acc, s) => ({
      totalShifts: acc.totalShifts + s.totalShifts,
      hoursWorked: acc.hoursWorked + s.hoursWorked,
      weekendShifts: acc.weekendShifts + s.weekendShifts,
    }),
    { totalShifts: 0, hoursWorked: 0, weekendShifts: 0 }
  );

  if (loading) return <div className="text-center py-10">Laden...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Statistiken</h1>
        <div className="flex items-center gap-4">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border rounded-md"
          />
          <button
            onClick={handleCalculate}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Neu berechnen
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Gesamte Dienste</h3>
          <p className="text-3xl font-bold text-gray-900">{totalStats.totalShifts}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Gearbeitete Stunden</h3>
          <p className="text-3xl font-bold text-gray-900">{totalStats.hoursWorked.toFixed(0)}h</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Wochenenddienste</h3>
          <p className="text-3xl font-bold text-gray-900">{totalStats.weekendShifts}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mitarbeiter</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dienste gesamt</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Früh</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Spät</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nacht</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wochenende</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stunden</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {statistics.map((stat) => (
              <tr key={stat.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium">
                  {getEmployeeName(stat.employeeId)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{stat.totalShifts}</td>
                <td className="px-6 py-4 whitespace-nowrap">{stat.earlyShifts}</td>
                <td className="px-6 py-4 whitespace-nowrap">{stat.lateShifts}</td>
                <td className="px-6 py-4 whitespace-nowrap">{stat.nightShifts}</td>
                <td className="px-6 py-4 whitespace-nowrap">{stat.weekendShifts}</td>
                <td className="px-6 py-4 whitespace-nowrap">{stat.hoursWorked.toFixed(0)}h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Export</h2>
        <p className="text-sm text-gray-600 mb-4">
          Exportieren Sie die Statistiken für den ausgewählten Zeitraum.
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => {
              const csv = [
                ['Mitarbeiter', 'Dienste', 'Früh', 'Spät', 'Nacht', 'Wochenende', 'Stunden'],
                ...statistics.map((s) => [
                  getEmployeeName(s.employeeId),
                  s.totalShifts,
                  s.earlyShifts,
                  s.lateShifts,
                  s.nightShifts,
                  s.weekendShifts,
                  s.hoursWorked,
                ]),
              ]
                .map((row) => row.join(','))
                .join('\n');

              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `statistik-${selectedMonth}.csv`;
              a.click();
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            CSV Export
          </button>
        </div>
      </div>
    </div>
  );
}
