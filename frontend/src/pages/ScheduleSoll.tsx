import { useEffect, useState } from 'react';
import { employeesApi, shiftModelsApi, schedulesApi, aiApi } from '../services/api';
import { Employee, ShiftModel, ScheduleEntry } from '../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, addMonths, subMonths, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Sparkles, Loader2, Copy, Lock, ChevronLeft, ChevronRight } from 'lucide-react';
import { isHoliday, getHolidayName } from '../utils/holidays';

export default function ScheduleSoll() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shiftModels, setShiftModels] = useState<ShiftModel[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => format(new Date(), 'yyyy-MM'));

  const monthStart = startOfMonth(parseISO(currentMonth + '-01'));
  const monthEnd = endOfMonth(monthStart);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  useEffect(() => {
    fetchData();
  }, [currentMonth, selectedModelId]);

  const fetchData = async () => {
    try {
      const [empRes, modelsRes, schedRes] = await Promise.all([
        employeesApi.getAll(),
        shiftModelsApi.getAll(),
        schedulesApi.getSoll({
          startDate: monthStart.toISOString(),
          endDate: monthEnd.toISOString(),
        }),
      ]);
      setEmployees(empRes.data.filter((e: Employee) => e.isActive));
      setShiftModels(modelsRes.data);
      setSchedule(schedRes.data);
      if (modelsRes.data.length > 0 && !selectedModelId) {
        setSelectedModelId(modelsRes.data[0].id);
      }
    } catch (err) {
      console.error('Fehler beim Laden:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAiGenerate = async () => {
    if (!selectedModelId) {
      alert('Bitte wählen Sie ein Dienstplanmodell');
      return;
    }
    setAiLoading(true);
    try {
      const response = await aiApi.generateSchedule(
        selectedModelId,
        monthStart.toISOString(),
        monthEnd.toISOString()
      );

      if (response.data.entries && response.data.entries.length > 0) {
        await schedulesApi.createSoll(response.data.entries);
        fetchData();
      }
    } catch (err: any) {
      alert('Fehler bei der KI-Generierung: ' + (err.response?.data?.error || err.message));
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopyToIst = async () => {
    if (!confirm('Soll-Plan in Ist-Plan kopieren?')) return;
    try {
      await schedulesApi.copySollToIst(monthStart.toISOString(), monthEnd.toISOString());
      alert('Erfolgreich kopiert!');
    } catch (err) {
      console.error('Fehler beim Kopieren:', err);
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

  const toggleShift = async (employeeId: string, date: Date, shiftType: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const existing = schedule.find(
      (s) => s.employeeId === employeeId && s.date.startsWith(dateStr) && s.shiftType === shiftType
    );

    try {
      if (existing) {
        await schedulesApi.deleteSoll(existing.id);
      } else {
        await schedulesApi.createSoll([{
          employeeId,
          date: dateStr,
          shiftType,
          shiftModelId: selectedModelId,
        }]);
      }
      fetchData();
    } catch (err) {
      console.error('Fehler:', err);
    }
  };

  const togglePin = async (e: React.MouseEvent, shift: ScheduleEntry) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await schedulesApi.createSoll([{
        employeeId: shift.employeeId,
        date: shift.date.split('T')[0],
        shiftType: shift.shiftType,
        shiftModelId: shift.shiftModelId,
        isPinned: !shift.isPinned,
      }]);
      fetchData();
    } catch (err) {
      console.error('Fehler beim Pinnen:', err);
    }
  };

  if (loading) return <div className="text-center py-10">Laden...</div>;

  const activeEmployees = employees.filter((e) => e.isActive);
  const selectedModel = shiftModels.find((m) => m.id === selectedModelId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Soll-Dienstplan</h1>
        <div className="flex items-center gap-3 flex-wrap">
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

          <select
            value={selectedModelId}
            onChange={(e) => setSelectedModelId(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="">Modell wählen...</option>
            {shiftModels.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <button
            onClick={handleAiGenerate}
            disabled={aiLoading || !selectedModelId}
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
          >
            {aiLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generiere...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                KI generieren
              </>
            )}
          </button>
          <button
            onClick={handleCopyToIst}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Copy className="w-4 h-4 mr-2" />
            In Ist-Plan kopieren
          </button>
        </div>
      </div>

      {selectedModel && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Verfügbare Schichten:</h3>
          <div className="flex flex-wrap gap-2">
            {selectedModel.shifts.map((s) => (
              <div
                key={s.id}
                className="px-3 py-1 rounded text-white text-sm"
                style={{ backgroundColor: s.color }}
              >
                {s.name} ({s.startTime}-{s.endTime})
              </div>
            ))}
          </div>
        </div>
      )}

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
                            className={`relative px-1 py-0.5 rounded text-white cursor-pointer select-none ${getShiftColor(s.shiftType)} ${s.isPinned ? 'ring-2 ring-yellow-300' : ''}`}
                            onClick={() => !s.isPinned && toggleShift(emp.id, day, s.shiftType)}
                            onContextMenu={(e) => togglePin(e, s)}
                            title={s.isPinned ? 'Festgesetzt – Rechtsklick zum Lösen' : 'Rechtsklick zum Festsetzen'}
                          >
                            <span className="flex items-center justify-center gap-0.5">
                              {s.isPinned && <Lock className="w-2.5 h-2.5" />}
                              <span>{s.shiftType.charAt(0)}</span>
                            </span>
                          </div>
                        ))}
                        {shifts.length === 0 && selectedModel && (
                          <div className="flex flex-col gap-0.5">
                            {selectedModel.shifts.map((shift) => (
                              <button
                                key={shift.id}
                                onClick={() => toggleShift(emp.id, day, shift.name)}
                                className="px-1 py-0.5 rounded border border-dashed border-gray-300 text-gray-400 hover:border-gray-500 hover:text-gray-600"
                              >
                                {shift.name.charAt(0)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
            <div className="w-4 h-4 rounded bg-green-500 ring-2 ring-yellow-300"></div>
            <Lock className="w-3 h-3" />
            <span className="text-sm">Festgesetzt (Rechtsklick zum Ändern)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
