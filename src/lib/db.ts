import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Sound, Magazine, Page, Chain, BeatzProject } from '../types';

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
  chains: {
    key: string;
    value: Chain;
    indexes: { 'by-createdAt': number };
  };
  beatzProjects: {
    key: string;
    value: BeatzProject;
  };
}

let dbPromise: Promise<IDBPDatabase<JellybeanDB>> | null = null;

function getDb(): Promise<IDBPDatabase<JellybeanDB>> {
  if (!dbPromise) {
    dbPromise = openDB<JellybeanDB>('jellybean-soundz', 4, {
      async upgrade(db, oldVersion, _newVersion, transaction) {
        // --- Fresh install ---
        if (oldVersion === 0) {
          const soundStore = db.createObjectStore('sounds', { keyPath: 'id' });
          soundStore.createIndex('by-createdAt', 'createdAt');
          db.createObjectStore('audioBlobs', { keyPath: 'id' });
          db.createObjectStore('magazines', { keyPath: 'id' });
          const pageStore = db.createObjectStore('pages', { keyPath: 'id' });
          pageStore.createIndex('by-magazineId', 'magazineId');
          const chainStore = db.createObjectStore('chains', { keyPath: 'id' });
          chainStore.createIndex('by-createdAt', 'createdAt');
          return;
        }

        // --- v1 → v2/v3: migrate padAssignments to magazines + pages ---
        if (oldVersion === 1) {
          let oldPads: { padIndex: number; soundId: string | null; padName: string }[] = [];
          try {
            oldPads = await (transaction as any).objectStore('padAssignments').getAll();
          } catch (_) { /* no assignments */ }
          try { (db as any).deleteObjectStore('padAssignments'); } catch (_) { /* already gone */ }

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
          await (transaction as any).objectStore('magazines').put({ id: magId, name: 'Default', color: '#7700FF', createdAt: now, order: 0 });
          await (transaction as any).objectStore('pages').put({ id: pageId, name: 'Main', magazineId: magId, pads, createdAt: now, order: 0 });
        }

        // --- v1 and v2 both need the chains store (v3 addition) ---
        if (oldVersion < 3) {
          const chainStore = db.createObjectStore('chains', { keyPath: 'id' });
          chainStore.createIndex('by-createdAt', 'createdAt');
        }

        // --- v4 addition: beatzProjects store ---
        if (oldVersion < 4) {
          db.createObjectStore('beatzProjects', { keyPath: 'id' });
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

// Chains CRUD
export async function getAllChains(): Promise<Chain[]> {
  const db = await getDb();
  return db.getAllFromIndex('chains', 'by-createdAt');
}

export async function saveChain(chain: Chain): Promise<void> {
  const db = await getDb();
  await db.put('chains', chain);
}

export async function deleteChain(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('chains', id);
}

// BeatzProjects CRUD
export async function getAllBeatzProjects(): Promise<BeatzProject[]> {
  const db = await getDb();
  return db.getAll('beatzProjects');
}

export async function saveBeatzProject(project: BeatzProject): Promise<void> {
  const db = await getDb();
  await db.put('beatzProjects', project);
}

export async function deleteBeatzProject(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('beatzProjects', id);
}
