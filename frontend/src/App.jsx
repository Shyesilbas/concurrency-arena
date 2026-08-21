import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import UserLoginModal from './components/UserLoginModal';
import ConcertCard from './components/ConcertCard';
import LoadTestRunner from './components/LoadTestRunner';
import MetricsPanel from './components/MetricsPanel';
import SessionComparisonTable from './components/SessionComparisonTable';
import { api } from './api/client';

export default function App() {
  const [user, setUser] = useState({
    id: 1,
    username: 'serhat_yesilbas',
    email: 'shyesilbas@gmail.com'
  });
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [concert, setConcert] = useState(null);
  const [loadingConcert, setLoadingConcert] = useState(false);
  const [lastTestResult, setLastTestResult] = useState(null);
  const [sessionResults, setSessionResults] = useState(null);

  // Fetch real-time concert details from backend
  const fetchConcert = async () => {
    setLoadingConcert(true);
    try {
      const res = await api.getConcert(1);
      if (res.ok && res.data) {
        setConcert(res.data);
      }
    } catch (err) {
      console.warn('Backend connection fallback:', err);
    } finally {
      setLoadingConcert(false);
    }
  };

  // Reset concert inventory in DB and Redis
  const handleResetConcert = async (capacity = 100) => {
    setLoadingConcert(true);
    try {
      const res = await api.resetConcert(1, capacity);
      if (res.ok && res.data) {
        setConcert(res.data);
      }
    } catch (err) {
      console.error('Reset error:', err);
      fetchConcert();
    } finally {
      setLoadingConcert(false);
    }
  };

  useEffect(() => {
    fetchConcert();
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        user={user}
        onOpenLogin={() => setIsLoginOpen(true)}
      />

      <main style={{
        maxWidth: '1140px',
        width: '100%',
        margin: '0 auto',
        padding: '24px 24px 60px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* Concert Inventory Status */}
        <ConcertCard
          concert={concert}
          onReset={handleResetConcert}
          loading={loadingConcert}
        />

        {/* Load Test Runner with Single Run & 5-in-1 Test Session */}
        <LoadTestRunner
          concertId={concert ? concert.id : 1}
          user={user}
          onTestComplete={(result) => setLastTestResult(result)}
          onBatchSessionComplete={(results) => {
            setSessionResults(results);
            if (results && results.length > 0) {
              setLastTestResult(results[0]);
            }
          }}
          onRefreshConcert={fetchConcert}
          onResetConcertStock={handleResetConcert}
        />

        {/* Multi-Strategy Session Live Comparison Table with Drill-Down Selection */}
        <SessionComparisonTable
          sessionResults={sessionResults}
          selectedDetailId={lastTestResult ? lastTestResult.strategyId : null}
          onSelectStrategyDetail={(selectedResult) => setLastTestResult(selectedResult)}
        />

        {/* Detailed User-by-User Execution Log & Telemetry Panel */}
        <MetricsPanel lastResult={lastTestResult} />
      </main>

      <UserLoginModal
        user={user}
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLogin={(newUser) => setUser(newUser)}
      />
    </div>
  );
}
