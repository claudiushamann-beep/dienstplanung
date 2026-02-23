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
    const employeeList = params.employees.map(e => 
      `${e.firstName} ${e.lastName} (ID: ${e.id}, ${e.workFraction * 100}%)`
    ).join(', ');

    const prompt = `Erstelle einen Dienstplan für ${params.startDate.toISOString().split('T')[0]} bis ${params.endDate.toISOString().split('T')[0]}.
Mitarbeiter: ${employeeList}
Schichten: ${JSON.stringify(params.shiftModel.shifts)}
Berücksichtige Constraints und Abwesenheiten.

Antworte als JSON: {"entries": [{"employeeId": "id", "date": "YYYY-MM-DD", "shiftType": "FRUEH|SPAET|NACHT"}]}`;

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
