import { useEffect } from 'react';
import { Header } from './components/Header';
import { ChatPanel } from './components/ChatPanel';
import { TerminalPanel } from './components/TerminalPanel';
import { SessionList } from './components/SessionList';
import { useSession } from './hooks/useSession';
import './index.css';

export default function App() {
  const { sessions, activeId, setActiveId, loading, error, spawn, refresh, kill } = useSession();

  // Initial load
  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="app">
      <Header />
      <main className="app-main">
        <aside className="app-sidebar">
          <SessionList
            sessions={sessions}
            activeId={activeId}
            onSelect={setActiveId}
            onKill={kill}
            onRefresh={refresh}
          />
        </aside>
        <section className="app-chat">
          <ChatPanel onSpawn={spawn} loading={loading} error={error} />
        </section>
        <section className="app-terminal">
          <TerminalPanel sessionId={activeId} />
        </section>
      </main>
      <footer className="app-footer">
        <span>Built with ⚡ by</span>
        <a href="https://agentsbooks.com" target="_blank" rel="noopener">AgentsBooks</a>
        <span className="footer-sep">·</span>
        <span>Open Source</span>
      </footer>
    </div>
  );
}
