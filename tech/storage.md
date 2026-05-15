# Storage Module

All user data lives entirely in the browser — no server-side database. Three storage mechanisms are used:

| Mechanism | What's stored | Why |
|---|---|---|
| **IndexedDB** (via `idb`) | `Resume` objects, `OptimizationSession` objects | Structured, queryable, handles large JSON blobs |
| **localStorage** — AI settings | AI provider settings (keys, models, active provider) | Simple key-value, survives tab close, never leaves browser |
| **localStorage** — Job applications | `JobApplication` objects (key: `smartcv:job-applications`) | Lightweight; no blob storage needed |
| **localStorage** — Revision history | Per-resume undo snapshots (keys: `smartcv:resume-history:<resumeId>`) | Best-effort; capped at 30 entries per resume |

---

## Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────────────┐
│                              Browser                                      │
│                                                                           │
│  ┌──────────────────┐          ┌──────────────────────────────────────┐  │
│  │  useResumeStore  │          │          useSettingsStore            │  │
│  │  (Zustand)       │          │          (Zustand +                  │  │
│  │                  │          │           subscribeWithSelector)      │  │
│  └────────┬─────────┘          └───────────────┬──────────────────────┘  │
│           │ async calls                         │ sync get/set            │
│  ┌────────▼──────────────────┐    ┌─────────────▼──────────────────────┐ │
│  │  indexedDB.ts             │    │  localStorage                      │ │
│  │  resumeDB  optimizationDB │    │  settingsStorage  (AI settings)    │ │
│  └────────┬──────────────────┘    │  jobApplicationDB (applications)   │ │
│           │                       │  revisionHistory  (undo snapshots) │ │
│  ┌────────▼──────────────────┐    └────────────────────────────────────┘ │
│  │  IndexedDB "SmartCV" v1   │                                           │
│  │  ├─ resumes store         │                                           │
│  │  └─ optimizations store   │                                           │
│  └───────────────────────────┘                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Resume Type

**File:** `SmartCV.Web/src/types/resume.ts`

```typescript
interface Resume {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;

  // Job-version fields (set when a resume is a tailored copy)
  baseResumeId?: string;       // id of the master resume this was forked from
  jobApplicationId?: string;   // id of the linked JobApplication
  versionLabel?: string;       // human label for this version

  // Section customisation
  sectionOrder?: ResumeSection[];
  sectionTitles?: Partial<Record<ResumeSection, string>>;

  personalInfo: PersonalInfo;
  summary: string;
  coreHighlights: CoreHighlight[];
  experience: Experience[];
  education: Education[];
  skills: Skill[];
  projects: Project[];
  certifications: Certification[];
  languages: Language[];
  interests: Interest[];
  achievements: Achievement[];
  referees: Referee[];
  targetJob?: string;          // aids ATS checker keyword suggestions
}

type ResumeSection =
  | 'personalInfo' | 'summary' | 'coreHighlights'
  | 'experience' | 'education' | 'skills' | 'projects'
  | 'certifications' | 'languages' | 'interests' | 'achievements' | 'referees';
```

---

## IndexedDB Schema

**File:** `SmartCV.Web/src/services/storage/indexedDB.ts`

```
Database: "SmartCV"   Version: 1
│
├── Object Store: resumes
│   keyPath: "id"  (string UUID)
│   Indexes:
│   └── by-updated  →  updatedAt  (for sorted list view)
│
└── Object Store: optimizations
    keyPath: "id"  (string UUID)
    Indexes:
    ├── by-resume  →  resumeId   (fetch all sessions for a resume)
    └── by-created →  createdAt  (chronological sort)
```

### Resume Operations

```typescript
// indexedDB.ts — resumeDB
export const resumeDB = {
  async getAll(): Promise<Resume[]> { ... },   // sorted by updatedAt desc
  async get(id: string): Promise<Resume | undefined> { ... },
  async save(resume: Resume): Promise<void> { ... },  // upsert by id

  // Cascade-deletes linked optimization sessions
  async delete(id: string): Promise<void> {
    await db.delete('resumes', id);
    const opts = await db.getAllFromIndex('optimizations', 'by-resume', id);
    // bulk-delete in a single transaction
  },

  // Copies resume, clearing job-version fields so the copy is standalone
  async duplicate(id: string): Promise<Resume | null> {
    const copy: Resume = {
      ...original,
      id: crypto.randomUUID(),
      name: `${original.name} (Copy)`,
      baseResumeId: undefined,      // strip version linkage
      jobApplicationId: undefined,
      versionLabel: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await resumeDB.save(copy);
    return copy;
  }
};
```

### Optimization Operations

```typescript
// indexedDB.ts — optimizationDB
export const optimizationDB = {
  async getByResume(resumeId: string): Promise<OptimizationSession[]> { ... },
  async get(id: string): Promise<OptimizationSession | undefined> { ... },
  async save(session: OptimizationSession): Promise<void> { ... },
  async delete(id: string): Promise<void> { ... }
};
```

---

## localStorage — AI Settings

**File:** `SmartCV.Web/src/services/storage/localStorage.ts`

Key: `"smartcv_ai_settings"` → `AISettings` JSON

```
{
  activeProvider: AIProviderType,
  useAI: boolean,
  providers: {
    [provider: AIProviderType]: { apiKey: string, model: string }
  }
}
```

