import { useEffect, useMemo, useRef, useState } from 'react';
import { getAnimatedDeviceArtSrc, getDeviceArtSrc } from '../../config/deviceArt';

const PHASE_BY_KEY = {
  washer: 'ph-wash',
  dryer: 'ph-dry',
  dishwasher: 'ph-wash',
  kettle: 'ph-heat',
  coffee_maker: 'ph-brew',
  oven: 'ph-heat',
  microwave: 'ph-heat',
  air_fryer: 'ph-heat',
  toaster: 'ph-heat',
  hob: 'ph-heat',
  radiator: 'ph-heat',
  towel_dryer: 'ph-heat',
  water_heater: 'ph-heat',
};

const svgCache = new Map();

function prepareSvg(source, key) {
  const namespaced = source
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/ID-/g, `${key}-`);
  return namespaced
    .replace(
      /<style>/,
      '<style>.device-art-svg{width:100%;height:100%;display:block}</style><style>'
    )
    .replace(/<svg\b([^>]*)>/, `<svg$1 data-device-art="${key}">`);
}

/** Animated appliance illustration with a static fallback. */
export default function AnimatedDeviceArt({ artKey, active = false, className = '' }) {
  const animatedSrc = getAnimatedDeviceArtSrc(artKey);
  const fallbackSrc = getDeviceArtSrc(artKey);
  const hostRef = useRef(null);
  const [markup, setMarkup] = useState(() => svgCache.get(artKey) || null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!animatedSrc) {
      setMarkup(null);
      setFailed(true);
      return undefined;
    }
    const cached = svgCache.get(artKey);
    if (cached) {
      setMarkup(cached);
      setFailed(false);
      return undefined;
    }
    let cancelled = false;
    fetch(animatedSrc)
      .then((response) => (response.ok ? response.text() : Promise.reject(new Error('missing'))))
      .then((source) => {
        const prepared = prepareSvg(source, artKey);
        svgCache.set(artKey, prepared);
        if (!cancelled) {
          setMarkup(prepared);
          setFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [animatedSrc, artKey]);

  const html = useMemo(() => {
    if (!markup) return null;
    const phase = active ? PHASE_BY_KEY[artKey] || '' : '';
    const classes = ['device-art-svg', active ? 'active' : '', phase].filter(Boolean).join(' ');
    return markup.replace(
      /<svg\b([^>]*)>/,
      `<svg$1 class="${classes}" style="width:100%;height:100%;display:block">`
    );
  }, [markup, active, artKey]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !html) return;
    const root = host.shadowRoot || host.attachShadow({ mode: 'open' });
    root.innerHTML = html;
  }, [html]);

  if (failed || !animatedSrc || !html) {
    return fallbackSrc ? (
      <img src={fallbackSrc} alt="" className={className} draggable={false} />
    ) : null;
  }

  return (
    <span
      ref={hostRef}
      className={className}
      style={{
        display: 'block',
        '--acc': 'var(--domain-climate)',
        '--ac-lcd': '#7ec8e3',
        '--ac-alert': '#ff7a59',
        '--ac-active': 'var(--domain-light)',
        '--ac-heat': '#ff8a3d',
        '--ac-cold': '#2b9af9',
        '--ac-ok': '#43a047',
        '--amp': '.6',
      }}
    />
  );
}
