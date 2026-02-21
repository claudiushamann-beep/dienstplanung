import { useEffect, useState } from 'react';
import { aiApi } from '../services/api';
import { AIProvider } from '../types';
import { Save, Trash2, Plus } from 'lucide-react';
import { useAuthStore } from '../store/auth';

export default function Settings() {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
  const isAdmin = useAuthStore((s) => s.isAdmin());

  const [newProvider, setNewProvider] = useState({
    name: '',
    type: 'openai',
    apiKey: '',
    baseUrl: '',
    isDefault: false,
  });

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const response = await aiApi.getProviders();
      setProviders(response.data);
    } catch (err) {
      console.error('Fehler beim Laden:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await aiApi.createProvider({
        ...newProvider,
        isActive: true,
      });
      setNewProvider({ name: '', type: 'openai', apiKey: '', baseUrl: '', isDefault: false });
      fetchProviders();
    } catch (err) {
      console.error('Fehler:', err);
    }
  };

  const handleUpdateProvider = async (provider: AIProvider) => {
    try {
      await aiApi.updateProvider(provider.id, {
        name: provider.name,
        type: provider.type,
        apiKey: provider.apiKey,
        baseUrl: provider.baseUrl,
        isDefault: provider.isDefault,
        isActive: provider.isActive,
      });
      setEditingProvider(null);
      fetchProviders();
    } catch (err) {
      console.error('Fehler:', err);
    }
  };

  const handleDeleteProvider = async (id: string) => {
    if (!confirm('KI-Provider löschen?')) return;
    try {
      await aiApi.deleteProvider(id);
      fetchProviders();
    } catch (err) {
      console.error('Fehler:', err);
    }
  };

  const handleSetDefault = async (provider: AIProvider) => {
    try {
      await aiApi.updateProvider(provider.id, {
        ...provider,
        isDefault: true,
      });
      fetchProviders();
    } catch (err) {
      console.error('Fehler:', err);
    }
  };

  if (loading) return <div className="text-center py-10">Laden...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">KI-Provider konfigurieren</h2>
        <p className="text-sm text-gray-600 mb-6">
          Konfigurieren Sie die verschiedenen KI-Anbieter für die Dienstplan-Generierung.
          Der als "Standard" markierte Provider wird für die KI-Generierung verwendet.
        </p>

        {isAdmin && (
          <form onSubmit={handleCreateProvider} className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="font-medium mb-3">Neuen Provider hinzufügen</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newProvider.name}
                  onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="z.B. OpenAI GPT-4"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
                <select
                  value={newProvider.type}
                  onChange={(e) => setNewProvider({ ...newProvider, type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="google">Google (Gemini)</option>
                  <option value="ollama">Ollama (Lokal)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API-Key</label>
                <input
                  type="password"
                  value={newProvider.apiKey}
                  onChange={(e) => setNewProvider({ ...newProvider, apiKey: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="sk-..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
                <input
                  type="text"
                  value={newProvider.baseUrl}
                  onChange={(e) => setNewProvider({ ...newProvider, baseUrl: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Nur für Ollama"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Hinzufügen
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="space-y-4">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className={`border rounded-lg p-4 ${
                provider.isDefault ? 'border-blue-500 bg-blue-50' : ''
              }`}
            >
              {editingProvider?.id === provider.id ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={editingProvider.name}
                      onChange={(e) =>
                        setEditingProvider({ ...editingProvider, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">API-Key</label>
                    <input
                      type="password"
                      value={editingProvider.apiKey || ''}
                      onChange={(e) =>
                        setEditingProvider({ ...editingProvider, apiKey: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="Neuer Key..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
                    <input
                      type="text"
                      value={editingProvider.baseUrl || ''}
                      onChange={(e) =>
                        setEditingProvider({ ...editingProvider, baseUrl: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <button
                      onClick={() => handleUpdateProvider(editingProvider)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingProvider(null)}
                      className="px-4 py-2 border rounded-md hover:bg-gray-50"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{provider.name}</h3>
                      {provider.isDefault && (
                        <span className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded">
                          Standard
                        </span>
                      )}
                      {!provider.isActive && (
                        <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
                          Inaktiv
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      Typ: {provider.type.toUpperCase()}
                      {provider.baseUrl && ` · ${provider.baseUrl}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!provider.isDefault && (
                      <button
                        onClick={() => handleSetDefault(provider)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Als Standard
                      </button>
                    )}
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => setEditingProvider(provider)}
                          className="text-sm text-gray-600 hover:text-gray-800"
                        >
                          Bearbeiten
                        </button>
                        <button
                          onClick={() => handleDeleteProvider(provider.id)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Hinweise zur Einrichtung</h2>
        <div className="prose prose-sm text-gray-600">
          <h3 className="text-md font-medium">OpenAI</h3>
          <p>Benötigt einen API-Key von platform.openai.com. Das Modell GPT-4 wird empfohlen.</p>

          <h3 className="text-md font-medium mt-4">Anthropic (Claude)</h3>
          <p>API-Key von console.anthropic.com. Claude 3 Sonnet bietet ein gutes Preis-Leistungs-Verhältnis.</p>

          <h3 className="text-md font-medium mt-4">Google (Gemini)</h3>
          <p>API-Key von makersuite.google.com. Gemini Pro ist kostenlos verfügbar.</p>

          <h3 className="text-md font-medium mt-4">Ollama (Lokal)</h3>
          <p>
            Für lokale Modelle. Ollama muss installiert sein (ollama.ai).
            Base URL ist standardmäßig http://localhost:11434
          </p>
        </div>
      </div>
    </div>
  );
}
