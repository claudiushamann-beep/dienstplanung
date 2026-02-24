import { AIProviderConfig, GenerateScheduleParams, ExplainModelParams, ShiftModelResult, GeneratedSchedule } from './types.js';

export class OllamaProvider {
  private baseUrl: string;
  private model: string;

  constructor(config: AIProviderConfig) {
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
    this.model = config.model || 'llama3';
  }

  private async generate(prompt: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false
      })
    });

    const data = await response.json() as { response: string };
    return data.response;
  }

  async explainModel(params: ExplainModelParams): Promise<ShiftModelResult> {
    const prompt = `Analysiere diese Dienstplan-Beschreibung und extrahiere ein JSON-Modell:

"${params.description}"

Antworte NUR als JSON (kein Markdown):
{"name": "...", "description": "...", "shifts": [{"name": "...", "startTime": "HH:MM", "endTime": "HH:MM", "minStaff": 2, "minQualified": 1, "days": "Mo-Fr", "color": "#3B82F6"}]}`;

    const text = await this.generate(prompt);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('Kein valides JSON von Ollama erhalten');
  }

  async generateSchedule(params: GenerateScheduleParams): Promise<GeneratedSchedule> {
    const employeeList = params.employees.map(e => {
      const quals = typeof e.qualifications === 'string'
        ? JSON.parse(e.qualifications || '[]')
        : (e.qualifications || []);
      return `- ID: ${e.id} | ${e.firstName} ${e.lastName} (${e.position}, ${e.workFraction * 100}%)`;
    }).join('\n');

    const shiftNames = params.shiftModel.shifts.map((s: any) => s.name).join(', ');
    const shiftList = params.shiftModel.shifts.map((s: any) =>
      `- ${s.name} (${s.startTime}-${s.endTime}): Min. ${s.minStaff} Mitarbeiter`
    ).join('\n');

    const absenceList = params.absences.map((a: any) =>
      `- ${a.employeeId}: ${a.startDate} bis ${a.endDate}`
    ).join('\n');

    const pinnedList = (params.pinnedEntries || []).map((p: any) =>
      `- employeeId: ${p.employeeId}, date: ${p.date instanceof Date ? p.date.toISOString().split('T')[0] : p.date}, shiftType: ${p.shiftType}`
    ).join('\n');

    const holidayList = (params.holidays || []).map((h: any) =>
      `- ${h.date} (${h.name})`
    ).join('\n');

    const rulesText = (params.rules || []).map((r: any) => `- ${r.label || r.type}`).join('\n');

    const prompt = `Erstelle einen Dienstplan für ${params.startDate.toISOString().split('T')[0]} bis ${params.endDate.toISOString().split('T')[0]}.

Mitarbeiter (verwende exakt diese IDs):
${employeeList}

Verfügbare Schichttypen (verwende exakt diese Namen):
${shiftNames}

Schichten:
${shiftList}

Abwesenheiten: ${absenceList || 'Keine'}
${holidayList ? `Feiertage:\n${holidayList}` : ''}
${pinnedList ? `FESTGESETZTE Einträge (NICHT ändern):\n${pinnedList}` : ''}
${rulesText ? `Planungsregeln:\n${rulesText}` : ''}

Antworte NUR als JSON (kein Markdown):
{"entries": [{"employeeId": "<exakte-uuid>", "date": "YYYY-MM-DD", "shiftType": "<exakter-schichtname>"}]}`;

    const text = await this.generate(prompt);
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return { entries: [] };
  }

  async validateSchedule(): Promise<{ valid: boolean; issues: string[] }> {
    return { valid: true, issues: [] };
  }
}
