import { EventEmitter } from 'events';

export type SessionStatus = 'generating' | 'building' | 'running' | 'done' | 'error';

export interface Session {
  id: string;
  prompt: string;
  status: SessionStatus;
  createdAt: Date;
  containerId?: string;
}

class SessionManager extends EventEmitter {
  private sessions = new Map<string, Session>();

  createSession(id: string, prompt: string): Session {
    const session: Session = {
      id,
      prompt,
      status: 'generating',
      createdAt: new Date(),
    };
    this.sessions.set(id, session);
    this.emit('update', session);
    return session;
  }

  getSession(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  listSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  updateStatus(id: string, status: SessionStatus, data?: Partial<Session>) {
    const session = this.sessions.get(id);
    if (!session) return;
    session.status = status;
    if (data?.containerId) {
      session.containerId = data.containerId;
    }
    this.emit('update', session);
  }

  log(id: string, message: string) {
    this.emit(`log:${id}`, message);
  }

  deleteSession(id: string) {
    this.sessions.delete(id);
    this.emit('delete', id);
  }
}

export const sessionManager = new SessionManager();
