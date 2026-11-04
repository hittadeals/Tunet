import { memo, useMemo, useState } from 'react';
import {
  Activity,
  BatteryCharging,
  Search,
  Settings,
  X,
  Zap,
} from '../../icons';
import { getDeviceArtSrc } from '../../config/deviceArt';
import AnimatedDeviceArt from '../cards/AnimatedDeviceArt';
import {
  formatEnergy,
  formatPower,
  getApplianceConsumption,
} from '../../utils/applianceConsumption';

const ApplianceTile = memo(function ApplianceTile({ group, maxPower, maxEnergy, t }) {
  const artSrc = getDeviceArtSrc(group.artKey);
  const unavailable = [...group.powerEntities, ...group.energyEntities].every((entity) =>
    ['unavailable', 'unknown'].includes(entity.state)
  );
  const powerPct =
    maxPower > 0 && group.powerW > 0
      ? Math.max(3, Math.min(100, (group.powerW / maxPower) * 100))
      : 0;
  const energyPct =
    maxEnergy > 0 && group.energyKwh > 0
      ? Math.max(3, Math.min(100, (group.energyKwh / maxEnergy) * 100))
      : 0;

  return (
    <div
      className={`glass-texture group relative overflow-hidden rounded-3xl border p-4 transition-all duration-300 ${
        unavailable ? 'opacity-55' : ''
      }`}
      style={{
        borderColor: group.active
          ? 'color-mix(in srgb, var(--domain-light) 24%, var(--surface-border))'
          : undefined,
        backgroundImage: group.active
          ? 'linear-gradient(135deg, color-mix(in srgb, var(--domain-light) 9%, transparent), transparent 70%)'
          : undefined,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        {group.areaName ? (
          <span className="rounded-full bg-[var(--glass-bg)] px-2 py-1 text-[9px] font-bold tracking-widest text-[var(--text-secondary)] uppercase">
            {group.areaName}
          </span>
        ) : (
          <span />
        )}
        <span
          aria-hidden="true"
          className={`mt-1 h-2 w-2 rounded-full ${
            group.active ? 'bg-[var(--domain-light)]' : 'bg-[var(--text-muted)] opacity-40'
          }`}
          style={group.active ? { boxShadow: '0 0 10px var(--domain-light)' } : undefined}
        />
      </div>

      <div
        className="relative mt-3 flex h-28 items-center justify-center overflow-hidden rounded-2xl"
        style={{
          background: group.active
            ? 'radial-gradient(circle at 50% 65%, color-mix(in srgb, var(--domain-light) 18%, transparent), transparent 68%), color-mix(in srgb, var(--text-primary) 3%, transparent)'
            : 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
        }}
      >
        {artSrc ? (
          <AnimatedDeviceArt
            artKey={group.artKey}
            active={group.active}
            className="h-24 w-24 drop-shadow-[0_10px_18px_rgba(0,0,0,0.25)] transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <Zap className="h-10 w-10 text-[var(--domain-light)] opacity-70" />
        )}
      </div>

      <div className="mt-3 min-w-0">
        <p className="truncate text-[15px] font-semibold text-[var(--text-primary)]">
          {group.name}
        </p>

        <div className="mt-2.5 flex items-center justify-between gap-2">
          <span className="inline-flex min-w-0 items-center gap-1 text-[9px] font-bold tracking-widest text-[var(--text-secondary)] uppercase">
            <Zap className="h-3 w-3 shrink-0 text-[var(--domain-light)]" />
            <span className="truncate">{t('appliances.currentPower')}</span>
          </span>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--text-primary)]">
            {unavailable ? '—' : formatPower(group.powerW)}
          </span>
        </div>
        <div
          className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--glass-bg)]"
          role="progressbar"
          aria-label={`${group.name} ${t('appliances.currentPower')}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(powerPct)}
        >
          <div
            className="h-full rounded-full bg-[var(--domain-light)] transition-all duration-500"
            style={{ width: `${powerPct}%`, opacity: group.active ? 1 : 0.35 }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="inline-flex min-w-0 items-center gap-1 text-[9px] font-bold tracking-widest text-[var(--text-secondary)] uppercase">
            <BatteryCharging className="h-3 w-3 shrink-0 text-[var(--domain-energy)]" />
            <span className="truncate">{t('appliances.energy')}</span>
          </span>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--text-primary)]">
            {unavailable ? '—' : formatEnergy(group.energyKwh)}
          </span>
        </div>
        <div
          className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--glass-bg)]"
          role="progressbar"
          aria-label={`${group.name} ${t('appliances.energy')}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(energyPct)}
        >
          <div
            className="h-full rounded-full bg-[var(--domain-energy)] transition-all duration-500"
            style={{ width: `${energyPct}%`, opacity: group.energyKwh > 0 ? 1 : 0.35 }}
          />
        </div>
      </div>
    </div>
  );
});

