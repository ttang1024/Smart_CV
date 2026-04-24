import { useNavigate } from 'react-router-dom';
import { FileText, Trash2, Copy, Edit3, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Resume } from '../../types/resume';
import { formatDate } from '../../lib/utils';
import Button from '../ui/Button';

interface ResumeCardProps {
  resume: Resume;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export default function ResumeCard({ resume, onDelete, onDuplicate }: ResumeCardProps) {
  const navigate = useNavigate();

  const completionFields = [
    resume.personalInfo.fullName,
    resume.personalInfo.email,
    resume.summary,
    resume.experience.length > 0,
    resume.education.length > 0,
    resume.skills.length > 0
  ];
  const completion = Math.round((completionFields.filter(Boolean).length / completionFields.length) * 100);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col gap-4 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all cursor-pointer"
      onClick={() => navigate(`/editor/${resume.id}`)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">{resume.name}</h3>
            {resume.personalInfo.title && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{resume.personalInfo.title}</p>
            )}
          </div>
        </div>

        {/* Action buttons — visible on hover */}
        <div
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={e => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Edit"
            onClick={() => navigate(`/editor/${resume.id}`)}
          >
            <Edit3 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Duplicate"
            onClick={() => onDuplicate(resume.id)}
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Delete"
            onClick={() => onDelete(resume.id)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-gray-500 dark:text-gray-400">Completion</span>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{completion}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${completion}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
        <Clock className="w-3 h-3" />
        <span>Updated {formatDate(resume.updatedAt)}</span>
      </div>
    </motion.div>
  );
}
