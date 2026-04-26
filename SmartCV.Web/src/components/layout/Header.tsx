import { Link, useLocation } from 'react-router-dom';
import { Settings, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from '../ui/Button';
import LanguageSwitcher from '../ui/LanguageSwitcher';

export default function Header() {
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/app" className="flex items-center gap-2 font-bold text-gray-900">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg">Smart<span className="text-indigo-600">CV</span></span>
        </Link>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          {/* <LanguageSwitcher /> */}
          {/* AI Settings — always top-right */}
          <Link to="/settings">
            <Button variant={location.pathname === '/settings' ? 'primary' : 'outline'} size="sm">
              <Settings className="w-4 h-4" />
              {t('header.aiSettings')}
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
