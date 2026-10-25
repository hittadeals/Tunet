import { normalizeName } from '../utils/houseScene';

/**
 * Static appliance illustrations vendored from
 * https://github.com/skyrotter/ha-appliance-electromenager-cards (MIT).
 *
 * The original files are animated SVG custom cards. scripts/import-device-art.mjs
 * freezes them into standalone SVGs in public/device-art/.
 */
export const DEVICE_ART = [
  {
    key: 'tv',
    domain: 'media_player',
    keywords: ['tv', 'television', 'televiseur', 'tele', 'bravia', 'webos', 'tizen', 'android', 'appletv', 'apple tv', 'chromecast', 'firetv', 'fire tv', 'shield'],
  },
  {
    key: 'robot_vacuum',
    domain: 'vacuum',
    asset: 'png',
    keywords: ['vacuum', 'robot vacuum', 'dammsugare', 'robotdammsugare', 'stovsuger', 'aspirateur', 'staubsauger'],
  },
  {
    key: 'robot_mower',
    asset: 'png',
    keywords: ['mower', 'robot mower', 'grasklippare', 'robotgrasklippare', 'gressklipper', 'tondeuse', 'maehroboter'],
  },
  {
    key: 'ev_charger',
    asset: 'png',
    keywords: ['ev charger', 'ev_charger', 'evse', 'wallbox', 'laddbox', 'laddstation', 'elbilsladdare', 'billader', 'borne de recharge', 'ladestation'],
  },
  {
    key: 'battery',
    asset: 'png',
    keywords: ['solar battery', 'home battery', 'battery bank', 'hembatteri', 'solbatteri', 'batteribank', 'ackumulator', 'batterie solaire', 'hausbatterie'],
  },
  {
    key: 'aquarium',
    asset: 'png',
    keywords: ['aquarium', 'akvarium', 'fish tank', 'akvarie'],
  },
  {
    key: 'jacuzzi',
    asset: 'png',
    keywords: ['jacuzzi', 'hot tub', 'spa', 'bubble bath', 'bubbelpool', 'boblebad', 'whirlpool'],
  },
  {
    key: 'linky',
    asset: 'png',
    keywords: ['linky', 'electricity meter', 'smart meter', 'elmatare', 'strommatare', 'compteur', 'stromzahler'],
  },
  {
    key: 'gas_boiler',
    asset: 'png',
    keywords: ['gas boiler', 'gaspanna', 'gasskjel', 'chaudiere gaz', 'gaskessel', 'gasheizung'],
  },
  {
    key: 'pellet_boiler',
    asset: 'png',
    keywords: ['pellet boiler', 'pelletspanna', 'pelletskjel', 'chaudiere pellets', 'pelletkessel'],
  },
  {
    key: 'diesel_heater',
    asset: 'png',
    keywords: ['diesel heater', 'dieselheater', 'dieselvarmare', 'dieselvarmer', 'chauffage diesel', 'dieselheizung'],
  },
  {
    key: 'water_heat_pump',
    asset: 'png',
    keywords: ['water heat pump', 'hot water heat pump', 'vattenvarmepump', 'varmepumpe for varmtvann', 'chauffe eau thermodynamique', 'warmwasser warmepumpe'],
  },
  {
    key: 'av_receiver',
    keywords: ['receiver', 'avr', 'ampli', 'amplifier', 'forstarkare', 'home cinema', 'homecinema', 'denon', 'yamaha', 'onkyo', 'marantz', 'pioneer'],
  },
  {
    key: 'washer',
    keywords: ['washer', 'washing machine', 'tvattmaskin', 'vaskemaskin', 'lave linge', 'lavelinge', 'waschmaschine'],
  },
  {
    key: 'dryer',
    keywords: ['dryer', 'tumble dryer', 'torktumlare', 'seche linge', 'sechelinge', 'trockner'],
  },
  {
    key: 'dishwasher',
    keywords: ['dishwasher', 'diskmaskin', 'oppvaskmaskin', 'lave vaisselle', 'lavevaisselle', 'geschirrspuler'],
  },
  {
    key: 'fridge',
    keywords: ['fridge', 'refrigerator', 'kylskap', 'kyl', 'kjoleskap', 'frigo', 'refrigerateur', 'kuhlschrank'],
  },
  {
    key: 'chest_freezer',
    keywords: ['chest freezer', 'frysbox', 'coffre', 'congelateur coffre', 'bahut', 'truhe'],
  },
  {
    key: 'drawer_freezer',
    keywords: ['freezer', 'frys', 'congelateur', 'fryseskap', 'gefrierschrank'],
  },
  {
    key: 'oven',
    keywords: ['oven', 'ugn', 'stekeovn', 'four', 'backofen'],
  },
  {
    key: 'microwave',
    keywords: ['microwave', 'mikrovagsugn', 'mikro', 'micro onde', 'mikrowelle'],
  },
  {
    key: 'hob',
    keywords: ['hob', 'cooktop', 'spis', 'kokplatta', 'plaque', 'induction', 'kochfeld'],
  },
  {
    key: 'range_hood',
    keywords: ['range hood', 'hood', 'flaktkapa', 'kjokkenvifte', 'hotte', 'dunstabzug'],
  },
  {
    key: 'coffee_maker',
    keywords: ['coffee', 'kaffebryggare', 'kaffemaskin', 'cafetiere', 'espresso', 'nespresso', 'senseo', 'kaffeemaschine'],
  },
  {
    key: 'air_fryer',
    keywords: ['air fryer', 'airfryer', 'fritös', 'fritos', 'friteuse', 'heissluftfritteuse'],
  },
  {
    key: 'water_heater',
    domain: 'water_heater',
    keywords: ['water heater', 'varmvattenberedare', 'beredare', 'varmtvannstank', 'chauffe eau', 'ballon', 'warmwasserbereiter'],
  },
  {
    key: 'heat_pump',
    keywords: ['heat pump', 'heatpump', 'varmepump', 'pompe a chaleur', 'warmepumpe'],
  },
  {
    key: 'ac_split',
    keywords: ['air conditioner', 'aircondition', 'aircon', 'luftkonditionering', 'klimatanlaggning', 'clim', 'climatisation', 'klimaanlage'],
  },
  {
    key: 'radiator',
    keywords: ['radiator', 'element', 'heater', 'convecteur', 'heizkorper'],
  },
  {
    key: 'towel_dryer',
    keywords: ['towel dryer', 'handdukstork', 'handdukstorkare', 'seche serviette', 'towel rail', 'handtuchtrockner'],
  },
  {
    key: 'solar',
    keywords: ['solar', 'solcell', 'solceller', 'solpaneler', 'photovolta', 'inverter', 'vaxelriktare', 'solaranlage'],
  },
  {
    key: 'pool_pump',
    keywords: ['pool pump', 'poolpump', 'pool', 'piscine', 'filtration', 'poolpumpe'],
  },
  {
    key: 'printer_3d',
    keywords: ['3d printer', 'printer 3d', 'imprimante 3d', 'bambu', 'prusa', 'octoprint', 'klipper', '3d drucker'],
  },
  {
    key: 'server_rack',
    keywords: ['server', 'rack', 'nas', 'homelab', 'proxmox', 'unraid', 'baie', 'serverschrank'],
  },
  {
    key: 'desktop_pc',
    keywords: ['desktop', 'pc fixe', 'workstation', 'gaming', 'dator', 'ordinateur', 'desktop pc'],
  },
  {
    key: 'laptop',
    keywords: ['laptop', 'notebook', 'macbook', 'thinkpad', 'portable', 'barbar', 'chromebook'],
  },
  {
    key: 'wine_cooler',
    keywords: ['wine cooler', 'wine', 'vin', 'vinkyl', 'cave a vin', 'weinkuhlschrank'],
  },
  {
    key: 'beer_tap',
    keywords: ['beer', 'biere', 'kegerator', 'draft', 'tireuse', 'bier'],
  },
  {
    key: 'pellet_stove',
    keywords: ['pellet stove', 'pellet', 'pellets', 'poele', 'kamin', 'pelletofen'],
  },
  {
    key: 'vmc',
    keywords: ['vmc', 'ventilation', 'ftx', 'mvhr', 'hrv', 'lüftung', 'luftung'],
  },
  {
    key: 'tool_charger',
    keywords: ['tool charger', 'battery charger', 'laddare', 'chargeur', 'perceuse', 'makita', 'dewalt', 'ryobi', 'milwaukee'],
  },
  {
    key: 'ceiling_fan',
    keywords: ['ceiling fan', 'takflakt', 'takvifte', 'ventilateur de plafond', 'deckenventilator'],
  },
  {
    key: 'fan',
    domain: 'fan',
    keywords: ['fan', 'ventilator', 'flakt', 'vifte', 'ventilateur', 'ventilador', 'ventola'],
  },
  {
    key: 'generic',
    keywords: [],
  },
];

