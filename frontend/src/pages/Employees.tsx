import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { employeesApi } from '../services/api';
import { Employee } from '../types';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useAuthStore } from '../store/auth';

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    position: '',
    workFraction: 1,
    qualifications: '',
  });
  const isPlaner = useAuthStore((s) => s.isPlaner());

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await employeesApi.getAll();
      setEmployees(response.data);
    } catch (err) {
      console.error('Fehler beim Laden:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await employeesApi.create({
        ...formData,
        qualifications: formData.qualifications.split(',').map((q) => q.trim()).filter(Boolean),
      });
      setShowForm(false);
      setFormData({ firstName: '', lastName: '', position: '', workFraction: 1, qualifications: '' });
      fetchEmployees();
    } catch (err) {
      console.error('Fehler beim Erstellen:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Mitarbeiter wirklich löschen?')) return;
    try {
      await employeesApi.delete(id);
      fetchEmployees();
    } catch (err) {
      console.error('Fehler beim Löschen:', err);
    }
  };

  if (loading) return <div className="text-center py-10">Laden...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Mitarbeiter</h1>
        {isPlaner && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Neuer Mitarbeiter
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Neuen Mitarbeiter anlegen</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vorname</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nachname</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                required
                className="w-full px-3 py-2 border rounded-md"
                placeholder="z.B. Pflegefachkraft"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Arbeitszeit (%)</label>
              <select
                value={formData.workFraction}
                onChange={(e) => setFormData({ ...formData, workFraction: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value={1}>100% (Vollzeit)</option>
                <option value={0.75}>75%</option>
                <option value={0.5}>50% (Halbtags)</option>
                <option value={0.25}>25%</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Qualifikationen (komma-getrennt)
              </label>
              <input
                type="text"
                value={formData.qualifications}
                onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="z.B. Fachkraft, Praxisanleiter, Wundexperte"
              />
            </div>
            <div className="col-span-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Speichern
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Arbeitszeit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qualifikationen</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              {isPlaner && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aktionen</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {employees.map((emp) => (
              <tr key={emp.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link to={`/mitarbeiter/${emp.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                    {emp.firstName} {emp.lastName}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.position}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.workFraction * 100}%</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-wrap gap-1">
                    {emp.qualifications.map((q, i) => (
                      <span key={i} className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-800">
                        {q}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded ${emp.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {emp.isActive ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </td>
                {isPlaner && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <Link to={`/mitarbeiter/${emp.id}`} className="text-blue-600 hover:text-blue-800 mr-3">
                      <Pencil className="w-4 h-4 inline" />
                    </Link>
                    <button onClick={() => handleDelete(emp.id)} className="text-red-600 hover:text-red-800">
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
