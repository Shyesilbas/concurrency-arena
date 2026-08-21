import React, { useState } from 'react';
import { Play, PlayCircle } from 'lucide-react';
import { api } from '../api/client';

const STRATEGIES = [
  {
    id: 'naive',
    endpoint: '/bookings/naive',
    title: '01. Naive (Korumasız)',
    desc: 'Kilit yok. Lost Update ve Overselling yaşanır.'
  },
  {
    id: 'pessimistic',
    endpoint: '/bookings/pessimistic',
    title: '02. Pessimistic Lock',
    desc: 'SELECT FOR UPDATE satır kilidi. Tutarlı ama yavaş.'
  },
  {
    id: 'optimistic',
    endpoint: '/bookings/optimistic',
    title: '03. Optimistic Lock',
    desc: '@Version + 50x Jitter Retry. Lock-free çakışma yakalama.'
  },
  {
    id: 'redis',
    endpoint: '/bookings/redis',
    title: '04. Redis Lua Scripting',
    desc: 'Atomik bellek içi stok düşümü. Sıfır DB kilidi.'
  },
  {
    id: 'kafka',
    endpoint: '/bookings/kafka',
    title: '05. Kafka Event-Driven',
    desc: '202 Accepted. Redis stok düşümü + asenkron kuyruk.'
  }
];