const ART_BY_KEY = new Map(DEVICE_ART.map((entry) => [entry.key, entry]));
const KEYWORD_ENTRIES = DEVICE_ART.filter((entry) => entry.keywords.length > 0);

export const DEVICE_ART_KEYS = DEVICE_ART.map((entry) => entry.key);

export function isDeviceArtKey(key) {
  return ART_BY_KEY.has(key);
}

export function getDeviceArtSrc(key) {
  if (!key || key === 'none' || !ART_BY_KEY.has(key)) return null;
  const base = import.meta.env?.BASE_URL || '/';
  const extension = ART_BY_KEY.get(key)?.asset || 'svg';
  return `${base.replace(/\/?$/, '/')}device-art/${key}.${extension}`;
}

const tokenize = (value) => normalizeName(value).split(' ').filter(Boolean);

function haystackFor(entityId, entity) {
  const local = String(entityId || '').split('.')[1] || '';
  const name = entity?.attributes?.friendly_name || '';
  return `${local} ${name}`;
}

function matchesKeyword(tokens, keyword) {
  const parts = normalizeName(keyword).split(' ').filter(Boolean);
  if (parts.length === 0) return false;
  if (parts.length === 1) return tokens.includes(parts[0]);
  return ` ${tokens.join(' ')} `.includes(` ${parts.join(' ')} `);
}

