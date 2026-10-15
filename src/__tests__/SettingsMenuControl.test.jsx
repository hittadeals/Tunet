import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SettingsMenuControl from '../layouts/SettingsMenuControl';

const makeProps = (overrides = {}) => ({
  setShowConfigModal: vi.fn(),
  setConfigTab: vi.fn(),
  setShowThemeSidebar: vi.fn(),
  setShowLayoutSidebar: vi.fn(),
  setShowHeaderEditModal: vi.fn(),
  onToggleEdit: vi.fn(),
  editMode: false,
  updateCount: 0,
  isMobile: true,
  t: (key) => key,
  ...overrides,
});

describe('SettingsMenuControl', () => {
  it('uses a 44px mobile trigger and keeps edit mode in the menu', () => {
    const props = makeProps();
    render(<SettingsMenuControl {...props} />);

    const trigger = screen.getByTestId('settings-dropdown-trigger');
    expect(trigger).toHaveClass('h-11', 'w-11');

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('menuitem', { name: 'menu.edit' }));

    expect(props.onToggleEdit).toHaveBeenCalledOnce();
  });

  it('opens system settings and preserves the update badge', () => {
    const props = makeProps({ updateCount: 3 });
    render(<SettingsMenuControl {...props} />);

    expect(screen.getByText('3')).toBeInTheDocument();
    const badge = document.querySelector('[data-settings-update-badge]');
    expect(badge).toHaveClass('-top-2', '-right-2');
    expect(badge).not.toHaveClass('border-2');
    fireEvent.click(screen.getByTestId('settings-dropdown-trigger'));
    fireEvent.click(screen.getByTestId('settings-menu-system'));

    expect(props.setShowConfigModal).toHaveBeenCalledWith(true);
    expect(props.setConfigTab).toHaveBeenCalledWith('connection');
  });

  it('keeps the small gear trigger outside the mobile variant', () => {
    render(<SettingsMenuControl {...makeProps({ isMobile: false })} />);

    const trigger = screen.getByTestId('settings-dropdown-trigger');
    expect(trigger).not.toHaveClass('h-11');
    expect(trigger).toHaveAccessibleName('menu.settings');
    expect(screen.getByTestId('settings-menu-control')).not.toHaveClass('fixed');
  });

  it('offers a done action in the menu while editing', () => {
    const props = makeProps({ editMode: true });
    render(<SettingsMenuControl {...props} />);

    fireEvent.click(screen.getByTestId('settings-dropdown-trigger'));
    const done = screen.getByRole('menuitem', { name: 'nav.done' });
    expect(done).toHaveAttribute('data-testid', 'settings-menu-done');

    fireEvent.click(done);

    expect(props.onToggleEdit).toHaveBeenCalledOnce();
  });
});
