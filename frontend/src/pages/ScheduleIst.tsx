import { useEffect, useState } from 'react';
import { employeesApi, schedulesApi } from '../services/api';
import { Employee, ScheduleEntry } from '../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, addMonths, subMonths, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { isHoliday, getHolidayName } from '../utils/holidays';

export default function ScheduleIst() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [deviationReason, setDeviationReason] = useState('');

  const monthStart = startOfMonth(parseISO(currentMonth + '-01'));
  const monthEnd = endOfMonth(monthStart);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  useEffect(() => {
    fetchData();
  }, [currentMonth]);

  const fetchData = async () => {
    try {
      const [empRes, schedRes] = await Promise.all([
        employeesApi.getAll(),
        schedulesApi.getIst({
          startDate: monthStart.toISOString(),
          endDate: monthEnd.toISOString(),
        }),
      ]);
      setEmployees(empRes.data);
      setSchedule(schedRes.data);
    } catch (err) {
      console.error('Fehler beim Laden:', err);
    } finally {
      setLoading(false);
    }
  };

  const getShiftForEmployeeAndDate = (employeeId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return schedule.filter(
      (s) => s.employeeId === employeeId && s.date.startsWith(dateStr)
    );
  };

  const getShiftColor = (shiftType: string) => {
    if (shiftType.includes('Früh')) return 'bg-green-500';
    if (shiftType.includes('Spät')) return 'bg-amber-500';
    if (shiftType.includes('Nacht')) return 'bg-indigo-500';
    return 'bg-gray-500';
  };

  const isDayOff = (day: Date) => isWeekend(day) || isHoliday(day);

  const handleUpdateDeviation = async (entryId: string, reason: string) => {
    try {
      await schedulesApi.createIst([{
        id: entryId,
        deviationReason: reason || null,
      }]);
      setEditingEntry(null);
      setDeviationReason('');
      fetchData();
    } catch (err) {
      console.error('Fehler:', err);
    }
  };

  if (loading) return <div className="text-center py-10">Laden...</div>;

  const activeEmployees = employees.filter((e) => e.isActive);
  const totalDeviations = schedule.filter((s) => s.deviationReason).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ist-Dienstplan</h1>
          {totalDeviations > 0 && (
            <p className="text-sm text-amber-600 flex items-center mt-1">
              <AlertTriangle className="w-4 h-4 mr-1" />
              {totalDeviations} Abweichung(en) vom Soll-Plan
            </p>
          )}
        </div>

        {/* Month navigation */}
        <div className="flex items-center gap-2 border rounded-md px-2 py-1 bg-white">
          <button
            onClick={() => setCurrentMonth(format(subMonths(parseISO(currentMonth + '-01'), 1), 'yyyy-MM'))}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-medium min-w-[130px] text-center">
            {format(parseISO(currentMonth + '-01'), 'MMMM yyyy', { locale: de })}
          </span>
          <button
            onClick={() => setCurrentMonth(format(addMonths(parseISO(currentMonth + '-01'), 1), 'yyyy-MM'))}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase z-10 min-w-[150px]">
                Mitarbeiter
              </th>
              {days.map((day) => (
                <th
                  key={day.toISOString()}
                  className={`px-2 py-3 text-center text-xs font-medium uppercase min-w-[38px] ${
                    isDayOff(day) ? 'bg-gray-100' : ''
                  }`}
                  title={getHolidayName(day) || undefined}
                >
                  <div>{format(day, 'EEE', { locale: de })}</div>
                  <div className="font-normal">{format(day, 'dd')}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {activeEmployees.map((emp) => (
              <tr key={emp.id} className="hover:bg-gray-50">
                <td className="sticky left-0 bg-white px-4 py-2 font-medium z-10">
                  <div>{emp.firstName} {emp.lastName}</div>
                  <div className="text-xs text-gray-500">{emp.position}</div>
                </td>
                {days.map((day) => {
                  const shifts = getShiftForEmployeeAndDate(emp.id, day);
                  return (
                    <td
                      key={day.toISOString()}
                      className={`px-1 py-2 text-center text-xs ${isDayOff(day) ? 'bg-gray-50' : ''}`}
                    >
                      <div className="flex flex-col gap-1">
                        {shifts.map((s) => (
                          <div
                            key={s.id}
                            className={`relative px-1 py-0.5 rounded text-white cursor-pointer ${getShiftColor(s.shiftType)} ${
                              s.deviationReason ? 'ring-2 ring-red-400' : ''
                            }`}
                            onClick={() => {
                              setEditingEntry(s.id);
                              setDeviationReason(s.deviationReason || '');
                            }}
                            title={s.deviationReason || undefined}
                          >
                            {s.shiftType.charAt(0)}
                            {s.deviationReason && (
                              <AlertTriangle className="absolute -top-1 -right-1 w-3 h-3 text-red-500 bg-white rounded-full" />
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Abweichungsgrund bearbeiten</h3>
            <textarea
              value={deviationReason}
              onChange={(e) => setDeviationReason(e.target.value)}
              className="w-full px-3 py-2 border rounded-md mb-4"
              rows={3}
              placeholder="z.B. Krankheit, Tausch mit Kollege..."
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setEditingEntry(null);
                  setDeviationReason('');
                }}
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={() => handleUpdateDeviation(editingEntry, deviationReason)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-medium mb-2">Legende</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500"></div>
            <span className="text-sm">Frühdienst</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-500"></div>
            <span className="text-sm">Spätdienst</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-indigo-500"></div>
            <span className="text-sm">Nachtdienst</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-200 border"></div>
            <span className="text-sm">Wochenende / Feiertag</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500 ring-2 ring-red-400"></div>
            <span className="text-sm">Mit Abweichung</span>
          </div>
        </div>
      </div>
    </div>
  );
}
