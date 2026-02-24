import Anthropic from '@anthropic-ai/sdk';
import { AIProviderConfig, GenerateScheduleParams, ExplainModelParams, ShiftModelResult, GeneratedSchedule } from './types.js';

export class AnthropicProvider {
  private client: Anthropic;
  private model: string;

  constructor(config: AIProviderConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model || 'claude-3-sonnet-20240229';
  }

  async explainModel(params: ExplainModelParams): Promise<ShiftModelResult> {
    const prompt = `Du bist ein Experte für Dienstplanung im Krankenhaus- und Pflegebereich.
    
Analysiere die folgende Beschreibung eines Dienstplanmodells und extrahiere daraus eine strukturierte Tabelle:

"${params.description}"

Antworte NUR als valides JSON ohne Markdown-Formatierung:
{
  "name": "Name des Modells",
  "description": "Kurze Beschreibung",
  "shifts": [
    {
      "name": "Schichtname (z.B. Früh, Spät, Nacht)",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "minStaff": 2,
      "minQualified": 1,
      "days": "Mo-Fr oder Sa-So oder Mo-So",
      "color": "#Farbcode"
    }
  ]
}`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return JSON.parse(content.text);
    }
    
    throw new Error('Unerwartete Antwort von Claude');
  }

  async generateSchedule(params: GenerateScheduleParams): Promise<GeneratedSchedule> {
    const employeeList = params.employees.map(e => {
      const quals = typeof e.qualifications === 'string'
        ? JSON.parse(e.qualifications || '[]')
        : (e.qualifications || []);
      return `- ID: ${e.id} | ${e.firstName} ${e.lastName} (${e.position}, ${e.workFraction * 100}%, Skills: ${quals.join(', ') || 'keine'})`;
    }).join('\n');

    const constraintList = params.constraints.map(c =>
      `- ${c.type}: ${c.value}`
    ).join('\n');

    const absenceList = params.absences.map((a: any) =>
      `- ${a.employeeId}: ${a.startDate} bis ${a.endDate} (${a.type})`
    ).join('\n');

    const shiftList = params.shiftModel.shifts.map((s: any) =>
      `- ${s.name} (${s.startTime}-${s.endTime}): Min. ${s.minStaff} Mitarbeiter, davon ${s.minQualified} qualifiziert, ${s.days}`
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

Erstelle einen optimalen Dienstplan für den Zeitraum ${params.startDate.toISOString().split('T')[0]} bis ${params.endDate.toISOString().split('T')[0]}.

Mitarbeiter (verwende exakt diese IDs im JSON):
${employeeList}

Verfügbare Schichttypen (verwende exakt diese Namen im JSON):
${shiftNames}

Schichtmodell "${params.shiftModel.name}":
${shiftList}

Einschränkungen:
${constraintList || 'Keine'}

Abwesenheiten (nicht verfügbar):
${absenceList || 'Keine'}
${holidayList ? `\nFeiertage (wie Wochenenden behandeln, möglichst frei lassen):\n${holidayList}` : ''}
${pinnedList ? `\nFESTGESETZTE Einträge (dürfen NICHT geändert oder überschrieben werden):\n${pinnedList}` : ''}
${rulesText ? `\nPlanungsregeln (unbedingt einhalten):\n${rulesText}` : ''}

Berücksichtige:
1. Mitarbeiter mit 50% Stelle sollten max. 50% der Dienste arbeiten
2. Konflikte zwischen Mitarbeitern respektieren
3. Urlaube und Abwesenheiten beachten
4. Ausreichende Besetzung pro Schicht
5. Mindestens 1 qualifizierte Kraft pro Schicht
6. Faire Verteilung der Dienste

Antworte NUR als valides JSON ohne Markdown:
{
  "entries": [
    { "employeeId": "<exakte-uuid-aus-der-liste>", "date": "YYYY-MM-DD", "shiftType": "<exakter-schichtname-aus-der-liste>" }
  ]
}`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if (content.type === 'text') {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : content.text);
    }

    throw new Error('Unerwartete Antwort von Claude');
  }

  async validateSchedule(schedule: any[], params: GenerateScheduleParams): Promise<{ valid: boolean; issues: string[] }> {
    return { valid: true, issues: [] };
  }
}
