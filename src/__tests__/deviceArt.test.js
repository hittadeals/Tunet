import { describe, it, expect } from 'vitest';
import {
  getAutoDeviceArtKey,
  getDeviceArtSrc,
  isDeviceArtKey,
  resolveEntityArtKey,
} from '../config/deviceArt';

describe('device art', () => {
  it('matches common appliances by entity id and name', () => {
    expect(getAutoDeviceArtKey('media_player.living_room_tv', {})).toBe('tv');
    expect(getAutoDeviceArtKey('light.kok_tak', { attributes: { friendly_name: 'Kök tak' } })).toBe(
      null
    );
    expect(
      getAutoDeviceArtKey('sensor.tvattmaskin_power', {
        attributes: { friendly_name: 'Tvättmaskin effekt' },
      })
    ).toBe('washer');
    expect(
      getAutoDeviceArtKey('switch.kylskap', { attributes: { friendly_name: 'Kylskåp' } })
    ).toBe('fridge');
    expect(getAutoDeviceArtKey('vacuum.robot', {})).toBe('robot_vacuum');
    expect(
      getAutoDeviceArtKey('sensor.wallbox_power', {
        attributes: { friendly_name: 'Elbilsladdare' },
      })
    ).toBe('ev_charger');
  });

  it('lets an explicit override win over automatic matching', () => {
    const entity = { attributes: { friendly_name: 'Samsung TV' } };
    expect(resolveEntityArtKey('media_player.tv', entity, {})).toBe('tv');
    expect(resolveEntityArtKey('media_player.tv', entity, { 'media_player.tv': 'monitor' })).toBe(
      'tv'
    );
    expect(resolveEntityArtKey('media_player.tv', entity, { 'media_player.tv': 'none' })).toBe(
      null
    );
    expect(resolveEntityArtKey('media_player.tv', entity, { 'media_player.tv': 'av_receiver' })).toBe(
      'av_receiver'
    );
  });

  it('resolves asset paths and validates keys', () => {
    expect(isDeviceArtKey('tv')).toBe(true);
    expect(isDeviceArtKey('nope')).toBe(false);
    expect(getDeviceArtSrc('tv')).toBe('/device-art/tv.svg');
    expect(getDeviceArtSrc('robot_vacuum')).toBe('/device-art/robot_vacuum.png');
    expect(getDeviceArtSrc('none')).toBeNull();
    expect(getDeviceArtSrc(undefined)).toBeNull();
  });
});
