import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MiniPlayer from '../components/media/MiniPlayer';

describe('MiniPlayer', () => {
  const player = {
    entity_id: 'media_player.living_room',
    state: 'playing',
    attributes: { friendly_name: 'Living room' },
  };

  const renderPlayer = (overrides = {}) => {
    const callService = vi.fn();
    const onOpen = vi.fn();
    render(
      <MiniPlayer
        entities={{ [player.entity_id]: player }}
        activeMediaId={player.entity_id}
        setActiveMediaId={vi.fn()}
        callService={callService}
        getA={(entityId, attribute) =>
          entityId === player.entity_id && attribute === 'media_title' ? 'Song' : undefined
        }
        isMediaActive={(entity) => entity.state === 'playing'}
        onOpen={onOpen}
        t={(key) => key}
        {...overrides}
      />
    );
    return { callService, onOpen };
  };

  it('shows the current track and controls playback', () => {
    const { callService } = renderPlayer();
    expect(screen.getByText('Song')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'media.pause' }));
    expect(callService).toHaveBeenCalledWith('media_player', 'media_play_pause', {
      entity_id: player.entity_id,
    });
  });

  it('opens the media page from the track info', () => {
    const { onOpen } = renderPlayer();
    fireEvent.click(screen.getByText('Song'));
    expect(onOpen).toHaveBeenCalled();
  });
});
