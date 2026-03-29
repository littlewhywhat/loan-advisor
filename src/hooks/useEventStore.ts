import { useEffect, useMemo, useState } from 'react';
import { deriveState } from '@/lib/deriveState';
import type {
  DerivedState,
  EventStore,
  FinanceEvent,
  NewEventInput,
} from '@/types/events';

const MODE_KEY = 'finance-mode';
const STORAGE_KEY_DEV = 'event-store-dev';
const STORAGE_KEY_PROD = 'event-store-prod';

export type AppMode = 'dev' | 'prod';

const EMPTY_STORE: EventStore = { events: [] };

function loadMode(): AppMode {
  const saved = localStorage.getItem(MODE_KEY);
  if (saved === 'prod') return 'prod';
  return 'dev';
}

function storageKey(mode: AppMode): string {
  return mode === 'dev' ? STORAGE_KEY_DEV : STORAGE_KEY_PROD;
}

function loadStore(mode: AppMode): EventStore {
  const key = storageKey(mode);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.events)) return parsed;
    }
  } catch {}
  return { ...EMPTY_STORE };
}

function uid(): string {
  return crypto.randomUUID();
}

export function useEventStore() {
  const [mode, setModeState] = useState<AppMode>(loadMode);
  const [store, setStore] = useState<EventStore>(() => loadStore(mode));

  useEffect(() => {
    localStorage.setItem(storageKey(mode), JSON.stringify(store));
  }, [store, mode]);

  const derived: DerivedState = useMemo(
    () => deriveState(store.events),
    [store.events],
  );

  const setMode = (next: AppMode) => {
    localStorage.setItem(MODE_KEY, next);
    setModeState(next);
    setStore(loadStore(next));
  };

  const addEvent = (event: NewEventInput): string => {
    const id = uid();
    setStore((prev) => ({
      events: [
        ...prev.events,
        { ...event, id, status: 'active' } as FinanceEvent,
      ],
    }));
    return id;
  };

  const archiveEvent = (id: string) =>
    setStore((prev) => ({
      events: prev.events.map((e) =>
        e.id === id ? { ...e, status: 'archived' as const } : e,
      ),
    }));

  const restoreEvent = (id: string) =>
    setStore((prev) => ({
      events: prev.events.map((e) =>
        e.id === id ? { ...e, status: 'active' as const } : e,
      ),
    }));

  const updateEvent = (
    id: string,
    updater: (event: FinanceEvent) => FinanceEvent,
  ) =>
    setStore((prev) => ({
      events: prev.events.map((e) => (e.id === id ? updater(e) : e)),
    }));

  const deleteEvent = (id: string) =>
    setStore((prev) => ({
      events: prev.events.filter((e) => e.id !== id),
    }));

  return {
    events: store.events,
    derived,
    mode,
    setMode,
    addEvent,
    updateEvent,
    archiveEvent,
    restoreEvent,
    deleteEvent,
  };
}
