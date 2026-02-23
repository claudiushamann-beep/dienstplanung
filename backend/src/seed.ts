import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Datenbank...');

  await prisma.scheduleIst.deleteMany();
  await prisma.scheduleSoll.deleteMany();
  await prisma.statistics.deleteMany();
  await prisma.shiftConfig.deleteMany();
  await prisma.shiftModel.deleteMany();
  await prisma.shiftTemplate.deleteMany();
  await prisma.absence.deleteMany();
  await prisma.constraint.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.user.deleteMany();
  await prisma.aIProvider.deleteMany();

  console.log('Erstelle Benutzer...');
  const adminPassword = await bcrypt.hash('admin123', 10);
  const planerPassword = await bcrypt.hash('planer123', 10);
  const mitarbeiterPassword = await bcrypt.hash('mitarbeiter123', 10);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@krankenhaus.de',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
    }
  });

  const planerUser = await prisma.user.create({
    data: {
      email: 'planer@krankenhaus.de',
      password: planerPassword,
      name: 'Personalplaner',
      role: 'PLANER',
    }
  });

  console.log('Erstelle Mitarbeiter...');
  const employees = await Promise.all([
    prisma.employee.create({
      data: {
        firstName: 'Dr. Andreas',
        lastName: 'Schmidt',
        position: 'Stationsarzt',
        workFraction: 1.0,
        qualifications: JSON.stringify(['Facharzt', 'Notfallmedizin']),
        user: { create: { email: 'schmidt@krankenhaus.de', password: mitarbeiterPassword, name: 'Dr. Schmidt', role: 'MITARBEITER' } }
      }
    }),
    prisma.employee.create({
      data: {
        firstName: 'Maria',
        lastName: 'Müller',
        position: 'Pflegefachkraft',
        workFraction: 1.0,
        qualifications: JSON.stringify(['Fachkraft', 'Praxisanleiter', 'Wundexperte']),
      }
    }),
    prisma.employee.create({
      data: {
        firstName: 'Thomas',
        lastName: 'Weber',
        position: 'Pflegefachkraft',
        workFraction: 0.5,
        qualifications: JSON.stringify(['Fachkraft']),
      }
    }),
    prisma.employee.create({
      data: {
        firstName: 'Anna',
        lastName: 'Fischer',
        position: 'Pflegefachkraft',
        workFraction: 1.0,
        qualifications: JSON.stringify(['Fachkraft', 'Stellv. Stationsleitung']),
      }
    }),
    prisma.employee.create({
      data: {
        firstName: 'Peter',
        lastName: 'Klein',
        position: 'Pflegehelfer',
        workFraction: 1.0,
        qualifications: JSON.stringify(['Helfer']),
      }
    }),
    prisma.employee.create({
      data: {
        firstName: 'Lisa',
        lastName: 'Braun',
        position: 'Pflegehelfer',
        workFraction: 0.5,
        qualifications: JSON.stringify(['Helfer']),
      }
    }),
    prisma.employee.create({
      data: {
        firstName: 'Julia',
        lastName: 'Hoffmann',
        position: 'Pflegefachkraft',
        workFraction: 1.0,
        qualifications: JSON.stringify(['Fachkraft', 'Wundexperte']),
      }
    }),
    prisma.employee.create({
      data: {
        firstName: 'Max',
        lastName: 'Bauer',
        position: 'Pflegehelfer',
        workFraction: 0.75,
        qualifications: JSON.stringify(['Helfer']),
      }
    }),
  ]);

  console.log('Erstelle Einschränkungen...');
  await Promise.all([
    prisma.constraint.create({
      data: {
        employeeId: employees[2].id,
        type: 'MAX_SHIFTS_PER_WEEK',
        value: '3',
        description: 'Maximal 3 Dienste pro Woche (50% Stelle)',
      }
    }),
    prisma.constraint.create({
      data: {
        employeeId: employees[1].id,
        type: 'CONFLICT',
        value: employees[4].id,
        description: 'Kann keinen Dienst mit Peter Klein machen',
      }
    }),
    prisma.constraint.create({
      data: {
        employeeId: employees[5].id,
        type: 'UNAVAILABLE_SHIFT_TYPE',
        value: 'NACHT',
        description: 'Keine Nachtschichten möglich',
      }
    }),
    prisma.constraint.create({
      data: {
        employeeId: employees[7].id,
        type: 'UNAVAILABLE_DAYS',
        value: 'MONDAY,TUESDAY,WEDNESDAY',
        description: 'Mo-Mi nicht verfügbar (andere Verpflichtung)',
      }
    }),
    prisma.constraint.create({
      data: {
        employeeId: employees[5].id,
        type: 'MAX_SHIFTS_PER_WEEK',
        value: '3',
        description: 'Maximal 3 Dienste pro Woche (50% Stelle)',
      }
    }),
    prisma.constraint.create({
      data: {
        employeeId: employees[7].id,
        type: 'MAX_SHIFTS_PER_WEEK',
        value: '4',
        description: 'Maximal 4 Dienste pro Woche (75% Stelle)',
      }
    }),
    prisma.constraint.create({
      data: {
        employeeId: employees[0].id,
        type: 'PREFERRED_SHIFTS',
        value: 'FRUEH,SPAET',
        description: 'Bevorzugt Früh- und Spätschichten',
      }
    }),
  ]);

  console.log('Erstelle Urlaube...');
  const now = new Date();
  const year = now.getFullYear();
  
  await Promise.all([
    prisma.absence.create({
      data: {
        employeeId: employees[1].id,
        type: 'VACATION',
        startDate: new Date(year, 2, 15),
        endDate: new Date(year, 2, 22),
        status: 'APPROVED',
        note: 'Jährlicher Urlaub',
      }
    }),
    prisma.absence.create({
      data: {
        employeeId: employees[3].id,
        type: 'VACATION',
        startDate: new Date(year, 3, 1),
        endDate: new Date(year, 3, 5),
        status: 'APPROVED',
        note: 'Kurzurlaub',
      }
    }),
    prisma.absence.create({
      data: {
        employeeId: employees[2].id,
        type: 'VACATION',
        startDate: new Date(year, 4, 20),
        endDate: new Date(year, 4, 20),
        status: 'REQUESTED',
        note: 'Brückentag',
      }
    }),
    prisma.absence.create({
      data: {
        employeeId: employees[6].id,
        type: 'TRAINING',
        startDate: new Date(year, 1, 10),
        endDate: new Date(year, 1, 12),
        status: 'APPROVED',
        note: 'Fortbildung Wundmanagement',
      }
    }),
  ]);

  console.log('Erstelle Dienstplanmodell...');
  const shiftModel = await prisma.shiftModel.create({
    data: {
      name: 'Standard Krankenstation',
      description: '3-Schicht-System mit reduzierter Wochenendbesetzung',
      config: JSON.stringify({
        notes: 'Berücksichtigt Mindestbesetzung und Qualifikationsanforderungen'
      }),
      shifts: {
        create: [
          {
            name: 'Früh',
            startTime: '06:00',
            endTime: '14:00',
            minStaff: 3,
            minQualified: 1,
            days: 'Mo-Fr',
            color: '#22C55E'
          },
          {
            name: 'Früh WE',
            startTime: '06:00',
            endTime: '14:00',
            minStaff: 2,
            minQualified: 1,
            days: 'Sa-So',
            color: '#16A34A'
          },
          {
            name: 'Spät',
            startTime: '14:00',
            endTime: '22:00',
            minStaff: 2,
            minQualified: 1,
            days: 'Mo-Fr',
            color: '#F59E0B'
          },
          {
            name: 'Spät WE',
            startTime: '14:00',
            endTime: '22:00',
            minStaff: 2,
            minQualified: 1,
            days: 'Sa-So',
            color: '#D97706'
          },
          {
            name: 'Nacht',
            startTime: '22:00',
            endTime: '06:00',
            minStaff: 2,
            minQualified: 1,
            days: 'Mo-So',
            color: '#6366F1'
          },
        ]
      }
    },
    include: { shifts: true }
  });

  console.log('Erstelle Soll-Dienstplan (2 Wochen)...');
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - startDate.getDay() + 1);
  
  const scheduleEntries = [];
  
  for (let day = 0; day < 14; day++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + day);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const fruehKey = isWeekend ? 'Früh WE' : 'Früh';
    const spaetKey = isWeekend ? 'Spät WE' : 'Spät';

    const availableEmployees = employees.filter(e => {
      if (e.id === employees[7].id && (dayOfWeek === 1 || dayOfWeek === 2 || dayOfWeek === 3)) {
        return false;
      }
      return true;
    });

    const fruehCount = isWeekend ? 2 : 3;
    const spaetCount = 2;
    const nachtCount = 2;

    const shuffledFrueh = availableEmployees.filter(e => e.workFraction >= 0.5).slice(0, fruehCount + 2);
    const shuffledSpaet = availableEmployees.filter(e => e.workFraction >= 0.5).slice(0, spaetCount + 2);
    const shuffledNacht = availableEmployees.filter(e => 
      e.workFraction >= 0.5 && e.id !== employees[5].id
    ).slice(0, nachtCount + 2);

    for (let i = 0; i < fruehCount && i < shuffledFrueh.length; i++) {
      scheduleEntries.push({
        employeeId: shuffledFrueh[i].id,
        date: new Date(date),
        shiftType: fruehKey,
        shiftModelId: shiftModel.id
      });
    }

    for (let i = 0; i < spaetCount && i < shuffledSpaet.length; i++) {
      const emp = shuffledSpaet[(i + 1) % shuffledSpaet.length];
      scheduleEntries.push({
        employeeId: emp.id,
        date: new Date(date),
        shiftType: spaetKey,
        shiftModelId: shiftModel.id
      });
    }

    for (let i = 0; i < nachtCount && i < shuffledNacht.length; i++) {
      const emp = shuffledNacht[(i + 2) % shuffledNacht.length];
      scheduleEntries.push({
        employeeId: emp.id,
        date: new Date(date),
        shiftType: 'Nacht',
        shiftModelId: shiftModel.id
      });
    }
  }

  for (const entry of scheduleEntries) {
    try {
      await prisma.scheduleSoll.create({ data: entry });
    } catch {}
  }

  console.log('Erstelle Ist-Dienstplan mit Abweichungen...');
  const istEntries: Array<{ employeeId: string; date: Date; shiftType: string; shiftModelId: string; deviationReason: string | null }> = scheduleEntries.slice(0, Math.floor(scheduleEntries.length * 0.8)).map(entry => ({
    ...entry,
    deviationReason: null
  }));

  istEntries.push({
    employeeId: employees[4].id,
    date: new Date(startDate.getTime() + 2 * 24 * 60 * 60 * 1000),
    shiftType: 'Früh',
    shiftModelId: shiftModel.id,
    deviationReason: 'Maria Müller krank - Peter Klein eingesprungen'
  });

  for (const entry of istEntries) {
    try {
      await prisma.scheduleIst.create({ data: entry });
    } catch {}
  }

  console.log('Erstelle Statistiken...');
  for (const employee of employees) {
    await prisma.statistics.create({
      data: {
        employeeId: employee.id,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        totalShifts: Math.floor(Math.random() * 15) + 10,
        earlyShifts: Math.floor(Math.random() * 8) + 3,
        lateShifts: Math.floor(Math.random() * 6) + 2,
        nightShifts: Math.floor(Math.random() * 4) + 1,
        weekendShifts: Math.floor(Math.random() * 4),
        hoursWorked: Math.floor(Math.random() * 40) + 80,
      }
    });
  }

  console.log('Erstelle KI-Provider...');
  await prisma.aIProvider.createMany({
    data: [
      {
        name: 'OpenAI GPT-4',
        type: 'openai',
        apiKey: process.env.OPENAI_API_KEY || '',
        isActive: true,
        isDefault: true,
      },
      {
        name: 'Anthropic Claude',
        type: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY || '',
        isActive: true,
        isDefault: false,
      },
      {
        name: 'Google Gemini',
        type: 'google',
        apiKey: process.env.GOOGLE_API_KEY || '',
        isActive: true,
        isDefault: false,
      },
      {
        name: 'Ollama (Lokal)',
        type: 'ollama',
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        isActive: true,
        isDefault: false,
      },
    ]
  });

  console.log('\n=== Seeding abgeschlossen! ===');
  console.log('\nBenutzer:');
  console.log('  Admin: admin@krankenhaus.de / admin123');
  console.log('  Planer: planer@krankenhaus.de / planer123');
  console.log('\nMitarbeiter erstellt: 8');
  console.log('Einschränkungen erstellt: 7');
  console.log('Urlaube erstellt: 4');
  console.log('Dienstplanmodell: 1');
  console.log('Soll-Plan Einträge:', scheduleEntries.length);
  console.log('Ist-Plan Einträge:', istEntries.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
