import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AppliancesPage from '../components/pages/AppliancesPage';

const power = (entityId, state, name) => ({
  entity_id: entityId,
  state: String(state),
  attributes: {
    friendly_name: name,
    device_class: 'power',
    unit_of_measurement: 'W',
  },
});
const energy = (entityId, state, name) => ({
  entity_id: entityId,
  state: String(state),
  attributes: {
    friendly_name: name,
    device_class: 'energy',
    unit_of_measurement: 'kWh',
  },
});

const entities = {
  'sensor.dishwasher_power': power('sensor.dishwasher_power', 1800, 'Dishwasher power'),
  'sensor.dishwasher_energy_today': energy(
    'sensor.dishwasher_energy_today',
    1.25,
    'Dishwasher energy'
  ),
  'sensor.fridge_power': power('sensor.fridge_power', 0, 'Fridge power'),
  'sensor.fridge_energy': energy('sensor.fridge_energy', 2.5, 'Fridge energy'),
};

describe('AppliancesPage', () => {
  it('summarises appliance power, energy and active devices', () => {
    render(
      <AppliancesPage
        entities={entities}
        pageSettings={{}}
        pageId="appliances"
        savePageSetting={vi.fn()}
        t={(key) => key}
      />
    );

    expect(screen.getByText('appliances.pageTitle')).toBeInTheDocument();
    expect(screen.getAllByText('1.8 kW').length).toBeGreaterThan(0);
    expect(screen.getByText('3.75 kWh')).toBeInTheDocument();
    expect(screen.getByText('Dishwasher')).toBeInTheDocument();
    expect(screen.getByText('Fridge')).toBeInTheDocument();
    expect(screen.getAllByRole('progressbar')).toHaveLength(4);
  });

  it('lets the user choose which appliances are shown', () => {
    const savePageSetting = vi.fn();
    render(
      <AppliancesPage
        entities={entities}
        pageSettings={{}}
        pageId="appliances"
        savePageSetting={savePageSetting}
        t={(key) => key}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'appliances.selectDevices' }));
    fireEvent.click(screen.getAllByRole('switch')[1]);
    expect(savePageSetting).toHaveBeenCalledWith('appliances', 'appliancesSelection', [
      'dishwasher',
    ]);
    expect(screen.getAllByRole('progressbar')).toHaveLength(2);
  });

  it('opens the per-device image picker in edit mode', () => {
    render(
      <AppliancesPage
        entities={entities}
        pageSettings={{}}
        pageId="appliances"
        savePageSetting={vi.fn()}
        editMode
        t={(key) => key}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'appliances.editImages' })[0]);
    expect(screen.getAllByTitle('deviceArt.choose').length).toBeGreaterThan(0);
  });

  it('uses daily statistics instead of raw lifetime energy', async () => {
    const conn = {
      sendMessagePromise: vi.fn(async (message) => ({
        change: message.statistic_id === 'sensor.dishwasher_energy_today' ? 0.42 : 0.1,
      })),
    };
    render(
      <AppliancesPage
        entities={entities}
        conn={conn}
        pageSettings={{}}
        pageId="appliances"
        savePageSetting={vi.fn()}
        t={(key) => key}
      />
    );

    expect(await screen.findByText('0.42 kWh')).toBeInTheDocument();
    expect(await screen.findByText('0.52 kWh')).toBeInTheDocument();
    expect(conn.sendMessagePromise).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'recorder/statistic_during_period',
        calendar: { period: 'day' },
      })
    );
  });
});
