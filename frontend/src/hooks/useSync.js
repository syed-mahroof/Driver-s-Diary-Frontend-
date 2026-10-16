import { useState, useEffect, useCallback, useRef } from 'react';
import { getPendingRides, markRideSynced, clearSyncedRides, countPendingRides } from '../utils/db';
import { driverAPI } from '../utils/api';

export function useSync(ownerId) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const syncLock = useRef(false);
  const mounted = useRef(false);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const refreshPendingCount = useCallback(async () => {
    const count = await countPendingRides(ownerId);
    if (mounted.current) setPendingCount(count);
  }, [ownerId]);

  const syncNow = useCallback(async () => {
    if (!navigator.onLine || syncLock.current || ownerId == null) return;
    syncLock.current = true;
    try {
      const pending = await getPendingRides(ownerId);
      if (!pending.length || !mounted.current) return;
      const account = JSON.parse(localStorage.getItem('user') || 'null');
      if (account?.id !== ownerId) return;
      setSyncing(true);
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

      for (const local_id of [...data.synced, ...data.skipped]) {
        await markRideSynced(local_id);
      }
      await clearSyncedRides();
      await refreshPendingCount();
      if (mounted.current) setLastSynced(new Date());
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      syncLock.current = false;
      if (mounted.current) setSyncing(false);
    }
  }, [ownerId, refreshPendingCount]);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      syncNow();
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    refreshPendingCount();
    syncNow();

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
