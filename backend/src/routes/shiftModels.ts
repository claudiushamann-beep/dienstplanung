import { Router, Response } from 'express';
import { prisma } from '../index.js';
import { auth, AuthRequest, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', auth, async (_req: AuthRequest, res: Response) => {
  try {
    const models = await prisma.shiftModel.findMany({
      include: { shifts: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(models);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Abrufen der Dienstplanmodelle' });
  }
});

router.get('/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    const model = await prisma.shiftModel.findUnique({
      where: { id: req.params.id },
      include: { shifts: true }
    });

    if (!model) {
      return res.status(404).json({ error: 'Dienstplanmodell nicht gefunden' });
    }

    res.json(model);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Abrufen des Dienstplanmodells' });
  }
});

router.post('/', auth, requireRole('ADMIN', 'PLANER'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, config, shifts } = req.body;

    const model = await prisma.shiftModel.create({
      data: {
        name,
        description,
        config: typeof config === 'object' ? JSON.stringify(config) : (config || '{}'),
        shifts: {
          create: shifts || []
        }
      },
      include: { shifts: true }
    });

    res.status(201).json(model);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Erstellen des Dienstplanmodells' });
  }
});

router.put('/:id', auth, requireRole('ADMIN', 'PLANER'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, config, isActive, shifts } = req.body;

    if (shifts) {
      await prisma.shiftConfig.deleteMany({
        where: { shiftModelId: req.params.id }
      });
    }

    const model = await prisma.shiftModel.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        config: config !== undefined ? (typeof config === 'object' ? JSON.stringify(config) : config) : undefined,
        isActive,
        shifts: shifts ? {
          create: shifts
        } : undefined
      },
      include: { shifts: true }
    });

    res.json(model);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Dienstplanmodells' });
  }
});

router.delete('/:id', auth, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.shiftModel.delete({
      where: { id: req.params.id }
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Löschen des Dienstplanmodells' });
  }
});

export default router;
