import { LineChart, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Resume } from '../../types/resume';
import type { JobApplication } from '../../types/jobApplication';
import type { ScoreSnapshot } from '../../types/scoreSnapshot';
import { runAtsCheck } from '../../services/ats/atsChecker';
import { resumeDB, scoreSnapshotDB } from '../../services/storage/indexedDB';
import Badge from '../ui/Badge';
import ScoreRing from '../ui/ScoreRing';
import { cn } from '../../lib/utils';

interface ScoreHistoryPanelProps {
  resume: Resume;
  applications: JobApplication[];
  onOpenResume: (resumeId: string) => void;
}

interface SiblingSummary {
  resumeId: string;
  name: string;
  status?: JobApplication['status'];
  score: number | null;
}

export default function ScoreHistoryPanel({ resume, applications, onOpenResume }: ScoreHistoryPanelProps) {
  const current = useMemo(() => runAtsCheck(resume), [resume]);
  const [snapshots, setSnapshots] = useState<ScoreSnapshot[]>([]);
  const [snapshotsResumeId, setSnapshotsResumeId] = useState<string | null>(null);
  const [siblings, setSiblings] = useState<SiblingSummary[]>([]);
  const loadingHistory = snapshotsResumeId !== resume.id;

  useEffect(() => {
    let active = true;
    scoreSnapshotDB.getByResume(resume.id).then(result => {
      if (!active) return;
      setSnapshots(result);
      setSnapshotsResumeId(resume.id);
    });
    return () => { active = false; };
  }, [resume.id]);

  const relatedApplications = useMemo(() => applications.filter(application =>
    application.baseResumeId === (resume.baseResumeId ?? resume.id) ||
    application.versionResumeId === resume.id
  ), [applications, resume.baseResumeId, resume.id]);

  useEffect(() => {
    let active = true;
    const siblingIds = new Set<string>();
    relatedApplications.forEach(application => {
      siblingIds.add(application.baseResumeId);
      siblingIds.add(application.versionResumeId);
    });
    siblingIds.delete(resume.id);

    Promise.all([...siblingIds].map(async (id): Promise<SiblingSummary | null> => {
      const [siblingResume, siblingSnapshots] = await Promise.all([
        resumeDB.get(id),
        scoreSnapshotDB.getByResume(id),
      ]);
      if (!siblingResume) return null;
      const status = relatedApplications.find(application => application.versionResumeId === id)?.status;
      const last = siblingSnapshots.at(-1);
      return {
        resumeId: id,
        name: siblingResume.versionLabel || siblingResume.name,
        status,
        score: last ? last.score : null,
      };
    })).then(results => {
      if (active) setSiblings(results.filter((result): result is SiblingSummary => result !== null));
    });

    return () => { active = false; };
  }, [relatedApplications, resume.id]);

  const first = snapshots[0];
  const delta = first ? current.score - first.score : 0;
  const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const trendClass =
    delta > 0 ? 'text-emerald-600 dark:text-emerald-400' :
    delta < 0 ? 'text-red-600 dark:text-red-400' :
    'text-gray-500 dark:text-gray-400';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-lime-50 to-teal-50 dark:from-lime-950/30 dark:to-teal-950/30">
        <div className="flex items-center gap-2">
          <LineChart className="w-4 h-4 text-lime-600 dark:text-lime-400" />
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Insights</h2>
          {first && (
            <Badge variant={delta > 0 ? 'success' : delta < 0 ? 'danger' : 'info'} className="ml-auto">
              {delta >= 0 ? '+' : ''}{delta} since first save
            </Badge>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
            <ScoreRing score={current.score} size={74} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Current ATS score</p>
              <p className={cn('text-xs mt-1 flex items-center gap-1', trendClass)}>
                <TrendIcon className="w-3.5 h-3.5 shrink-0" />
                {first
                  ? `${delta >= 0 ? '+' : ''}${delta} pts over ${snapshots.length} saved edit${snapshots.length === 1 ? '' : 's'}`
                  : 'Keep editing to build a history'}
              </p>
            </div>
          </div>

          <section>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
              Score over time
            </p>
            {loadingHistory ? (
              <div className="h-24 rounded-lg border border-gray-200 dark:border-gray-800 animate-pulse bg-gray-100 dark:bg-gray-900" />
            ) : snapshots.length < 2 ? (
              <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
                Not enough saved history yet — make a few edits and save to start charting your progress.
              </div>
            ) : (
              <ScoreSparkline snapshots={snapshots} />
            )}
          </section>

          {siblings.length > 0 && (
            <section className="space-y-2">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Compare with other versions
              </p>
              <div className="space-y-2">
                {siblings.map(sibling => (
                  <button
                    key={sibling.resumeId}
                    type="button"
                    onClick={() => onOpenResume(sibling.resumeId)}
                    className="w-full flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-3 text-left hover:border-lime-300 dark:hover:border-lime-700 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{sibling.name}</p>
                      {sibling.status && (
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 capitalize">{sibling.status}</span>
                      )}
                    </div>
                    <span className={cn(
                      'text-sm font-semibold shrink-0',
                      sibling.score === null ? 'text-gray-400 dark:text-gray-500' :
                      sibling.score >= 75 ? 'text-emerald-600 dark:text-emerald-400' :
                      sibling.score >= 50 ? 'text-amber-600 dark:text-amber-400' :
                      'text-red-600 dark:text-red-400'
                    )}>
                      {sibling.score === null ? '—' : `${sibling.score}%`}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreSparkline({ snapshots }: { snapshots: ScoreSnapshot[] }) {
  const width = 100;
  const height = 36;
  const points = snapshots
    .map((snapshot, i) => {
      const x = snapshots.length === 1 ? 0 : (i / (snapshots.length - 1)) * width;
      const y = height - (snapshot.score / 100) * height;
      return `${x},${y}`;
    })
    .join(' ');

  const last = snapshots[snapshots.length - 1];
  const color = last.score >= 75 ? '#10b981' : last.score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-16" preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 mt-1">
        <span>{new Date(snapshots[0].createdAt).toLocaleDateString()}</span>
        <span>{new Date(last.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
