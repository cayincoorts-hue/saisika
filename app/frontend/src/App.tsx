import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LanguageSwitcher from './components/layout/LanguageSwitcher';
import ActivatePage from './pages/ActivatePage';
import UploadPage from './pages/UploadPage';
import ConfirmPage from './pages/ConfirmPage';
import ResultPage from './pages/ResultPage';
import HistoryPage from './pages/HistoryPage';

export default function App() {
  // v1.4: 推广期全开放，默认已激活。恢复付费时改回 false。
  const [activated, setActivated] = useState(true);

  if (!activated) {
    return <ActivatePage onActivated={() => setActivated(true)} />;
  }

  return (
    <BrowserRouter>
      <LanguageSwitcher />
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/confirm/:batchId" element={<ConfirmPage />} />
        <Route path="/result/:batchId" element={<ResultPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
