import { TodoCard } from '../../components';
import { getDeviceArtSrc, resolveEntityArtKey } from '../../config/deviceArt';
import { getSettings, stopPropagation } from '../helpers';

export function renderTodoCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const {
    editMode,
    conn,
    cardSettings,
    customNames,
    customIcons,
    customArt,
    setShowTodoModal,
    setShowEditCardModal,
    setEditCardSettingsKey,
    t,
  } = ctx;
  const settings = getSettings(cardSettings, settingsKey, cardId);
  const sizeSetting = settings.size;
  return (
    <TodoCard
      key={cardId}
      cardId={cardId}
      settings={settings}
      conn={conn}
      t={t}
      dragProps={dragProps}
      getControls={getControls}
      isEditMode={editMode}
      className="h-full"
      style={cardStyle}
      size={sizeSetting}
      iconName={customIcons[cardId] || null}
      artSrc={getDeviceArtSrc(resolveEntityArtKey(cardId, null, customArt))}
      customName={customNames[cardId] || null}
      onClick={(e) => {
        stopPropagation(e);
        if (editMode) {
          setShowEditCardModal(cardId);
          setEditCardSettingsKey(settingsKey);
        } else {
          setShowTodoModal(cardId);
        }
      }}
    />
  );
}
