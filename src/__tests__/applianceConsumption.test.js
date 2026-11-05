import { describe, expect, it } from 'vitest';
import {
  formatEnergy,
  formatPower,
  getApplianceConsumption,
} from '../utils/applianceConsumption';

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

describe('appliance consumption', () => {
  it('groups power and energy sensors per appliance and ignores whole-home totals', () => {
    const groups = getApplianceConsumption({
      'sensor.dishwasher_power': power('sensor.dishwasher_power', 1800, 'Dishwasher power'),
      'sensor.dishwasher_energy_today': energy(
        'sensor.dishwasher_energy_today',
        1.25,
        'Dishwasher energy'
      ),
      'sensor.dishwasher_energy_total': energy(
        'sensor.dishwasher_energy_total',
        18000,
        'Dishwasher total energy'
      ),
      'sensor.fridge_power': power('sensor.fridge_power', 80, 'Fridge power'),
      'sensor.fridge_energy': energy('sensor.fridge_energy', 2.5, 'Fridge energy'),
      'sensor.freezer_energy_wh': {
        entity_id: 'sensor.freezer_energy_wh',
        state: '18000',
        attributes: {
          friendly_name: 'Freezer energy',
          device_class: 'energy',
          unit_of_measurement: 'Wh',
        },
      },
      'sensor.home_power': power('sensor.home_power', 900, 'Home power'),
    });

    expect(groups.map((group) => group.key)).toEqual([
      'dishwasher',
      'fridge',
      'freezer',
    ]);
    const dishwasher = groups.find((group) => group.key === 'dishwasher');
    expect(dishwasher.powerW).toBe(1800);
    expect(dishwasher.energyKwh).toBe(1.25);
    expect(dishwasher.active).toBe(true);
    expect(dishwasher.artKey).toBe('dishwasher');
    expect(groups.find((group) => group.key === 'freezer').energyKwh).toBe(18);
  });

  it('formats power and energy for the appliance cards', () => {
    expect(formatPower(0)).toBe('0 W');
    expect(formatPower(80)).toBe('80 W');
    expect(formatPower(1800)).toBe('1.8 kW');
    expect(formatPower(12000)).toBe('12 kW');
    expect(formatEnergy(0)).toBe('0 kWh');
    expect(formatEnergy(1.25)).toBe('1.25 kWh');
    expect(formatEnergy(12.4)).toBe('12.4 kWh');
  });
});
