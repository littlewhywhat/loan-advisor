import { useCallback, useEffect, useState } from 'react';
import type { AppMode } from '@/hooks/useEventStore';
import type { NewEventInput, Strategy, StrategyLibrary } from '@/types/events';
import { MAX_STRATEGIES } from '@/types/events';

function storageKey(mode: AppMode): string {
  return mode === 'dev' ? 'strategy-library-dev' : 'strategy-library-prod';
}

function legacyKey(mode: AppMode): string {
  return mode === 'dev' ? 'strategy-dev' : 'strategy-prod';
}

const EMPTY_LIBRARY: StrategyLibrary = { strategies: [], activeId: null };

function migrate(mode: AppMode): StrategyLibrary | null {
  try {
    const raw = localStorage.getItem(legacyKey(mode));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.events) || parsed.events.length === 0)
      return null;
    const migrated: Strategy = {
      id: crypto.randomUUID(),
      name: parsed.name || 'Strategy 1',
      events: parsed.events,
    };
    localStorage.removeItem(legacyKey(mode));
    return { strategies: [migrated], activeId: migrated.id };
  } catch {
    return null;
  }
}

function loadLibrary(mode: AppMode): StrategyLibrary {
  try {
    const raw = localStorage.getItem(storageKey(mode));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.strategies)) return parsed;
    }
  } catch {}
  const migrated = migrate(mode);
  if (migrated) return migrated;
  return { ...EMPTY_LIBRARY, strategies: [] };
}

export function useStrategyLibrary(mode: AppMode) {
  const [library, setLibrary] = useState<StrategyLibrary>(() =>
    loadLibrary(mode),
  );

  useEffect(() => {
    setLibrary(loadLibrary(mode));
  }, [mode]);

  useEffect(() => {
    localStorage.setItem(storageKey(mode), JSON.stringify(library));
  }, [library, mode]);

  const activeStrategy =
    library.strategies.find((s) => s.id === library.activeId) ?? null;

  const addStrategy = useCallback((name: string) => {
    setLibrary((prev) => {
      if (prev.strategies.length >= MAX_STRATEGIES) return prev;
      const s: Strategy = { id: crypto.randomUUID(), name, events: [] };
      return { strategies: [...prev.strategies, s], activeId: s.id };
    });
  }, []);

  const removeStrategy = useCallback((id: string) => {
    setLibrary((prev) => {
      const next = prev.strategies.filter((s) => s.id !== id);
      return {
        strategies: next,
        activeId: prev.activeId === id ? (next[0]?.id ?? null) : prev.activeId,
      };
    });
  }, []);

  const duplicateStrategy = useCallback((id: string) => {
    setLibrary((prev) => {
      if (prev.strategies.length >= MAX_STRATEGIES) return prev;
      const source = prev.strategies.find((s) => s.id === id);
      if (!source) return prev;
      const copy: Strategy = {
        id: crypto.randomUUID(),
        name: `${source.name} (copy)`,
        events: source.events.map((e) => ({ ...e })),
      };
      return { strategies: [...prev.strategies, copy], activeId: copy.id };
    });
  }, []);

  const renameStrategy = useCallback((id: string, name: string) => {
    setLibrary((prev) => ({
      ...prev,
      strategies: prev.strategies.map((s) =>
        s.id === id ? { ...s, name } : s,
      ),
    }));
  }, []);

  const setActive = useCallback((id: string) => {
    setLibrary((prev) => ({ ...prev, activeId: id }));
  }, []);

  const addStrategyEvent = useCallback((event: NewEventInput) => {
    setLibrary((prev) => ({
      ...prev,
      strategies: prev.strategies.map((s) =>
        s.id === prev.activeId ? { ...s, events: [...s.events, event] } : s,
      ),
    }));
  }, []);

  const removeStrategyEvent = useCallback((index: number) => {
    setLibrary((prev) => ({
      ...prev,
      strategies: prev.strategies.map((s) =>
        s.id === prev.activeId
          ? { ...s, events: s.events.filter((_, i) => i !== index) }
          : s,
      ),
    }));
  }, []);

  const updateStrategyEvent = useCallback(
    (index: number, event: NewEventInput) => {
      setLibrary((prev) => ({
        ...prev,
        strategies: prev.strategies.map((s) =>
          s.id === prev.activeId
            ? {
                ...s,
                events: s.events.map((e, i) => (i === index ? event : e)),
              }
            : s,
        ),
      }));
    },
    [],
  );

  const clearStrategy = useCallback((id: string) => {
    setLibrary((prev) => ({
      ...prev,
      strategies: prev.strategies.filter((s) => s.id !== id),
      activeId:
        prev.activeId === id
          ? (prev.strategies.find((s) => s.id !== id)?.id ?? null)
          : prev.activeId,
    }));
  }, []);

  const applyStrategy = useCallback(
    (id: string, commitEvent: (event: NewEventInput) => void) => {
      const s = library.strategies.find((st) => st.id === id);
      if (!s) return;
      for (const event of s.events) {
        commitEvent(event);
      }
      clearStrategy(id);
    },
    [library.strategies, clearStrategy],
  );

  return {
    library,
    activeStrategy,
    strategies: library.strategies,
    addStrategy,
    removeStrategy,
    duplicateStrategy,
    renameStrategy,
    setActive,
    addStrategyEvent,
    removeStrategyEvent,
    updateStrategyEvent,
    clearStrategy,
    applyStrategy,
  };
}
