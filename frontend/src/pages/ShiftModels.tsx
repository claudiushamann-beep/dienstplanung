import { useEffect, useState } from 'react';
import { shiftModelsApi, aiApi } from '../services/api';
import { ShiftModel, ShiftConfig } from '../types';
import { Plus, Trash2, Sparkles, Save, Loader2 } from 'lucide-react';

export default function ShiftModels() {
  const [models, setModels] = useState<ShiftModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<ShiftModel | null>(null);
  const [aiDescription, setAiDescription] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<ShiftModel | null>(null);

  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    shifts: [] as Partial<ShiftConfig>[],
  });

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await shiftModelsApi.getAll();
      setModels(response.data);
    } catch (err) {
      console.error('Fehler beim Laden:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAiGenerate = async () => {
    if (!aiDescription.trim()) return;
    setAiLoading(true);
    try {
      const response = await aiApi.explainModel(aiDescription);
      const result = response.data;
      
      setAiResult({
        id: '',
        name: result.name || 'Neues Modell',
        description: result.description || '',
        config: '',
        isActive: true,
        shifts: (result.shifts || []).map((s: any) => ({
          id: '',
          shiftModelId: '',
          name: s.name,
          startTime: s.startTime,
          endTime: s.endTime,
          minStaff: s.minStaff || 2,
          minQualified: s.minQualified || 1,
          days: s.days || 'Mo-So',
          color: s.color || '#3B82F6',
        })),
      });
      
      setEditForm({
        name: result.name || 'Neues Modell',
        description: result.description || '',
        shifts: (result.shifts || []).map((s: any) => ({
          name: s.name,
          startTime: s.startTime,
          endTime: s.endTime,
          minStaff: s.minStaff || 2,
          minQualified: s.minQualified || 1,
          days: s.days || 'Mo-So',
          color: s.color || '#3B82F6',
        })),
      });
    } catch (err: any) {
      alert('Fehler bei der KI-Generierung: ' + (err.response?.data?.error || err.message));
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveModel = async () => {
    try {
      if (selectedModel?.id) {
        await shiftModelsApi.update(selectedModel.id, {
          name: editForm.name,
          description: editForm.description,
          shifts: editForm.shifts,
        });
      } else {
        await shiftModelsApi.create({
          name: editForm.name,
          description: editForm.description,
          shifts: editForm.shifts,
        });
      }
      setEditForm({ name: '', description: '', shifts: [] });
      setSelectedModel(null);
      setAiResult(null);
      fetchModels();
    } catch (err) {
      console.error('Fehler beim Speichern:', err);
    }
  };

  const handleDeleteModel = async (id: string) => {
    if (!confirm('Dienstplanmodell löschen?')) return;
    try {
      await shiftModelsApi.delete(id);
      fetchModels();
    } catch (err) {
      console.error('Fehler beim Löschen:', err);
    }
  };

  const addShift = () => {
    setEditForm({
      ...editForm,
      shifts: [
        ...editForm.shifts,
        { name: '', startTime: '06:00', endTime: '14:00', minStaff: 2, minQualified: 1, days: 'Mo-Fr', color: '#3B82F6' },
      ],
    });
  };

  const updateShift = (index: number, field: string, value: any) => {
    const shifts = [...editForm.shifts];
    shifts[index] = { ...shifts[index], [field]: value };
    setEditForm({ ...editForm, shifts });
  };

  const removeShift = (index: number) => {
    setEditForm({
      ...editForm,
      shifts: editForm.shifts.filter((_, i) => i !== index),
    });
  };

  if (loading) return <div className="text-center py-10">Laden...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dienstplanmodell</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <Sparkles className="w-5 h-5 mr-2 text-purple-500" />
          KI-gestützte Modellerstellung
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Beschreiben Sie Ihr Dienstplanmodell in natürlicher Sprache. Die KI erstellt daraus eine strukturierte Tabelle.
        </p>
        <textarea
          value={aiDescription}
          onChange={(e) => setAiDescription(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border rounded-md mb-4"
          placeholder="z.B. Wir haben eine Krankenstation mit 3 Schichten: Früh (6-14 Uhr), Spät (14-22 Uhr) und Nacht (22-6 Uhr). Die Frühschicht braucht tagsüber 3 Mitarbeiter (min. 1 Fachkraft), am Wochenende 2. Spät- und Nachtschicht je 2 Mitarbeiter..."
        />
        <button
          onClick={handleAiGenerate}
          disabled={aiLoading || !aiDescription.trim()}
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
              Modell erstellen
            </>
          )}
        </button>
      </div>

      {(editForm.shifts.length > 0 || selectedModel || aiResult) && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">
            {selectedModel ? 'Modell bearbeiten' : 'Neues Modell'}
          </h2>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
              <input
                type="text"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>

          <div className="overflow-x-auto mb-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Schicht</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Beginn</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ende</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Min. Personal</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Min. Qualifiziert</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tage</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Farbe</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {editForm.shifts.map((shift, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={shift.name || ''}
                        onChange={(e) => updateShift(index, 'name', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="time"
                        value={shift.startTime || '06:00'}
                        onChange={(e) => updateShift(index, 'startTime', e.target.value)}
                        className="px-2 py-1 border rounded text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="time"
                        value={shift.endTime || '14:00'}
                        onChange={(e) => updateShift(index, 'endTime', e.target.value)}
                        className="px-2 py-1 border rounded text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={shift.minStaff || 2}
                        onChange={(e) => updateShift(index, 'minStaff', parseInt(e.target.value))}
                        className="w-16 px-2 py-1 border rounded text-sm"
                        min="1"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={shift.minQualified || 1}
                        onChange={(e) => updateShift(index, 'minQualified', parseInt(e.target.value))}
                        className="w-16 px-2 py-1 border rounded text-sm"
                        min="0"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={shift.days || 'Mo-Fr'}
                        onChange={(e) => updateShift(index, 'days', e.target.value)}
                        className="px-2 py-1 border rounded text-sm"
                      >
                        <option value="Mo-So">Mo-So</option>
                        <option value="Mo-Fr">Mo-Fr</option>
                        <option value="Sa-So">Sa-So</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="color"
                        value={shift.color || '#3B82F6'}
                        onChange={(e) => updateShift(index, 'color', e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => removeShift(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between">
            <button
              onClick={addShift}
              className="inline-flex items-center px-3 py-1 border rounded-md hover:bg-gray-50"
            >
              <Plus className="w-4 h-4 mr-1" />
              Schicht hinzufügen
            </button>
            <button
              onClick={handleSaveModel}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Speichern
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Gespeicherte Modelle</h2>
        </div>
        <div className="divide-y">
          {models.length === 0 ? (
            <p className="p-6 text-gray-500 text-center">Keine Dienstmodelle vorhanden</p>
          ) : (
            models.map((model) => (
              <div key={model.id} className="p-6 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold">{model.name}</h3>
                    <p className="text-sm text-gray-500">{model.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedModel(model);
                        setEditForm({
                          name: model.name,
                          description: model.description || '',
                          shifts: model.shifts,
                        });
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => handleDeleteModel(model.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Löschen
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                  {model.shifts.map((shift) => (
                    <div
                      key={shift.id}
                      className="px-3 py-2 rounded text-white text-sm"
                      style={{ backgroundColor: shift.color }}
                    >
                      <div className="font-medium">{shift.name}</div>
                      <div className="text-xs opacity-90">
                        {shift.startTime}-{shift.endTime}
                      </div>
                      <div className="text-xs opacity-75">
                        {shift.minStaff} Pers. ({shift.minQualified} FK) · {shift.days}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
