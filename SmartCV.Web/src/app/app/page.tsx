'use client';

import dynamic from 'next/dynamic';
import Header from '../../components/layout/Header';

const HomePage = dynamic(() => import('../../views/HomePage'), {
  ssr: false,
});

export default function AppPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header />
      <main>
        <HomePage />
      </main>
    </div>
  );
}
