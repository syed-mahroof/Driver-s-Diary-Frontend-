import { useState, useEffect, useCallback } from 'react';
import { getPendingRides, markRideSynced, clearSyncedRides, countPendingRides } from '../utils/db';
import { driverAPI } from '../utils/api';

export function useSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);

  const refreshPendingCount = useCallback(async () => {
    const count = await countPendingRides();
    setPendingCount(count);
  }, []);

  const syncNow = useCallback(async () => {
    if (!navigator.onLine || syncing) return;
    const pending = await getPendingRides();
    if (pending.length === 0) return;

    setSyncing(true);
    try {
      const payload = pending.map(r => ({
        local_id: r.local_id,
        company_id: r.company_id,
        date: r.date,
        ride_time: r.ride_time,
        trip_type: r.trip_type,
        route: r.route,
        pickup: r.pickup,
        drop: r.drop,
        notes: r.notes,
        total_km: r.total_km,
        vehicle_number: r.vehicle_number,
        requested_seater: r.requested_seater,
      }));

      const { data } = await driverAPI.syncRides(payload);

      for (const local_id of data.synced) {
        await markRideSynced(local_id);
      }
      await clearSyncedRides();
      await refreshPendingCount();
      setLastSynced(new Date());
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  }, [syncing, refreshPendingCount]);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      syncNow();
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    refreshPendingCount();

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [syncNow, refreshPendingCount]);

  // Auto-sync every 30 seconds when online
  useEffect(() => {
    if (!isOnline) return;
    const interval = setInterval(syncNow, 30000);
    return () => clearInterval(interval);
  }, [isOnline, syncNow]);

  return { isOnline, pendingCount, syncing, lastSynced, syncNow, refreshPendingCount };
}
