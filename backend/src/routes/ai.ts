import { Router, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
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

router.post('/chat', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { messages, providerId } = req.body;

    const providerConfig = providerId
      ? await prisma.aIProvider.findUnique({ where: { id: providerId } })
      : await prisma.aIProvider.findFirst({ where: { isDefault: true, isActive: true, type: 'anthropic' } });

    if (!providerConfig) {
      return res.status(400).json({ error: 'Kein Anthropic-Provider konfiguriert' });
    }

    const client = new Anthropic({ apiKey: providerConfig.apiKey || '' });

    const tools: Anthropic.Tool[] = [
      {
        name: 'get_employees',
        description: 'Ruft alle aktiven Mitarbeiter mit ihren Qualifikationen und Einschränkungen ab',
        input_schema: {
          type: 'object' as const,
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_schedule',
        description: 'Ruft den Soll- oder Ist-Dienstplan für einen Zeitraum ab',
        input_schema: {
          type: 'object' as const,
          properties: {
            startDate: { type: 'string', description: 'Startdatum im Format YYYY-MM-DD' },
            endDate: { type: 'string', description: 'Enddatum im Format YYYY-MM-DD' },
            planType: {
              type: 'string',
              enum: ['soll', 'ist'],
              description: 'Soll-Plan (geplant) oder Ist-Plan (tatsächlich)',
            },
          },
          required: ['startDate', 'endDate'],
        },
      },
      {
        name: 'get_absences',
        description: 'Ruft alle Abwesenheiten (Urlaub, Krankheit) ab',
        input_schema: {
          type: 'object' as const,
          properties: {},
          required: [],
        },
      },
    ];

    // Build the conversation, using only user/assistant text turns sent from the frontend
    const conversationMessages: Anthropic.MessageParam[] = messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    let apiResponse = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system:
        'Du bist ein hilfreicher KI-Assistent für die Dienstplanung in einem Krankenhaus oder einer Pflegeeinrichtung. ' +
        'Du kannst Fragen zu Mitarbeitern, Dienstplänen und Abwesenheiten beantworten. ' +
        'Antworte immer auf Deutsch und sei präzise und hilfreich.',
      messages: conversationMessages,
      tools,
    });

    // Tool-use loop: the API assigns unique IDs to each tool_use block.
    // We must use those exact IDs in tool_result responses — never recreate them.
    while (apiResponse.stop_reason === 'tool_use') {
      const assistantContent = apiResponse.content;

      // Collect tool results for every tool_use block in this response
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of assistantContent) {
        if (block.type !== 'tool_use') continue;

        let toolOutput: unknown;

        try {
          if (block.name === 'get_employees') {
            const employees = await prisma.employee.findMany({
              where: { isActive: true },
              include: { constraints: true },
              orderBy: { lastName: 'asc' },
            });
            toolOutput = employees.map((e) => ({
              id: e.id,
              name: `${e.firstName} ${e.lastName}`,
              position: e.position,
              workFraction: e.workFraction,
              qualifications: e.qualifications,
            }));
          } else if (block.name === 'get_schedule') {
            const input = block.input as { startDate: string; endDate: string; planType?: string };
            if (input.planType === 'ist') {
              toolOutput = await prisma.scheduleIst.findMany({
                where: {
                  date: { gte: new Date(input.startDate), lte: new Date(input.endDate) },
                },
                include: { employee: true },
                orderBy: { date: 'asc' },
              });
            } else {
              toolOutput = await prisma.scheduleSoll.findMany({
                where: {
                  date: { gte: new Date(input.startDate), lte: new Date(input.endDate) },
                },
                include: { employee: true },
                orderBy: { date: 'asc' },
              });
            }
          } else if (block.name === 'get_absences') {
            toolOutput = await prisma.absence.findMany({
              include: { employee: true },
              orderBy: { startDate: 'asc' },
            });
          } else {
            toolOutput = { error: 'Unbekanntes Tool' };
          }
        } catch (toolError: any) {
          toolOutput = { error: toolError.message };
        }

        toolResults.push({
          type: 'tool_result',
          // CRITICAL: use the exact id returned by the API — it is guaranteed unique
          tool_use_id: block.id,
          content: JSON.stringify(toolOutput),
        });
      }

      // Append the assistant turn (with tool_use blocks) and the tool results
      conversationMessages.push({ role: 'assistant', content: assistantContent });
      conversationMessages.push({ role: 'user', content: toolResults });

      // Continue the conversation
      apiResponse = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system:
          'Du bist ein hilfreicher KI-Assistent für die Dienstplanung in einem Krankenhaus oder einer Pflegeeinrichtung. ' +
          'Du kannst Fragen zu Mitarbeitern, Dienstplänen und Abwesenheiten beantworten. ' +
          'Antworte immer auf Deutsch und sei präzise und hilfreich.',
        messages: conversationMessages,
        tools,
      });
    }

    const textBlock = apiResponse.content.find((b) => b.type === 'text');
    res.json({ reply: textBlock?.type === 'text' ? textBlock.text : '' });
  } catch (error: any) {
    console.error('Chat-Fehler:', error);
    res.status(500).json({ error: error.message || 'Chat-Fehler' });
  }
});

export default router;
