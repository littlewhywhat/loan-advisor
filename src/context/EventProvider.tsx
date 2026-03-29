import { createContext, type ReactNode, useContext } from 'react';
import { useEventStore } from '@/hooks/useEventStore';

type EventContextValue = ReturnType<typeof useEventStore>;

const EventContext = createContext<EventContextValue | null>(null);

export function EventProvider({ children }: { children: ReactNode }) {
  const events = useEventStore();
  return (
    <EventContext.Provider value={events}>{children}</EventContext.Provider>
  );
}

export function useEvents(): EventContextValue {
  const ctx = useContext(EventContext);
  if (!ctx) {
    throw new Error('useEvents must be used within an EventProvider');
  }
  return ctx;
}
