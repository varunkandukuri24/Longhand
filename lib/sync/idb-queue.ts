import type { QueuedBatch } from "./types";

const DB_NAME = "longhand";
const DB_VERSION = 1;
const STORE = "batches";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("idb open failed"));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("byPiece", "pieceId", { unique: false });
        store.createIndex("byPieceSessionSeq", ["pieceId", "sessionId", "seq"], {
          unique: true,
        });
      }
    };
  });
}

function reqToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("idb request failed"));
  });
}

export async function enqueueBatch(batch: QueuedBatch): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    await reqToPromise(tx.objectStore(STORE).put(batch));
  } finally {
    db.close();
  }
}

export async function removeBatch(id: string): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    await reqToPromise(tx.objectStore(STORE).delete(id));
  } finally {
    db.close();
  }
}

export async function updateBatch(batch: QueuedBatch): Promise<void> {
  await enqueueBatch(batch);
}

/** Queued batches for a piece, ordered by sessionId then seq. */
export async function listQueuedBatches(pieceId: string): Promise<QueuedBatch[]> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readonly");
    const index = tx.objectStore(STORE).index("byPiece");
    const rows = await reqToPromise(index.getAll(pieceId));
    return (rows as QueuedBatch[]).sort((a, b) => {
      if (a.createdAt !== b.createdAt) {
        return a.createdAt - b.createdAt;
      }
      if (a.sessionId !== b.sessionId) {
        return a.sessionId < b.sessionId ? -1 : 1;
      }
      return a.seq - b.seq;
    });
  } finally {
    db.close();
  }
}

export async function countQueued(pieceId: string): Promise<number> {
  const rows = await listQueuedBatches(pieceId);
  return rows.length;
}

/** Remove queued batches for a piece that belong to the given session. */
export async function removeBatchesForSession(
  pieceId: string,
  sessionId: string,
): Promise<number> {
  const queued = await listQueuedBatches(pieceId);
  const mine = queued.filter((b) => b.sessionId === sessionId);
  for (const batch of mine) {
    await removeBatch(batch.id);
  }
  return mine.length;
}
