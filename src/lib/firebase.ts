import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc as fSetDoc, 
  getDoc as fGetDoc, 
  getDocs as fGetDocs, 
  query as fQuery, 
  where as fWhere, 
  addDoc as fAddDoc, 
  updateDoc as fUpdateDoc, 
  deleteDoc as fDeleteDoc, 
  orderBy, 
  limit, 
  onSnapshot, 
  DocumentReference, 
  DocumentSnapshot, 
  Query, 
  QuerySnapshot, 
  DocumentData,
  initializeFirestore
} from "firebase/firestore";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId 
  ? initializeFirestore(app, { experimentalForceLongPolling: true }, firebaseConfig.firestoreDatabaseId)
  : initializeFirestore(app, { experimentalForceLongPolling: true });
const auth = getAuth(app);

// Default seed data for the platform
const DEFAULT_LEARNING_RESOURCES = [
  {
    id: "lr-1",
    title: "Masonry Basics: Laying Bricks and Mixing Mortar",
    trade: "Mason",
    category: "technical" as const,
    type: "video" as const,
    link: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    description: "Learn the fundamentals of masonry, cement-to-sand ratio mixing, and alignment techniques.",
    duration: "12 mins"
  },
  {
    id: "lr-2",
    title: "Safe Electrical Practices for Daily Workers",
    trade: "Electrician",
    category: "safety" as const,
    type: "video" as const,
    link: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    description: "Essential site safety measures, personal protective equipment (PPE), and preventing electrical hazards.",
    duration: "15 mins"
  },
  {
    id: "lr-3",
    title: "Plumbing Pipes & Leak Repair Fundamentals",
    trade: "Plumber",
    category: "technical" as const,
    type: "video" as const,
    link: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    description: "A complete step-by-step video on using plumbing wrenches, sealing joints, and fixing pipe cracks.",
    duration: "10 mins"
  },
  {
    id: "lr-4",
    title: "Opening Zero-Balance Savings & Daily Wage Planning",
    trade: "All",
    category: "financial_literacy" as const,
    type: "guide" as const,
    link: "#",
    description: "A simple guide on opening basic savings accounts, secure mobile banking, and micro-savings strategies.",
    duration: "5 mins read"
  },
  {
    id: "lr-5",
    title: "Paint Selection and Smooth Application Techniques",
    trade: "Painter",
    category: "technical" as const,
    type: "video" as const,
    link: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    description: "How to prepare drywalls, calculate primers, apply paint coats evenly, and maintain rollers.",
    duration: "8 mins"
  }
];

const DEFAULT_JOBS = [
  {
    id: "job-1",
    employerId: "emp-demo-1",
    employerName: "Metro Build Corp",
    title: "Bricklayers & Helpers for Metro Project",
    trade: "Mason",
    description: "Requires 2 skilled bricklayers and 1 helper for building a boundary wall at the metro construction site. Cement, mortar, and tools are provided. Wage paid daily upon verification.",
    location: "Metro Station Gate 3, Central Area",
    wage: 850,
    startDate: "2026-07-01",
    endDate: "2026-07-05",
    slots: 3,
    slotsTaken: 0,
    status: "open" as const,
    createdAt: new Date().toISOString(),
    latitude: 12.9785,
    longitude: 77.5902
  },
  {
    id: "job-2",
    employerId: "emp-demo-2",
    employerName: "Rajesh Sharma (Independent Builder)",
    title: "Residential Plumbing Installation Support",
    trade: "Plumber",
    description: "Looking for an experienced plumber to help install PVC bathroom pipelines and drainage lines for a double-story house renovation. High probability of extension.",
    location: "Saraswati Vihar, Lane 5",
    wage: 950,
    startDate: "2026-07-02",
    endDate: "2026-07-03",
    slots: 1,
    slotsTaken: 0,
    status: "open" as const,
    createdAt: new Date().toISOString(),
    latitude: 12.9592,
    longitude: 77.6143
  },
  {
    id: "job-3",
    employerId: "emp-demo-1",
    employerName: "Metro Build Corp",
    title: "Site Wiring and Panel Board Assistant",
    trade: "Electrician",
    description: "Assistant electrician needed to wire temporary floodlights and main panels for the night shift crew. Safety harness and insulation gloves will be provided.",
    location: "Sector 14 Industrial Yard",
    wage: 900,
    startDate: "2026-07-01",
    endDate: "2026-07-02",
    slots: 1,
    slotsTaken: 0,
    status: "open" as const,
    createdAt: new Date().toISOString(),
    latitude: 12.9345,
    longitude: 77.5342
  },
  {
    id: "job-4",
    employerId: "emp-demo-3",
    employerName: "Apex Facility Management",
    title: "Office Painting Helpers",
    trade: "Painter",
    description: "Need 4 painters for commercial interior wall painting. Must know wall putty application and scraping. Brushes, paint, and ladders are on site.",
    location: "Tech Park Block C, Phase 2",
    wage: 750,
    startDate: "2026-07-03",
    endDate: "2026-07-08",
    slots: 4,
    slotsTaken: 0,
    status: "open" as const,
    createdAt: new Date().toISOString(),
    latitude: 12.9154,
    longitude: 77.6784
  }
];