export default function LoadTestRunner({ concertId, user, onTestComplete, onBatchSessionComplete, onRefreshConcert, onResetConcertStock }) {
  const [selectedStrategy, setSelectedStrategy] = useState('naive');
  const [vuCount, setVuCount] = useState(100);
  const [targetStockCapacity, setTargetStockCapacity] = useState(5);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionProgressText, setSessionProgressText] = useState('');

  // Single test execution helper
  const executeSingleTest = async (stratObj, stock, vus) => {
    if (onResetConcertStock) {
      await onResetConcertStock(stock);
      await new Promise(r => setTimeout(r, 250));
    }

    const testStartTime = performance.now();
    const testStartTimestamp = new Date();
    const requests = [];
    const latencies = [];
    const userReports = [];
    let successCount = 0;
    let failCount = 0;
    let statusCodes = {};

    const baseUserId = user ? user.id : 1;

    for (let i = 1; i <= vus; i++) {
      const userIndex = i;
      const p = (async () => {
        const reqStart = performance.now();
        const sendTime = new Date().toLocaleTimeString() + '.' + String(new Date().getMilliseconds()).padStart(3, '0');
        let status = 'PENDING';
        let httpCode = 0;
        let responseMessage = '';
        let trackingId = null;

        try {
          const res = await api.bookTicket(stratObj.endpoint, {
            concertId: concertId || 1,
            userId: baseUserId,
            seatCount: 1,
            idempotencyKey: `sim-${Date.now()}-${userIndex}-${Math.random().toString(36).substring(7)}`
          });

          const reqEnd = performance.now();
          const duration = reqEnd - reqStart;
          latencies.push(duration);

          httpCode = res.status;
          statusCodes[res.status] = (statusCodes[res.status] || 0) + 1;
          responseMessage = res.message;

          if (res.ok || res.status === 202) {
            successCount++;
            status = 'ALINDI';
            if (res.data && res.data.trackingId) {
              trackingId = res.data.trackingId;
            }
          } else {
            failCount++;
            status = 'ALAMADI';
          }

          userReports.push({
            userLabel: `User #${userIndex}`,
            sendTime,
            durationMs: Math.round(duration),
            status,
            httpCode,
            ticketCount: 1,
            message: responseMessage,
            trackingId
          });

        } catch (err) {
          const reqEnd = performance.now();
          const duration = reqEnd - reqStart;
          latencies.push(duration);
          failCount++;
          statusCodes['Error'] = (statusCodes['Error'] || 0) + 1;

          userReports.push({
            userLabel: `User #${userIndex}`,
            sendTime,
            durationMs: Math.round(duration),
            status: 'HATA',
            httpCode: 500,
            ticketCount: 1,
            message: err.message || 'Bağlantı Hatası',
            trackingId: null
          });
        }
      })();
      requests.push(p);
    }

    await Promise.all(requests);
    const totalTimeMs = performance.now() - testStartTime;

    latencies.sort((a, b) => a - b);
    const sum = latencies.reduce((acc, v) => acc + v, 0);
    const avg = latencies.length ? (sum / latencies.length) : 0;
    const min = latencies.length ? latencies[0] : 0;
    const max = latencies.length ? latencies[latencies.length - 1] : 0;
    const med = latencies.length ? latencies[Math.floor(latencies.length * 0.5)] : 0;
    const p90 = latencies.length ? latencies[Math.floor(latencies.length * 0.9)] : 0;
    const p95 = latencies.length ? latencies[Math.floor(latencies.length * 0.95)] : 0;
    const throughput = totalTimeMs > 0 ? (vus / (totalTimeMs / 1000)) : 0;

    userReports.sort((a, b) => {
      const idA = parseInt(a.userLabel.replace('User #', ''), 10);
      const idB = parseInt(b.userLabel.replace('User #', ''), 10);
      return idA - idB;
    });

    return {
      strategyId: stratObj.id,
      strategyTitle: stratObj.title,
      targetStockCapacity: stock,
      vuCount: vus,
      totalTicketsRequested: vus,
      totalTicketsSold: successCount,
      totalTimeMs,
      successCount,
      failCount,
      statusCodes,
      avgMs: avg,
      minMs: min,
      medMs: med,
      maxMs: max,
      p90Ms: p90,
      p95Ms: p95,
      throughputRps: throughput,
      userReports,
      timestamp: testStartTimestamp.toLocaleTimeString()
    };
  };

  // Run single selected strategy
  const handleRunSingle = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setSessionProgressText('Seçili test çalışıyor...');

    const stratObj = STRATEGIES.find(s => s.id === selectedStrategy) || STRATEGIES[0];
    const result = await executeSingleTest(stratObj, targetStockCapacity, vuCount);

    onTestComplete(result);
    setIsRunning(false);
    setSessionProgressText('');
    setTimeout(onRefreshConcert, 1000);
  };

  // Run full benchmark session (5 strategies back-to-back with identical params)
  const handleRunFullSession = async () => {
    if (isRunning) return;
    setIsRunning(true);

    const sessionResults = [];

    for (let i = 0; i < STRATEGIES.length; i++) {
      const strat = STRATEGIES[i];
      setSessionProgressText(`[${i + 1}/5] ${strat.title} test ediliyor (${targetStockCapacity} Bilet / ${vuCount} VU)...`);
      
      const result = await executeSingleTest(strat, targetStockCapacity, vuCount);
      sessionResults.push(result);
      onTestComplete(result);
      
      await new Promise(r => setTimeout(r, 600));
    }

    if (onBatchSessionComplete) {
      onBatchSessionComplete(sessionResults);
    }

    setIsRunning(false);
    setSessionProgressText('');
    setTimeout(onRefreshConcert, 1000);
  };

  return (
    <div className="card-soft" style={{ padding: '24px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--brand-black)' }}>
          1. Eşzamanlılık Stratejisi & Parametreler
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Tek bir modu deneyebilir veya tek tıkla 5 stratejinin tamamını aynı şartlarda yarıştıran bir test oturumu başlatabilirsiniz.
        </p>
      </div>

      {/* Strategies Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '10px',
        marginBottom: '24px'
      }}>
        {STRATEGIES.map((strat) => {
          const isSelected = selectedStrategy === strat.id;
          return (
            <div
              key={strat.id}
              onClick={() => !isRunning && setSelectedStrategy(strat.id)}
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                background: isSelected ? 'var(--brand-black)' : 'var(--bg-subtle)',
                color: isSelected ? '#ffffff' : 'var(--text-main)',
                cursor: isRunning ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{ fontSize: '0.9rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                {strat.title}
              </span>
              <p style={{ fontSize: '0.75rem', color: isSelected ? '#94a3b8' : 'var(--text-muted)', lineHeight: '1.3' }}>
                {strat.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Parameters & Action Buttons */}
      <div style={{
        padding: '20px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          {/* Toplam Bilet Stoku */}
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              Satışa Açılacak Bilet:
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[1, 5, 10, 50, 100].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setTargetStockCapacity(val)}
                  className={`btn-modern ${targetStockCapacity === val ? 'btn-black' : 'btn-white'}`}
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  {val} Bilet
                </button>
              ))}
            </div>
          </div>

          {/* Yarışan Kullanıcı Sayısı (VU) */}
          <div style={{ flex: '1 1 220px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Yarışan Kullanıcı (VU):</span>
              <span className="font-mono" style={{ fontSize: '0.9rem', fontWeight: 700 }}>{vuCount} Kullanıcı</span>
            </div>
            <input
              type="range"
              min="10"
              max="200"
              step="10"
              value={vuCount}
              disabled={isRunning}
              onChange={(e) => setVuCount(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--brand-black)', cursor: 'pointer' }}
            />
          </div>

          {/* Dual Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={handleRunSingle}
              disabled={isRunning}
              className="btn-modern btn-white"
              style={{ padding: '12px 18px', fontSize: '0.85rem' }}
              title="Sadece seçtiğiniz modu test eder"
            >
              <Play size={15} />
              <span>Seçili Modu Test Et</span>
            </button>

            <button
              onClick={handleRunFullSession}
              disabled={isRunning}
              className="btn-modern btn-black"
              style={{ padding: '12px 20px', fontSize: '0.85rem' }}
              title="5 stratejinin tamamını sırayla test edip karşılaştırma tablosunu üretir"
            >
              <PlayCircle size={17} />
              <span>5'li Test Oturumu Başlat</span>
            </button>
          </div>
        </div>

        {/* Live Running Status banner */}
        {isRunning && (
          <div style={{
            padding: '10px 14px',
            background: 'var(--brand-black)',
            color: '#ffffff',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', animation: 'pulse 1.5s infinite' }} />
            <span>{sessionProgressText}</span>
          </div>
        )}
      </div>
    </div>
  );
}
