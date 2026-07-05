import { useState } from 'react';
import { useEvents } from '@/context/EventProvider';
import { findOwnerEvent, ownedEntityNames } from '@/lib/eventUtils';

type Entity = { id: string; name: string };

export function useEntityActions<T extends Entity>() {
  const { events, archiveEvent, restoreEvent, deleteEvent } = useEvents();

  const [archiveTarget, setArchiveTarget] = useState<T | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<T | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);

  const restoreOwner = restoreTarget
    ? findOwnerEvent(events, restoreTarget.id)
    : undefined;

  const handleArchive = () => {
    if (!archiveTarget) return;
    const owner = findOwnerEvent(events, archiveTarget.id);
    if (owner) archiveEvent(owner.id);
    setArchiveTarget(null);
  };

  const handleRestore = () => {
    if (!restoreTarget) return;
    const owner = findOwnerEvent(events, restoreTarget.id);
    if (owner) restoreEvent(owner.id);
    setRestoreTarget(null);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const owner = findOwnerEvent(events, deleteTarget.id);
    if (owner) deleteEvent(owner.id);
    setDeleteTarget(null);
  };

  const restoreDescription = restoreOwner
    ? ownedEntityNames(restoreOwner).join(', ')
    : '';

  return {
    archiveTarget,
    setArchiveTarget,
    restoreTarget,
    setRestoreTarget,
    deleteTarget,
    setDeleteTarget,
    handleArchive,
    handleRestore,
    handleDelete,
    restoreDescription,
  };
}
