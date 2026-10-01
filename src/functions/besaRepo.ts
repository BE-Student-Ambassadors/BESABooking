import {
  collection,
  collectionGroup,
  getDocs,
  getFirestore,
  query,
  limit,
  Firestore,
} from "firebase/firestore";
import { getApp, getApps } from "firebase/app";

// ---- Types (match your app) ----
export type TimeSlot = { start: string; end: string };
export type OfficeHours = { available: boolean; timeSlots: TimeSlot[] };
export type Besa = {
  id: string;
  name: string;
  email: string;
  status: string;
  role: string;
  officeHours: {
    monday: OfficeHours; tuesday: OfficeHours; wednesday: OfficeHours;
    thursday: OfficeHours; friday: OfficeHours; saturday: OfficeHours; sunday: OfficeHours;
  };
};

function ensureDb(db?: Firestore): Firestore {
  if (db) return db;
  const app = getApps().length ? getApp() : undefined;
  if (!app) throw new Error("No Firebase app initialized.");
  const inferred = getFirestore(app);
  return inferred;
}

/**
 * Try to read BESAS as a TOP-LEVEL collection: /BESAS
 * Optionally prefilter by active status to cut read volume.
 */
export async function getBesasTopLevel(db?: Firestore): Promise<Besa[]> {
  const _db = ensureDb(db);
  try {
    // Optional: prefilter on active (requires 'status' field exactly 'active')
    const base = collection(_db, "Besas");
    // If you see permission errors, comment the query and start with plain getDocs(base)
    const q = query(base /*, where("status", "==", "active")*/, limit(200));
    const snap = await getDocs(q);

    const rows = snap.docs.map(d => ({ id: d.id, data: d.data() }));
    return rows.map(r => ({ id: r.id, ...(r.data as any) })) as Besa[];
  } catch (e: any) {
    console.error("Failed to fetch top-level BESAs:", e);
    return [];
  }
}

/**
 * Try to read BESAS as a COLLECTION GROUP (matches any .../BESAS under any parent).
 * Useful if your data lives at /Organizations/{orgId}/BESAS.
 */
export async function getBesasCollectionGroup(db?: Firestore): Promise<Besa[]> {
  const _db = ensureDb(db);
  try {
    const base = collectionGroup(_db, "Besas");
    const q = query(base /*, where("status", "==", "active")*/, limit(200));
    const snap = await getDocs(q);

    const rows = snap.docs.map(d => ({ id: d.id, data: d.data() }));
    return rows.map(r => ({ id: r.id, ...(r.data as any) })) as Besa[];
  } catch (e: any) {
    console.error("Failed to fetch BESA collection group:", e);
    return [];
  }
}

/**
 * Wrapper that tries top-level, then collection group.
 * Returns an empty list if neither location has any BESAs.
 */
export async function fetchBesas(db?: Firestore): Promise<Besa[]> {
  const top = await getBesasTopLevel(db);
  if (top.length) return top;

  const grp = await getBesasCollectionGroup(db);
  if (grp.length) return grp;

  return [];
}
