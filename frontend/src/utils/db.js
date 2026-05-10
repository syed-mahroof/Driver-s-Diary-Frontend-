import { openDB } from 'idb';

const DB_NAME = 'cabservice-offline';
const DB_VERSION = 2;
const RIDES_STORE = 'pending-rides';

let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(RIDES_STORE)) {
          const store = db.createObjectStore(RIDES_STORE, { keyPath: 'local_id' });
          store.createIndex('synced', 'synced');
          store.createIndex('driver_id', 'driver_id');
        }
      },
    });
  }
  return dbPromise;
}

export async function savePendingRide(ride) {
  const db = await getDB();
  const record = {
    local_id: ride.local_id || crypto.randomUUID(),
    driver_id: ride.driver_id,
    date: ride.date,
    company_id: ride.company_id || null,
    ride_time: ride.ride_time || null,
    trip_type: ride.trip_type || 'P',
    route: ride.route || '',
    pickup: ride.pickup || '',
    drop: ride.drop || '',
    notes: ride.notes || '',
    total_km: ride.total_km || null,
    vehicle_number: ride.vehicle_number || '',
    synced: false,
    created_at: new Date().toISOString(),
  };
  await db.put(RIDES_STORE, record);
  return record;
}

export async function getPendingRides() {
  const db = await getDB();
  const all = await db.getAll(RIDES_STORE);
  return all.filter(r => !r.synced);
}

export async function markRideSynced(local_id) {
  const db = await getDB();
  const ride = await db.get(RIDES_STORE, local_id);
  if (ride) {
    ride.synced = true;
    await db.put(RIDES_STORE, ride);
  }
}

export async function clearSyncedRides() {
  const db = await getDB();
  const all = await db.getAll(RIDES_STORE);
  const synced = all.filter(r => r.synced);
  const tx = db.transaction(RIDES_STORE, 'readwrite');
  await Promise.all(synced.map(r => tx.store.delete(r.local_id)));
  await tx.done;
}

export async function countPendingRides() {
  const pending = await getPendingRides();
  return pending.length;
}
