import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface VideoRecord {
  id: string;
  patientName: string;
  blob: Blob;
  thumbnail: string;
  duration: number;
  createdAt: Date;
  hidePatient?: boolean;
}

interface MedicalRecorderDB extends DBSchema {
  videos: {
    key: string;
    value: VideoRecord;
    indexes: {
      'by-patient': string;
      'by-date': Date;
    };
  };
}

let dbInstance: IDBPDatabase<MedicalRecorderDB> | null = null;

export async function getDatabase(): Promise<IDBPDatabase<MedicalRecorderDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<MedicalRecorderDB>('medical-recorder', 1, {
    upgrade(db) {
      const videoStore = db.createObjectStore('videos', {
        keyPath: 'id',
      });
      videoStore.createIndex('by-patient', 'patientName');
      videoStore.createIndex('by-date', 'createdAt');
    },
  });

  return dbInstance;
}

export async function saveVideo(
  patientName: string,
  blob: Blob,
  thumbnail: string,
  duration: number
): Promise<string> {
  const db = await getDatabase();
  const id = `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const videoRecord: VideoRecord = {
    id,
    patientName,
    blob,
    thumbnail,
    duration,
    createdAt: new Date(),
    hidePatient: false,
  };

  await db.add('videos', videoRecord);
  return id;
}

export async function getVideos(): Promise<VideoRecord[]> {
  const db = await getDatabase();
  // getAllFromIndex returns in index order; we will sort in UI if needed
  return db.getAllFromIndex('videos', 'by-date');
}

export async function getVideo(id: string): Promise<VideoRecord | undefined> {
  const db = await getDatabase();
  return db.get('videos', id);
}

export async function deleteVideo(id: string): Promise<void> {
  const db = await getDatabase();
  await db.delete('videos', id);
}

export async function getVideosByPatient(patientName: string): Promise<VideoRecord[]> {
  const db = await getDatabase();
  return db.getAllFromIndex('videos', 'by-patient', patientName);
}

export async function updateVideo(id: string, updates: Partial<VideoRecord>): Promise<VideoRecord> {
  const db = await getDatabase();
  const existing = await db.get('videos', id);
  if (!existing) {
    throw new Error(`Video with id ${id} not found`);
  }
  const updated: VideoRecord = { ...existing, ...updates };
  await db.put('videos', updated);
  return updated;
}