API keys are stored in plain text in localStorage — they never leave the browser.

---

## localStorage — Job Applications

**File:** `SmartCV.Web/src/services/storage/jobApplications.ts`

Key: `"smartcv:job-applications"` → `JobApplication[]` JSON (all applications in one array).

```typescript
interface JobApplication {
  id: string;
  baseResumeId: string;       // master resume the version was forked from
  versionResumeId: string;    // tailored resume created for this application
  role: string;
  company: string;
  jobUrl?: string;
  jobDescription?: string;
  status: 'draft' | 'applied' | 'interviewing' | 'offer' | 'rejected' | 'archived';
  exportHistory: ExportHistoryItem[];  // last 20 PDF exports
  createdAt: string;
  updatedAt: string;
}

interface ExportHistoryItem {
  id: string;
  exportedAt: string;
  filename: string;
  format: 'pdf';
}
```

```typescript
// jobApplications.ts — jobApplicationDB
export const jobApplicationDB = {
  getAll(): JobApplication[] { ... },              // sorted by updatedAt desc
  get(id: string): JobApplication | undefined { ... },
  getByResume(resumeId: string): JobApplication[], // matches baseResumeId OR versionResumeId
  save(application: JobApplication): JobApplication,
  updateStatus(id: string, status): JobApplication | undefined,
  addExport(id: string, item: ExportHistoryItem): JobApplication | undefined,
  delete(id: string): void,
};
```

---

## localStorage — Revision History

**File:** `SmartCV.Web/src/services/storage/revisionHistory.ts`

One key per resume: `"smartcv:resume-history:<resumeId>"` → `ResumeRevision[]` JSON.  
Capped at **30 entries** per resume. Each entry stores a full deep copy of the `Resume` object.

```typescript
interface ResumeRevision {
  id: string;
  resumeId: string;
  label: string;       // e.g. "Edit", or a section-specific label
  createdAt: string;
  resume: Resume;      // deep clone at the time of snapshot
}
```

```typescript
// revisionHistory.ts — revisionHistory
export const revisionHistory = {
  get(resumeId: string): ResumeRevision[],
  push(resume: Resume, label: string, existing?): ResumeRevision[],   // prepend + cap at 30
  replace(resumeId: string, revisions: ResumeRevision[]): ResumeRevision[],
  clear(resumeId: string): void,
};
```

Revision history is **best-effort** — `safeWrite` silently swallows `localStorage` quota errors.

---

## Zustand State Layer

### resumeStore

**File:** `SmartCV.Web/src/store/resumeStore.ts`

Acts as an in-memory cache over IndexedDB. All mutations write through to IndexedDB atomically.

```typescript
// resumeStore.ts — key actions
saveResume: async (resume: Resume) => {
  const updated = { ...resume, updatedAt: new Date().toISOString() };
  await resumeDB.save(updated);
  set(state => ({
    resumes: state.resumes.map(r => r.id === updated.id ? updated : r),
    currentResume: state.currentResume?.id === updated.id ? updated : state.currentResume
  }));
},

deleteResume: async (id: string) => {
  await resumeDB.delete(id);                      // cascade deletes optimizations in IndexedDB
  jobApplicationDB.getByResume(id).forEach(       // cascade deletes related job applications
    app => jobApplicationDB.delete(app.id)
  );
  set(state => ({
    resumes: state.resumes.filter(r => r.id !== id),
    currentResume: state.currentResume?.id === id ? null : state.currentResume
  }));
},
```

### settingsStore

**File:** `SmartCV.Web/src/store/settingsStore.ts`

Uses `subscribeWithSelector` middleware. Every mutation calls `settingsStorage.saveAISettings()` synchronously.

---

## EditorPage — Undo / Redo

**File:** `SmartCV.Web/src/views/EditorPage.tsx`

Undo/redo is managed by the editor component using `revisionHistory` as the persistent backing store. Snapshots are coalesced — a new entry is only pushed if ≥ 1200 ms have passed since the last push (`HISTORY_COALESCE_MS`), or when a forced-history action occurs (e.g. section reorder).

```
undoStack  ←  revisionHistory.push(current, label)   // on each significant change
redoStack  ←  managed in-memory only (not persisted)
```

---

## Data Flow Diagram

```
Component action                   Store / Service        Persistence
───────────────────────────────────────────────────────────────────────────
createResume()          ──►  resumeStore          ──►  resumeDB.save()
saveResume(resume)      ──►  resumeStore          ──►  resumeDB.save()
deleteResume(id)        ──►  resumeStore          ──►  resumeDB.delete() + cascade opts
                                                  ──►  jobApplicationDB.delete() per app
loadResumes()           ◄──  resumeStore          ◄──  resumeDB.getAll()
loadResume(id)          ◄──  resumeStore          ◄──  resumeDB.get(id)
saveOptimization(s)     ──►  resumeStore          ──►  optimizationDB.save()
loadOptimizations(id)   ◄──  resumeStore          ◄──  optimizationDB.getByResume()
setAPIKey(p, key)       ──►  settingsStore        ──►  localStorage (sync)
getActiveConfig()       ◄──  settingsStore        ◄──  in-memory (loaded from localStorage on init)
saveApplication(a)      ──►  jobApplicationDB     ──►  localStorage (sync)
pushRevision(r, label)  ──►  revisionHistory      ──►  localStorage (sync, capped 30)
```
