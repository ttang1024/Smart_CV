'use client';

import { Toaster } from 'react-hot-toast';
import '../i18n';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#ffffff',
            color: '#111827',
            borderRadius: '10px',
            border: '1px solid #e5e7eb',
          },
        }}
      />
    </>
  );
}
