import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchCurrentSettings as apiFetchCurrentSettings,
  fetchSettingsHistory as apiFetchSettingsHistory,
  deleteSettingsHistory as apiDeleteSettingsHistory,
  deleteSettingsDevice as apiDeleteSettingsDevice,
  updateSettingsDeviceLabel as apiUpdateSettingsDeviceLabel,
  saveCurrentSettings as apiSaveCurrentSettings,
  fetchCurrentDevices as apiFetchCurrentDevices,
  publishCurrentSettings as apiPublishCurrentSettings,
} from '../services/settingsApi';
import { collectSnapshot, applySnapshot, isValidSnapshot } from '../services/snapshot';

const createDeviceId = () => {
  const webCrypto = globalThis.window?.crypto ?? globalThis.crypto;
  if (webCrypto && typeof webCrypto.randomUUID === 'function') {
    return webCrypto.randomUUID();
  }

  if (webCrypto && typeof webCrypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    webCrypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
    return `device_${hex}`;
  }

  const epoch = Date.now().toString(36);
  const perfNow = Math.trunc(globalThis.performance?.now?.() || 0).toString(36);
  return `device_${epoch}_${perfNow}`;
};

const getOrCreateDeviceId = () => {
  const key = 'tunet_device_id';
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const next = createDeviceId();
    localStorage.setItem(key, next);
    return next;
  } catch {
    return createDeviceId();
  }
};

const clampHistoryKeepLimit = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 50;
  return Math.min(Math.max(Math.trunc(parsed), 5), 500);
};

const getStoredDeviceLabel = () => {
  try {
    return (localStorage.getItem('tunet_device_label') || '').trim();
  } catch {
    return '';
  }
};

const hasDefaultDashboardLayout = (snapshot) => {
  const layout = snapshot?.layout;
  if (!layout) return false;
  const pagesConfig = layout.pagesConfig || {};
  const pages = Array.isArray(pagesConfig.pages) ? pagesConfig.pages : [];
  const header = Array.isArray(pagesConfig.header) ? pagesConfig.header : [];
  const homeCards = Array.isArray(pagesConfig.home) ? pagesConfig.home : [];
  if (pages.length !== 1 || pages[0] !== 'home' || header.length > 0 || homeCards.length > 0) {
    return false;
  }
  const isEmptyObject = (value) =>
    value == null || (typeof value === 'object' && Object.keys(value).length === 0);
  const isEmptyArray = (value) => value == null || (Array.isArray(value) && value.length === 0);
  return (
    isEmptyObject(layout.cardSettings) &&
    isEmptyObject(layout.customNames) &&
    isEmptyObject(layout.customIcons) &&
    isEmptyObject(layout.customArt) &&
    isEmptyObject(layout.pageSettings) &&
    isEmptyArray(layout.hiddenCards)
  );
};

const READ_CURRENT_FAILED = Symbol('READ_CURRENT_FAILED');
const isServiceUnavailableError = (error) => Number(error?.status) === 503;

/**
 * Serialized hash of the local snapshot, or an empty string when it cannot be
 * collected. Used to tell "the user changed something locally" apart from
 * "the server changed something".
 */
const getLocalSnapshotHash = () => {
  try {
    const snapshot = collectSnapshot();
    if (!isValidSnapshot(snapshot)) return '';
    return JSON.stringify(snapshot);
  } catch {
    return '';
  }
};

