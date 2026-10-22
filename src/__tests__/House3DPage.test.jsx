import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import House3DPage from '../components/pages/House3DPage';

const t = (key) => key;

const baseProps = {
  entities: {},
  callService: vi.fn(),
  conn: null,
  pageSettings: {},
  pageId: 'house_3d',
  savePageSetting: vi.fn(),
  t,
};

describe('House3DPage', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  it('falls back to the room list when WebGL is unavailable', () => {
    render(<House3DPage {...baseProps} />);

    expect(screen.getByText('house3d.title')).toBeInTheDocument();
    expect(screen.getByText('house3d.noWebgl')).toBeInTheDocument();
    expect(screen.getByText('Kök')).toBeInTheDocument();
    expect(screen.getByText('Vardagsrum')).toBeInTheDocument();
  });

  it('opens and closes the room panel from the room list', () => {
    render(<House3DPage {...baseProps} />);

    fireEvent.click(screen.getByText('Kök'));
    expect(screen.getByTestId('house3d-room-panel')).toBeInTheDocument();
    expect(screen.getByText('house3d.emptyRoom')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('common.close'));
    expect(screen.queryByTestId('house3d-room-panel')).not.toBeInTheDocument();
  });

  it('lists every floor option and toggles the sensor overlay', () => {
    render(<House3DPage {...baseProps} />);

    expect(screen.getByText('Entréplan')).toBeInTheDocument();
    expect(screen.getByText('Övre plan')).toBeInTheDocument();
    expect(screen.getByText('Alla plan')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /house3d.sensors/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });
});
