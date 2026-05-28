import { useState, useEffect, useCallback } from 'react';
import { Chain, ChainItem } from '../types';
import * as db from '../lib/db';

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useChains() {
  const [chains, setChains] = useState<Chain[]>([]);
  const [activeChainId, setActiveChainId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      let stored = await db.getAllChains();
      if (stored.length === 0) {
        const chain: Chain = { id: uid('chain'), name: 'My Jingle', items: [], createdAt: Date.now() };
        await db.saveChain(chain);
        stored = [chain];
      }
      setChains(stored);
      const savedId = localStorage.getItem('jb-activeChainId');
      const active = stored.find((c) => c.id === savedId) ?? stored[0];
      setActiveChainId(active?.id ?? null);
      setLoading(false);
    }
    init();
  }, []);

  useEffect(() => {
    if (activeChainId) localStorage.setItem('jb-activeChainId', activeChainId);
  }, [activeChainId]);

  const activeChain = chains.find((c) => c.id === activeChainId) ?? null;

  const mutateActive = useCallback(
    (updater: (chain: Chain) => Chain) => {
      setChains((prev) =>
        prev.map((c) => {
          if (c.id !== activeChainId) return c;
          const updated = updater(c);
          db.saveChain(updated);
          return updated;
        })
      );
    },
    [activeChainId]
  );

  const addChain = useCallback(async (name: string): Promise<Chain> => {
    const chain: Chain = { id: uid('chain'), name, items: [], createdAt: Date.now() };
    await db.saveChain(chain);
    setChains((prev) => [...prev, chain]);
    setActiveChainId(chain.id);
    return chain;
  }, []);

  const renameChain = useCallback(
    async (id: string, name: string) => {
      setChains((prev) => {
        const next = prev.map((c) => (c.id === id ? { ...c, name } : c));
        const c = next.find((c) => c.id === id);
        if (c) db.saveChain(c);
        return next;
      });
    },
    []
  );

  const deleteChain = useCallback(
    async (id: string) => {
      await db.deleteChain(id);
      setChains((prev) => {
        const next = prev.filter((c) => c.id !== id);
        return next;
      });
      setActiveChainId((prev) => {
        if (prev !== id) return prev;
        const remaining = chains.filter((c) => c.id !== id);
        return remaining[0]?.id ?? null;
      });
    },
    [chains]
  );

  const addItem = useCallback(
    (soundId: string) => {
      mutateActive((chain) => ({
        ...chain,
        items: [...chain.items, { id: uid('ci'), soundId, gapBefore: 0 }],
      }));
    },
    [mutateActive]
  );

  const removeItem = useCallback(
    (itemId: string) => {
      mutateActive((chain) => ({
        ...chain,
        items: chain.items.filter((item) => item.id !== itemId),
      }));
    },
    [mutateActive]
  );

  const setItemGap = useCallback(
    (itemId: string, gapBefore: number) => {
      mutateActive((chain) => ({
        ...chain,
        items: chain.items.map((item) =>
          item.id === itemId ? { ...item, gapBefore: Math.max(0, gapBefore) } : item
        ),
      }));
    },
    [mutateActive]
  );

  const moveItem = useCallback(
    (itemId: string, direction: 'up' | 'down') => {
      mutateActive((chain) => {
        const idx = chain.items.findIndex((item) => item.id === itemId);
        if (idx === -1) return chain;
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= chain.items.length) return chain;
        const newItems = [...chain.items];
        [newItems[idx], newItems[swapIdx]] = [newItems[swapIdx], newItems[idx]];
        return { ...chain, items: newItems };
      });
    },
    [mutateActive]
  );

  const duplicateItem = useCallback(
    (itemId: string) => {
      mutateActive((chain) => {
        const item = chain.items.find((i) => i.id === itemId);
        if (!item) return chain;
        const copy: ChainItem = { ...item, id: uid('ci') };
        const idx = chain.items.indexOf(item);
        const newItems = [...chain.items];
        newItems.splice(idx + 1, 0, copy);
        return { ...chain, items: newItems };
      });
    },
    [mutateActive]
  );

  return {
    chains,
    activeChain,
    activeChainId,
    loading,
    setActiveChainId,
    addChain,
    renameChain,
    deleteChain,
    addItem,
    removeItem,
    setItemGap,
    moveItem,
    duplicateItem,
  };
}
