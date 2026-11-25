/**
 * Local-language search terms for the vendored ha-device-art drawings.
 * The upstream labels are English; these aliases make the picker searchable
 * with Swedish/Norwegian everyday words as well.
 */
const BY_SOURCE_ID = {
  'laundrycfg/cfgscreen': ['tvättmaskin', 'torktumlare', 'tvätt och tork', 'tvattmaskin', 'vaskemaskin'],
  'laundrycfg/cfgtop': ['tvättmaskin', 'torktumlare', 'tvattmaskin', 'vaskemaskin'],
  'laundrycfg/cfgcombo': ['tvättmaskin', 'torktumlare', 'kombimaskin', 'vaskemaskin'],
  'dishwasher/front': ['diskmaskin', 'oppvaskmaskin'],
  'fridgecfg/steel': ['kylskåp', 'kyl', 'frys', 'kjoleskap', 'kjolskap'],
  'fridgecfg/glasspanel': ['kylskåp', 'kyl', 'frys', 'kjoleskap'],
  'rangecfg/cfg-classic': ['spis', 'ugn', 'häll', 'komfyr'],
  'range/steam': ['ångugn', 'ugn', 'stekeovn'],
  'microwave/counter': ['mikrovågsugn', 'mikro', 'mikrobolgeovn'],
  'microwave/glass': ['mikrovågsugn', 'mikro', 'fläktkåpa', 'kjokkenvifte'],
  'kitchen2/12-cup-drip-maker': ['kaffebryggare', 'kaffe', 'kaffemaskin', 'kaffetrakter'],
  'kitchen2/steel-drip-maker': ['kaffebryggare', 'kaffe', 'kaffemaskin'],
  'smallkitchen/drip': ['kaffebryggare', 'kaffe', 'kaffemaskin'],
  'smallkitchen/espresso': ['espressomaskin', 'espresso', 'kaffe'],
  'smallkitchen/pod': ['kapselmaskin', 'kaffe', 'kaffemaskin'],
  'smallkitchen/toaster2': ['brödrost', 'brodrost', 'toaster'],
  'smallkitchen/toaster4': ['brödrost', 'brodrost', 'toaster'],
  'smallkitchen/airfryer': ['airfryer', 'fritös', 'varmluftsugn'],
  'vacuum/lidar': ['dammsugare', 'robotdammsugare', 'stovsuger'],
  'vacuum/dshape': ['dammsugare', 'robotdammsugare', 'stovsuger'],
  'vacuum/mower': ['gräsklippare', 'robotgräsklippare', 'gressklipper'],
  'floorcare/laser-stick-vacuum': ['dammsugare', 'sladdlös dammsugare', 'stovsuger'],
  'media/wall-tv': ['tv', 'television', 'televisor'],
  'media/console-tv': ['tv', 'television'],
  'media/art-tv': ['tv', 'television', 'konst-tv'],
  'speakers2/tall-cylinder-speaker': ['högtalare', 'smart högtalare', 'hogtalare'],
  'speakers2/fabric-puck-speaker': ['högtalare', 'smart högtalare', 'hogtalare'],
  'thermostat/learning': ['termostat', 'värme', 'termostat'],
  'thermostat/dial': ['termostat', 'värme', 'termostat'],
  'ac/minisplit': ['luftkonditionering', 'ac', 'värmepump', 'varmepumpe'],
  'ac/window': ['luftkonditionering', 'ac', 'fönster-ac'],
  'heater/oil': ['element', 'radiator', 'värmare', 'ovn'],
  'heating/combi': ['värmepanna', 'panna', 'kjel'],
  'water/elec': ['varmvattenberedare', 'beredare', 'varmtvannstank'],
  'heating/panelrad': ['radiator', 'element', 'panelradiator'],
  'energy/roof': ['solceller', 'solpaneler', 'solcelle'],
  'energy/round': ['laddbox', 'elbilsladdare', 'lader'],
  'energy/slab': ['hembatteri', 'solbatteri', 'batteri'],
  'ceilingfan/classic': ['takfläkt', 'fläkt', 'takvifte'],
  'standfan/classic': ['fläkt', 'golvfläkt', 'vifte'],
  'towerfan/classic': ['fläkt', 'tornfläkt', 'tarnvifte'],
  'purifier/cylinder': ['luftrenare', 'luftrening', 'luftrenser'],
  'humidifier/cleartank': ['luftfuktare', 'luftfuktighet', 'luftfukter'],
  'dehumidifier/upright': ['avfuktare', 'luftavfuktare', 'avfukter'],
  'security/dome': ['kamera', 'övervakningskamera', 'kamera'],
  'security/bullet': ['kamera', 'övervakningskamera'],
  'lock/keypad': ['lås', 'dörrlås', 'smart lås', 'las'],
  'lock/touch': ['lås', 'dörrlås', 'smart lås', 'las'],
  'doorbell/brass': ['dörrklocka', 'ringklocka', 'dorringeklokke'],
  'switch/paddle-rocker': ['strömbrytare', 'brytare', 'lysbryter'],
  'switch/dimmer': ['dimmer', 'strömbrytare', 'brytare'],
  'plug/mini': ['smartplugg', 'plugg', 'uttag', 'stikkontakt'],
  'outlets/duplex': ['eluttag', 'uttag', 'stikkontakt'],
  'smoke/alarm': ['brandvarnare', 'rökdetektor', 'roykvarsler'],
  'leaks/slim': ['läckagesensor', 'vattenläcka', 'lekkasje'],
  'sensor/pir': ['rörelsesensor', 'rörelse', 'bevegelsessensor'],
  'sensor/door': ['dörrsensor', 'dörr', 'dorsensor'],
  'sprinklers/controller': ['bevattning', 'sprinkler', 'vanning'],
  'pool/inground': ['pool', 'poolbelysning'],
  'grill/gas3': ['grill', 'gasolgrill'],
  'fireplace/wall': ['eldstad', 'kamin', 'peis'],
};

const BY_CATEGORY = {
  ceiling: ['taklampa', 'takbelysning', 'spotlight', 'downlight'],
  pendants: ['pendel', 'hänglampa', 'hanglampa'],
  wall: ['vägglampa', 'vagglampa', 'applique'],
  floor: ['golvlampa', 'gulvlampe'],
  table: ['bordslampa', 'skrivbordslampa', 'nattlampa', 'bordlampe'],
  bulbs: ['glödlampa', 'lampa', 'ljuskälla', 'lyspaere'],
  strips: ['ledlist', 'ljuslist', 'led-list', 'ledstrip'],
  outdoor: ['utelampa', 'utomhusbelysning', 'trädgårdsbelysning', 'utelys'],
  appliances: ['apparat', 'hushållsapparat', 'husholdningsapparat'],
};

export function getHaDeviceArtSearchTerms(entry) {
  if (!entry?.sourceId) return [];
  const specific = BY_SOURCE_ID[entry.sourceId] || [];
  const category = BY_CATEGORY[entry.category] || [];
  return [...new Set([...specific, ...category])];
}
