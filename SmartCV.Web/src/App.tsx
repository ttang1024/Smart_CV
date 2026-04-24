import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Header from './components/layout/Header';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import SettingsPage from './pages/SettingsPage';

function AppShell() {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {!isLanding && <Header />}
      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/app" element={<HomePage />} />
          <Route path="/editor/:id" element={<EditorPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#ffffff',
            color: '#111827',
            borderRadius: '10px',
            border: '1px solid #e5e7eb'
          }
        }}
      />
    </BrowserRouter>
  );
}
