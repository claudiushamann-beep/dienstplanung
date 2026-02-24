import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProviderConfig, GenerateScheduleParams, ExplainModelParams, ShiftModelResult, GeneratedSchedule } from './types.js';

export class GoogleProvider {
  private genAI: GoogleGenerativeAI;
  private model: string;

  constructor(config: AIProviderConfig) {
    this.genAI = new GoogleGenerativeAI(config.apiKey || '');
    this.model = config.model || 'gemini-pro';
  }

  async explainModel(params: ExplainModelParams): Promise<ShiftModelResult> {
    const prompt = `Du bist ein Experte für Dienstplanung. Analysiere diese Beschreibung und extrahiere ein strukturiertes Schichtmodell:

"${params.description}"

Antworte NUR als JSON:
{
  "name": "Name",
  "description": "Beschreibung",
  "shifts": [{ "name": "Schichtname", "startTime": "HH:MM", "endTime": "HH:MM", "minStaff": 2, "minQualified": 1, "days": "Mo-Fr", "color": "#3B82F6" }]
}`;

    const model = this.genAI.getGenerativeModel({ model: this.model });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('Kein valides JSON erhalten');
  }

  async generateSchedule(params: GenerateScheduleParams): Promise<GeneratedSchedule> {
    const employeeList = params.employees.map(e => {
      const quals = typeof e.qualifications === 'string'
        ? JSON.parse(e.qualifications || '[]')
        : (e.qualifications || []);
      return `- ID: ${e.id} | ${e.firstName} ${e.lastName} (${e.position}, ${e.workFraction * 100}%, Skills: ${quals.join(', ') || 'keine'})`;
    }).join('\n');

    const constraintList = params.constraints.map((c: any) =>
      `- ${c.type}: ${c.value}`
    ).join('\n');

    const absenceList = params.absences.map((a: any) =>
      `- ${a.employeeId}: ${a.startDate} bis ${a.endDate} (${a.type})`
    ).join('\n');

    const shiftList = params.shiftModel.shifts.map((s: any) =>
      `- ${s.name} (${s.startTime}-${s.endTime}): Min. ${s.minStaff} Mitarbeiter, ${s.days}`
    ).join('\n');

    const shiftNames = params.shiftModel.shifts.map((s: any) => s.name).join(', ');

    const pinnedList = (params.pinnedEntries || []).map((p: any) =>
      `- employeeId: ${p.employeeId}, date: ${p.date instanceof Date ? p.date.toISOString().split('T')[0] : p.date}, shiftType: ${p.shiftType}`
    ).join('\n');

    const holidayList = (params.holidays || []).map((h: any) =>
      `- ${h.date} (${h.name})`
    ).join('\n');

    const rulesText = (params.rules || []).map((r: any) => `- ${r.label || r.type}`).join('\n');

    const prompt = `Du bist ein Experte für Dienstplanung im Krankenhaus- und Pflegebereich.

Erstelle einen Dienstplan für ${params.startDate.toISOString().split('T')[0]} bis ${params.endDate.toISOString().split('T')[0]}.

Mitarbeiter (verwende exakt diese IDs):
${employeeList}

Verfügbare Schichttypen (verwende exakt diese Namen):
${shiftNames}

Schichtmodell "${params.shiftModel.name}":
${shiftList}

Einschränkungen: ${constraintList || 'Keine'}
Abwesenheiten: ${absenceList || 'Keine'}
${holidayList ? `Feiertage (wie Wochenenden behandeln):\n${holidayList}` : ''}
${pinnedList ? `FESTGESETZTE Einträge (NICHT ändern):\n${pinnedList}` : ''}
${rulesText ? `Planungsregeln:\n${rulesText}` : ''}

Antworte NUR als JSON ohne Markdown:
{"entries": [{"employeeId": "<exakte-uuid>", "date": "YYYY-MM-DD", "shiftType": "<exakter-schichtname>"}]}`;

    const model = this.genAI.getGenerativeModel({ model: this.model });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

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
