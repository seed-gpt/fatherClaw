import { useState, type FormEvent } from 'react';

interface Props {
  onSpawn: (prompt: string) => Promise<string | null>;
  loading: boolean;
  error: string | null;
}

const EXAMPLES = [
  'Build a REST API with Express and TypeScript for a todo app',
  'Create a React dashboard with charts using Recharts',
  'Write a CLI tool in Python that converts CSV to JSON',
  'Set up a Next.js blog with MDX support',
];

export function ChatPanel({ onSpawn, loading, error }: Props) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    await onSpawn(prompt.trim());
    setPrompt('');
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div className="chat-icon">⚡</div>
        <div>
          <h2>Spawn Agent</h2>
          <p className="chat-subtitle">Describe what you want to build</p>
        </div>
      </div>

      <form className="chat-form" onSubmit={handleSubmit}>
        <textarea
          className="chat-input"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Create a REST API with Express and PostgreSQL..."
          rows={4}
          disabled={loading}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e);
          }}
        />
        <button className="spawn-btn" type="submit" disabled={loading || !prompt.trim()}>
          {loading ? (
            <span className="spinner" />
          ) : (
            <>
              <span className="btn-icon">🚀</span>
              Spawn Agent
            </>
          )}
        </button>
        <p className="chat-hint">⌘+Enter to submit</p>
      </form>

      {error && <div className="error-banner">{error}</div>}

      <div className="examples">
        <p className="examples-title">Examples</p>
        {EXAMPLES.map((ex, i) => (
          <button key={i} className="example-btn" onClick={() => setPrompt(ex)}>
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
