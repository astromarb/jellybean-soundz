import { useState, useEffect, useCallback } from 'react';
import { Magazine, Page, PadAssignment, JELLYBEAN_COLORS } from '../types';
import * as db from '../lib/db';

const PAD_COUNT = 16;

function defaultPads(): PadAssignment[] {
  return Array.from({ length: PAD_COUNT }, (_, i) => ({
    padIndex: i,
    soundId: null,
    padName: `Pad ${i + 1}`,
  }));
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function usePages() {
  const [magazines, setMagazines] = useState<Magazine[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [activeMagazineId, setActiveMagazineId] = useState<string | null>(null);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      let [mags, pgs] = await Promise.all([db.getAllMagazines(), db.getAllPages()]);

      if (mags.length === 0) {
        const magId = uid('mag');
        const pageId = uid('page');
        const defaultMag: Magazine = { id: magId, name: 'Default', color: JELLYBEAN_COLORS[10], createdAt: Date.now(), order: 0 };
        const defaultPage: Page = { id: pageId, name: 'Main', magazineId: magId, pads: defaultPads(), createdAt: Date.now(), order: 0 };
        await db.saveMagazine(defaultMag);
        await db.savePage(defaultPage);
        mags = [defaultMag];
        pgs = [defaultPage];
      }

      const sortedMags = [...mags].sort((a, b) => a.order - b.order);
      const sortedPages = [...pgs].sort((a, b) => a.order - b.order);
      setMagazines(sortedMags);
      setPages(sortedPages);

      const savedMagId = localStorage.getItem('jb-activeMagazineId');
      const savedPageId = localStorage.getItem('jb-activePageId');

      const mag = sortedMags.find((m) => m.id === savedMagId) ?? sortedMags[0];
      const pgsInMag = sortedPages.filter((p) => p.magazineId === mag?.id);
      const page = pgsInMag.find((p) => p.id === savedPageId) ?? pgsInMag[0];

      setActiveMagazineId(mag?.id ?? null);
      setActivePageId(page?.id ?? null);
      setLoading(false);
    }
    init();
  }, []);

  useEffect(() => {
    if (activeMagazineId) localStorage.setItem('jb-activeMagazineId', activeMagazineId);
  }, [activeMagazineId]);

  useEffect(() => {
    if (activePageId) localStorage.setItem('jb-activePageId', activePageId);
  }, [activePageId]);

  const pagesInActiveMagazine = pages
    .filter((p) => p.magazineId === activeMagazineId)
    .sort((a, b) => a.order - b.order);

  const activePage = pages.find((p) => p.id === activePageId);
  const currentPads = activePage?.pads ?? defaultPads();

  // Magazine operations
  const addMagazine = useCallback(
    async (name: string): Promise<Magazine> => {
      const colorIndex = magazines.length % JELLYBEAN_COLORS.length;
      const mag: Magazine = {
        id: uid('mag'),
        name,
        color: JELLYBEAN_COLORS[colorIndex],
        createdAt: Date.now(),
        order: magazines.length,
      };
      const page: Page = {
        id: uid('page'),
        name: 'Page 1',
        magazineId: mag.id,
        pads: defaultPads(),
        createdAt: Date.now(),
        order: 0,
      };
      await db.saveMagazine(mag);
      await db.savePage(page);
      setMagazines((prev) => [...prev, mag]);
      setPages((prev) => [...prev, page]);
      setActiveMagazineId(mag.id);
      setActivePageId(page.id);
      return mag;
    },
    [magazines.length]
  );

  const renameMagazine = useCallback(async (id: string, name: string) => {
    setMagazines((prev) => {
      const next = prev.map((m) => (m.id === id ? { ...m, name } : m));
      const m = next.find((m) => m.id === id);
      if (m) db.saveMagazine(m);
      return next;
    });
  }, []);

  const deleteMagazine = useCallback(
    async (id: string) => {
      const pgsInMag = pages.filter((p) => p.magazineId === id);
      for (const p of pgsInMag) await db.deletePage(p.id);
      await db.deleteMagazine(id);
      setPages((prev) => prev.filter((p) => p.magazineId !== id));
      setMagazines((prev) => {
        const next = prev.filter((m) => m.id !== id);
        return next;
      });
      setActiveMagazineId((prev) => {
        if (prev !== id) return prev;
        const remaining = magazines.filter((m) => m.id !== id);
        const nextMag = remaining[0] ?? null;
        if (nextMag) {
          const nextPage = pages.filter((p) => p.magazineId === nextMag.id)[0] ?? null;
          setActivePageId(nextPage?.id ?? null);
        }
        return nextMag?.id ?? null;
      });
    },
    [pages, magazines]
  );

  const selectMagazine = useCallback(
    (id: string) => {
      setActiveMagazineId(id);
      const pgsInMag = pages.filter((p) => p.magazineId === id).sort((a, b) => a.order - b.order);
      setActivePageId(pgsInMag[0]?.id ?? null);
    },
    [pages]
  );

  // Page operations
  const addPage = useCallback(
    async (magazineId: string, name: string): Promise<Page> => {
      const pgsInMag = pages.filter((p) => p.magazineId === magazineId);
      const page: Page = {
        id: uid('page'),
        name,
        magazineId,
        pads: defaultPads(),
        createdAt: Date.now(),
        order: pgsInMag.length,
      };
      await db.savePage(page);
      setPages((prev) => [...prev, page]);
      setActivePageId(page.id);
      return page;
    },
    [pages]
  );

  const renamePage = useCallback(async (id: string, name: string) => {
    setPages((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, name } : p));
      const p = next.find((p) => p.id === id);
      if (p) db.savePage(p);
      return next;
    });
  }, []);

  const deletePage = useCallback(
    async (id: string) => {
      await db.deletePage(id);
      const magId = pages.find((p) => p.id === id)?.magazineId;
      setPages((prev) => prev.filter((p) => p.id !== id));
      if (activePageId === id) {
        const remaining = pages.filter((p) => p.id !== id && p.magazineId === magId).sort((a, b) => a.order - b.order);
        setActivePageId(remaining[0]?.id ?? null);
      }
    },
    [activePageId, pages]
  );

  // Pad operations on the active page
  const assignSound = useCallback(
    async (padIndex: number, soundId: string | null) => {
      setPages((prev) => {
        return prev.map((p) => {
          if (p.id !== activePageId) return p;
          const newPads = p.pads.map((pad) => (pad.padIndex === padIndex ? { ...pad, soundId } : pad));
          const updated = { ...p, pads: newPads };
          db.savePage(updated);
          return updated;
        });
      });
    },
    [activePageId]
  );

  const clearPad = useCallback(
    async (padIndex: number) => {
      await assignSound(padIndex, null);
    },
    [assignSound]
  );

  const renamePad = useCallback(
    async (padIndex: number, padName: string) => {
      setPages((prev) => {
        return prev.map((p) => {
          if (p.id !== activePageId) return p;
          const newPads = p.pads.map((pad) => (pad.padIndex === padIndex ? { ...pad, padName } : pad));
          const updated = { ...p, pads: newPads };
          db.savePage(updated);
          return updated;
        });
      });
    },
    [activePageId]
  );

  return {
    magazines,
    pages,
    activeMagazineId,
    activePageId,
    activePage,
    pagesInActiveMagazine,
    currentPads,
    loading,
    selectMagazine,
    setActivePageId,
    addMagazine,
    renameMagazine,
    deleteMagazine,
    addPage,
    renamePage,
    deletePage,
    assignSound,
    clearPad,
    renamePad,
  };
}
