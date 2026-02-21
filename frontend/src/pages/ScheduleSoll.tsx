import { useEffect, useState } from 'react';
import { employeesApi, shiftModelsApi, schedulesApi, aiApi } from '../services/api';
import { Employee, ShiftModel, ScheduleEntry } from '../types';
import { format, startOfWeek, addDays, isWeekend } from 'date-fns';
import { de } from 'date-fns/locale';
import { Sparkles, Loader2, Save, Copy } from 'lucide-react';

export default function ScheduleSoll() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shiftModels, setShiftModels] = useState<ShiftModel[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = startOfWeek(new Date(), { weekStartsOn: 1 });
    return format(d, 'yyyy-MM-dd');
  });

  const days = Array.from({ length: 14 }, (_, i) => addDays(new Date(startDate), i));

  useEffect(() => {
    fetchData();
  }, [startDate, selectedModelId]);

  const fetchData = async () => {
    try {
      const [empRes, modelsRes, schedRes] = await Promise.all([
        employeesApi.getAll(),
        shiftModelsApi.getAll(),
        schedulesApi.getSoll({
          startDate: days[0].toISOString(),
          endDate: days[13].toISOString(),
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
        days[0].toISOString(),
        days[13].toISOString()
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
      await schedulesApi.copySollToIst(days[0].toISOString(), days[13].toISOString());
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

  if (loading) return <div className="text-center py-10">Laden...</div>;

  const activeEmployees = employees.filter((e) => e.isActive);
  const selectedModel = shiftModels.find((m) => m.id === selectedModelId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Soll-Dienstplan</h1>
        <div className="flex items-center gap-4">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border rounded-md"
          />
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
                  className={`px-2 py-3 text-center text-xs font-medium uppercase ${
                    isWeekend(day) ? 'bg-gray-100' : ''
                  }`}
                >
                  <div>{format(day, 'EEE', { locale: de })}</div>
                  <div className="font-normal">{format(day, 'dd.MM')}</div>
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
                      className={`px-1 py-2 text-center text-xs ${isWeekend(day) ? 'bg-gray-50' : ''}`}
                    >
                      <div className="flex flex-col gap-1">
                        {shifts.map((s) => (
                          <div
                            key={s.id}
                            className={`px-2 py-0.5 rounded text-white cursor-pointer ${getShiftColor(s.shiftType)}`}
                            onClick={() => toggleShift(emp.id, day, s.shiftType)}
                          >
                            {s.shiftType}
                          </div>
                        ))}
                        {shifts.length === 0 && selectedModel && (
                          <div className="flex flex-col gap-0.5">
                            {['Früh', 'Spät', 'Nacht'].map((shift) => (
                              <button
                                key={shift}
                                onClick={() => toggleShift(emp.id, day, shift)}
                                className="px-2 py-0.5 rounded border border-dashed border-gray-300 text-gray-400 hover:border-gray-500 hover:text-gray-600"
                              >
                                {shift.charAt(0)}
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
        <div className="flex gap-4">
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
        </div>
      </div>
    </div>
  );
}
