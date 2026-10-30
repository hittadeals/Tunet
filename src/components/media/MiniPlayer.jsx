import { memo } from 'react';
import { Music, Pause, Play, SkipBack, SkipForward } from '../../icons';

/**
 * Persistent now-playing bar shown above the page navigation.
 *
 * @param {{ entities: Record<string, any>, activeMediaId?: string | null, setActiveMediaId?: Function, callService: Function, getA: Function, getEntityImageUrl?: Function, isMediaActive?: Function, onOpen?: Function, t: Function }} props
 */
function MiniPlayer({
  entities,
  activeMediaId,
  setActiveMediaId,
  callService,
  getA,
  getEntityImageUrl,
  isMediaActive,
  onOpen,
  t,
}) {
  const players = Object.values(entities || {}).filter(
    (entity) => entity?.entity_id?.startsWith('media_player.')
  );
  if (players.length === 0) return null;

  const isActive = (player) =>
    typeof isMediaActive === 'function'
      ? isMediaActive(player)
      : ['playing', 'paused', 'buffering'].includes(player.state);
  const player =
    players.find((item) => item.entity_id === activeMediaId && isActive(item)) ||
    players.find(isActive);
  if (!player) return null;

  const entityId = player.entity_id;
  const isPlaying = player.state === 'playing';
  const title =
    getA(entityId, 'media_title') ||
    getA(entityId, 'media_channel') ||
    player.attributes?.friendly_name ||
    entityId;
  const artist =
    getA(entityId, 'media_artist') ||
    getA(entityId, 'media_album_name') ||
    player.attributes?.friendly_name;
  const rawPicture =
    getA(entityId, 'entity_picture') || getA(entityId, 'media_image_url');
  const picture = rawPicture && getEntityImageUrl ? getEntityImageUrl(rawPicture) : rawPicture;

  const open = () => {
    setActiveMediaId?.(entityId);
    onOpen?.();
  };

  return (
    <div
      className="fixed inset-x-3 z-40 mx-auto flex max-w-3xl items-center gap-2 rounded-2xl border border-[var(--surface-border)] px-2 py-2 shadow-lg backdrop-blur-md"
      style={{
        bottom: 'calc(4.9rem + env(safe-area-inset-bottom) * 0.5)',
        backgroundColor: 'color-mix(in srgb, var(--modal-bg) 90%, transparent)',
      }}
    >
      <button
        type="button"
        onClick={open}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--glass-bg)]">
          {picture ? (
            <img src={picture} alt="" className="h-full w-full object-cover" />
          ) : (
            <Music className="h-4 w-4 text-[var(--text-secondary)]" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-[var(--text-primary)]">
            {title}
          </span>
          <span className="block truncate text-[10px] text-[var(--text-secondary)]">
            {artist || t('media.mediaPlayer')}
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={() =>
          callService('media_player', 'media_previous_track', { entity_id: entityId })
        }
        aria-label={t('media.previous') || 'Previous'}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-hover)]"
      >
        <SkipBack className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        onClick={() => callService('media_player', 'media_play_pause', { entity_id: entityId })}
        aria-label={isPlaying ? t('media.pause') : t('media.play')}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-bg)] text-[var(--accent-color)]"
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>

      <button
        type="button"
        onClick={() => callService('media_player', 'media_next_track', { entity_id: entityId })}
        aria-label={t('media.next') || 'Next'}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-hover)]"
      >
        <SkipForward className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default memo(MiniPlayer);
