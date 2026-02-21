export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'PLANER' | 'MITARBEITER';
  employeeId?: string;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  workFraction: number;
  qualifications: string[];
  isActive: boolean;
  constraints?: Constraint[];
  absences?: Absence[];
  user?: { id: string; email: string; role: string };
}

export interface Constraint {
  id: string;
  employeeId: string;
  type: ConstraintType;
  value: string;
  description?: string;
}

export type ConstraintType = 
  | 'CONFLICT'
  | 'MAX_SHIFTS_PER_WEEK'
  | 'MAX_SHIFTS_PER_MONTH'
  | 'UNAVAILABLE_DAYS'
  | 'PREFERRED_SHIFTS'
  | 'UNAVAILABLE_SHIFT_TYPE'
  | 'MAX_CONSECUTIVE_DAYS'
  | 'NOTE';

export interface Absence {
  id: string;
  employeeId: string;
  type: AbsenceType;
  startDate: string;
  endDate: string;
  status: AbsenceStatus;
  note?: string;
  employee?: { id: string; firstName: string; lastName: string };
}

export type AbsenceType = 'VACATION' | 'SICK' | 'TRAINING' | 'OTHER';
export type AbsenceStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED';

export interface ShiftModel {
  id: string;
  name: string;
  description?: string;
  config: string;
  isActive: boolean;
  shifts: ShiftConfig[];
}

export interface ShiftConfig {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  minStaff: number;
  minQualified: number;
  days: string;
  color: string;
}

export interface ScheduleEntry {
  id: string;
  employeeId: string;
  date: string;
  shiftType: string;
  shiftModelId?: string;
  note?: string;
  deviationReason?: string;
  employee?: { id: string; firstName: string; lastName: string; position: string };
}

export interface Statistics {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  totalShifts: number;
  earlyShifts: number;
  lateShifts: number;
  nightShifts: number;
  weekendShifts: number;
  hoursWorked: number;
  employee?: { id: string; firstName: string; lastName: string; position: string };
}

export interface AIProvider {
  id: string;
  name: string;
  type: string;
  apiKey?: string;
  baseUrl?: string;
  isActive: boolean;
  isDefault: boolean;
}
