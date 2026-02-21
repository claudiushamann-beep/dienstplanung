import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { employeesApi, schedulesApi, shiftModelsApi } from '../services/api';
import { Employee, ScheduleEntry, ShiftModel } from '../types';

export default function Dashboard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sollPlan, setSollPlan] = useState<ScheduleEntry[]>([]);
  const [shiftModels, setShiftModels] = useState<ShiftModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empRes, sollRes, modelsRes] = await Promise.all([
          employeesApi.getAll(),
          schedulesApi.getSoll(),
          shiftModelsApi.getAll(),
        ]);
        setEmployees(empRes.data);
        setSollPlan(sollRes.data);
        setShiftModels(modelsRes.data);
      } catch (err) {
        console.error('Fehler beim Laden der Daten:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="text-center py-10">Laden...</div>;
  }

  const activeEmployees = employees.filter((e) => e.isActive);
  const activeAbsences = employees.flatMap((e) => 
    (e.absences || []).filter((a) => new Date(a.endDate) >= new Date())
  );

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const todayShifts = sollPlan.filter((s) => s.date.split('T')[0] === todayStr);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Aktive Mitarbeiter</h3>
          <p className="text-3xl font-bold text-gray-900">{activeEmployees.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Dienste heute</h3>
          <p className="text-3xl font-bold text-gray-900">{todayShifts.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Aktive Urlaube</h3>
          <p className="text-3xl font-bold text-gray-900">{activeAbsences.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Dienstmodelle</h3>
          <p className="text-3xl font-bold text-gray-900">{shiftModels.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Heutige Dienste</h2>
          </div>
          <div className="divide-y">
            {todayShifts.length === 0 ? (
              <p className="p-6 text-gray-500 text-center">Keine Dienste geplant</p>
            ) : (
              todayShifts.map((shift) => (
                <div key={shift.id} className="px-6 py-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium">
                      {shift.employee?.firstName} {shift.employee?.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{shift.employee?.position}</p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded text-white ${
                      shift.shiftType.includes('Früh') ? 'bg-green-500' :
                      shift.shiftType.includes('Spät') ? 'bg-amber-500' :
                      'bg-indigo-500'
                    }`}
                  >
                    {shift.shiftType}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Aktuelle Abwesenheiten</h2>
          </div>
          <div className="divide-y">
            {activeAbsences.length === 0 ? (
              <p className="p-6 text-gray-500 text-center">Keine aktuellen Abwesenheiten</p>
            ) : (
              activeAbsences.slice(0, 5).map((absence) => {
                const emp = employees.find((e) => e.id === absence.employeeId);
                return (
                  <div key={absence.id} className="px-6 py-3">
                    <p className="font-medium">{emp?.firstName} {emp?.lastName}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(absence.startDate).toLocaleDateString('de-DE')} -{' '}
                      {new Date(absence.endDate).toLocaleDateString('de-DE')}
                      <span className="ml-2 px-2 py-0.5 text-xs rounded bg-gray-100">
                        {absence.type === 'VACATION' ? 'Urlaub' : 
                         absence.type === 'SICK' ? 'Krank' : 
                         absence.type === 'TRAINING' ? 'Fortbildung' : 'Sonstiges'}
                      </span>
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">Mitarbeiter-Übersicht</h2>
          <Link
            to="/mitarbeiter"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Alle anzeigen
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Arbeitszeit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qualifikationen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {activeEmployees.slice(0, 5).map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link to={`/mitarbeiter/${emp.id}`} className="text-blue-600 hover:text-blue-800">
                      {emp.firstName} {emp.lastName}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.position}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {emp.workFraction * 100}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {emp.qualifications.map((q, i) => (
                        <span key={i} className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-800">
                          {q}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
