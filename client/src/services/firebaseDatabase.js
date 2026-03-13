import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Get a single document
 */
export const getDocument = async (collectionName, documentId) => {
  try {
    const docRef = doc(db, collectionName, documentId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        success: true,
        data: { id: docSnap.id, ...docSnap.data() },
      };
    } else {
      return {
        success: false,
        error: 'Document not found',
      };
    }
  } catch (error) {
    console.error('Error getting document:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get all documents from a collection
 */
export const getDocuments = async (collectionName) => {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const documents = [];
    
    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() });
    });
    
    return {
      success: true,
      data: documents,
    };
  } catch (error) {
    console.error('Error getting documents:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Query documents with filters
 */
export const queryDocuments = async (collectionName, filters = []) => {
  try {
    let q = collection(db, collectionName);
    
    if (filters.length > 0) {
      q = query(q, ...filters);
    }
    
    const querySnapshot = await getDocs(q);
    const documents = [];
    
    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() });
    });
    
    return {
      success: true,
      data: documents,
    };
  } catch (error) {
    console.error('Error querying documents:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Add a new document
 */
export const addDocument = async (collectionName, data) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    return {
      success: true,
      data: { id: docRef.id, ...data },
      message: 'Document added successfully',
    };
  } catch (error) {
    console.error('Error adding document:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Update a document
 */
export const updateDocument = async (collectionName, documentId, data) => {
  try {
    const docRef = doc(db, collectionName, documentId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date(),
    });
    
    return {
      success: true,
      message: 'Document updated successfully',
    };
  } catch (error) {
    console.error('Error updating document:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Delete a document
 */
export const deleteDocument = async (collectionName, documentId) => {
  try {
    await deleteDoc(doc(db, collectionName, documentId));
    
    return {
      success: true,
      message: 'Document deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting document:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Listen to real-time document changes
 */
export const onDocumentChange = (collectionName, documentId, callback) => {
  try {
    const docRef = doc(db, collectionName, documentId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback({
          success: true,
          data: { id: docSnap.id, ...docSnap.data() },
        });
      } else {
        callback({
          success: false,
          error: 'Document not found',
        });
      }
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error listening to document:', error);
    callback({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Listen to real-time collection changes
 */
export const onCollectionChange = (collectionName, filters = [], callback) => {
  try {
    let q = collection(db, collectionName);
    
    if (filters.length > 0) {
      q = query(q, ...filters);
    }
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const documents = [];
      querySnapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...doc.data() });
      });
      
      callback({
        success: true,
        data: documents,
      });
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error listening to collection:', error);
    callback({
      success: false,
      error: error.message,
    });
    return () => {}; // Return empty unsubscribe function
  }
};

/**
 * Batch write operations
 */
export const batchWrite = async (operations) => {
  try {
    const batch = writeBatch(db);
    
    operations.forEach((operation) => {
      if (operation.type === 'set') {
        const docRef = doc(db, operation.collection, operation.id);
        batch.set(docRef, operation.data);
      } else if (operation.type === 'update') {
        const docRef = doc(db, operation.collection, operation.id);
        batch.update(docRef, operation.data);
      } else if (operation.type === 'delete') {
        const docRef = doc(db, operation.collection, operation.id);
        batch.delete(docRef);
      }
    });
    
    await batch.commit();
    
    return {
      success: true,
      message: 'Batch operations completed successfully',
    };
  } catch (error) {
    console.error('Error in batch write:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Example filter builders
 */
export const filters = {
  whereEqual: (field, value) => where(field, '==', value),
  whereLessThan: (field, value) => where(field, '<', value),
  whereGreaterThan: (field, value) => where(field, '>', value),
  whereIn: (field, values) => where(field, 'in', values),
  orderByField: (field, direction = 'asc') => orderBy(field, direction),
  limitTo: (count) => limit(count),
};

export default db;
