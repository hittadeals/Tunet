import { render, screen } from '@testing-library/react';
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

describe('AppliancesPage', () => {
  it('summarises appliance power, energy and active devices', () => {
    render(
      <AppliancesPage
        entities={{
          'sensor.dishwasher_power': power('sensor.dishwasher_power', 1800, 'Dishwasher power'),
          'sensor.dishwasher_energy_today': energy(
            'sensor.dishwasher_energy_today',
            1.25,
            'Dishwasher energy'
          ),
          'sensor.fridge_power': power('sensor.fridge_power', 0, 'Fridge power'),
          'sensor.fridge_energy': energy('sensor.fridge_energy', 2.5, 'Fridge energy'),
        }}
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
  });
});
