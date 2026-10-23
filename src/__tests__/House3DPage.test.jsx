import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
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

const lightEntity = {
  'light.kok_tak': {
    state: 'on',
    attributes: { friendly_name: 'Kök tak', brightness: 180 },
  },
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

  it('binds a device to the active room from the editor', () => {
    const savePageSetting = vi.fn();
    render(<House3DPage {...baseProps} entities={lightEntity} savePageSetting={savePageSetting} />);

    fireEvent.click(screen.getByRole('button', { name: /house3d.devices/ }));
    expect(screen.getByTestId('house3d-binding-editor')).toBeInTheDocument();
    expect(screen.getByText('light.kok_tak')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /house3d.bind.add/ }));
    expect(savePageSetting).toHaveBeenCalledWith('house_3d', 'houseBindings', {
      rooms: { hall: ['light.kok_tak'] },
      doors: {},
    });
  });

  it('opens the device editor for the selected room from its panel', () => {
    render(<House3DPage {...baseProps} />);

    fireEvent.click(screen.getByText('Kök'));
    const panel = screen.getByTestId('house3d-room-panel');
    fireEvent.click(within(panel).getAllByRole('button', { name: /house3d.bind.addDevices/ })[0]);

    const editor = screen.getByTestId('house3d-binding-editor');
    expect(editor).toBeInTheDocument();
    expect(within(editor).getByRole('button', { name: 'Kök' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('shows an add-devices shortcut on an empty house', () => {
    render(<House3DPage {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: /house3d.bind.emptyHint/ }));
    expect(screen.getByTestId('house3d-binding-editor')).toBeInTheDocument();
  });

  it('shows bound devices in the room panel', () => {
    render(
      <House3DPage
        {...baseProps}
        entities={lightEntity}
        pageSettings={{
          house_3d: { houseBindings: { rooms: { kok: ['light.kok_tak'] }, doors: {} } },
        }}
      />
    );

    fireEvent.click(screen.getByText('Kök'));
    expect(screen.getByTestId('house3d-room-panel')).toBeInTheDocument();
    expect(screen.getAllByText('Kök tak').length).toBeGreaterThan(0);
    expect(screen.queryByText('house3d.emptyRoom')).not.toBeInTheDocument();
  });

  it('binds a door sensor and reports open doors', () => {
    render(
      <House3DPage
        {...baseProps}
        entities={{
          'binary_sensor.ytterdorr': {
            state: 'on',
            attributes: { friendly_name: 'Ytterdörr', device_class: 'door' },
          },
        }}
        pageSettings={{
          house_3d: {
            houseBindings: { rooms: {}, doors: { front: 'binary_sensor.ytterdorr' } },
          },
        }}
      />
    );

    expect(screen.getByText(/1 house3d.openDoors/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /house3d.devices/ }));
    fireEvent.click(screen.getByRole('button', { name: /house3d.bind.doors/ }));
    expect(screen.getByLabelText('Ytterdörr')).toBeInTheDocument();
    expect(screen.getByText('house3d.door.open')).toBeInTheDocument();
  });
});
