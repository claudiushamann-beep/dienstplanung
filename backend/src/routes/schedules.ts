import { Router, Response } from 'express';
import { prisma } from '../index.js';
import { auth, AuthRequest, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/soll', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, employeeId } = req.query;
    
    const where: any = {};
    
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }
    
    if (employeeId) {
      where.employeeId = employeeId;
    }

    const schedule = await prisma.scheduleSoll.findMany({
      where,
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, position: true }
        }
      },
      orderBy: [{ date: 'asc' }, { shiftType: 'asc' }]
    });

    res.json(schedule);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Abrufen des Soll-Plans' });
  }
});

router.get('/ist', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, employeeId } = req.query;
    
    const where: any = {};
    
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }
    
    if (employeeId) {
      where.employeeId = employeeId;
    }

    const schedule = await prisma.scheduleIst.findMany({
      where,
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, position: true }
        }
      },
      orderBy: [{ date: 'asc' }, { shiftType: 'asc' }]
    });

    res.json(schedule);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Abrufen des Ist-Plans' });
  }
});

router.post('/soll', auth, requireRole('ADMIN', 'PLANER'), async (req: AuthRequest, res: Response) => {
  try {
    const { entries } = req.body;

    const created = await prisma.$transaction(
      entries.map((entry: any) => 
        prisma.scheduleSoll.upsert({
          where: {
            employeeId_date_shiftType: {
              employeeId: entry.employeeId,
              date: new Date(entry.date),
              shiftType: entry.shiftType
            }
          },
          update: {
            note: entry.note,
            shiftModelId: entry.shiftModelId
          },
          create: {
            employeeId: entry.employeeId,
            date: new Date(entry.date),
            shiftType: entry.shiftType,
            shiftModelId: entry.shiftModelId,
            note: entry.note
          }
        })
      )
    );

    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Erstellen des Soll-Plans' });
  }
});

router.post('/ist', auth, requireRole('ADMIN', 'PLANER'), async (req: AuthRequest, res: Response) => {
  try {
    const { entries } = req.body;

    const created = await prisma.$transaction(
      entries.map((entry: any) => 
        prisma.scheduleIst.upsert({
          where: {
            employeeId_date_shiftType: {
              employeeId: entry.employeeId,
              date: new Date(entry.date),
              shiftType: entry.shiftType
            }
          },
          update: {
            deviationReason: entry.deviationReason,
            note: entry.note,
            shiftModelId: entry.shiftModelId
          },
          create: {
            employeeId: entry.employeeId,
            date: new Date(entry.date),
            shiftType: entry.shiftType,
            shiftModelId: entry.shiftModelId,
            deviationReason: entry.deviationReason,
            note: entry.note
          }
        })
      )
    );

    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Erstellen des Ist-Plans' });
  }
});

router.delete('/soll/:id', auth, requireRole('ADMIN', 'PLANER'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.scheduleSoll.delete({
      where: { id: req.params.id }
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Löschen des Soll-Plan-Eintrags' });
  }
});

router.delete('/ist/:id', auth, requireRole('ADMIN', 'PLANER'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.scheduleIst.delete({
      where: { id: req.params.id }
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Löschen des Ist-Plan-Eintrags' });
  }
});

router.post('/copy-soll-to-ist', auth, requireRole('ADMIN', 'PLANER'), async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.body;
    
    const sollEntries = await prisma.scheduleSoll.findMany({
      where: {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      }
    });

    await prisma.scheduleIst.createMany({
      data: sollEntries.map(entry => ({
        employeeId: entry.employeeId,
        date: entry.date,
        shiftType: entry.shiftType,
        shiftModelId: entry.shiftModelId,
        note: entry.note
      })),
      skipDuplicates: true
    });

    res.json({ message: 'Soll-Plan erfolgreich in Ist-Plan kopiert', count: sollEntries.length });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Kopieren des Plans' });
  }
});

export default router;
