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
    const prompt = `Erstelle einen Dienstplan als JSON mit entries-Array: ${JSON.stringify(params)}`;
    
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
