import { Router, Response } from 'express';
import { prisma } from '../index.js';
import { auth, AuthRequest } from '../middleware/auth.js';
import { isGermanHoliday } from '../utils/holidays.js';

const router = Router();

router.get('/', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { month, year, employeeId } = req.query;

    const where: any = {};
    
    if (month) where.month = parseInt(month as string);
    if (year) where.year = parseInt(year as string);
    if (employeeId) where.employeeId = employeeId;

    const statistics = await prisma.statistics.findMany({
      where,
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, position: true }
        }
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }]
    });

    res.json(statistics);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Abrufen der Statistiken' });
  }
});

router.get('/employee/:employeeId', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    const istEntries = await prisma.scheduleIst.findMany({
      where: {
        employeeId: req.params.employeeId,
        date: {
          gte: startDate ? new Date(startDate as string) : undefined,
          lte: endDate ? new Date(endDate as string) : undefined
        }
      }
    });

    const stats = {
      totalShifts: istEntries.length,
      byType: {
        early: istEntries.filter(e => e.shiftType === 'FRUEH').length,
        late: istEntries.filter(e => e.shiftType === 'SPAET').length,
        night: istEntries.filter(e => e.shiftType === 'NACHT').length,
      },
      deviations: istEntries.filter(e => e.deviationReason).length
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Abrufen der Statistiken' });
  }
});

router.post('/calculate', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { month, year } = req.body;
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const employees = await prisma.employee.findMany({
      where: { isActive: true }
    });

    for (const employee of employees) {
      const istEntries = await prisma.scheduleIst.findMany({
        where: {
          employeeId: employee.id,
          date: { gte: startDate, lte: endDate }
        }
      });

      const holidayState = process.env.HOLIDAY_STATE || 'SH';
      const weekendDays = [0, 6];
      let weekendShifts = 0;
      let holidayShifts = 0;

      for (const entry of istEntries) {
        const entryDate = new Date(entry.date);
        const dayOfWeek = entryDate.getDay();
        if (weekendDays.includes(dayOfWeek)) weekendShifts++;
        if (isGermanHoliday(entryDate, holidayState)) holidayShifts++;
      }

      const hoursMap: Record<string, number> = {
        'FRUEH': 8,
        'SPAET': 8,
        'NACHT': 8
      };

      let hoursWorked = 0;
      for (const entry of istEntries) {
        hoursWorked += hoursMap[entry.shiftType] || 8;
      }

      await prisma.statistics.upsert({
        where: {
          employeeId_month_year: {
            employeeId: employee.id,
            month,
            year
          }
        },
        update: {
          totalShifts: istEntries.length,
          earlyShifts: istEntries.filter(e => e.shiftType.includes('Früh') || e.shiftType === 'FRUEH').length,
          lateShifts: istEntries.filter(e => e.shiftType.includes('Spät') || e.shiftType === 'SPAET').length,
          nightShifts: istEntries.filter(e => e.shiftType.includes('Nacht') || e.shiftType === 'NACHT').length,
          weekendShifts,
          holidayShifts,
          hoursWorked
        },
        create: {
          employeeId: employee.id,
          month,
          year,
          totalShifts: istEntries.length,
          earlyShifts: istEntries.filter(e => e.shiftType.includes('Früh') || e.shiftType === 'FRUEH').length,
          lateShifts: istEntries.filter(e => e.shiftType.includes('Spät') || e.shiftType === 'SPAET').length,
          nightShifts: istEntries.filter(e => e.shiftType.includes('Nacht') || e.shiftType === 'NACHT').length,
          weekendShifts,
          holidayShifts,
          hoursWorked
        }
      });
    }

    res.json({ message: 'Statistiken berechnet', month, year });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Berechnen der Statistiken' });
  }
});

export default router;