export function useSettingsSync({ haUserId, contextSettersRef, autoBootstrap = true }) {
  const deviceIdRef = useRef(getOrCreateDeviceId());
  const deviceLabelRef = useRef(getStoredDeviceLabel());
  const [enabled, setEnabled] = useState(() => {
    try {
      const raw = localStorage.getItem('tunet_auto_sync_enabled');
      return raw == null ? true : raw !== '0';
    } catch {
      return true;
    }
  });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [currentRevision, setCurrentRevisionState] = useState(null);
  const [conflictRevision, setConflictRevision] = useState(null);
  const [knownDevices, setKnownDevices] = useState([]);
  const [history, setHistory] = useState([]);
  const [backgroundSyncSuspended, setBackgroundSyncSuspendedState] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [removingDeviceId, setRemovingDeviceId] = useState('');
  const [updatingDeviceId, setUpdatingDeviceId] = useState('');
  const [historyKeepLimit, setHistoryKeepLimit] = useState(() => {
    try {
      const raw = localStorage.getItem('tunet_history_keep_limit');
      return clampHistoryKeepLimit(raw ?? 50);
    } catch {
      return 50;
    }
  });

  const autoSyncTimerRef = useRef(null);
  const syncInFlightRef = useRef(false);
  const lastObservedHashRef = useRef('');
  const lastUploadedHashRef = useRef('');
  const lastServerHashRef = useRef('');
  const conflictRef = useRef(false);
  const pushCurrentToServerRef = useRef(null);
  const backgroundSyncSuspendedRef = useRef(false);
  const currentRevisionRef = useRef(null);

  const setCurrentRevision = useCallback((nextRevision) => {
    const normalized = Number.isFinite(Number(nextRevision)) ? Number(nextRevision) : null;
    currentRevisionRef.current = normalized;
    setCurrentRevisionState(normalized);
    return normalized;
  }, []);

  const setBackgroundSyncSuspended = useCallback((next) => {
    backgroundSyncSuspendedRef.current = next;
    setBackgroundSyncSuspendedState(next);
    if (next && autoSyncTimerRef.current) {
      clearTimeout(autoSyncTimerRef.current);
      autoSyncTimerRef.current = null;
    }
  }, []);

  const updateBackgroundSyncAvailability = useCallback(
    (isAvailable, error = null) => {
      if (isAvailable) {
        if (backgroundSyncSuspendedRef.current) {
          setBackgroundSyncSuspended(false);
        }
        return;
      }

      if (isServiceUnavailableError(error)) {
        setBackgroundSyncSuspended(true);
      }
    },
    [setBackgroundSyncSuspended]
  );

  useEffect(() => {
    try {
      localStorage.setItem('tunet_auto_sync_enabled', enabled ? '1' : '0');
    } catch {
      // ignore storage errors
    }
  }, [enabled]);

  useEffect(() => {
    try {
      localStorage.setItem(
        'tunet_history_keep_limit',
        String(clampHistoryKeepLimit(historyKeepLimit))
      );
    } catch {
      // ignore storage errors
    }
  }, [historyKeepLimit]);

  const refreshKnownDevices = useCallback(async () => {
    if (!haUserId) return;
    try {
      const rows = await apiFetchCurrentDevices(haUserId);
      updateBackgroundSyncAvailability(true);
      setKnownDevices(Array.isArray(rows) ? rows : []);
    } catch (error) {
      updateBackgroundSyncAvailability(false, error);
      // ignore device list errors
    }
  }, [haUserId, updateBackgroundSyncAvailability]);

  const refreshHistory = useCallback(async () => {
    if (!haUserId) return;
    try {
      const rows = await apiFetchSettingsHistory(haUserId, deviceIdRef.current, 30);
      updateBackgroundSyncAvailability(true);
      setHistory(Array.isArray(rows) ? rows : []);
    } catch (error) {
      updateBackgroundSyncAvailability(false, error);
      setHistory([]);
    }
  }, [haUserId, updateBackgroundSyncAvailability]);

  const readCurrentFromServer = useCallback(async () => {
    if (!haUserId) return null;
    try {
      const row = await apiFetchCurrentSettings(haUserId, deviceIdRef.current);
      updateBackgroundSyncAvailability(true);
      if (row && typeof row === 'object') {
        setCurrentRevision(Number.isFinite(Number(row.revision)) ? Number(row.revision) : null);
        if (typeof row.device_label === 'string') {
          deviceLabelRef.current = row.device_label.trim();
          try {
            localStorage.setItem('tunet_device_label', deviceLabelRef.current);
          } catch {
            // ignore storage errors
          }
        }
        const serialized = JSON.stringify(row.data || {});
        // The baseline is what the server has confirmed *for this device*.
        // Only treat the server payload as our baseline when the device is
        // actually in sync with it, otherwise a customized device would
        // silently overwrite the shared config on the next push.
        if (!getLocalSnapshotHash() || getLocalSnapshotHash() === serialized) {
          lastUploadedHashRef.current = serialized;
        }
        lastServerHashRef.current = serialized;
        lastObservedHashRef.current = serialized;
        setLastSyncedAt(row.updated_at || null);
        setStatus('synced');
      }
      return row;
    } catch (fetchError) {
      updateBackgroundSyncAvailability(false, fetchError);
      setStatus('error');
      setError(fetchError?.message || 'Failed to fetch current settings');
      return READ_CURRENT_FAILED;
    }
  }, [haUserId, setCurrentRevision, updateBackgroundSyncAvailability]);

  const applyServerRow = useCallback(
    async (row, options = {}) => {
      if (!row || typeof row !== 'object' || !Number.isFinite(Number(row.revision))) return false;

      const forcedServerRevision = Number.isFinite(Number(options.forceServerRevision))
        ? Number(options.forceServerRevision)
        : null;
      const serverRevision = Number(row.revision);
      const localRevision = Number.isFinite(Number(currentRevisionRef.current))
        ? Number(currentRevisionRef.current)
        : 0;
      if (forcedServerRevision !== null && serverRevision < forcedServerRevision) return false;
      if (
        forcedServerRevision === null &&
        !options.allowSameRevision &&
        serverRevision <= localRevision
      ) {
        return false;
      }

      let localSnapshot = null;
      let localSerialized =
        typeof options.localSerializedOverride === 'string' ? options.localSerializedOverride : '';
      if (!localSerialized) {
        try {
          localSnapshot = collectSnapshot();
          if (isValidSnapshot(localSnapshot)) {
            localSerialized = JSON.stringify(localSnapshot);
          } else {
            localSnapshot = null;
          }
        } catch {
          localSerialized = '';
        }
      }

      const hasKnownBaseline = Boolean(lastUploadedHashRef.current);
      const serverSerialized = JSON.stringify(row.data || {});

      // Never overwrite local edits with the server copy:
      //  - with a baseline, the server copy is only adopted when the local
      //    state still matches what the server has for this device;
      //  - without a baseline, the server copy is only adopted by a device
      //    that still has the factory dashboard.
      // Everything else keeps the local state; the pending local edit is
      // pushed later and the server rejects it with a conflict if the shared
      // config moved on in the meantime.
      const localMatchesBaseline =
        hasKnownBaseline && Boolean(localSerialized) && localSerialized === lastUploadedHashRef.current;
      const canAdopt =
        localMatchesBaseline ||
        (!hasKnownBaseline && options.allowAdopt && hasDefaultDashboardLayout(localSnapshot));

      if (!canAdopt) {
        return false;
      }

      if (!row.data || typeof row.data !== 'object') return false;
      applySnapshot(row.data, contextSettersRef?.current || {});

      const serialized = serverSerialized;
      lastUploadedHashRef.current = serialized;
      lastServerHashRef.current = serialized;
      lastObservedHashRef.current = serialized;
      setCurrentRevision(serverRevision);
      setLastSyncedAt(row.updated_at || null);
      setStatus('synced');
      setError('');
      await refreshHistory();
      return true;
    },
    [contextSettersRef, refreshHistory, setCurrentRevision]
  );

  const applyServerRowRef = useRef(null);
  applyServerRowRef.current = applyServerRow;

  const reconcileFromServer = useCallback(
    async (options = {}) => {
      if (!haUserId) return false;

      const forcedServerRevision = Number.isFinite(Number(options.forceServerRevision))
        ? Number(options.forceServerRevision)
        : null;

      try {
        const row = await apiFetchCurrentSettings(haUserId, deviceIdRef.current);
        updateBackgroundSyncAvailability(true);
        return applyServerRow(row, { ...options, forceServerRevision: forcedServerRevision });
      } catch (error) {
        updateBackgroundSyncAvailability(false, error);
        // ignore reconciliation errors
        return false;
      }
    },
    [haUserId, applyServerRow, updateBackgroundSyncAvailability]
  );

  const pushCurrentToServer = useCallback(
    async (options = {}) => {
      if (!haUserId) return null;

      const snapshot = collectSnapshot();
      if (!isValidSnapshot(snapshot)) {
        const validationError = new Error('Invalid snapshot data');
        setStatus('error');
        setError(validationError.message);
        throw validationError;
      }

      const serialized = JSON.stringify(snapshot);
      if (!options.force && serialized === lastUploadedHashRef.current) {
        return null;
      }

      setStatus('syncing');
      setError('');

      const saveSnapshot = (baseRevision) =>
        apiSaveCurrentSettings(
          {
            ha_user_id: haUserId,
            device_id: deviceIdRef.current,
            data: snapshot,
            base_revision: baseRevision,
            history_keep_limit: clampHistoryKeepLimit(historyKeepLimit),
            device_label: deviceLabelRef.current || undefined,
          },
          options.fetchOptions || {}
        );

      const markSaveSynced = async (response) => {
        const resolvedRevision = Number.isFinite(Number(response?.revision))
          ? Number(response.revision)
          : currentRevisionRef.current;
        setCurrentRevision(resolvedRevision);
        setLastSyncedAt(response?.updated_at || new Date().toISOString());
        setStatus('synced');
        setError('');
        conflictRef.current = false;
        setConflictRevision(null);
        lastUploadedHashRef.current = serialized;
        lastServerHashRef.current = serialized;
        lastObservedHashRef.current = serialized;
        await refreshKnownDevices();
        await refreshHistory();
        return response;
      };

      try {
        const response = await saveSnapshot(currentRevisionRef.current);

        updateBackgroundSyncAvailability(true);
        return markSaveSynced(response);
      } catch (saveError) {
        if (saveError?.status === 409 && Number.isFinite(Number(saveError?.body?.revision))) {
          const conflictRevision = Number(saveError.body.revision);
          setCurrentRevision(conflictRevision);
          setConflictRevision(conflictRevision);
          setStatus('conflict');
          conflictRef.current = true;
          const hasLocalChanges =
            !lastUploadedHashRef.current || serialized !== lastUploadedHashRef.current;

          if (!hasLocalChanges) {
            const appliedServer = await reconcileFromServer({
              forceServerRevision: conflictRevision,
              localSerializedOverride: serialized,
            });
            if (appliedServer) return null;
          }

          // Another device changed the shared config while this one had local
          // edits. Overwriting it silently is what used to lose work, so the
          // automatic sync stops here and the user decides: pull the server
          // version or push the local one on purpose.
          if (!options.overwriteConflicts) {
            updateBackgroundSyncAvailability(true);
            throw saveError;
          }

          try {
            const response = await saveSnapshot(conflictRevision);
            updateBackgroundSyncAvailability(true);
            return markSaveSynced(response);
          } catch (retryError) {
            if (retryError?.status === 409 && Number.isFinite(Number(retryError?.body?.revision))) {
              setCurrentRevision(Number(retryError.body.revision));
              setConflictRevision(Number(retryError.body.revision));
              setStatus('conflict');
              conflictRef.current = true;
            } else {
              setStatus('error');
              setError(retryError?.message || 'Failed to sync settings');
            }
            updateBackgroundSyncAvailability(false, retryError);
            throw retryError;
          }
        } else {
          setStatus('error');
          setError(saveError?.message || 'Failed to sync settings');
        }
        updateBackgroundSyncAvailability(false, saveError);
        throw saveError;
      }
    },
    [
      haUserId,
      historyKeepLimit,
      reconcileFromServer,
      refreshKnownDevices,
      refreshHistory,
      setCurrentRevision,
      updateBackgroundSyncAvailability,
    ]
  );

  pushCurrentToServerRef.current = pushCurrentToServer;

  const queueAutoSync = useCallback(
    (
      force = false,
      { ignoreEnabled = false, ignoreSuspended = false, overwriteConflicts = false } = {}
    ) => {
      if ((!enabled && !ignoreEnabled) || !haUserId) return;
      if (backgroundSyncSuspendedRef.current && !ignoreSuspended) return;
      // A pending conflict is resolved by the user, not by another automatic
      // push. Overwriting the shared config behind their back is what used to
      // lose work.
      if (conflictRef.current && !overwriteConflicts) return;

      const snapshot = collectSnapshot();
      if (!isValidSnapshot(snapshot)) return;
      const serialized = JSON.stringify(snapshot);

      if (!force && serialized === lastObservedHashRef.current) return;
      lastObservedHashRef.current = serialized;

      if (autoSyncTimerRef.current) clearTimeout(autoSyncTimerRef.current);
      autoSyncTimerRef.current = setTimeout(
        async () => {
          if (syncInFlightRef.current) return;
          syncInFlightRef.current = true;
          try {
            await pushCurrentToServer({ force, overwriteConflicts });
          } catch {
            // state already handled
          } finally {
            syncInFlightRef.current = false;
          }
        },
        force ? 0 : 3500
      );
    },
    [enabled, haUserId, pushCurrentToServer]
  );

  useEffect(() => {
    if (!autoBootstrap || !haUserId || backgroundSyncSuspended) return;
    let disposed = false;

    const bootstrap = async () => {
      const row = await readCurrentFromServer();
      if (disposed) return;

      if (row === READ_CURRENT_FAILED) {
        if (!backgroundSyncSuspendedRef.current) {
          await refreshKnownDevices();
          await refreshHistory();
        }
        return;
      }

      if (!row) {
        try {
          await pushCurrentToServerRef.current?.({ force: true });
        } catch {
          // ignore bootstrap errors
        }
      } else if (row.data) {
        // Fresh device (default dashboard) with existing server settings:
        // adopt them locally. A device that already has a customized dashboard
        // keeps it and reports a conflict instead of losing local work.
        const adopted = await applyServerRowRef.current?.(row, {
          allowAdopt: true,
          allowSameRevision: true,
        });
        if (!adopted && row.data) {
          // The device has a local setup the server does not know about. It
          // is kept; the next deliberate edit pushes it, and the server
          // rejects the push if the shared config moved on in the meantime.
          setStatus('idle');
        }
      }

      if (disposed || backgroundSyncSuspendedRef.current) return;
      await refreshKnownDevices();
      await refreshHistory();
    };

    bootstrap();
    return () => {
      disposed = true;
    };
  }, [
    autoBootstrap,
    haUserId,
    backgroundSyncSuspended,
    readCurrentFromServer,
    refreshKnownDevices,
    refreshHistory,
  ]);

  useEffect(() => {
    if (!autoBootstrap || !haUserId || backgroundSyncSuspended) return;
    // 15s is enough to notice a change from another device without keeping a
    // 4s timer running on battery-powered tablets.
    const id = setInterval(() => {
      reconcileFromServer();
    }, 15000);
    return () => clearInterval(id);
  }, [autoBootstrap, haUserId, reconcileFromServer, backgroundSyncSuspended]);

  useEffect(() => {
    if (!haUserId || typeof globalThis.window === 'undefined') return undefined;

    const handleEditDone = () => {
      queueAutoSync(true, { ignoreEnabled: true });
    };

    globalThis.window.addEventListener('tunet:edit-done', handleEditDone);
    return () => {
      globalThis.window.removeEventListener('tunet:edit-done', handleEditDone);
    };
  }, [haUserId, queueAutoSync]);

  const loadCurrentFromServer = useCallback(
    async (revision) => {
      const row = Number.isFinite(Number(revision))
        ? await apiFetchCurrentSettings(haUserId, deviceIdRef.current, Number(revision))
        : await readCurrentFromServer();
      if (row === READ_CURRENT_FAILED) return;
      if (!row?.data || typeof row.data !== 'object') return;

      if (Number.isFinite(Number(row.revision))) {
        setCurrentRevision(Number(row.revision));
      }
      if (row.updated_at) {
        setLastSyncedAt(row.updated_at);
      }

      applySnapshot(row.data, contextSettersRef?.current || {});
      // Pulling is an explicit "the server wins" decision: the pulled payload
      // becomes the new baseline for this device.
      const serialized = JSON.stringify(row.data || {});
      lastUploadedHashRef.current = serialized;
      lastServerHashRef.current = serialized;
      lastObservedHashRef.current = serialized;
      setConflictRevision(null);
      setStatus('synced');
      setError('');
    },
    [haUserId, readCurrentFromServer, contextSettersRef, setCurrentRevision]
  );

  const publishCurrentToDevices = useCallback(
    async (targetDeviceIds) => {
      if (!haUserId) return;
      setPublishing(true);
      setError('');
      try {
        await pushCurrentToServer({ force: true, overwriteConflicts: true });

        const normalizedTargets = Array.isArray(targetDeviceIds)
          ? [
              ...new Set(
                targetDeviceIds
                  .filter((id) => typeof id === 'string' && id.trim())
                  .map((id) => id.trim())
              ),
            ]
          : [];

        // Tell the server which revision we expect on each target. A target
        // that changed since we last saw it is left alone and reported back
        // instead of being overwritten.
        const baseRevisions = Object.fromEntries(
          knownDevices
            .filter((device) => device?.device_id && Number.isFinite(Number(device.revision)))
            .map((device) => [device.device_id, Number(device.revision)])
        );

        if (normalizedTargets.length === 0) {
          await apiPublishCurrentSettings({
            ha_user_id: haUserId,
            source_device_id: deviceIdRef.current,
            target_device_id: undefined,
            history_keep_limit: clampHistoryKeepLimit(historyKeepLimit),
            base_revisions: baseRevisions,
          });
        } else {
          await Promise.all(
            normalizedTargets.map((targetDeviceId) =>
              apiPublishCurrentSettings({
                ha_user_id: haUserId,
                source_device_id: deviceIdRef.current,
                target_device_id: targetDeviceId,
                history_keep_limit: clampHistoryKeepLimit(historyKeepLimit),
                base_revisions: baseRevisions,
              })
            )
          );
        }
        await refreshKnownDevices();
        await refreshHistory();
      } catch (publishError) {
        setStatus('error');
        setError(publishError?.message || 'Failed to publish settings');
        throw publishError;
      } finally {
        setPublishing(false);
      }
    },
    [
      haUserId,
      historyKeepLimit,
      knownDevices,
      pushCurrentToServer,
      refreshKnownDevices,
      refreshHistory,
    ]
  );

  const clearHistory = useCallback(async () => {
    if (!haUserId) return;
    setClearingHistory(true);
    setError('');
    try {
      await apiDeleteSettingsHistory(haUserId, deviceIdRef.current, true);
      await refreshHistory();
    } catch (historyError) {
      setStatus('error');
      setError(historyError?.message || 'Failed to clear revision history');
      throw historyError;
    } finally {
      setClearingHistory(false);
    }
  }, [haUserId, refreshHistory]);

  const removeKnownDevice = useCallback(
    async (targetDeviceId) => {
      if (!haUserId || !targetDeviceId) return;
      if (targetDeviceId === deviceIdRef.current) {
        const removeCurrentError = new Error('Cannot remove current device');
        setStatus('error');
        setError(removeCurrentError.message);
        throw removeCurrentError;
      }

      setRemovingDeviceId(targetDeviceId);
      setError('');
      try {
        await apiDeleteSettingsDevice(haUserId, targetDeviceId);
        await refreshKnownDevices();
      } catch (removeError) {
        setStatus('error');
        setError(removeError?.message || 'Failed to remove device');
        throw removeError;
      } finally {
        setRemovingDeviceId('');
      }
    },
    [haUserId, refreshKnownDevices]
  );

  const renameKnownDevice = useCallback(
    async (targetDeviceId, nextLabel) => {
      if (!haUserId || !targetDeviceId) return;

      setUpdatingDeviceId(targetDeviceId);
      setError('');
      try {
        await apiUpdateSettingsDeviceLabel(haUserId, targetDeviceId, nextLabel);
        if (targetDeviceId === deviceIdRef.current) {
          const normalized = typeof nextLabel === 'string' ? nextLabel.trim() : '';
          deviceLabelRef.current = normalized;
          try {
            localStorage.setItem('tunet_device_label', normalized);
          } catch {
            // ignore storage errors
          }
        }
        await refreshKnownDevices();
      } catch (renameError) {
        setStatus('error');
        setError(renameError?.message || 'Failed to rename device');
        throw renameError;
      } finally {
        setUpdatingDeviceId('');
      }
    },
    [haUserId, refreshKnownDevices]
  );

  return {
    enabled,
    setEnabled,
    status,
    error,
    conflictRevision,
    backgroundSyncSuspended,
    lastSyncedAt,
    deviceId: deviceIdRef.current,
    currentRevision,
    knownDevices,
    history,
    publishing,
    clearingHistory,
    removingDeviceId,
    updatingDeviceId,
    historyKeepLimit,
    setHistoryKeepLimit,
    syncNow: () => queueAutoSync(true, { ignoreEnabled: true, ignoreSuspended: true }),
    loadCurrentFromServer,
    publishCurrentToDevices,
    clearHistory,
    removeKnownDevice,
    renameKnownDevice,
    refreshKnownDevices,
    /**
     * Push the local configuration over the server copy on purpose. Only used
     * from the explicit "overwrite" action after a conflict was reported.
     */
    overwriteServerWithLocal: () =>
      pushCurrentToServer({ force: true, overwriteConflicts: true }),
  };
}
