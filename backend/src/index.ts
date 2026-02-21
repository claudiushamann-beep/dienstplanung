import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/auth.js';
import employeeRoutes from './routes/employees.js';
import constraintRoutes from './routes/constraints.js';
import absenceRoutes from './routes/absences.js';
import shiftModelRoutes from './routes/shiftModels.js';
import scheduleRoutes from './routes/schedules.js';
import statisticsRoutes from './routes/statistics.js';
import aiRoutes from './routes/ai.js';

dotenv.config();

export const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/constraints', constraintRoutes);
app.use('/api/absences', absenceRoutes);
app.use('/api/shift-models', shiftModelRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/ai', aiRoutes);

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Etwas ist schiefgelaufen!' });
});

app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});

export default app;
