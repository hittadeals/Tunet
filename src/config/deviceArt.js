import { normalizeName } from '../utils/houseScene';

/**
 * Static appliance illustrations vendored from
 * https://github.com/skyrotter/ha-appliance-electromenager-cards (MIT).
 *
 * The original files are animated SVG custom cards. scripts/import-device-art.mjs
 * freezes them into standalone SVGs in public/device-art/.
 */
const GALLERY_LAMPS_2_ENTRIES = [
  ['pendant_globe_brass', ['globe pendant brass', 'brass pendant']],
  ['pendant_globe_black', ['globe pendant black', 'black pendant']],
  ['pendant_twin_globe', ['twin globe pendant', 'double globe']],
  ['pendant_triple_globe', ['triple globe pendant', 'three globe']],
  ['pendant_cascade', ['cascade pendant', 'cascade']],
  ['pendant_cage', ['cage pendant', 'wire pendant']],
  ['pendant_halo', ['halo pendant', 'ring light']],
  ['pendant_wide_drum', ['wide drum pendant', 'wide pendant']],
  ['pendant_cone_black', ['black cone pendant', 'black cone']],
  ['pendant_bell_white', ['white bell pendant', 'white bell']],
  ['pendant_cylinder_brass', ['brass cylinder pendant', 'cylinder pendant']],
  ['pendant_double_cone', ['double cone pendant', 'twin cone']],
  ['ceiling_dome_black', ['black ceiling dome', 'black ceiling']],
  ['ceiling_dome_brass', ['brass ceiling dome', 'brass ceiling']],
  ['ceiling_square_white', ['white ceiling square', 'square ceiling']],
  ['ceiling_round_micro', ['micro ceiling', 'small ceiling light']],
  ['ceiling_triple_spot', ['triple ceiling spot', 'three spot ceiling']],
  ['ceiling_twin_bar', ['ceiling twin bar', 'double ceiling bar']],
  ['ceiling_oval', ['oval ceiling', 'oval flush']],
  ['wall_sconce_brass', ['brass sconce', 'brass wall lamp']],
  ['wall_sconce_black', ['black sconce', 'black wall lamp']],
  ['wall_updown_round', ['round up down', 'round wall updown']],
  ['wall_candle', ['wall candle', 'candle sconce']],
  ['wall_swing', ['swing wall light', 'reading sconce']],
  ['wall_linear_updown', ['linear up down', 'linear wall light']],
  ['wall_globe', ['globe wall light', 'wall globe']],
  ['floor_arc_brass', ['brass arc floor', 'brass arc']],
  ['floor_arc_black', ['black arc floor', 'black arc']],
  ['floor_tripod_white', ['white tripod floor', 'white tripod']],
  ['floor_drum_tall', ['tall drum floor', 'tall floor lamp']],
  ['floor_globe_brass', ['brass globe floor', 'brass globe']],
  ['floor_twig_white', ['white twig floor', 'white branch floor']],
  ['floor_torchiere', ['torchiere', 'uplight floor']],
  ['table_ceramic_white', ['white ceramic table', 'white ceramic']],
  ['table_ceramic_black', ['black ceramic table', 'black ceramic']],
  ['table_mushroom', ['mushroom lamp', 'mushroom table']],
  ['table_globe', ['table globe', 'globe table lamp']],
  ['desk_architect_white', ['white architect', 'white desk lamp']],
  ['desk_architect_black', ['black architect', 'black desk lamp']],
  ['desk_clamp_white', ['white clamp', 'white clip lamp']],
  ['desk_ring', ['desk ring', 'ring desk lamp']],
  ['outdoor_bollard', ['bollard', 'garden bollard']],
  ['outdoor_wall_square', ['square outdoor wall', 'outdoor square']],
  ['outdoor_post', ['outdoor post', 'garden post']],
  ['outdoor_floodlight', ['floodlight', 'outdoor flood']],
  ['lightstrip', ['lightstrip', 'light strip', 'led strip', 'ledlist', 'ljuslist', 'bande led']],
  ['strip_cove', ['cove light', 'cove strip']],
  ['strip_round', ['round strip', 'round led']],
  ['strip_corner', ['corner strip', 'corner led']],
  ['strip_under', ['under cabinet strip', 'under shelf light']],
].map(([key, keywords]) => ({ key, keywords }));

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
    key: 'phone_charger',
    keywords: ['phone charger', 'telefonladdare', 'mobilladdare', 'mobil laddare', 'chargeur telephone', 'handy lader', 'phone charge'],
  },
  {
    key: 'kettle',
    keywords: ['kettle', 'vattenkokare', 'vasskokare', 'kjeleskjele', 'bouilloire', 'wasserkocher', 'hervidor'],
  },
  {
    key: 'toaster',
    keywords: ['toaster', 'brodrost', 'brödrost', 'grille pain', 'grille-pain', 'toast'],
  },
  {
    key: 'dehumidifier',
    keywords: ['dehumidifier', 'avfuktare', 'luftavfuktare', 'entfeuchter', 'deshumidificador', 'deshumidificateur'],
  },
  {
    key: 'monitor',
    keywords: ['monitor', 'skarm', 'skärm', 'bildschirm', 'ecran', 'écran', 'display'],
  },
  {
    key: 'piano',
    keywords: ['piano', 'elpiano', 'digital piano', 'klavier', 'pianoforte'],
  },
  {
    key: 'power_strip',
    keywords: ['power strip', 'grenuttag', 'forgreningsdosa', 'förgreningsdosa', 'multiprise', 'steckdosenleiste', 'regleta'],
  },
  {
    key: 'ps5',
    keywords: ['ps5', 'playstation', 'playstation 5', 'konsol', 'console'],
  },
  {
    key: 'smart_speaker',
    keywords: ['smart speaker', 'hogtalare', 'högtalare', 'enceinte', 'lautsprecher', 'altavoz', 'echo', 'homepod', 'google home'],
  },
  {
    key: 'thermomix',
    keywords: ['thermomix', 'koksmaskin', 'köksmaskin', 'robot patissier', 'kuchenmaschine', 'küchenmaschine'],
  },
  {
    key: 'garland',
    keywords: ['garland', 'ljusslinga', 'julgransljus', 'guirlande', 'lichterkette', 'string lights'],
  },
  {
    key: 'pendant_cluster',
    keywords: ['pendant cluster', 'cluster pendant', 'pendelgrupp', 'grappe', 'ljuskrona'],
  },
  {
    key: 'chandelier',
    keywords: ['chandelier', 'kronljus', 'lysekrone', 'kronleuchter', 'lustre', 'lampara de arana'],
  },
  {
    key: 'christmas_tree',
    keywords: ['christmas tree', 'julgran', 'juletre', 'weihnachtsbaum', 'sapin de noel', 'arbol de navidad'],
  },
  {
    key: 'filament_bulb',
    keywords: ['filament', 'edison', 'vintage bulb', 'glodlampa'],
  },
  {
    key: 'color_bulb',
    keywords: ['color bulb', 'rgb bulb', 'fargampull', 'fargepaere', 'bombilla de color', 'ampoule couleur'],
  },
  {
    key: 'pendant_light',
    keywords: ['pendant', 'pendel', 'hanglampa', 'suspension', 'colgante'],
  },
  {
    key: 'floor_lamp',
    keywords: ['floor lamp', 'golvlampa', 'gulvlampe', 'stehlampe', 'lampadaire', 'lampara de pie'],
  },
  {
    key: 'table_lamp',
    keywords: ['table lamp', 'bordslampa', 'bordlampe', 'tischlampe', 'lampe de table', 'lampara de mesa'],
  },
  {
    key: 'arc_lamp',
    keywords: ['arc lamp', 'baglampa', 'buelampe', 'bogenlampe', 'lampe arc'],
  },
  {
    key: 'desk_lamp',
    keywords: ['desk lamp', 'skrivbordslampa', 'skrivebordslampe', 'schreibtischlampe', 'lampe de bureau'],
  },
  {
    key: 'wall_sconce',
    keywords: ['sconce', 'wall lamp', 'vagg lampa', 'vegglampe', 'wandleuchte', 'applique', 'aplique'],
  },
  {
    key: 'track_spotlight',
    keywords: ['track light', 'spotlight', 'spotskena', 'spottskinne', 'strahler', 'rail de spots'],
  },
  {
    key: 'linear_pendant',
    keywords: ['linear pendant', 'linjar pendel', 'lineaer pendel', 'pendelleuchte', 'suspension lineaire'],
  },
  {
    key: 'garden_spotlight',
    keywords: ['garden spotlight', 'tradgardsspot', 'hagespot', 'gartenstrahler', 'foco de jardin'],
  },
  {
    key: 'outdoor_lantern',
    keywords: ['lantern', 'lykta', 'lykt', 'laterne', 'farol', 'lanterne'],
  },
  {
    key: 'ceiling_spot',
    keywords: ['downlight', 'recessed', 'takspot', 'deckenspot', 'encastre', 'empotrado'],
  },
  {
    key: 'led_strip',
    keywords: ['led strip', 'led list', 'ledlist', 'led streifen', 'tira led', 'ruban led'],
  },
  {
    key: 'night_light',
    keywords: ['night light', 'nattlampa', 'nattlampe', 'nachtlicht', 'luz nocturna', 'veilleuse'],
  },
  {
    key: 'light_bulb',
    keywords: ['bulb', 'glodlampa', 'lyspaere', 'bombilla', 'ampoule', 'lamp', 'lampa', 'lampe'],
  },
  {
    key: 'pendant_globe',
    keywords: ['globe pendant', 'globpendel', 'kugel pendel', 'suspension globe'],
  },
  {
    key: 'pendant_double',
    keywords: ['double pendant', 'dubbelpendel', 'dobbeltpendel', 'doppel pendel'],
  },
  {
    key: 'pendant_quintet',
    keywords: ['five light pendant', 'femljuspendel', 'femlys pendel', 'fünflicht'],
  },
  {
    key: 'pendant_drum',
    keywords: ['drum pendant', 'trommelpendel', 'trommel pendel', 'cylinderpendel', 'tambour'],
  },
  {
    key: 'pendant_cone',
    keywords: ['cone pendant', 'konpendel', 'kjeglependel', 'kegel pendel', 'cone'],
  },
  {
    key: 'pendant_bell',
    keywords: ['bell pendant', 'klockpendel', 'klokkependel', 'glocken pendel', 'cloche'],
  },
  {
    key: 'pendant_ring',
    keywords: ['ring pendant', 'ringpendel', 'ring pendel', 'anneau'],
  },
  {
    key: 'pendant_square',
    keywords: ['square pendant', 'fyrkantig pendel', 'firkantpendel', 'eckige pendel', 'carree'],
  },
  {
    key: 'ceiling_flush',
    keywords: ['flush ceiling', 'taklampa flat', 'taklampe flat', 'flache deckenleuchte', 'plafonnier'],
  },
  {
    key: 'ceiling_panel',
    keywords: ['ceiling panel', 'takpanel', 'deckenpanel', 'panneau de plafond', 'panel de techo'],
  },
  {
    key: 'ceiling_ring',
    keywords: ['ceiling ring', 'takring', 'deckenring', 'anneau de plafond', 'anillo de techo'],
  },
  {
    key: 'ceiling_spot_two',
    keywords: ['two ceiling spots', 'tva takspots', 'to takspots', 'zwei deckenspots', 'deux spots'],
  },
  {
    key: 'ceiling_spot_four',
    keywords: ['four ceiling spots', 'fyra takspots', 'fire takspots', 'vier deckenspots', 'quatre spots'],
  },
  {
    key: 'ceiling_bar',
    keywords: ['ceiling bar', 'takbar', 'takstang', 'deckenbalken', 'barre de plafond'],
  },
  {
    key: 'track_two',
    keywords: ['two spot track', 'spotskena 2', 'to spots skinne', 'zweifach strahler', 'rail deux spots'],
  },
  {
    key: 'track_four',
    keywords: ['four spot track', 'spotskena 4', 'fire spots skinne', 'vierfach strahler', 'rail quatre spots'],
  },
  {
    key: 'track_long',
    keywords: ['long track', 'lang spotskena', 'lang spottskinne', 'lange strahlerschiene', 'long rail'],
  },
  {
    key: 'wall_updown',
    keywords: ['up down wall', 'upp ned vagglampa', 'opp ned vegglampe', 'wandstrahler', 'applique haut bas'],
  },
  {
    key: 'wall_reading',
    keywords: ['reading light', 'laslampa', 'leselampe', 'leselampe', 'lampe de lecture'],
  },
  {
    key: 'wall_round',
    keywords: ['round wall', 'rund vagglampa', 'rund vegglampe', 'runde wandleuchte', 'applique ronde'],
  },
  {
    key: 'wall_mirror',
    keywords: ['mirror light', 'spegellampa', 'speillampe', 'spiegelleuchte', 'lumiere de miroir'],
  },
  {
    key: 'wall_lantern_round',
    keywords: ['bulkhead', 'rund utelykt', 'rund utelykt', 'runde aussenleuchte', 'applique ronde exterieure'],
  },
  {
    key: 'floor_tripod',
    keywords: ['tripod floor', 'tripodgolvlampa', 'tripodgulvlampe', 'tripod stehlampe', 'lampadaire trepied'],
  },
  {
    key: 'floor_drum',
    keywords: ['drum floor', 'cylindergolvlampa', 'trommelgulvlampe', 'trommel stehlampe', 'lampadaire tambour'],
  },
  {
    key: 'floor_twig',
    keywords: ['twig floor', 'kvistgolvlampa', 'kvistgulvlampe', 'zweig stehlampe', 'lampadaire branches'],
  },
  {
    key: 'floor_globe',
    keywords: ['globe floor', 'globgolvlampa', 'globgulvlampe', 'kugel stehlampe', 'lampadaire globe'],
  },
  {
    key: 'table_ceramic',
    keywords: ['ceramic table', 'keramisk bordslampa', 'keramisk bordlampe', 'keramik tischlampe', 'lampe ceramique'],
  },
  {
    key: 'table_touch',
    keywords: ['touch table', 'touch bordslampa', 'beroringsbordlampe', 'touch tischlampe', 'lampe tactile'],
  },
  {
    key: 'desk_architect',
    keywords: ['architect lamp', 'arkitektlampa', 'arkitektlampe', 'architektenlampe', 'lampe architecte'],
  },
  {
    key: 'desk_clamp',
    keywords: ['clamp lamp', 'klamlampa', 'klem lampe', 'klemmlampe', 'lampe a pince'],
  },
  {
    key: 'wet_vacuum',
    keywords: ['wet vacuum', 'vatdammsugare', 'våtdammsugare', 'vattensug', 'aspirateur eau', 'nasssauger'],
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
  ...GALLERY_LAMPS_2_ENTRIES,
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

/** Animated SVG variant used by the consumption page, when one exists. */
export function getAnimatedDeviceArtSrc(key) {
  if (!key || key === 'none' || !ART_BY_KEY.has(key)) return null;
  if ((ART_BY_KEY.get(key)?.asset || 'svg') !== 'svg') return null;
  const base = import.meta.env?.BASE_URL || '/';
  return `${base.replace(/\/?$/, '/')}device-art/animated/${key}.svg`;
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
      return translated === i18nKey
        ? entry.key
            .split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
        : translated;
    })(),
  }));
}
