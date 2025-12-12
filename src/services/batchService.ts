import { writeBatch, doc, collection } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Batch service for performing multiple Firestore operations in a single transaction
 * Reduces write operations and improves performance
 */

const MAX_BATCH_SIZE = 500; // Firestore limit

export interface BatchOperation {
  type: 'create' | 'update' | 'delete';
  collection: string;
  docId?: string; // Required for update/delete, optional for create
  data?: any; // Required for create/update
}

/**
 * Execute multiple Firestore operations in batches
 * Automatically splits into multiple batches if exceeding Firestore limit
 */
export async function executeBatch(operations: BatchOperation[]): Promise<void> {
  if (operations.length === 0) return;

  // Split operations into batches of MAX_BATCH_SIZE
  const batches: BatchOperation[][] = [];
  for (let i = 0; i < operations.length; i += MAX_BATCH_SIZE) {
    batches.push(operations.slice(i, i + MAX_BATCH_SIZE));
  }

  // Execute each batch
  for (const batchOps of batches) {
    const batch = writeBatch(db);

    for (const op of batchOps) {
      if (op.type === 'create') {
        if (!op.data) {
          throw new Error('Data is required for create operation');
        }
        const docRef = doc(collection(db, op.collection));
        batch.set(docRef, op.data);
      } else if (op.type === 'update') {
        if (!op.docId) {
          throw new Error('Document ID is required for update operation');
        }
        if (!op.data) {
          throw new Error('Data is required for update operation');
        }
        const docRef = doc(db, op.collection, op.docId);
        batch.update(docRef, op.data);
      } else if (op.type === 'delete') {
        if (!op.docId) {
          throw new Error('Document ID is required for delete operation');
        }
        const docRef = doc(db, op.collection, op.docId);
        batch.delete(docRef);
      }
    }

    await batch.commit();
  }
}

/**
 * Batch update multiple applications
 */
export async function batchUpdateApplications(
  updates: Array<{ id: string; data: any }>
): Promise<void> {
  const operations: BatchOperation[] = updates.map(({ id, data }) => ({
    type: 'update',
    collection: 'applications',
    docId: id,
    data,
  }));

  await executeBatch(operations);
}

/**
 * Batch update multiple CVs
 */
export async function batchUpdateCVs(
  updates: Array<{ id: string; data: any }>
): Promise<void> {
  const operations: BatchOperation[] = updates.map(({ id, data }) => ({
    type: 'update',
    collection: 'cvs',
    docId: id,
    data,
  }));

  await executeBatch(operations);
}

/**
 * Batch delete multiple documents
 */
export async function batchDelete(
  collectionName: string,
  docIds: string[]
): Promise<void> {
  const operations: BatchOperation[] = docIds.map((id) => ({
    type: 'delete',
    collection: collectionName,
    docId: id,
  }));

  await executeBatch(operations);
}

