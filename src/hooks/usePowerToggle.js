import { useEffect, useRef, useState } from 'react';

/**
 * Grace period before an unanswered toggle stops blocking new requests.
 * Home Assistant confirms most toggles immediately, but an entity that does
 * not echo its state used to freeze the control for ten seconds.
 */
const UNCONFIRMED_RELEASE_MS = 1200;

/**
 * Toggle helper for on/off entities.
 *
 * The request is locked while it is in flight so a double tap cannot send two
 * conflicting service calls. The lock is released as soon as Home Assistant
 * confirms the new state, or after a short grace period if the entity stays
 * silent.
 */
export function usePowerToggle({ entityId, isOn, domain, callService, buildCall = undefined }) {
  const [pending, setPending] = useState(null);
  const requestRef = useRef(null);
  const releaseTimeoutRef = useRef(null);

  useEffect(
    () => () => {
      if (releaseTimeoutRef.current) clearTimeout(releaseTimeoutRef.current);
    },
    []
  );

  useEffect(() => {
    if (!pending) return;
    const clear = () => {
      requestRef.current = null;
      setPending(null);
    };
    if (pending.entityId !== entityId || pending.target === isOn) {
      clear();
      return;
    }
    const timeout = setTimeout(clear, 10000);
    return () => clearTimeout(timeout);
  }, [pending, entityId, isOn]);

  const togglePower = () => {
    if (!callService || !entityId || requestRef.current) return;
    const request = { entityId, target: !isOn };
    requestRef.current = request;
    setPending(request);

    const reset = () => {
      if (requestRef.current !== request) return;
      requestRef.current = null;
      setPending(null);
    };

    // If the entity never reports the new state, release the control again so
    // the user is not left with a dead button.
    const releaseWhenUnconfirmed = () => {
      if (releaseTimeoutRef.current) clearTimeout(releaseTimeoutRef.current);
      releaseTimeoutRef.current = setTimeout(() => {
        if (requestRef.current === request) reset();
      }, UNCONFIRMED_RELEASE_MS);
    };

    try {
      const call = buildCall?.() || {
        domain,
        service: isOn ? 'turn_off' : 'turn_on',
        data: { entity_id: entityId },
      };
      Promise.resolve(callService(call.domain, call.service, call.data)).then(
        () => {
          releaseWhenUnconfirmed();
        },
        reset
      );
    } catch {
      reset();
    }
  };

  return { isPending: pending !== null, togglePower };
}
