'use client';

import Header from '../../components/layout/Header';
import SettingsPage from '../../views/SettingsPage';

export default function SettingsRoutePage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header />
      <main>
        <SettingsPage />
      </main>
    </div>
  );
}
