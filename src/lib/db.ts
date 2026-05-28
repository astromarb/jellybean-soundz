import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Sound, Magazine, Page } from '../types';

interface JellybeanDB extends DBSchema {
  sounds: {
    key: string;
    value: Sound;
    indexes: { 'by-createdAt': number };
  };
  audioBlobs: {
    key: string;
    value: { id: string; blob: Blob };
  };
  magazines: {
    key: string;
    value: Magazine;
  };
  pages: {
    key: string;
    value: Page;
    indexes: { 'by-magazineId': string };
  };
}

let dbPromise: Promise<IDBPDatabase<JellybeanDB>> | null = null;

function getDb(): Promise<IDBPDatabase<JellybeanDB>> {
  if (!dbPromise) {
    dbPromise = openDB<JellybeanDB>('jellybean-soundz', 2, {
      async upgrade(db, oldVersion, _newVersion, transaction) {
        if (oldVersion === 0) {
          // Fresh install — create v2 schema
          const soundStore = db.createObjectStore('sounds', { keyPath: 'id' });
          soundStore.createIndex('by-createdAt', 'createdAt');
          db.createObjectStore('audioBlobs', { keyPath: 'id' });
          db.createObjectStore('magazines', { keyPath: 'id' });
          const pageStore = db.createObjectStore('pages', { keyPath: 'id' });
          pageStore.createIndex('by-magazineId', 'magazineId');
        }

        if (oldVersion === 1) {
          // Migrate: preserve padAssignments → default magazine + page
          let oldPads: { padIndex: number; soundId: string | null; padName: string }[] = [];
          try {
            oldPads = await (transaction as any).objectStore('padAssignments').getAll();
          } catch (_) { /* no assignments yet */ }

          try { (db as any).deleteObjectStore('padAssignments'); } catch (_) { /* already gone */ }

          // Sounds & audioBlobs stores already exist from v1 — add indexes that might be missing
          try {
            const soundStore = (transaction as any).objectStore('sounds');
            if (!soundStore.indexNames.contains('by-createdAt')) {
              soundStore.createIndex('by-createdAt', 'createdAt');
            }
          } catch (_) { /* index already exists */ }

          db.createObjectStore('magazines', { keyPath: 'id' });
          const pageStore = db.createObjectStore('pages', { keyPath: 'id' });
          pageStore.createIndex('by-magazineId', 'magazineId');

          const now = Date.now();
          const magId = `mag-default-${now}`;
          const pageId = `page-default-${now}`;

          const padMap = new Map(oldPads.map((p) => [p.padIndex, p]));
          const pads = Array.from({ length: 16 }, (_, i) =>
            padMap.get(i) ?? { padIndex: i, soundId: null, padName: `Pad ${i + 1}` }
          );

          const magTx = (transaction as any).objectStore('magazines');
          const pageTx = (transaction as any).objectStore('pages');

          await magTx.put({ id: magId, name: 'Default', color: '#7700FF', createdAt: now, order: 0 });
          await pageTx.put({ id: pageId, name: 'Main', magazineId: magId, pads, createdAt: now, order: 0 });
        }
      },
    });
  }
  return dbPromise;
}

// Sounds CRUD
export async function getAllSounds(): Promise<Sound[]> {
  const db = await getDb();
  return db.getAllFromIndex('sounds', 'by-createdAt');
}

export async function saveSound(sound: Sound): Promise<void> {
  const db = await getDb();
  await db.put('sounds', sound);
}

export async function deleteSound(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('sounds', id);
  await db.delete('audioBlobs', id);
}

export async function getSoundById(id: string): Promise<Sound | undefined> {
  const db = await getDb();
  return db.get('sounds', id);
}

// Audio blobs
export async function saveAudioBlob(id: string, blob: Blob): Promise<void> {
  const db = await getDb();
  await db.put('audioBlobs', { id, blob });
}

export async function getAudioBlob(id: string): Promise<Blob | null> {
  const db = await getDb();
  const record = await db.get('audioBlobs', id);
  return record?.blob ?? null;
}

// Magazines CRUD
export async function getAllMagazines(): Promise<Magazine[]> {
  const db = await getDb();
  return db.getAll('magazines');
}

export async function saveMagazine(magazine: Magazine): Promise<void> {
  const db = await getDb();
  await db.put('magazines', magazine);
}

export async function deleteMagazine(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('magazines', id);
}

// Pages CRUD
export async function getAllPages(): Promise<Page[]> {
  const db = await getDb();
  return db.getAll('pages');
}

export async function savePage(page: Page): Promise<void> {
  const db = await getDb();
  await db.put('pages', page);
}

export async function deletePage(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('pages', id);
}
