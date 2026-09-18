export type SessionInvalidatedListener = () => void;

export class SessionEvents {
  private readonly listeners = new Set<SessionInvalidatedListener>();

  subscribe(listener: SessionInvalidatedListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyInvalidated(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const sessionEvents = new SessionEvents();
