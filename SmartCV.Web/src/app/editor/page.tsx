'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import Header from '../../components/layout/Header';

const EditorPage = dynamic(() => import('../../views/EditorPage'), {
  ssr: false,
});

export default function ResumeEditorPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header />
      <main>
        <Suspense fallback={null}>
          <EditorPage />
        </Suspense>
      </main>
    </div>
  );
}
