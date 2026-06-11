'use client';

import dynamic from 'next/dynamic';
import Header from '../../components/layout/Header';

const SharePage = dynamic(() => import('../../views/SharePage'), {
  ssr: false,
});

export default function SharedResumePage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header />
      <main>
        <SharePage />
      </main>
    </div>
  );
}
