import { Briefcase, ExternalLink, GitCompareArrows, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { JobApplication, JobApplicationStatus } from '../../types/jobApplication';
import type { Resume } from '../../types/resume';
import { jobApplicationDB } from '../../services/storage/jobApplications';
import { resumeDB } from '../../services/storage/indexedDB';
import { richTextToPlainText } from '../../lib/richText';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';

interface JobVersionsPanelProps {
  resume: Resume;
  applications: JobApplication[];
  jobContext: {
    jobTitle: string;
    company: string;
    jobDescription: string;
    jobUrl: string;
  };
  onJobContextChange: (updates: Partial<JobVersionsPanelProps['jobContext']>) => void;
  onCreateVersion: () => Promise<void>;
  onRefresh: () => void;
  onOpenResume: (resumeId: string) => void;
}

const statuses: JobApplicationStatus[] = ['draft', 'applied', 'interviewing', 'offer', 'rejected', 'archived'];

export default function JobVersionsPanel({
  resume,
  applications,
  jobContext,
  onJobContextChange,
  onCreateVersion,
  onRefresh,
  onOpenResume,
}: JobVersionsPanelProps) {
  const [creating, setCreating] = useState(false);
  const [baseResume, setBaseResume] = useState<Resume | null>(null);
  const currentApplication = applications.find(application => application.versionResumeId === resume.id);
  const relatedApplications = applications.filter(application =>
    application.baseResumeId === (resume.baseResumeId ?? resume.id) ||
    application.versionResumeId === resume.id
  );

  useEffect(() => {
    let active = true;
    const baseId = resume.baseResumeId;
    if (!baseId) {
      setBaseResume(null);
      return;
    }
    resumeDB.get(baseId).then(found => {
      if (active) setBaseResume(found ?? null);
    });
    return () => { active = false; };
  }, [resume.baseResumeId]);

  const compare = useMemo(() => baseResume ? compareResumes(baseResume, resume) : null, [baseResume, resume]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await onCreateVersion();
    } finally {
      setCreating(false);
    }
  };

  const handleStatus = (application: JobApplication, status: JobApplicationStatus) => {
    jobApplicationDB.updateStatus(application.id, status);
    onRefresh();
  };

  const handleDelete = (application: JobApplication) => {
    jobApplicationDB.delete(application.id);
    onRefresh();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-emerald-50 dark:from-indigo-950/30 dark:to-emerald-950/30">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Job Versions</h2>
          <Badge variant={currentApplication ? 'success' : 'info'} className="ml-auto">
            {currentApplication ? 'Targeted' : 'Base'}
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          <section className="space-y-3">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Create version for this job
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Role"
                value={jobContext.jobTitle}
                onChange={e => onJobContextChange({ jobTitle: e.target.value })}
              />
              <Input
                placeholder="Company"
                value={jobContext.company}
                onChange={e => onJobContextChange({ company: e.target.value })}
              />
            </div>
            <Input
              placeholder="Job URL"
              value={jobContext.jobUrl}
              onChange={e => onJobContextChange({ jobUrl: e.target.value })}
            />
            <Textarea
              placeholder="Paste the job description or notes..."
              value={jobContext.jobDescription}
              onChange={e => onJobContextChange({ jobDescription: e.target.value })}
              rows={5}
            />
            <Button className="w-full" onClick={handleCreate} loading={creating} disabled={!jobContext.jobTitle.trim() && !jobContext.company.trim()}>
              <Plus className="w-4 h-4" />
              Create Version for This Job
            </Button>
          </section>

          {compare && (
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <GitCompareArrows className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Base vs targeted
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <CompareStat label="Words" before={compare.baseWords} after={compare.versionWords} />
                <CompareStat label="Skills" before={compare.baseSkills} after={compare.versionSkills} />
                <CompareStat label="Bullets" before={compare.baseBullets} after={compare.versionBullets} />
              </div>
              <Button variant="secondary" size="sm" onClick={() => baseResume && onOpenResume(baseResume.id)}>
                Open Base Resume
              </Button>
            </section>
          )}

          <section className="space-y-2">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Applications ({relatedApplications.length})
            </p>
            {relatedApplications.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No job-specific versions yet.
              </p>
            ) : (
              relatedApplications.map(application => (
                <ApplicationCard
                  key={application.id}
                  application={application}
                  active={application.versionResumeId === resume.id}
                  onOpen={() => onOpenResume(application.versionResumeId)}
                  onStatus={status => handleStatus(application, status)}
                  onDelete={() => handleDelete(application)}
                />
              ))
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function ApplicationCard({
  application,
  active,
  onOpen,
  onStatus,
  onDelete,
}: {
  application: JobApplication;
  active: boolean;
  onOpen: () => void;
  onStatus: (status: JobApplicationStatus) => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-3 space-y-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {application.role || 'Untitled role'}
            </p>
            {active && <Badge variant="success">Open</Badge>}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {application.company || 'No company'}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={onDelete} title="Delete tracking record">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {statuses.map(status => (
          <button
            key={status}
            type="button"
            onClick={() => onStatus(status)}
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
              application.status === status
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onOpen}>Open Version</Button>
        {application.jobUrl && (
          <a
            href={application.jobUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Job
          </a>
        )}
      </div>

      <div>
        <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Export history</p>
        {application.exportHistory.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">No exports yet.</p>
        ) : (
          <div className="space-y-1">
            {application.exportHistory.slice(0, 3).map(item => (
              <p key={item.id} className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {new Date(item.exportedAt).toLocaleString()} · {item.filename}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CompareStat({ label, before, after }: { label: string; before: number; after: number }) {
  const delta = after - before;
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
      <p className="text-[11px] text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-900 dark:text-white">{before} to {after}</p>
      <p className={`text-[11px] ${delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
        {delta >= 0 ? '+' : ''}{delta}
      </p>
    </div>
  );
}

function compareResumes(base: Resume, version: Resume) {
  return {
    baseWords: countWords(resumeText(base)),
    versionWords: countWords(resumeText(version)),
    baseSkills: base.skills.flatMap(skill => skill.items).filter(Boolean).length,
    versionSkills: version.skills.flatMap(skill => skill.items).filter(Boolean).length,
    baseBullets: base.experience.flatMap(exp => exp.highlights).filter(Boolean).length,
    versionBullets: version.experience.flatMap(exp => exp.highlights).filter(Boolean).length,
  };
}

function resumeText(resume: Resume): string {
  return [
    richTextToPlainText(resume.summary),
    ...resume.experience.flatMap(exp => [exp.position, exp.company, richTextToPlainText(exp.description), ...exp.highlights.map(richTextToPlainText)]),
    ...resume.skills.flatMap(skill => [skill.category, ...skill.items]),
    ...resume.projects.flatMap(project => [project.name, richTextToPlainText(project.description), ...project.highlights.map(richTextToPlainText)]),
  ].join(' ');
}

function countWords(value: string): number {
  return value.split(/\s+/).filter(Boolean).length;
}
