export interface AIProviderConfig {
  name: string;
  type: 'openai' | 'anthropic' | 'google' | 'ollama';
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export interface GenerateScheduleParams {
  employees: any[];
  constraints: any[];
  absences: any[];
  shiftModel: any;
  startDate: Date;
  endDate: Date;
  pinnedEntries?: any[];
  holidays?: { date: string; name: string }[];
  rules?: { type: string; value?: any; label?: string }[];
}

export interface ExplainModelParams {
  description: string;
}

export interface ShiftModelResult {
  name: string;
  description: string;
  shifts: {
    name: string;
    startTime: string;
    endTime: string;
    minStaff: number;
    minQualified: number;
    days: string;
    color: string;
  }[];
}

export interface GeneratedSchedule {
  entries: {
    employeeId: string;
    date: string;
    shiftType: string;
  }[];
}
