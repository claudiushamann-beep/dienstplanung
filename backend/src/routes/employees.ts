import { Router, Response } from 'express';
import { prisma } from '../index.js';
import { auth, AuthRequest, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', auth, async (_req: AuthRequest, res: Response) => {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        constraints: true,
        absences: {
          where: {
            endDate: { gte: new Date() }
          }
        },
        user: {
          select: { id: true, email: true, role: true }
        }
      },
      orderBy: { lastName: 'asc' }
    });
    const parsedEmployees = employees.map(e => ({
      ...e,
      qualifications: JSON.parse(e.qualifications || '[]')
    }));
    res.json(parsedEmployees);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Abrufen der Mitarbeiter' });
  }
});

router.get('/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.params.id },
      include: {
        constraints: true,
        absences: true,
        user: {
          select: { id: true, email: true, role: true }
        }
      }
    });

    if (!employee) {
      return res.status(404).json({ error: 'Mitarbeiter nicht gefunden' });
    }

    res.json({
      ...employee,
      qualifications: JSON.parse(employee.qualifications || '[]')
    });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Abrufen des Mitarbeiters' });
  }
});

router.post('/', auth, requireRole('ADMIN', 'PLANER'), async (req: AuthRequest, res: Response) => {
  try {
    const { firstName, lastName, position, workFraction, qualifications, userId } = req.body;

    const employee = await prisma.employee.create({
      data: {
        firstName,
        lastName,
        position,
        workFraction: workFraction || 1.0,
        qualifications: JSON.stringify(qualifications || []),
        userId,
      },
      include: {
        constraints: true,
        absences: true
      }
    });

    res.status(201).json({
      ...employee,
      qualifications: JSON.parse(employee.qualifications || '[]')
    });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Erstellen des Mitarbeiters' });
  }
});

router.put('/:id', auth, requireRole('ADMIN', 'PLANER'), async (req: AuthRequest, res: Response) => {
  try {
    const { firstName, lastName, position, workFraction, qualifications, isActive } = req.body;

    const employee = await prisma.employee.update({
      where: { id: req.params.id },
      data: {
        firstName,
        lastName,
        position,
        workFraction,
        qualifications: qualifications ? JSON.stringify(qualifications) : undefined,
        isActive,
      },
      include: {
        constraints: true,
        absences: true
      }
    });

    res.json({
      ...employee,
      qualifications: JSON.parse(employee.qualifications || '[]')
    });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Mitarbeiters' });
  }
});

router.delete('/:id', auth, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.employee.delete({
      where: { id: req.params.id }
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Löschen des Mitarbeiters' });
  }
});

export default router;
