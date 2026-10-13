import { Clipboard, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Modal from '../../ui/Modal';

/** Read-only share link (resume encoded in the URL fragment) with an optional QR code. */
export function ShareDialog({ open, onClose, url, qrDataUrl }: {
  open: boolean;
  onClose: () => void;
  url: string;
  qrDataUrl: string | null;
}) {
  const { t } = useTranslation();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('app.share.copied'));
    } catch {
      toast.error(t('app.share.copyFailed'));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('app.share.title')} size="md">
      <div className="space-y-4">
        <div className="flex items-start gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-lg text-sm">
          <Lock className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{t('app.share.privacyNote')}</span>
        </div>

        <div className="flex gap-2">
          <input
            readOnly
            value={url}
            onFocus={e => e.target.select()}
            className="flex-1 min-w-0 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 font-mono"
          />
          <button
            onClick={copy}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shrink-0"
          >
            <Clipboard className="w-3.5 h-3.5" />
            {t('app.share.copy')}
          </button>
        </div>

        {qrDataUrl ? (
          <div className="flex flex-col items-center gap-2">
            <img src={qrDataUrl} alt={t('app.share.qrAlt')} className="rounded-lg border border-gray-200 dark:border-gray-700" />
            <p className="text-xs text-gray-400 dark:text-gray-500">{t('app.share.qrHint')}</p>
          </div>
        ) : (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">{t('app.share.tooLargeForQr')}</p>
        )}
      </div>
    </Modal>
  );
}
