# Job Versions Module

Lets the user fork a master resume into a tailored version for a specific job opening, track the application status, and compare the tailored version against the original side by side.

---

## Concepts

| Term | Meaning |
|---|---|
| **Base resume** | The master resume the user maintains. `Resume.baseResumeId` is `undefined`. |
| **Version resume** | A copy tailored for one job. `Resume.baseResumeId` points to the master's `id`. |
| **Job application** | A record linking a base resume, a version resume, job metadata, and status. |

---

## Flow Chart

```mermaid
flowchart TD
    A([User opens Job Versions panel\nfor a base resume]) --> B[onCreateVersion called]
    B --> C[resumeDB.duplicate(baseResumeId)]
    C --> D[Set versionResume.baseResumeId\nSet versionResume.versionLabel]
    D --> E[jobApplicationDB.save\nnew JobApplication record]
    E --> F[router.push to new version]

    G([User opens Job Versions panel\nfor a version resume]) --> H[Load base resume\nvia resume.baseResumeId]
    H --> I[compareResumes\ncompute per-field diff]
    I --> J([Show field-level delta\nstatus badge, export history])

    K([User changes status]) --> L[jobApplicationDB.updateStatus]
```

---

## Front-End

### Components / Services

| File | Role |
|---|---|
| `SmartCV.Web/src/components/jobs/JobVersionsPanel.tsx` | Job context inputs, create-version button, status selector, version list, diff view |
| `SmartCV.Web/src/services/storage/jobApplications.ts` | `jobApplicationDB` — CRUD for `JobApplication` records in localStorage |
| `SmartCV.Web/src/services/storage/indexedDB.ts` | `resumeDB.duplicate()` — creates the version resume copy |

### Panel Props

```typescript
interface JobVersionsPanelProps {
  resume: Resume;
  applications: JobApplication[];
  jobContext: { jobTitle: string; company: string; jobDescription: string; jobUrl: string };
  onJobContextChange: (updates: Partial<JobVersionsPanelProps['jobContext']>) => void;
  onCreateVersion: () => Promise<void>;
  onRefresh: () => void;
  onOpenResume: (resumeId: string) => void;
}
```

### Creating a Version (EditorPage)

```typescript
// EditorPage.tsx — handleCreateVersion
const handleCreateVersion = async () => {
  const baseId = localResume.baseResumeId ?? localResume.id;
  const copy = await resumeDB.duplicate(baseId);            // deep copy, strips version fields
  const versionResume = {
    ...copy,
    baseResumeId: baseId,
    versionLabel: jobContext.jobTitle || jobContext.company || 'Version',
    targetJob: jobContext.jobTitle,
  };
  await resumeDB.save(versionResume);
  jobApplicationDB.save({
    id: crypto.randomUUID(),
    baseResumeId: baseId,
    versionResumeId: versionResume.id,
    role: jobContext.jobTitle,
    company: jobContext.company,
    jobUrl: jobContext.jobUrl,
    jobDescription: jobContext.jobDescription,
    status: 'draft',
    exportHistory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  router.push(`/editor?id=${versionResume.id}`);
};
```

### Resume Diff

The panel computes a field-level diff between the base and version resume using `compareResumes()`, which returns counts of changed sections so the user can see what was tailored.

---

## Job Application Status Lifecycle

```
draft → applied → interviewing → offer
                              → rejected
                → archived
```

Status is updated via `jobApplicationDB.updateStatus(id, status)` directly from the panel — no store layer.

---

## Data Types

```typescript
// types/jobApplication.ts
interface JobApplication {
  id: string;
  baseResumeId: string;       // master resume
  versionResumeId: string;    // tailored copy
  role: string;
  company: string;
  jobUrl?: string;
  jobDescription?: string;
  status: JobApplicationStatus;
  exportHistory: ExportHistoryItem[];  // last 20 PDF exports, prepend-only
  createdAt: string;
  updatedAt: string;
}

type JobApplicationStatus = 'draft' | 'applied' | 'interviewing' | 'offer' | 'rejected' | 'archived';

interface ExportHistoryItem {
  id: string;
  exportedAt: string;
  filename: string;
  format: 'pdf';
}
```

---

## Resume Type Fields

Version-specific fields on `Resume` that support this module:

| Field | Type | Purpose |
|---|---|---|
| `baseResumeId` | `string?` | Points to the master resume; set only on version resumes |
| `jobApplicationId` | `string?` | Links to the `JobApplication` record |
| `versionLabel` | `string?` | Human-readable label shown in the resume list |
| `targetJob` | `string?` | Pre-fills the ATS checker target and cover letter job title |

---

## Storage

Job applications are stored in localStorage (key: `smartcv:job-applications`). See [storage.md](storage.md) for the full schema and API.

When a resume is deleted, `resumeStore.deleteResume` cascades to delete all linked `JobApplication` records.
