import { Router, Response } from 'express';
import { prisma } from '../index.js';
import { auth, AuthRequest, requireRole } from '../middleware/auth.js';
import { createAIProvider } from '../ai/index.js';

const router = Router();

router.get('/providers', auth, async (_req: AuthRequest, res: Response) => {
  try {
    const providers = await prisma.aIProvider.findMany();
    res.json(providers);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Abrufen der KI-Provider' });
  }
});

router.post('/providers', auth, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, apiKey, baseUrl, isActive, isDefault } = req.body;

    if (isDefault) {
      await prisma.aIProvider.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      });
    }

    const provider = await prisma.aIProvider.create({
      data: {
        name,
        type,
        apiKey,
        baseUrl,
        isActive: isActive ?? true,
        isDefault: isDefault ?? false,
      }
    });

    res.status(201).json(provider);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Erstellen des KI-Providers' });
  }
});

router.put('/providers/:id', auth, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, apiKey, baseUrl, isActive, isDefault } = req.body;

    if (isDefault) {
      await prisma.aIProvider.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      });
    }

    const provider = await prisma.aIProvider.update({
      where: { id: req.params.id },
      data: { name, type, apiKey, baseUrl, isActive, isDefault }
    });

    res.json(provider);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Aktualisieren des KI-Providers' });
  }
});

router.delete('/providers/:id', auth, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.aIProvider.delete({
      where: { id: req.params.id }
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Löschen des KI-Providers' });
  }
});

router.post('/explain-model', auth, requireRole('ADMIN', 'PLANER'), async (req: AuthRequest, res: Response) => {
  try {
    const { description, providerId } = req.body;

    const providerConfig = providerId 
      ? await prisma.aIProvider.findUnique({ where: { id: providerId } })
      : await prisma.aIProvider.findFirst({ where: { isDefault: true, isActive: true } });

    if (!providerConfig) {
      return res.status(400).json({ error: 'Kein KI-Provider konfiguriert' });
    }

    const provider = createAIProvider({
      name: providerConfig.name,
      type: providerConfig.type as any,
      apiKey: providerConfig.apiKey || undefined,
      baseUrl: providerConfig.baseUrl || undefined
    });

    const result = await provider.explainModel({ description });

    res.json(result);
  } catch (error: any) {
    console.error('KI-Fehler:', error);
    res.status(500).json({ error: error.message || 'Fehler bei der KI-Generierung' });
  }
});

router.post('/generate-schedule', auth, requireRole('ADMIN', 'PLANER'), async (req: AuthRequest, res: Response) => {
  try {
    const { shiftModelId, startDate, endDate, providerId } = req.body;

    const providerConfig = providerId 
      ? await prisma.aIProvider.findUnique({ where: { id: providerId } })
      : await prisma.aIProvider.findFirst({ where: { isDefault: true, isActive: true } });

    if (!providerConfig) {
      return res.status(400).json({ error: 'Kein KI-Provider konfiguriert' });
    }

    const [shiftModel, employees] = await Promise.all([
      prisma.shiftModel.findUnique({
        where: { id: shiftModelId },
        include: { shifts: true }
      }),
      prisma.employee.findMany({
        where: { isActive: true },
        include: { constraints: true, absences: true }
      })
    ]);

    if (!shiftModel) {
      return res.status(404).json({ error: 'Dienstplanmodell nicht gefunden' });
    }

    const allConstraints = employees.flatMap(e => e.constraints);
    const allAbsences = employees.flatMap(e => e.absences);

    const provider = createAIProvider({
      name: providerConfig.name,
      type: providerConfig.type as any,
      apiKey: providerConfig.apiKey || undefined,
      baseUrl: providerConfig.baseUrl || undefined
    });

    const result = await provider.generateSchedule({
      employees,
      constraints: allConstraints,
      absences: allAbsences,
      shiftModel,
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    });

    res.json(result);
  } catch (error: any) {
    console.error('KI-Fehler:', error);
    res.status(500).json({ error: error.message || 'Fehler bei der Dienstplan-Generierung' });
  }
});

export default router;
