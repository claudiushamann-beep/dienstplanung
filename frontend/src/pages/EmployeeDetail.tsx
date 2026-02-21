import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { employeesApi, constraintsApi, absencesApi } from '../services/api';
import { Employee, Constraint, Absence, ConstraintType, AbsenceType, AbsenceStatus } from '../types';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useAuthStore } from '../store/auth';

const constraintTypes: { value: ConstraintType; label: string }[] = [
  { value: 'CONFLICT', label: 'Konflikt mit Mitarbeiter' },
  { value: 'MAX_SHIFTS_PER_WEEK', label: 'Max. Dienste/Woche' },
  { value: 'MAX_SHIFTS_PER_MONTH', label: 'Max. Dienste/Monat' },
  { value: 'UNAVAILABLE_DAYS', label: 'Nicht verfügbar (Tage)' },
  { value: 'PREFERRED_SHIFTS', label: 'Bevorzugte Schichten' },
  { value: 'UNAVAILABLE_SHIFT_TYPE', label: 'Keine Schichtart möglich' },
  { value: 'MAX_CONSECUTIVE_DAYS', label: 'Max. aufeinanderfolgende Tage' },
  { value: 'NOTE', label: 'Notiz für KI' },
];

const absenceTypes: { value: AbsenceType; label: string }[] = [
  { value: 'VACATION', label: 'Urlaub' },
  { value: 'SICK', label: 'Krankheit' },
  { value: 'TRAINING', label: 'Fortbildung' },
  { value: 'OTHER', label: 'Sonstiges' },
];

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isPlaner = useAuthStore((s) => s.isPlaner());
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'constraints' | 'absences'>('details');
  
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    position: '',
    workFraction: 1,
    qualifications: '',
    isActive: true,
  });
  
  const [newConstraint, setNewConstraint] = useState({
    type: 'MAX_SHIFTS_PER_WEEK' as ConstraintType,
    value: '',
    description: '',
  });
  
  const [newAbsence, setNewAbsence] = useState({
    type: 'VACATION' as AbsenceType,
    startDate: '',
    endDate: '',
    note: '',
  });

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      const [empRes, allEmpRes] = await Promise.all([
        employeesApi.getById(id!),
        employeesApi.getAll(),
      ]);
      setEmployee(empRes.data);
      setAllEmployees(allEmpRes.data);
      setEditForm({
        firstName: empRes.data.firstName,
        lastName: empRes.data.lastName,
        position: empRes.data.position,
        workFraction: empRes.data.workFraction,
        qualifications: empRes.data.qualifications.join(', '),
        isActive: empRes.data.isActive,
      });
    } catch (err) {
      console.error('Fehler beim Laden:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await employeesApi.update(id!, {
        ...editForm,
        qualifications: editForm.qualifications.split(',').map((q) => q.trim()).filter(Boolean),
      });
      fetchData();
    } catch (err) {
      console.error('Fehler beim Aktualisieren:', err);
    }
  };

  const handleAddConstraint = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await constraintsApi.create({
        employeeId: id,
        ...newConstraint,
      });
      setNewConstraint({ type: 'MAX_SHIFTS_PER_WEEK', value: '', description: '' });
      fetchData();
    } catch (err) {
      console.error('Fehler beim Hinzufügen:', err);
    }
  };

  const handleDeleteConstraint = async (constraintId: string) => {
    if (!confirm('Einschränkung löschen?')) return;
    try {
      await constraintsApi.delete(constraintId);
      fetchData();
    } catch (err) {
      console.error('Fehler beim Löschen:', err);
    }
  };

  const handleAddAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await absencesApi.create({
        employeeId: id,
        ...newAbsence,
        status: 'APPROVED',
      });
      setNewAbsence({ type: 'VACATION', startDate: '', endDate: '', note: '' });
      fetchData();
    } catch (err) {
      console.error('Fehler beim Hinzufügen:', err);
    }
  };

  const handleDeleteAbsence = async (absenceId: string) => {
    if (!confirm('Abwesenheit löschen?')) return;
    try {
      await absencesApi.delete(absenceId);
      fetchData();
    } catch (err) {
      console.error('Fehler beim Löschen:', err);
    }
  };

  if (loading) return <div className="text-center py-10">Laden...</div>;
  if (!employee) return <div className="text-center py-10">Mitarbeiter nicht gefunden</div>;

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/mitarbeiter')}
        className="inline-flex items-center text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Zurück zur Liste
      </button>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <nav className="flex -mb-px">
            {(['details', 'constraints', 'absences'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'details' ? 'Stammdaten' : tab === 'constraints' ? 'Einschränkungen' : 'Urlaub & Abwesenheit'}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'details' && (
            <form onSubmit={handleUpdateEmployee} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vorname</label>
                <input
                  type="text"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  disabled={!isPlaner}
                  className="w-full px-3 py-2 border rounded-md disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nachname</label>
                <input
                  type="text"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  disabled={!isPlaner}
                  className="w-full px-3 py-2 border rounded-md disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                <input
                  type="text"
                  value={editForm.position}
                  onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                  disabled={!isPlaner}
                  className="w-full px-3 py-2 border rounded-md disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Arbeitszeit (%)</label>
                <select
                  value={editForm.workFraction}
                  onChange={(e) => setEditForm({ ...editForm, workFraction: parseFloat(e.target.value) })}
                  disabled={!isPlaner}
                  className="w-full px-3 py-2 border rounded-md disabled:bg-gray-100"
                >
                  <option value={1}>100%</option>
                  <option value={0.75}>75%</option>
                  <option value={0.5}>50%</option>
                  <option value={0.25}>25%</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Qualifikationen</label>
                <input
                  type="text"
                  value={editForm.qualifications}
                  onChange={(e) => setEditForm({ ...editForm, qualifications: e.target.value })}
                  disabled={!isPlaner}
                  className="w-full px-3 py-2 border rounded-md disabled:bg-gray-100"
                  placeholder="Komma-getrennt"
                />
              </div>
              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    disabled={!isPlaner}
                    className="mr-2"
                  />
                  Aktiv
                </label>
              </div>
              {isPlaner && (
                <div className="col-span-2 flex justify-end">
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Speichern
                  </button>
                </div>
              )}
            </form>
          )}

          {activeTab === 'constraints' && (
            <div className="space-y-6">
              {isPlaner && (
                <form onSubmit={handleAddConstraint} className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-3">Neue Einschränkung hinzufügen</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
                      <select
                        value={newConstraint.type}
                        onChange={(e) => setNewConstraint({ ...newConstraint, type: e.target.value as ConstraintType })}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        {constraintTypes.map((ct) => (
                          <option key={ct.value} value={ct.value}>{ct.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Wert</label>
                      {newConstraint.type === 'CONFLICT' ? (
                        <select
                          value={newConstraint.value}
                          onChange={(e) => setNewConstraint({ ...newConstraint, value: e.target.value })}
                          className="w-full px-3 py-2 border rounded-md"
                        >
                          <option value="">Mitarbeiter wählen...</option>
                          {allEmployees.filter(e => e.id !== id).map((e) => (
                            <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                          ))}
                        </select>
                      ) : newConstraint.type === 'UNAVAILABLE_SHIFT_TYPE' ? (
                        <select
                          value={newConstraint.value}
                          onChange={(e) => setNewConstraint({ ...newConstraint, value: e.target.value })}
                          className="w-full px-3 py-2 border rounded-md"
                        >
                          <option value="">Schichtart wählen...</option>
                          <option value="FRUEH">Frühdienst</option>
                          <option value="SPAET">Spätdienst</option>
                          <option value="NACHT">Nachtdienst</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={newConstraint.value}
                          onChange={(e) => setNewConstraint({ ...newConstraint, value: e.target.value })}
                          className="w-full px-3 py-2 border rounded-md"
                          placeholder={newConstraint.type === 'MAX_SHIFTS_PER_WEEK' ? 'z.B. 3' : ''}
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                      <input
                        type="text"
                        value={newConstraint.description}
                        onChange={(e) => setNewConstraint({ ...newConstraint, description: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button type="submit" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Hinzufügen
                    </button>
                  </div>
                </form>
              )}

              <div className="divide-y">
                {employee.constraints?.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Keine Einschränkungen vorhanden</p>
                ) : (
                  employee.constraints?.map((c: Constraint) => (
                    <div key={c.id} className="py-3 flex justify-between items-center">
                      <div>
                        <p className="font-medium">{constraintTypes.find((t) => t.value === c.type)?.label || c.type}</p>
                        <p className="text-sm text-gray-500">
                          {c.type === 'CONFLICT' 
                            ? allEmployees.find((e) => e.id === c.value)?.firstName + ' ' + allEmployees.find((e) => e.id === c.value)?.lastName
                            : c.value}
                        </p>
                        {c.description && <p className="text-sm text-gray-400">{c.description}</p>}
                      </div>
                      {isPlaner && (
                        <button
                          onClick={() => handleDeleteConstraint(c.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'absences' && (
            <div className="space-y-6">
              {isPlaner && (
                <form onSubmit={handleAddAbsence} className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-3">Neue Abwesenheit hinzufügen</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Art</label>
                      <select
                        value={newAbsence.type}
                        onChange={(e) => setNewAbsence({ ...newAbsence, type: e.target.value as AbsenceType })}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        {absenceTypes.map((at) => (
                          <option key={at.value} value={at.value}>{at.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Von</label>
                      <input
                        type="date"
                        value={newAbsence.startDate}
                        onChange={(e) => setNewAbsence({ ...newAbsence, startDate: e.target.value })}
                        required
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bis</label>
                      <input
                        type="date"
                        value={newAbsence.endDate}
                        onChange={(e) => setNewAbsence({ ...newAbsence, endDate: e.target.value })}
                        required
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notiz</label>
                      <input
                        type="text"
                        value={newAbsence.note}
                        onChange={(e) => setNewAbsence({ ...newAbsence, note: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button type="submit" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Hinzufügen
                    </button>
                  </div>
                </form>
              )}

              <div className="divide-y">
                {employee.absences?.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Keine Abwesenheiten vorhanden</p>
                ) : (
                  employee.absences?.map((a: Absence) => (
                    <div key={a.id} className="py-3 flex justify-between items-center">
                      <div>
                        <p className="font-medium">
                          {new Date(a.startDate).toLocaleDateString('de-DE')} - {new Date(a.endDate).toLocaleDateString('de-DE')}
                        </p>
                        <p className="text-sm text-gray-500">
                          {absenceTypes.find((t) => t.value === a.type)?.label}
                          <span className={`ml-2 px-2 py-0.5 text-xs rounded ${
                            a.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                            a.status === 'REQUESTED' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {a.status === 'APPROVED' ? 'Genehmigt' : a.status === 'REQUESTED' ? 'Beantragt' : 'Abgelehnt'}
                          </span>
                        </p>
                        {a.note && <p className="text-sm text-gray-400">{a.note}</p>}
                      </div>
                      {isPlaner && (
                        <button
                          onClick={() => handleDeleteAbsence(a.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
