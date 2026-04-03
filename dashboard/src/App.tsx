import { useState, useEffect } from 'react';
import { getKey } from './lib/api';
import { Login } from './pages/Login';
import { Sidebar } from './components/Sidebar';
import { Overview } from './pages/Overview';
import { Webhooks } from './pages/Webhooks';
import { Events } from './pages/Events';
import { DLQ } from './pages/DLQ';

type Page = 'overview' | 'webhooks' | 'events' | 'dlq';

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [page, setPage] = useState<Page>('overview');

  useEffect(() => {
    if (getKey()) setAuthed(true);
  }, []);

  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      <Sidebar current={page} onChange={setPage} />
      <main className="ml-56 flex-1 p-8 max-w-[calc(100vw-224px)]">
        {page === 'overview' && <Overview />}
        {page === 'webhooks' && <Webhooks />}
        {page === 'events' && <Events />}
        {page === 'dlq' && <DLQ />}
      </main>
    </div>
  );
}