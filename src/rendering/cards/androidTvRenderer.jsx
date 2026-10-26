import { GenericAndroidTVCard } from '../../components';
import { getSettings, renderMissingEntityWhenReady } from '../helpers';
import { getDeviceArtSrc, resolveEntityArtKey } from '../../config/deviceArt';

export function renderGenericAndroidTVCard(
  cardId,
  dragProps,
  getControls,
  cardStyle,
  settingsKey,
  ctx
) {
  const {
    entities,
    editMode,
    cardSettings,
    customNames,
    customArt,
    getA,
    getEntityImageUrl,
    setShowAndroidTVModal,
    callService,
    isMobile,
    t,
  } = ctx;
  const settings = getSettings(cardSettings, settingsKey, cardId);
  const mediaPlayerId = settings.mediaPlayerId;
  const remoteId = settings.remoteId;
  const linkedMediaPlayers = settings.linkedMediaPlayers;

  if (!mediaPlayerId || !entities[mediaPlayerId]) {
    return renderMissingEntityWhenReady(ctx, {
      cardId,
      dragProps,
      controls: getControls(cardId),
      cardStyle,
      missingEntityId: mediaPlayerId || cardId,
      t,
    });
  }

  return (
    <GenericAndroidTVCard
      cardId={cardId}
      dragProps={dragProps}
      controls={getControls(cardId)}
      cardStyle={cardStyle}
      editMode={editMode}
      entities={entities}
      mediaPlayerId={mediaPlayerId}
      remoteId={remoteId}
      linkedMediaPlayers={linkedMediaPlayers}
      size={settings.size}
      getA={getA}
      getEntityImageUrl={getEntityImageUrl}
      onOpen={() => setShowAndroidTVModal(cardId)}
      customNames={customNames}
      artSrc={getDeviceArtSrc(
        resolveEntityArtKey(mediaPlayerId, entities[mediaPlayerId], customArt)
      )}
      isMobile={isMobile}
      t={t}
      callService={callService}
    />
  );
}
