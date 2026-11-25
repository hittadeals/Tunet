/**
 * Tap-action selector for a status pill. Kept separate from the large config
 * modal so the interaction model can evolve without touching the whole editor.
 */
export default function StatusPillTapActionField({ pill, updatePill, getTranslation }) {
  const tr = (key, fallback) => {
    const value = getTranslation(key, fallback);
    return value || fallback;
  };
  return (
    <label className="flex min-w-[10rem] flex-col gap-1 rounded-xl border border-[var(--glass-border)]/35 bg-transparent p-2">
      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">
        {tr('statusPills.tapAction', 'Tap action')}
      </span>
      <select
        value={pill.tapAction || 'auto'}
        onChange={(event) => updatePill(pill.id, { tapAction: event.target.value })}
        className="rounded-lg border-0 bg-[var(--modal-bg)] px-2 py-1 text-xs font-bold text-[var(--text-primary)] outline-none"
      >
        <option value="auto">{tr('statusPills.tapAuto', 'Automatic')}</option>
        <option value="toggle">{tr('statusPills.tapToggle', 'Toggle')}</option>
        <option value="more-info">{tr('statusPills.tapMoreInfo', 'More info')}</option>
        <option value="none">{tr('statusPills.tapNone', 'No action')}</option>
      </select>
      <span className="text-[10px] leading-snug text-[var(--text-muted)]">
        {tr('statusPills.shortPressHint', 'Short press opens details')}
      </span>
    </label>
  );
}
