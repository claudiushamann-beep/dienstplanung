import { useRef, useState } from 'react';
import { aiApi } from '../services/api';
import { Send, Loader2, Bot, User } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function Konsole() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setError('');
    setLoading(true);

    try {
      const response = await aiApi.chat(updated);
      const reply: string = response.data.reply;
      setMessages([...updated, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Fehler beim Senden');
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">KI-Konsole</h1>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto bg-white rounded-lg shadow p-4 space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Bot className="w-12 h-12 mb-3" />
            <p className="text-sm">Stellen Sie Fragen zu Mitarbeitern, Dienstplänen oder Abwesenheiten.</p>
            <p className="text-xs mt-1">z.B. „Wer hat nächste Woche Frühdienst?" oder „Wie viele Mitarbeiter sind diese Woche krank?"</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                msg.role === 'user' ? 'bg-blue-600' : 'bg-purple-600'
              }`}
            >
              {msg.role === 'user' ? (
                <User className="w-4 h-4 text-white" />
              ) : (
                <Bot className="w-4 h-4 text-white" />
              )}
            </div>
            <div
              className={`max-w-[75%] px-4 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-gray-100 text-gray-900 rounded-tl-none'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 flex-row">
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-purple-600">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="px-4 py-2 rounded-lg bg-gray-100 text-gray-500 text-sm flex items-center gap-2 rounded-tl-none">
              <Loader2 className="w-4 h-4 animate-spin" />
              Denke nach...
            </div>
          </div>
        )}

        {error && (
          <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-3">
            Fehler: {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="flex gap-2 bg-white rounded-lg shadow p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder="Nachricht eingeben… (Enter zum Senden, Shift+Enter für neue Zeile)"
          className="flex-1 resize-none px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="self-end px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
