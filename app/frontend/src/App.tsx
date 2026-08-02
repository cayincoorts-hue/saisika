import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import ActivatePage from './pages/ActivatePage';
import UploadPage from './pages/UploadPage';
import ConfirmPage from './pages/ConfirmPage';
import ResultPage from './pages/ResultPage';
import HistoryPage from './pages/HistoryPage';
import DemoHomePage from './pages/DemoHomePage';
import UnderstandPage from './pages/UnderstandPage';
import MappingPage from './pages/MappingPage';
import DemoAnalyzePage from './pages/DemoAnalyzePage';
import { isDemoMode } from './runtime/mode';

export default function App() {
  const [activated, setActivated] = useState(true);

  if (!activated) {
    return <ActivatePage onActivated={() => setActivated(true)} />;
  }

  if (isDemoMode) {
    return (
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<DemoHomePage />} />
            <Route path="/demo/upload" element={<UploadPage />} />
            <Route path="/demo/understand" element={<UnderstandPage />} />
            <Route path="/demo/mapping" element={<MappingPage />} />
            <Route path="/demo/analyze" element={<DemoAnalyzePage />} />
            <Route path="/demo/result" element={<ResultPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    );
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