/**
 * Best-guess illustration for an entity, based on its name and domain.
 * Returns null when there is no confident match.
 */
export function getAutoDeviceArtKey(entityId, entity) {
  const tokens = tokenize(haystackFor(entityId, entity));
  if (tokens.length === 0) return null;

  for (const entry of KEYWORD_ENTRIES) {
    if (entry.keywords.some((keyword) => matchesKeyword(tokens, keyword))) return entry.key;
  }

  const domain = String(entityId || '').split('.')[0];
  const domainEntry = DEVICE_ART.find((entry) => entry.domain === domain);
  return domainEntry ? domainEntry.key : null;
}

/**
 * Resolve the illustration for an entity.
 * Overrides: a key forces an illustration, "none" disables it, undefined
 * falls back to the automatic match.
 */
export function resolveEntityArtKey(entityId, entity, overrides) {
  const override = overrides?.[entityId];
  if (override === 'none') return null;
  if (override && isDeviceArtKey(override)) return override;
  return getAutoDeviceArtKey(entityId, entity);
}

export function getDeviceArtOptions(t) {
  return DEVICE_ART.map((entry) => ({
    key: entry.key,
    label: (() => {
      const i18nKey = `deviceArt.kind.${entry.key}`;
      const translated = t ? t(i18nKey) : i18nKey;
      return translated === i18nKey ? entry.key.replace(/_/g, ' ') : translated;
    })(),
  }));
}
