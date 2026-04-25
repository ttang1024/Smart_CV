import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Sparkles, FileText } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useResumeStore } from '../store/resumeStore';
import ResumeCard from '../components/resume/ResumeCard';
import PDFImport from '../components/resume/PDFImport';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';

export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { resumes, loading, loadResumes, createResume, deleteResume, duplicateResume } = useResumeStore();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [newResumeName, setNewResumeName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => { loadResumes(); }, []);

  const filtered = resumes.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.personalInfo.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    const name = newResumeName.trim() || t('home.createModal.placeholder');
    const resume = await createResume(name);
    setCreating(false);
    setNewResumeName('');
    navigate(`/editor/${resume.id}`);
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteResume(deleteTarget);
      setDeleteTarget(null);
    }
  };

  const handleDuplicate = async (id: string) => {
    await duplicateResume(id);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero section for empty state */}
      {resumes.length === 0 && !loading && (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('home.emptyTitle')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg mb-8 max-w-md mx-auto">
            {t('home.emptySubtitle')}
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button size="lg" onClick={() => setCreating(true)}>
              <Plus className="w-5 h-5" />
              {t('home.createFromScratch')}
            </Button>
            <PDFImport onImported={id => navigate(`/editor/${id}`)} />
          </div>
        </div>
      )}

      {/* Toolbar */}
      {resumes.length > 0 && (
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1">
            <Input
              icon={<Search className="w-4 h-4" />}
              placeholder={t('home.searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <PDFImport onImported={id => navigate(`/editor/${id}`)} />
          <Button onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4" />
            {t('home.newResume')}
          </Button>
        </div>
      )}

      {/* Resume grid */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && resumes.length > 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>{t('home.noResults')}</p>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(resume => (
            <ResumeCard
              key={resume.id}
              resume={resume}
              onDelete={id => setDeleteTarget(id)}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      </AnimatePresence>

      {/* Create modal */}
      <Modal open={creating} onClose={() => setCreating(false)} title={t('home.createModal.title')}>
        <div className="space-y-4">
          <Input
            label={t('home.createModal.label')}
            value={newResumeName}
            onChange={e => setNewResumeName(e.target.value)}
            placeholder={t('home.createModal.placeholder')}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setCreating(false)}>{t('home.createModal.cancel')}</Button>
            <Button onClick={handleCreate}>{t('home.createModal.create')}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={t('home.deleteModal.title')} size="sm">
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            {t('home.deleteModal.confirm')}
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>{t('home.deleteModal.cancel')}</Button>
            <Button variant="danger" onClick={handleDelete}>{t('home.deleteModal.delete')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
