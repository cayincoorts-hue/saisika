import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import ActivatePage from './pages/ActivatePage';
import UploadPage from './pages/UploadPage';
import ConfirmPage from './pages/ConfirmPage';
import ResultPage from './pages/ResultPage';
import HistoryPage from './pages/HistoryPage';

export default function App() {
  const [activated, setActivated] = useState(true);

  if (!activated) {
    return <ActivatePage onActivated={() => setActivated(true)} />;
  }

  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/confirm/:batchId" element={<ConfirmPage />} />
          <Route path="/result/:batchId" element={<ResultPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
