import SettingsDropdown from '../components/ui/SettingsDropdown';

export default function SettingsMenuControl({
  setShowConfigModal,
  setConfigTab,
  setShowThemeSidebar,
  setShowLayoutSidebar,
  setShowHeaderEditModal,
  onAddCard,
  onToggleEdit,
  editMode,
  updateCount,
  isMobile,
  t,
}) {
  return (
    <div
      className="relative flex flex-shrink-0 items-center justify-center"
      data-testid="settings-menu-control"
    >
      <SettingsDropdown
        onOpenSettings={() => {
          setShowConfigModal(true);
          setConfigTab('connection');
        }}
        onOpenTheme={() => setShowThemeSidebar(true)}
        onOpenLayout={() => setShowLayoutSidebar(true)}
        onOpenHeader={() => setShowHeaderEditModal(true)}
        onAddCard={onAddCard}
        onToggleEdit={onToggleEdit}
        editMode={editMode}
        isMobile={isMobile}
        t={t}
      />
      {updateCount > 0 && (
        <div
          data-settings-update-badge
          className="pointer-events-none absolute -top-2 -right-2 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-600 px-1 shadow-sm"
        >
          <span className="pt-[1px] text-[11px] leading-none font-bold text-white">
            {updateCount}
          </span>
        </div>
      )}
    </div>
  );
}
