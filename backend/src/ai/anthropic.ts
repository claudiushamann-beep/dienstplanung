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
    const employeeList = params.employees.map(e => 
      `- ${e.firstName} ${e.lastName} (${e.position}, ${e.workFraction * 100}%)`
    ).join('\n');

    const constraintList = params.constraints.map(c => 
      `- ${c.type}: ${c.value}`
    ).join('\n');

    const prompt = `Erstelle einen Dienstplan für den Zeitraum ${params.startDate.toISOString().split('T')[0]} bis ${params.endDate.toISOString().split('T')[0]}.

Mitarbeiter:
${employeeList}

Einschränkungen: ${constraintList || 'Keine'}
Schichtmodell: ${JSON.stringify(params.shiftModel.shifts)}

Antworte als JSON: { "entries": [{ "employeeId": "uuid", "date": "YYYY-MM-DD", "shiftType": "FRUEH|SPAET|NACHT" }] }`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return JSON.parse(content.text);
    }
    
    throw new Error('Unerwartete Antwort von Claude');
  }

  async validateSchedule(schedule: any[], params: GenerateScheduleParams): Promise<{ valid: boolean; issues: string[] }> {
    return { valid: true, issues: [] };
  }
}