function AppliancesPage({ entities, pageSettings, pageId, savePageSetting, t }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState(
    () => pageSettings?.[pageId]?.appliancesFilter || 'all'
  );
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState(() => {
    const saved = pageSettings?.[pageId]?.appliancesSelection;
    return Array.isArray(saved) ? saved : null;
  });

  const groups = useMemo(() => getApplianceConsumption(entities), [entities]);
  const selectedSet = selectedKeys ? new Set(selectedKeys) : null;
  const visibleGroups = selectedSet
    ? groups.filter((group) => selectedSet.has(group.key))
    : groups;
  const activeCount = visibleGroups.filter((group) => group.active).length;
  const totalPower = visibleGroups.reduce((sum, group) => sum + group.powerW, 0);
  const totalEnergy = visibleGroups.reduce((sum, group) => sum + group.energyKwh, 0);
  const maxPower = visibleGroups.reduce((max, group) => Math.max(max, group.powerW), 0);
  const maxEnergy = visibleGroups.reduce((max, group) => Math.max(max, group.energyKwh), 0);

  const filtered = useMemo(() => {
    let list =
      filterMode === 'active'
        ? visibleGroups.filter((group) => group.active)
        : visibleGroups;
    if (searchTerm.trim()) {
      const query = searchTerm.trim().toLowerCase();
      list = list.filter(
        (group) =>
          group.name.toLowerCase().includes(query) ||
          String(group.areaName || '').toLowerCase().includes(query)
      );
    }
    return list;
  }, [visibleGroups, filterMode, searchTerm]);

  const saveSelection = (next) => {
    setSelectedKeys(next);
    if (savePageSetting && pageId) savePageSetting(pageId, 'appliancesSelection', next);
  };

  const toggleDevice = (key) => {
    const base = selectedSet ? [...selectedSet] : groups.map((group) => group.key);
    const next = base.includes(key)
      ? base.filter((item) => item !== key)
      : [...base, key];
    const normalized =
      next.length === groups.length ? null : groups.map((group) => group.key).filter((item) => next.includes(item));
    saveSelection(normalized);
  };

  const changeFilter = (mode) => {
    setFilterMode(mode);
    if (savePageSetting && pageId) savePageSetting(pageId, 'appliancesFilter', mode);
  };

  return (
    <div className="animate-in fade-in zoom-in px-4 pb-8 duration-500">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="page-title">{t('appliances.pageTitle')}</h2>
          <p className="page-subtitle">
            {visibleGroups.length} {t('appliances.devices')} · {activeCount}{' '}
            {t('appliances.active')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSelectionOpen((open) => !open)}
          aria-expanded={selectionOpen}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 text-[11px] font-bold tracking-widest text-[var(--text-secondary)] uppercase transition-colors hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
        >
          <Settings className="h-3.5 w-3.5" />
          {t('appliances.selectDevices')}
        </button>
      </div>

      {selectionOpen && (
        <div className="glass-texture mb-5 rounded-3xl border border-[var(--surface-border)] bg-[var(--card-bg)] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="card-eyebrow">{t('appliances.selectDevices')}</p>
            <button
              type="button"
              onClick={() => saveSelection(null)}
              className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-1.5 text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase transition-colors hover:text-[var(--text-primary)]"
            >
              {t('appliances.showAll')}
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => {
              const checked = !selectedSet || selectedSet.has(group.key);
              return (
                <button
                  key={group.key}
                  type="button"
                  role="switch"
                  aria-checked={checked}
                  onClick={() => toggleDevice(group.key)}
                  className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 text-left transition-colors ${
                    checked
                      ? 'border-[var(--accent-color)] bg-[var(--accent-bg)]'
                      : 'border-[var(--surface-border)] bg-[var(--glass-bg)]'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                      checked
                        ? 'border-[var(--accent-color)] bg-[var(--accent-color)] text-[var(--bg-primary)]'
                        : 'border-[var(--surface-border)]'
                    }`}
                  >
                    {checked ? '✓' : ''}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[var(--text-primary)]">
                    {group.name}
                  </span>
                  {group.areaName && (
                    <span className="shrink-0 text-[9px] text-[var(--text-muted)]">
                      {group.areaName}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-5 grid grid-cols-3 gap-2 sm:gap-3">
        <div className="glass-texture min-w-0 rounded-2xl border border-[var(--surface-border)] bg-[var(--card-bg)] p-3 sm:p-4">
          <p className="card-eyebrow flex min-w-0 items-center gap-1.5 text-[9px] leading-tight sm:text-[var(--text-eyebrow)]">
            <Zap className="h-3 w-3 shrink-0 text-[var(--domain-light)]" />
            <span className="truncate">{t('appliances.currentPower')}</span>
          </p>
          <p className="mt-1.5 truncate text-lg font-semibold tabular-nums text-[var(--text-primary)] sm:mt-2 sm:text-2xl">
            {formatPower(totalPower)}
          </p>
        </div>
        <div className="glass-texture min-w-0 rounded-2xl border border-[var(--surface-border)] bg-[var(--card-bg)] p-3 sm:p-4">
          <p className="card-eyebrow flex min-w-0 items-center gap-1.5 text-[9px] leading-tight sm:text-[var(--text-eyebrow)]">
            <BatteryCharging className="h-3 w-3 shrink-0 text-[var(--domain-energy)]" />
            <span className="truncate">{t('appliances.todayEnergy')}</span>
          </p>
          <p className="mt-1.5 truncate text-lg font-semibold tabular-nums text-[var(--text-primary)] sm:mt-2 sm:text-2xl">
            {formatEnergy(totalEnergy)}
          </p>
        </div>
        <div className="glass-texture min-w-0 rounded-2xl border border-[var(--surface-border)] bg-[var(--card-bg)] p-3 sm:p-4">
          <p className="card-eyebrow flex min-w-0 items-center gap-1.5 text-[9px] leading-tight sm:text-[var(--text-eyebrow)]">
            <Activity className="h-3 w-3 shrink-0 text-[var(--domain-climate)]" />
            <span className="truncate">{t('appliances.active')}</span>
          </p>
          <p className="mt-1.5 truncate text-lg font-semibold tabular-nums text-[var(--text-primary)] sm:mt-2 sm:text-2xl">
            {activeCount}/{visibleGroups.length}
          </p>
        </div>
      </div>

      {visibleGroups.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t('appliances.search')}
              className="popup-surface w-full rounded-2xl py-2.5 pr-9 pl-10 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                aria-label={t('common.close')}
                className="absolute top-1/2 right-3 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--glass-bg)] text-[var(--text-muted)]"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          {[
            { key: 'all', label: t('appliances.all'), count: visibleGroups.length },
            { key: 'active', label: t('appliances.active'), count: activeCount },
          ].map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => changeFilter(option.key)}
              className={`rounded-2xl border px-3 py-2.5 text-[11px] font-bold tracking-widest uppercase transition-all active:scale-95 ${
                filterMode === option.key
                  ? 'border-[var(--accent-color)] bg-[var(--accent-bg)] text-[var(--accent-color)]'
                  : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)]'
              }`}
            >
              {option.label} ({option.count})
            </button>
          ))}
        </div>
      )}

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((group) => (
            <ApplianceTile
              key={group.key}
              group={group}
              maxPower={maxPower}
              maxEnergy={maxEnergy}
              t={t}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
          <div className="mb-4 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] p-5">
            <Zap className="h-10 w-10 text-[var(--domain-light)] opacity-70" />
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            {groups.length === 0
              ? t('appliances.noAppliances')
              : visibleGroups.length === 0
                ? t('appliances.noSelection')
                : t('appliances.noResults')}
          </p>
          {groups.length > 0 && visibleGroups.length === 0 && (
            <button
              type="button"
              onClick={() => setSelectionOpen(true)}
              className="mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-2xl border border-[var(--accent-color)] bg-[var(--accent-bg)] px-4 text-[11px] font-bold tracking-widest text-[var(--accent-color)] uppercase"
            >
              <Settings className="h-3.5 w-3.5" />
              {t('appliances.selectDevices')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(AppliancesPage);
