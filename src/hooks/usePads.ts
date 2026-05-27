import { useState, useEffect, useCallback } from 'react';
import { PadAssignment } from '../types';
import * as db from '../lib/db';

const PAD_COUNT = 16;

function defaultPads(): PadAssignment[] {
  return Array.from({ length: PAD_COUNT }, (_, i) => ({
    padIndex: i,
    soundId: null,
    padName: `Pad ${i + 1}`,
  }));
}

export function usePads() {
  const [pads, setPads] = useState<PadAssignment[]>(defaultPads());

  useEffect(() => {
    async function load() {
      const stored = await db.getAllPadAssignments();
      if (stored.length > 0) {
        const map = new Map(stored.map((p) => [p.padIndex, p]));
        setPads(defaultPads().map((p) => map.get(p.padIndex) ?? p));
      }
    }
    load();
  }, []);

  const assignSound = useCallback(async (padIndex: number, soundId: string | null): Promise<void> => {
    setPads((prev) => {
      const updated = prev.map((p) =>
        p.padIndex === padIndex ? { ...p, soundId } : p
      );
      const pad = updated.find((p) => p.padIndex === padIndex);
      if (pad) db.savePadAssignment(pad);
      return updated;
    });
  }, []);

  const clearPad = useCallback(async (padIndex: number): Promise<void> => {
    setPads((prev) => {
      const updated = prev.map((p) =>
        p.padIndex === padIndex ? { ...p, soundId: null } : p
      );
      const pad = updated.find((p) => p.padIndex === padIndex);
      if (pad) db.savePadAssignment(pad);
      return updated;
    });
  }, []);

  const renamePad = useCallback(async (padIndex: number, newName: string): Promise<void> => {
    setPads((prev) => {
      const updated = prev.map((p) =>
        p.padIndex === padIndex ? { ...p, padName: newName } : p
      );
      const pad = updated.find((p) => p.padIndex === padIndex);
      if (pad) db.savePadAssignment(pad);
      return updated;
    });
  }, []);

  return { pads, assignSound, clearPad, renamePad };
}
