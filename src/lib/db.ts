import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Sound, PadAssignment } from '../types';

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
  padAssignments: {
    key: number;
    value: PadAssignment;
  };
}

let dbPromise: Promise<IDBPDatabase<JellybeanDB>> | null = null;

function getDb(): Promise<IDBPDatabase<JellybeanDB>> {
  if (!dbPromise) {
    dbPromise = openDB<JellybeanDB>('jellybean-soundz', 1, {
      upgrade(db) {
        // Sounds store
        const soundStore = db.createObjectStore('sounds', { keyPath: 'id' });
        soundStore.createIndex('by-createdAt', 'createdAt');

        // Audio blobs store
        db.createObjectStore('audioBlobs', { keyPath: 'id' });

        // Pad assignments store
        db.createObjectStore('padAssignments', { keyPath: 'padIndex' });
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

// Pad assignments
export async function getAllPadAssignments(): Promise<PadAssignment[]> {
  const db = await getDb();
  return db.getAll('padAssignments');
}

export async function savePadAssignment(assignment: PadAssignment): Promise<void> {
  const db = await getDb();
  await db.put('padAssignments', assignment);
}

export async function clearPadAssignment(padIndex: number): Promise<void> {
  const db = await getDb();
  const existing = await db.get('padAssignments', padIndex);
  if (existing) {
    await db.put('padAssignments', { ...existing, soundId: null });
  }
}