// Helper to check and seed initial database data
export async function seedInitialDatabase() {
  seedLocalStorage();
  try {
    // 1. Seed Learning Resources
    const lrSnap = await getDocs(collection(db, "learning_resources"));
    if (lrSnap.empty) {
      for (const lr of DEFAULT_LEARNING_RESOURCES) {
        await setDoc(doc(db, "learning_resources", lr.id), lr);
      }
      console.log("Seeded learning resources.");
    }

    // 2. Seed Jobs
    const jobsSnap = await getDocs(collection(db, "jobs"));
    if (jobsSnap.empty) {
      for (const j of DEFAULT_JOBS) {
        await setDoc(doc(db, "jobs", j.id), j);
      }
      console.log("Seeded default jobs.");
    }

    // 3. Setup a generic Admin account in FireStore if it doesn't exist
    const adminUserDoc = await getDoc(doc(db, "users", "admin-demo-id"));
    if (!adminUserDoc.exists()) {
      await setDoc(doc(db, "users", "admin-demo-id"), {
        uid: "admin-demo-id",
        email: "admin@empowork.com",
        role: "admin",
        name: "EmpoWork System Admin",
        phone: "9999999999",
        location: "Central Operations Office",
        createdAt: new Date().toISOString(),
        statusState: "available"
      });
      console.log("Created demo admin user in Firestore.");
    }

    // 4. Setup default Worker (Daily Wage) Ramesh Kumar
    const workerLabourDoc = await getDoc(doc(db, "users", "worker-demo-id-123"));
    if (!workerLabourDoc.exists()) {
      await setDoc(doc(db, "users", "worker-demo-id-123"), {
        uid: "worker-demo-id-123",
        email: "worker@empowork.com",
        role: "worker",
        name: "Ramesh Kumar",
        phone: "9876543210",
        location: "Metropolitan Area",
        trade: "Mason",
        experience: "4 Years",
        bio: "Specialist in cement bricklaying, high-altitude plastering, and site wall constructions. Always punctual, focused on safety, and works hard with teams.",
        wageExpectation: 800,
        skills: ["Bricklaying", "Plastering", "Cement Mixing", "Safety Auditing"],
        workerType: "labour",
        createdAt: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
        statusState: "available"
      });
      console.log("Seeded Ramesh Kumar (Daily Worker) in Firestore.");
    }

    // 5. Setup default Worker (Employee) Sunil Verma
    const workerEmployeeDoc = await getDoc(doc(db, "users", "worker-demo-id-456"));
    if (!workerEmployeeDoc.exists()) {
      await setDoc(doc(db, "users", "worker-demo-id-456"), {
        uid: "worker-demo-id-456",
        email: "sunil@empowork.com",
        role: "worker",
        name: "Sunil Verma",
        phone: "9823456789",
        location: "East Sector Area",
        trade: "Electrician",
        experience: "5+ Years",
        bio: "Certified commercial electrical wireman. Specialized in heavy power panels, backup generators, and safety earthing installations.",
        wageExpectation: 950,
        skills: ["Panel wiring", "Phase Balance", "Earthing", "Power Tools"],
        workerType: "employee",
        createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
        statusState: "busy"
      });
      console.log("Seeded Sunil Verma (Employee) in Firestore.");
    }

    // 6. Setup default Employer Sanjay Singhania
    const employerDoc = await getDoc(doc(db, "users", "emp-demo-1"));
    if (!employerDoc.exists()) {
      await setDoc(doc(db, "users", "emp-demo-1"), {
        uid: "emp-demo-1",
        email: "employer@empowork.com",
        role: "employer",
        name: "Sanjay Singhania",
        phone: "9812345678",
        companyName: "Metro Build Corp",
        businessType: "Commercial & Civil Infrastructure",
        location: "Industrial District Gate 2",
        createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
        statusState: "available"
      });
      console.log("Seeded Sanjay Singhania (Employer) in Firestore.");
    }
  } catch (error) {
    console.error("Error seeding initial database: ", error);
    if (error instanceof Error && (error.message.includes("permission") || error.message.includes("Permission"))) {
      handleFirestoreError(error, OperationType.WRITE, "learning_resources");
    }
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  const jsonErrorString = JSON.stringify(errInfo);
  console.error('Firestore Error: ', jsonErrorString);
  throw new Error(jsonErrorString);
}

// --- LocalStorage Database Engine Fallback for Robustness ---
function getLocalCollection(collectionName: string): any[] {
  const data = localStorage.getItem(`empowork_db_${collectionName}`);
  return data ? JSON.parse(data) : [];
}

function saveLocalCollection(collectionName: string, items: any[]) {
  localStorage.setItem(`empowork_db_${collectionName}`, JSON.stringify(items));
}

function getLocalDoc(collectionName: string, docId: string): any | null {
  const items = getLocalCollection(collectionName);
  return items.find(item => item.id === docId || item.uid === docId) || null;
}

function setLocalDoc(collectionName: string, docId: string, data: any) {
  const items = getLocalCollection(collectionName);
  const index = items.findIndex(item => item.id === docId || item.uid === docId);
  const itemData = { ...data };
  if (docId) {
    if (collectionName === "users") {
      itemData.uid = docId;
    } else {
      itemData.id = docId;
    }
  }
  if (index >= 0) {
    items[index] = { ...items[index], ...itemData };
  } else {
    items.push(itemData);
  }
  saveLocalCollection(collectionName, items);
}

function deleteLocalDoc(collectionName: string, docId: string) {
  const items = getLocalCollection(collectionName);
  const filtered = items.filter(item => item.id !== docId && item.uid !== docId);
  saveLocalCollection(collectionName, filtered);
}

function getCollectionName(queryRef: any): string {
  const rawPath = String(queryRef?.path || queryRef?.query?.path || queryRef?._query?.path || queryRef?._query?.path?.segments?.join('/') || '');
  for (const name of ["users", "jobs", "job_applications", "attendance", "wage_payments", "complaints", "savings_goals", "learning_resources", "reviews", "contact_requests", "applicants", "wages", "emergencies", "audit_logs", "announcements"]) {
    if (rawPath.includes(name)) {
      return name;
    }
  }
  return "unknown";
}

export function seedLocalStorage() {
  if (localStorage.getItem("empowork_local_seeded") === "true") {
    return;
  }
  
  saveLocalCollection("learning_resources", DEFAULT_LEARNING_RESOURCES);
  saveLocalCollection("jobs", DEFAULT_JOBS);
  
  setLocalDoc("users", "admin-demo-id", {
    uid: "admin-demo-id",
    email: "admin@empowork.com",
    role: "admin",
    name: "EmpoWork System Admin",
    phone: "9999999999",
    location: "Central Operations Office",
    createdAt: new Date().toISOString(),
    statusState: "available"
  });
  
  setLocalDoc("users", "worker-demo-id-123", {
    uid: "worker-demo-id-123",
    email: "worker@empowork.com",
    role: "worker",
    name: "Ramesh Kumar",
    phone: "9876543210",
    location: "Metropolitan Area",
    trade: "Mason",
    experience: "4 Years",
    bio: "Specialist in cement bricklaying, high-altitude plastering, and site wall constructions. Always punctual, focused on safety, and works hard with teams.",
    wageExpectation: 800,
    skills: ["Bricklaying", "Plastering", "Cement Mixing", "Safety Auditing"],
    workerType: "labour",
    createdAt: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
    statusState: "available"
  });
  
  setLocalDoc("users", "worker-demo-id-456", {
    uid: "worker-demo-id-456",
    email: "sunil@empowork.com",
    role: "worker",
    name: "Sunil Verma",
    phone: "9823456789",
    location: "East Sector Area",
    trade: "Electrician",
    experience: "5+ Years",
    bio: "Certified commercial electrical wireman. Specialized in heavy power panels, backup generators, and safety earthing installations.",
    wageExpectation: 950,
    skills: ["Panel wiring", "Phase Balance", "Earthing", "Power Tools"],
    workerType: "employee",
    createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
    statusState: "busy"
  });
  
  setLocalDoc("users", "emp-demo-1", {
    uid: "emp-demo-1",
    email: "employer@empowork.com",
    role: "employer",
    name: "Sanjay Singhania",
    phone: "9812345678",
    companyName: "Metro Build Corp",
    businessType: "Commercial & Civil Infrastructure",
    location: "Industrial District Gate 2",
    createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    statusState: "available"
  });
  
  localStorage.setItem("empowork_local_seeded", "true");
  console.log("LocalStorage seeded with default offline data.");
}

// Intercept query & where to implement local filter evaluations
function where(fieldPath: string, opStr: string, value: any) {
  const realWhere = fWhere(fieldPath, opStr as any, value);
  (realWhere as any)._customFilter = { fieldPath, opStr, value };
  return realWhere;
}

function query(queryRef: any, ...queryConstraints: any[]) {
  const realQuery = fQuery(queryRef, ...queryConstraints);
  const filters = queryConstraints
    .filter(c => c && c._customFilter)
    .map(c => c._customFilter);
  
  (realQuery as any)._customFilters = filters;
  (realQuery as any)._customCollection = getCollectionName(queryRef);
  return realQuery;
}

// Mocks to satisfy QuerySnapshot & DocumentSnapshot interfaces
class MockQueryDocumentSnapshot {
  id: string;
  private _data: any;
  constructor(id: string, data: any) {
    this.id = id;
    this._data = data;
  }
  data(): any {
    return this._data;
  }
  exists(): boolean {
    return true;
  }
}

class MockQuerySnapshot {
  docs: MockQueryDocumentSnapshot[];
  empty: boolean;
  constructor(docs: MockQueryDocumentSnapshot[]) {
    this.docs = docs;
    this.empty = docs.length === 0;
  }
  forEach(callback: (doc: any) => void) {
    this.docs.forEach(callback);
  }
}

class MockDocumentSnapshot {
  id: string;
  private _data: any | null;
  constructor(id: string, data: any | null) {
    this.id = id;
    this._data = data;
  }
  exists(): boolean {
    return this._data !== null;
  }
  data(): any {
    return this._data || undefined;
  }
}

// Fast timeout helper to fall back to LocalStorage immediately if backend is unresponsive
function withTimeout<T>(promise: Promise<T>, timeoutMs = 1500): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      reject(new Error("Device is offline. Operating in offline mode."));
      return;
    }
    const timer = setTimeout(() => {
      reject(new Error("Timeout reaching Firestore backend. Operating in offline mode."));
    }, timeoutMs);
    promise.then(
      (res) => {
        clearTimeout(timer);
        resolve(res);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export async function getDoc<T = DocumentData>(documentRef: DocumentReference<T>): Promise<DocumentSnapshot<T>> {
  try {
    return await withTimeout(fGetDoc(documentRef));
  } catch (error: any) {
    console.warn("Firestore getDoc failed, attempting LocalStorage fallback:", error);
    const parts = documentRef.path.split('/');
    const collectionName = parts[0];
    const docId = parts[1];
    if (collectionName && docId) {
      const localData = getLocalDoc(collectionName, docId);
      return new MockDocumentSnapshot(docId, localData) as unknown as DocumentSnapshot<T>;
    }
    if (error?.code === 'permission-denied' || error?.message?.toLowerCase().includes('permission')) {
      handleFirestoreError(error, OperationType.GET, documentRef.path || 'unknown');
    }
    throw error;
  }
}

export async function getDocs<T = DocumentData>(queryRef: Query<T>): Promise<QuerySnapshot<T>> {
  try {
    return await withTimeout(fGetDocs(queryRef));
  } catch (error: any) {
    console.warn("Firestore getDocs failed, attempting LocalStorage fallback:", error);
    const collectionName = (queryRef as any)._customCollection || getCollectionName(queryRef);
    if (collectionName === "unknown") {
      if (error?.code === 'permission-denied' || error?.message?.toLowerCase().includes('permission')) {
        const path = (queryRef as any).path || (queryRef as any).query?.path || 'unknown';
        handleFirestoreError(error, OperationType.LIST, path);
      }
      throw error;
    }
    
    let items = getLocalCollection(collectionName);
    const filters = (queryRef as any)._customFilters || [];
    for (const filter of filters) {
      const { fieldPath, opStr, value } = filter;
      items = items.filter(item => {
        const itemValue = item[fieldPath];
        if (opStr === "==") {
          if (typeof itemValue === "string" && typeof value === "string") {
            return itemValue.toLowerCase().trim() === value.toLowerCase().trim();
          }
          return itemValue === value;
        }
        return true;
      });
    }
    
    const mockDocs = items.map(item => {
      const docId = item.id || item.uid || "unknown-id";
      return new MockQueryDocumentSnapshot(docId, item);
    });
    
    return new MockQuerySnapshot(mockDocs) as unknown as QuerySnapshot<T>;
  }
}

export async function setDoc<T = DocumentData>(documentRef: DocumentReference<T>, data: any, options?: any) {
  const parts = documentRef.path.split('/');
  const collectionName = parts[0];
  const docId = parts[1];
  if (collectionName && docId) {
    setLocalDoc(collectionName, docId, data);
  }
  try {
    return await withTimeout(fSetDoc(documentRef, data, options));
  } catch (error: any) {
    console.warn("Firestore setDoc failed, saved to LocalStorage offline cache:", error);
    if (error?.code === 'permission-denied' || error?.message?.toLowerCase().includes('permission')) {
      handleFirestoreError(error, OperationType.WRITE, documentRef.path || 'unknown');
    }
  }
}

export async function addDoc<T = DocumentData>(reference: any, data: any) {
  const collectionName = getCollectionName(reference);
  const docId = `local-id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  if (collectionName !== "unknown") {
    setLocalDoc(collectionName, docId, { ...data, id: docId });
  }
  try {
    const realDocRef = await withTimeout(fAddDoc(reference, data));
    if (collectionName !== "unknown") {
      deleteLocalDoc(collectionName, docId);
      setLocalDoc(collectionName, realDocRef.id, { ...data, id: realDocRef.id });
    }
    return realDocRef;
  } catch (error: any) {
    console.warn("Firestore addDoc failed, saved to LocalStorage offline cache:", error);
    if (error?.code === 'permission-denied' || error?.message?.toLowerCase().includes('permission')) {
      handleFirestoreError(error, OperationType.CREATE, reference.path || 'unknown');
    }
    return {
      id: docId,
      path: `${collectionName}/${docId}`,
    } as any;
  }
}

export async function updateDoc<T = DocumentData>(documentRef: DocumentReference<T>, data: any) {
  const parts = documentRef.path.split('/');
  const collectionName = parts[0];
  const docId = parts[1];
  if (collectionName && docId) {
    const current = getLocalDoc(collectionName, docId) || {};
    setLocalDoc(collectionName, docId, { ...current, ...data });
  }
  try {
    return await withTimeout(fUpdateDoc(documentRef, data));
  } catch (error: any) {
    console.warn("Firestore updateDoc failed, updated in LocalStorage offline cache:", error);
    if (error?.code === 'permission-denied' || error?.message?.toLowerCase().includes('permission')) {
      handleFirestoreError(error, OperationType.UPDATE, documentRef.path || 'unknown');
    }
  }
}

export async function deleteDoc<T = DocumentData>(documentRef: DocumentReference<T>) {
  const parts = documentRef.path.split('/');
  const collectionName = parts[0];
  const docId = parts[1];
  if (collectionName && docId) {
    deleteLocalDoc(collectionName, docId);
  }
  try {
    return await withTimeout(fDeleteDoc(documentRef));
  } catch (error: any) {
    console.warn("Firestore deleteDoc failed, deleted from LocalStorage offline cache:", error);
    if (error?.code === 'permission-denied' || error?.message?.toLowerCase().includes('permission')) {
      handleFirestoreError(error, OperationType.DELETE, documentRef.path || 'unknown');
    }
  }
}

export { 
  app, 
  db, 
  auth, 
  collection, 
  doc, 
  query, 
  where, 
  orderBy,
  limit,
  onSnapshot,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
};
