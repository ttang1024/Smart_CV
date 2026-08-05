import { Briefcase, FileSearch, FileText, Languages, LineChart, Mail, MessageSquareText, Mic, Sparkles, SpellCheck } from 'lucide-react';
import type { Resume } from '../../types/resume';
import type { OptimizationSession, OptimizationSuggestion } from '../../types/ai';
import type { JobApplication } from '../../types/jobApplication';
import AIOptimizationPanel from '../../components/ai/AIOptimizationPanel';
import ATSCheckerPanel from '../../components/ats/ATSCheckerPanel';
import CoverLetterPanel from '../../components/cover/CoverLetterPanel';
import InterviewPrepPanel from '../../components/interview/InterviewPrepPanel';
import MockInterviewPanel from '../../components/interview/MockInterviewPanel';
import JobVersionsPanel from '../../components/jobs/JobVersionsPanel';
import TranslatePanel from '../../components/translate/TranslatePanel';
import FollowUpEmailPanel from '../../components/email/FollowUpEmailPanel';
import ProofreadPanel from '../../components/proofread/ProofreadPanel';
import ScoreHistoryPanel from '../../components/insights/ScoreHistoryPanel';

export type PanelId = 'ai' | 'ats' | 'cover' | 'interview' | 'mock' | 'jobs' | 'translate' | 'email' | 'proofread' | 'insights';

export interface EditorJobContext {
  jobTitle: string;
  company: string;
  jobDescription: string;
  jobUrl: string;
}

// Single source of truth for the side-panel tab strip. Full Tailwind class
// strings (no runtime interpolation) so the active colours survive purge.
const PANEL_TABS: { id: PanelId; label: string; Icon: typeof Sparkles; activeClass: string }[] = [
  { id: 'ai', label: 'AI Optimize', Icon: Sparkles, activeClass: 'bg-emerald-500' },
  { id: 'ats', label: 'ATS', Icon: FileSearch, activeClass: 'bg-teal-500' },
  { id: 'cover', label: 'Cover Letter', Icon: FileText, activeClass: 'bg-sky-500' },
  { id: 'interview', label: 'Interview', Icon: MessageSquareText, activeClass: 'bg-violet-500' },
  { id: 'mock', label: 'Mock', Icon: Mic, activeClass: 'bg-rose-500' },
  { id: 'jobs', label: 'Jobs', Icon: Briefcase, activeClass: 'bg-indigo-500' },
  { id: 'translate', label: 'Translate', Icon: Languages, activeClass: 'bg-amber-500' },
  { id: 'email', label: 'Email', Icon: Mail, activeClass: 'bg-cyan-500' },
  { id: 'proofread', label: 'Proofread', Icon: SpellCheck, activeClass: 'bg-fuchsia-500' },
  { id: 'insights', label: 'Insights', Icon: LineChart, activeClass: 'bg-lime-600' },
];

interface SidePanelProps {
  width: number;
  sidePanel: PanelId;
  onSelectPanel: (panel: PanelId) => void;
  resume: Resume;
  jobContext: EditorJobContext;
  onJobContextChange: (updates: Partial<EditorJobContext>) => void;
  applications: JobApplication[];
  onApplySuggestion: (suggestion: OptimizationSuggestion) => void;
  onSessionSaved: (session: OptimizationSession) => void | Promise<void>;
  onCreateVersion: () => Promise<void>;
  onRefreshJobs: () => void;
  onOpenResume: (resumeId: string) => void;
  onApplyProofreadFixes: (fixes: { fieldKey: string; correctedText: string }[]) => number;
}

export function SidePanel({
  width,
  sidePanel,
  onSelectPanel,
  resume,
  jobContext,
  onJobContextChange,
  applications,
  onApplySuggestion,
  onSessionSaved,
  onCreateVersion,
  onRefreshJobs,
  onOpenResume,
  onApplyProofreadFixes,
}: SidePanelProps) {
  return (
    <div style={{ width: `${width}px` }} className="bg-white dark:bg-gray-950 flex flex-col overflow-hidden shrink-0">
      {/* Tool tabs */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 dark:border-gray-800 shrink-0">
        {PANEL_TABS.map(({ id, label, Icon, activeClass }) => (
          <button
            key={id}
            onClick={() => onSelectPanel(id)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              sidePanel === id
                ? `${activeClass} text-white shadow-sm`
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden min-h-0">
        {sidePanel === 'ai' ? (
          <AIOptimizationPanel
            resume={resume}
            onApplySuggestion={onApplySuggestion}
            onSessionSaved={onSessionSaved}
            jobContext={jobContext}
            onJobContextChange={onJobContextChange}
          />
        ) : sidePanel === 'cover' ? (
          <CoverLetterPanel
            resume={resume}
            jobContext={jobContext}
            onJobContextChange={onJobContextChange}
          />
        ) : sidePanel === 'interview' ? (
          <InterviewPrepPanel
            resume={resume}
            jobContext={jobContext}
            onJobContextChange={onJobContextChange}
          />
        ) : sidePanel === 'mock' ? (
          <MockInterviewPanel
            resume={resume}
            jobContext={jobContext}
            onJobContextChange={onJobContextChange}
          />
        ) : sidePanel === 'jobs' ? (
          <JobVersionsPanel
            resume={resume}
            applications={applications}
            jobContext={jobContext}
            onJobContextChange={onJobContextChange}
            onCreateVersion={onCreateVersion}
            onRefresh={onRefreshJobs}
            onOpenResume={onOpenResume}
          />
        ) : sidePanel === 'translate' ? (
          <TranslatePanel
            resume={resume}
            onOpenResume={onOpenResume}
          />
        ) : sidePanel === 'email' ? (
          <FollowUpEmailPanel
            resume={resume}
            jobContext={jobContext}
            onJobContextChange={onJobContextChange}
          />
        ) : sidePanel === 'proofread' ? (
          <ProofreadPanel
            resume={resume}
            onApplyFixes={onApplyProofreadFixes}
          />
        ) : sidePanel === 'insights' ? (
          <ScoreHistoryPanel
            resume={resume}
            applications={applications}
            onOpenResume={onOpenResume}
          />
        ) : (
          <ATSCheckerPanel resume={resume} />
        )}
      </div>
    </div>
  );
}
