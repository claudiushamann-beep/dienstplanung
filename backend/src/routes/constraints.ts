import { Router, Response } from 'express';
import { prisma } from '../index.js';
import { auth, AuthRequest, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/employee/:employeeId', auth, async (req: AuthRequest, res: Response) => {
  try {
    const constraints = await prisma.constraint.findMany({
      where: { employeeId: req.params.employeeId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(constraints);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Abrufen der Einschränkungen' });
  }
});

router.post('/', auth, requireRole('ADMIN', 'PLANER'), async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId, type, value, description } = req.body;

    const constraint = await prisma.constraint.create({
      data: {
        employeeId,
        type,
        value,
        description,
      }
    });

    res.status(201).json(constraint);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Erstellen der Einschränkung' });
  }
});

router.put('/:id', auth, requireRole('ADMIN', 'PLANER'), async (req: AuthRequest, res: Response) => {
  try {
    const { type, value, description } = req.body;

    const constraint = await prisma.constraint.update({
      where: { id: req.params.id },
      data: { type, value, description }
    });

    res.json(constraint);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Aktualisieren der Einschränkung' });
  }
});

router.delete('/:id', auth, requireRole('ADMIN', 'PLANER'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.constraint.delete({
      where: { id: req.params.id }
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Löschen der Einschränkung' });
  }
});

export default router;
