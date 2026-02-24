import { useEffect, useState } from 'react';
import { shiftModelsApi, aiApi } from '../services/api';
import { ShiftModel, ShiftConfig } from '../types';
import { Plus, Trash2, Sparkles, Save, Loader2 } from 'lucide-react';

interface Rule {
  type: string;
  value: number | string;
  shiftA?: string;
  shiftB?: string;
  label: string;
}

const RULE_TYPES = [
  { value: 'MAX_CONSECUTIVE_SHIFTS', label: 'Max. aufeinanderfolgende Dienste', unit: 'Dienste' },
  { value: 'MIN_REST_DAYS', label: 'Min. Ruhetage nach langer Folge', unit: 'Tage' },
  { value: 'MAX_SHIFTS_PER_WEEK', label: 'Max. Dienste pro Woche', unit: 'Dienste' },
  { value: 'MAX_SHIFTS_PER_MONTH', label: 'Max. Dienste pro Monat', unit: 'Dienste' },
  { value: 'NO_SHIFT_AFTER', label: 'Keine Schicht X nach Schicht Y', unit: '' },
];

function parseConfig(configStr: string): { notes: string; rules: Rule[] } {
  try {
    const parsed = JSON.parse(configStr || '{}');
    return { notes: parsed.notes || '', rules: parsed.rules || [] };
  } catch {
    return { notes: '', rules: [] };
  }
}

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
    rules: [] as Rule[],
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
        config: '{}',
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
        rules: [],
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
      const config = JSON.stringify({ rules: editForm.rules });
      if (selectedModel?.id) {
        await shiftModelsApi.update(selectedModel.id, {
          name: editForm.name,
          description: editForm.description,
          config,
          shifts: editForm.shifts,
        });
      } else {
        await shiftModelsApi.create({
          name: editForm.name,
          description: editForm.description,
          config,
          shifts: editForm.shifts,
        });
      }
      setEditForm({ name: '', description: '', shifts: [], rules: [] });
      setSelectedModel(null);
      setAiResult(null);
      fetchModels();
    } catch (err: any) {
      alert('Fehler beim Speichern: ' + (err.response?.data?.error || err.message));
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
    setEditForm({ ...editForm, shifts: editForm.shifts.filter((_, i) => i !== index) });
  };

  const addRule = () => {
    const def = RULE_TYPES[0];
    setEditForm({
      ...editForm,
      rules: [...editForm.rules, { type: def.value, value: 5, label: `${def.label}: 5` }],
    });
  };

  const updateRule = (index: number, field: keyof Rule, val: any) => {
    const rules = [...editForm.rules];
    rules[index] = { ...rules[index], [field]: val };
    // Auto-generate label
    const typeDef = RULE_TYPES.find(t => t.value === rules[index].type);
    if (typeDef && rules[index].type !== 'NO_SHIFT_AFTER') {
      rules[index].label = `${typeDef.label}: ${rules[index].value} ${typeDef.unit}`;
    } else if (rules[index].type === 'NO_SHIFT_AFTER') {
      rules[index].label = `Keine ${rules[index].shiftB || '?'} nach ${rules[index].shiftA || '?'}`;
    }
    setEditForm({ ...editForm, rules });
  };

  const removeRule = (index: number) => {
    setEditForm({ ...editForm, rules: editForm.rules.filter((_, i) => i !== index) });
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
          placeholder="z.B. Wir haben eine Krankenstation mit 3 Schichten: Früh (6-14 Uhr), Spät (14-22 Uhr) und Nacht (22-6 Uhr). Die Frühschicht braucht tagsüber 3 Mitarbeiter (min. 1 Fachkraft), am Wochenende 2..."
        />
        <button
          onClick={handleAiGenerate}
          disabled={aiLoading || !aiDescription.trim()}
          className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
        >
          {aiLoading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generiere...</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-2" />Modell erstellen</>
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

          {/* Schichten */}
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Schichten</h3>
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
                      <input type="text" value={shift.name || ''} onChange={(e) => updateShift(index, 'name', e.target.value)} className="w-full px-2 py-1 border rounded text-sm" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="time" value={shift.startTime || '06:00'} onChange={(e) => updateShift(index, 'startTime', e.target.value)} className="px-2 py-1 border rounded text-sm" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="time" value={shift.endTime || '14:00'} onChange={(e) => updateShift(index, 'endTime', e.target.value)} className="px-2 py-1 border rounded text-sm" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" value={shift.minStaff || 2} onChange={(e) => updateShift(index, 'minStaff', parseInt(e.target.value))} className="w-16 px-2 py-1 border rounded text-sm" min="1" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" value={shift.minQualified || 1} onChange={(e) => updateShift(index, 'minQualified', parseInt(e.target.value))} className="w-16 px-2 py-1 border rounded text-sm" min="0" />
                    </td>
                    <td className="px-3 py-2">
                      <select value={shift.days || 'Mo-Fr'} onChange={(e) => updateShift(index, 'days', e.target.value)} className="px-2 py-1 border rounded text-sm">
                        <option value="Mo-So">Mo-So</option>
                        <option value="Mo-Fr">Mo-Fr</option>
                        <option value="Sa-So">Sa-So</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input type="color" value={shift.color || '#3B82F6'} onChange={(e) => updateShift(index, 'color', e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={() => removeShift(index)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button onClick={addShift} className="inline-flex items-center px-3 py-1 border rounded-md hover:bg-gray-50 mb-6">
            <Plus className="w-4 h-4 mr-1" />Schicht hinzufügen
          </button>

          {/* Planungsregeln */}
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2 mt-2">Planungsregeln</h3>
          <p className="text-xs text-gray-500 mb-3">Diese Regeln werden der KI beim Generieren des Dienstplans mitgegeben.</p>

          <div className="space-y-2 mb-3">
            {editForm.rules.map((rule, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
                <select
                  value={rule.type}
                  onChange={(e) => updateRule(i, 'type', e.target.value)}
                  className="px-2 py-1 border rounded text-sm"
                >
                  {RULE_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                {rule.type === 'NO_SHIFT_AFTER' ? (
                  <>
                    <input
                      type="text"
                      placeholder="Schicht A (nach der)"
                      value={rule.shiftA || ''}
                      onChange={(e) => updateRule(i, 'shiftA', e.target.value)}
                      className="w-28 px-2 py-1 border rounded text-sm"
                    />
                    <span className="text-xs text-gray-500">→ nicht</span>
                    <input
                      type="text"
                      placeholder="Schicht B (danach)"
                      value={rule.shiftB || ''}
                      onChange={(e) => updateRule(i, 'shiftB', e.target.value)}
                      className="w-28 px-2 py-1 border rounded text-sm"
                    />
                  </>
                ) : (
                  <input
                    type="number"
                    value={rule.value as number}
                    min={1}
                    onChange={(e) => updateRule(i, 'value', parseInt(e.target.value))}
                    className="w-16 px-2 py-1 border rounded text-sm"
                  />
                )}
                <span className="text-xs text-gray-400 flex-1 truncate">{rule.label}</span>
                <button onClick={() => removeRule(i)} className="text-red-500 hover:text-red-700">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-between">
            <button onClick={addRule} className="inline-flex items-center px-3 py-1 border rounded-md hover:bg-gray-50 text-sm">
              <Plus className="w-4 h-4 mr-1" />Regel hinzufügen
            </button>
            <button onClick={handleSaveModel} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />Speichern
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
            models.map((model) => {
              const cfg = parseConfig(model.config);
              return (
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
                            rules: cfg.rules,
                          });
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Bearbeiten
                      </button>
                      <button onClick={() => handleDeleteModel(model.id)} className="text-red-600 hover:text-red-800 text-sm">
                        Löschen
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mb-2">
                    {model.shifts.map((shift) => (
                      <div key={shift.id} className="px-3 py-2 rounded text-white text-sm" style={{ backgroundColor: shift.color }}>
                        <div className="font-medium">{shift.name}</div>
                        <div className="text-xs opacity-90">{shift.startTime}-{shift.endTime}</div>
                        <div className="text-xs opacity-75">{shift.minStaff} Pers. ({shift.minQualified} FK) · {shift.days}</div>
                      </div>
                    ))}
                  </div>
                  {cfg.rules.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 font-medium mb-1">Regeln:</p>
                      <div className="flex flex-wrap gap-1">
                        {cfg.rules.map((r, i) => (
                          <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs border border-blue-200">
                            {r.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
