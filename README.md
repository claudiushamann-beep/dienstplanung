# KI-gestützte Dienstplanung

Eine Web-Anwendung für die intelligente Dienstplanung im Krankenhaus- und Pflegebereich mit KI-Unterstützung.

## Features

- **KI-gestützte Dienstplan-Generierung** - Beschreiben Sie Ihr Dienstplanmodell in natürlicher Sprache, die KI erstellt daraus eine strukturierte Tabelle
- **Multi-Provider KI-Unterstützung** - OpenAI, Anthropic (Claude), Google (Gemini), Ollama (lokal)
- **Mitarbeiterverwaltung** mit:
  - Qualifikationen
  - Arbeitszeitmodellen (Vollzeit, Teilzeit, 50%)
  - Einschränkungen (Konflikte, max. Dienste, nicht verfügbare Tage/Schichten)
- **Urlaubsverwaltung** mit Genehmigungsworkflow
- **Soll-Plan vs. Ist-Plan** mit Abweichungsgründen
- **Statistiken** pro Mitarbeiter und Zeitraum
- **Rollenbasierte Zugriffssteuerung** (Admin, Planer, Mitarbeiter)

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS + Zustand
- **Backend**: Node.js + Express + TypeScript
- **Datenbank**: SQLite (Entwicklung) / PostgreSQL (Produktion)
- **ORM**: Prisma

## Installation

### Voraussetzungen

- Node.js 18+
- npm oder yarn

### Backend einrichten

```bash
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

### Frontend einrichten

```bash
cd frontend
npm install
npm run dev
```

### Umgebungsvariablen

Erstellen Sie eine `.env` Datei im Backend-Verzeichnis:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key"
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
GOOGLE_API_KEY="..."
OLLAMA_BASE_URL="http://localhost:11434"
```

## Test-Zugänge

Nach dem Seeding stehen folgende Test-Zugänge zur Verfügung:

- **Admin**: admin@krankenhaus.de / admin123
- **Planer**: planer@krankenhaus.de / planer123

## Beispieldaten

Nach dem Seeding sind folgende Daten verfügbar:

- 8 Mitarbeiter (Ärzte, Pflegefachkräfte, Pflegehelfer)
- 7 Einschränkungen (Konflikte, max. Dienste, etc.)
- 4 Urlaube/Abwesenheiten
- 1 Dienstplanmodell mit 5 Schichtarten
- 94 Soll-Plan Einträge (2 Wochen)
- 76 Ist-Plan Einträge mit Abweichungen

## Verwendung

### 1. Dienstplanmodell erstellen

Gehen Sie zu "Dienstplanmodell" und beschreiben Sie Ihr Modell:

```
Wir haben eine Krankenstation mit 3 Schichten: Früh (6-14 Uhr), 
Spät (14-22 Uhr) und Nacht (22-6 Uhr). Die Frühschicht braucht 
tagsüber 3 Mitarbeiter (min. 1 Fachkraft), am Wochenende 2.
```

Die KI erstellt daraus eine strukturierte Tabelle, die Sie anpassen können.

### 2. Mitarbeiter anlegen

Fügen Sie Mitarbeiter hinzu mit:
- Name und Position
- Arbeitszeitanteil (100%, 75%, 50%)
- Qualifikationen
- Einschränkungen (Konflikte mit Kollegen, max. Dienste, etc.)
- Urlaub

### 3. KI-Dienstplan generieren

Im Soll-Plan:
1. Wählen Sie ein Dienstplanmodell
2. Klicken Sie "KI generieren"
3. Die KI berücksichtigt automatisch alle Einschränkungen und Urlaube

### 4. Ist-Plan pflegen

Nach dem Kopieren des Soll-Plans in den Ist-Plan können Sie:
- Abweichungsgründe dokumentieren
- Krankheiten und Tausch erfassen

### 5. Statistiken

In der Statistik-Ansicht sehen Sie:
- Dienstanzahl pro Mitarbeiter
- Schichtverteilung
- Wochenenddienste
- Gearbeitete Stunden

## KI-Provider konfigurieren

Unter "Einstellungen" können Sie KI-Provider konfigurieren:

### OpenAI
- API-Key von platform.openai.com
- Empfohlen: GPT-4

### Anthropic (Claude)
- API-Key von console.anthropic.com
- Empfohlen: Claude 3 Sonnet

### Google (Gemini)
- API-Key von makersuite.google.com
- Gemini Pro ist kostenlos verfügbar

### Ollama (Lokal)
- Installation: ollama.ai
- Base URL: http://localhost:11434
- Kein API-Key erforderlich

## API-Endpunkte

### Auth
- `POST /api/auth/login` - Anmeldung
- `POST /api/auth/register` - Registrierung
- `GET /api/auth/me` - Aktueller Benutzer

### Mitarbeiter
- `GET /api/employees` - Alle Mitarbeiter
- `GET /api/employees/:id` - Mitarbeiter-Details
- `POST /api/employees` - Erstellen
- `PUT /api/employees/:id` - Aktualisieren
- `DELETE /api/employees/:id` - Löschen

### Einschränkungen
- `GET /api/constraints/employee/:id` - Einschränkungen eines Mitarbeiters
- `POST /api/constraints` - Erstellen
- `PUT /api/constraints/:id` - Aktualisieren
- `DELETE /api/constraints/:id` - Löschen

### Urlaube
- `GET /api/absences` - Alle Abwesenheiten
- `GET /api/absences/employee/:id` - Abwesenheiten eines Mitarbeiters
- `POST /api/absences` - Erstellen
- `PUT /api/absences/:id` - Aktualisieren
- `DELETE /api/absences/:id` - Löschen

### Dienstplanmodelle
- `GET /api/shift-models` - Alle Modelle
- `GET /api/shift-models/:id` - Modell-Details
- `POST /api/shift-models` - Erstellen
- `PUT /api/shift-models/:id` - Aktualisieren
- `DELETE /api/shift-models/:id` - Löschen

### Dienstpläne
- `GET /api/schedules/soll` - Soll-Plan
- `GET /api/schedules/ist` - Ist-Plan
- `POST /api/schedules/soll` - Soll-Einträge erstellen
- `POST /api/schedules/ist` - Ist-Einträge erstellen
- `POST /api/schedules/copy-soll-to-ist` - Kopieren

### KI
- `GET /api/ai/providers` - Alle KI-Provider
- `POST /api/ai/providers` - Provider erstellen
- `PUT /api/ai/providers/:id` - Provider aktualisieren
- `DELETE /api/ai/providers/:id` - Provider löschen
- `POST /api/ai/explain-model` - Dienstplanmodell aus Beschreibung erstellen
- `POST /api/ai/generate-schedule` - Dienstplan generieren

## Lizenz

MIT
