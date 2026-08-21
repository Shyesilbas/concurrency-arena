import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import UserLoginModal from './components/UserLoginModal';
import ConcertCard from './components/ConcertCard';
import LoadTestRunner from './components/LoadTestRunner';
import MetricsPanel from './components/MetricsPanel';
import SessionComparisonTable from './components/SessionComparisonTable';

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

  const fetchConcert = async () => {
    setLoadingConcert(true);
    try {
      const res = await fetch('http://localhost:8080/api/v1/concerts/1');
      const json = await res.json();
      if (json.success && json.data) {
        setConcert(json.data);
      }
    } catch (err) {
      console.warn('Backend connection fallback:', err);
      setConcert({
        id: 1,
        name: 'Harbiye Açıkhava Konseri',
        artist: 'Tarkan',
        totalCapacity: 100,
        availableSeats: 100,
        redisStock: 100,
        totalOrders: 0,
        totalTickets: 0,
        version: 0
      });
    } finally {
      setLoadingConcert(false);
    }
  };

  const handleResetConcert = async (capacity = 100) => {
    setLoadingConcert(true);
    try {
      const res = await fetch(`http://localhost:8080/api/v1/concerts/1/reset?capacity=${capacity}`, {
        method: 'POST'
      });
      const json = await res.json();
      if (json.success && json.data) {
        setConcert(json.data);
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
              setLastTestResult(results[0]); // Default focus on first result
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
