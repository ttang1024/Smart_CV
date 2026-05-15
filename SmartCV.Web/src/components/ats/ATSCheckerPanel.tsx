import { AlertTriangle, CheckCircle2, FileSearch, Info, ShieldAlert, Target } from 'lucide-react';
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Resume } from '../../types/resume';
import type { AtsIssue, AtsIssueSeverity } from '../../services/ats/atsChecker';
import { runAtsCheck } from '../../services/ats/atsChecker';
import Badge from '../ui/Badge';
import ScoreRing from '../ui/ScoreRing';
import { cn } from '../../lib/utils';

interface ATSCheckerPanelProps {
  resume: Resume;
}

const severityStyle: Record<AtsIssueSeverity, {
  badge: 'success' | 'warning' | 'danger' | 'info';
  icon: ReactNode;
  label: string;
  className: string;
}> = {
  critical: {
    badge: 'danger',
    icon: <ShieldAlert className="w-4 h-4" />,
    label: 'Critical',
    className: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300',
  },
  warning: {
    badge: 'warning',
    icon: <AlertTriangle className="w-4 h-4" />,
    label: 'Warning',
    className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-300',
  },
  info: {
    badge: 'info',
    icon: <Info className="w-4 h-4" />,
    label: 'Improve',
    className: 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900/60 dark:bg-teal-950/20 dark:text-teal-300',
  },
  pass: {
    badge: 'success',
    icon: <CheckCircle2 className="w-4 h-4" />,
    label: 'Passed',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300',
  },
};

export default function ATSCheckerPanel({ resume }: ATSCheckerPanelProps) {
  const result = useMemo(() => runAtsCheck(resume), [resume]);
  const criticalCount = result.issues.filter(issue => issue.severity === 'critical').length;
  const warningCount = result.issues.filter(issue => issue.severity === 'warning').length;
  const improvementCount = result.issues.filter(issue => issue.severity === 'info').length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30">
        <div className="flex items-center gap-2">
          <FileSearch className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">ATS Checker</h2>
          <Badge variant={result.score >= 85 ? 'success' : result.score >= 70 ? 'warning' : 'danger'} className="ml-auto">
            {result.verdict}
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
            <ScoreRing score={result.score} size={74} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">ATS readiness</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{result.summary}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Stat label="Critical" value={criticalCount} tone={criticalCount ? 'danger' : 'success'} />
            <Stat label="Warnings" value={warningCount} tone={warningCount ? 'warning' : 'success'} />
            <Stat label="Improve" value={improvementCount} tone={improvementCount ? 'info' : 'success'} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Stat label="Words" value={result.stats.wordCount} />
            <Stat label="Bullets" value={result.stats.bulletCount} />
            <Stat label="With metrics" value={`${result.stats.quantifiedBulletCount}/${result.stats.bulletCount}`} />
            <Stat label="Sections" value={result.stats.sectionCount} />
          </div>

          {result.stats.missingCoreSections.length > 0 && (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/20">
              <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-2">Missing core sections</p>
              <div className="flex flex-wrap gap-1.5">
                {result.stats.missingCoreSections.map(section => (
                  <Badge key={section} variant="danger">{section}</Badge>
                ))}
              </div>
            </div>
          )}

          <section>
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Fix first
              </p>
            </div>
            <div className="space-y-2">
              {result.issues.length === 0 ? (
                <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300 text-sm">
                  No ATS risks detected.
                </div>
              ) : (
                result.issues.map(issue => <IssueCard key={issue.id} issue={issue} />)
              )}
            </div>
          </section>

          {result.passed.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                Passed checks
              </p>
              <div className="space-y-2">
                {result.passed.map(issue => <IssueCard key={issue.id} issue={issue} compact />)}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'success' | 'warning' | 'danger' | 'info' }) {
  const toneClass = {
    default: 'text-gray-900 dark:text-white',
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    danger: 'text-red-600 dark:text-red-400',
    info: 'text-teal-600 dark:text-teal-400',
  }[tone];

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-3 min-w-0">
      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{label}</p>
      <p className={cn('text-base font-semibold mt-0.5 truncate', toneClass)}>{value}</p>
    </div>
  );
}

function IssueCard({ issue, compact = false }: { issue: AtsIssue; compact?: boolean }) {
  const style = severityStyle[issue.severity];

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-3">
      <div className="flex items-start gap-2">
        <div className={cn('mt-0.5 shrink-0', issue.severity === 'pass' ? 'text-emerald-500' : 'text-current')}>
          {style.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-white min-w-0">{issue.title}</p>
            <Badge variant={style.badge} className="shrink-0">{style.label}</Badge>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{issue.detail}</p>
          {!compact && issue.fix && (
            <p className={cn('text-xs mt-2 rounded-md border px-2 py-1.5', style.className)}>
              {issue.fix}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
