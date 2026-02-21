import { Router, Response } from 'express';
import { prisma } from '../index.js';
import { auth, AuthRequest, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/employee/:employeeId', auth, async (req: AuthRequest, res: Response) => {
  try {
    const absences = await prisma.absence.findMany({
      where: { employeeId: req.params.employeeId },
      orderBy: { startDate: 'desc' }
    });
    res.json(absences);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Abrufen der Abwesenheiten' });
  }
});

router.get('/', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, status } = req.query;
    
    const where: any = {};
    
    if (startDate || endDate) {
      where.OR = [];
      if (startDate) {
        where.OR.push({ endDate: { gte: new Date(startDate as string) } });
      }
      if (endDate) {
        where.OR.push({ startDate: { lte: new Date(endDate as string) } });
      }
    }
    
    if (status) {
      where.status = status;
    }

    const absences = await prisma.absence.findMany({
      where,
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true }
        }
      },
      orderBy: { startDate: 'desc' }
    });
    res.json(absences);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Abrufen der Abwesenheiten' });
  }
});

router.post('/', auth, requireRole('ADMIN', 'PLANER'), async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId, type, startDate, endDate, status, note } = req.body;

    const absence = await prisma.absence.create({
      data: {
        employeeId,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: status || 'REQUESTED',
        note,
      }
    });

    res.status(201).json(absence);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Erstellen der Abwesenheit' });
  }
});

router.put('/:id', auth, requireRole('ADMIN', 'PLANER'), async (req: AuthRequest, res: Response) => {
  try {
    const { type, startDate, endDate, status, note } = req.body;

    const absence = await prisma.absence.update({
      where: { id: req.params.id },
      data: {
        type,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        status,
        note
      }
    });

    res.json(absence);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Aktualisieren der Abwesenheit' });
  }
});

router.delete('/:id', auth, requireRole('ADMIN', 'PLANER'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.absence.delete({
      where: { id: req.params.id }
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Löschen der Abwesenheit' });
  }
});

export default router;
