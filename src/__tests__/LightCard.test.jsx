import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LightCard from '../components/cards/LightCard';

const light = (entityId, state, attributes = {}) => ({
  entity_id: entityId,
  state,
  attributes: {
    friendly_name: entityId,
    supported_color_modes: ['brightness'],
    ...attributes,
  },
});

const renderCard = (overrides = {}) => {
  const entities = {
    'light.group': light('light.group', 'on', {
      brightness: 200,
      entity_id: ['light.a', 'light.b'],
    }),
    'light.a': light('light.a', 'on', {
      brightness: 200,
      rgb_color: [255, 255, 255],
    }),
    'light.b': light('light.b', 'on', {
      brightness: 210,
      rgb_color: [255, 255, 255],
    }),
  };
  const callService = vi.fn().mockResolvedValue({});
  const utils = render(
    <LightCard
      cardId="light.group"
      entityId="light.group"
      dragProps={{}}
      controls={null}
      cardStyle={{}}
      entities={entities}
      editMode={false}
      cardSettings={{}}
      settingsKey="home::light.group"
      customNames={{}}
      customIcons={{}}
      customArt={{}}
      getA={(entityId, attribute) => entities[entityId]?.attributes?.[attribute]}
      callService={callService}
      onOpen={vi.fn()}
      isMobile={false}
      optimisticLightBrightness={{}}
      setOptimisticLightBrightness={vi.fn()}
      t={(key) => key}
      {...overrides}
    />
  );
  return { ...utils, entities, callService };
};

describe('LightCard', () => {
  it('uses the fixed amber accent for grouped lights', () => {
    const { container } = renderCard();
    const card = container.firstChild;
    expect(card.style.backgroundImage).toContain('--domain-light');
    const toggle = screen.getByRole('switch');
    expect(toggle.style.backgroundColor).toBe('var(--domain-light)');
    expect(screen.getByText('2/2 common.on')).toBeInTheDocument();
  });

  it('optimistically toggles the group and rolls back when the service fails', async () => {
    const callService = vi.fn().mockRejectedValue(new Error('offline'));
    renderCard({ callService });
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    await Promise.resolve();
    await Promise.resolve();
    expect(callService).toHaveBeenCalledWith('light', 'turn_off', {
      entity_id: 'light.group',
    });
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'));
  });

  it('opens the group member sheet from the group badge', () => {
    const { callService } = renderCard();
    fireEvent.click(screen.getByRole('button', { name: '2 lights.groups' }));
    const sheet = screen.getByRole('dialog', { name: 'light.groupMembers' });
    expect(within(sheet).getByText('light.a')).toBeInTheDocument();
    fireEvent.click(within(sheet).getAllByRole('switch')[0]);
    expect(callService).toHaveBeenCalledWith('light', 'turn_off', {
      entity_id: 'light.a',
    });
  });

  it('opens quick actions from the context menu and applies a preset', () => {
    const { container, callService } = renderCard();
    fireEvent.contextMenu(container.firstChild);
    const sheet = screen.getByRole('dialog', { name: 'light.quickActions' });
    fireEvent.click(within(sheet).getByRole('button', { name: '25%' }));
    expect(callService).toHaveBeenCalledWith('light', 'turn_on', {
      entity_id: 'light.group',
      brightness: 64,
    });
  });
});
