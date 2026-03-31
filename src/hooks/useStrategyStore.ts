import { useCallback, useEffect, useState } from 'react';
import type { AppMode } from '@/hooks/useEventStore';
import type { NewEventInput, Strategy } from '@/types/events';

function storageKey(mode: AppMode): string {
  return mode === 'dev' ? 'strategy-dev' : 'strategy-prod';
}

const EMPTY_STRATEGY: Strategy = { name: '', events: [] };

function loadStrategy(mode: AppMode): Strategy {
  try {
    const raw = localStorage.getItem(storageKey(mode));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.events)) return parsed;
    }
  } catch {}
  return { ...EMPTY_STRATEGY, events: [] };
}

export function useStrategyStore(mode: AppMode) {
  const [strategy, setStrategy] = useState<Strategy>(() => loadStrategy(mode));

  useEffect(() => {
    setStrategy(loadStrategy(mode));
  }, [mode]);

  useEffect(() => {
    localStorage.setItem(storageKey(mode), JSON.stringify(strategy));
  }, [strategy, mode]);

  const addStrategyEvent = useCallback((event: NewEventInput) => {
    setStrategy((prev) => ({
      ...prev,
      events: [...prev.events, event],
    }));
  }, []);

  const removeStrategyEvent = useCallback((index: number) => {
    setStrategy((prev) => ({
      ...prev,
      events: prev.events.filter((_, i) => i !== index),
    }));
  }, []);

  const updateStrategyEvent = useCallback((index: number, event: NewEventInput) => {
    setStrategy((prev) => ({
      ...prev,
      events: prev.events.map((e, i) => (i === index ? event : e)),
    }));
  }, []);

  const setStrategyName = useCallback((name: string) => {
    setStrategy((prev) => ({ ...prev, name }));
  }, []);

  const clearStrategy = useCallback(() => {
    setStrategy({ ...EMPTY_STRATEGY, events: [] });
  }, []);

  return {
    strategy,
    addStrategyEvent,
    removeStrategyEvent,
    updateStrategyEvent,
    setStrategyName,
    clearStrategy,
  };
}
