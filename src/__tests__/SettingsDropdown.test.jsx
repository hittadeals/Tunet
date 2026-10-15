import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SettingsDropdown from '../components/ui/SettingsDropdown';

const translations = {
  'menu.settings': 'Settings',
  'menu.edit': 'Edit',
  'menu.system': 'System',
  'nav.addCard': 'Add card',
  'nav.done': 'Done',
  'settings.openAppearance': 'Open appearance',
  'settings.openLayout': 'Open layout',
  'settings.openHeader': 'Open header',
  'settings.openSystem': 'Open system',
  'system.tabAppearance': 'Appearance',
  'system.tabLayout': 'Layout',
  'system.tabHeader': 'Header',
};

const baseProps = (overrides = {}) => ({
  onOpenSettings: vi.fn(),
  onOpenTheme: vi.fn(),
  onOpenLayout: vi.fn(),
  onOpenHeader: vi.fn(),
  onAddCard: vi.fn(),
  onToggleEdit: vi.fn(),
  editMode: false,
  isMobile: true,
  t: (key) => translations[key] || key,
  ...overrides,
});

describe('SettingsDropdown action menu', () => {
  it('opens downward from the gear trigger and exposes add-card and edit actions', () => {
    const props = baseProps();
    render(<SettingsDropdown {...props} />);

    const trigger = screen.getByRole('button', { name: 'Settings' });
    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('settings-dropdown-menu').className).toContain('top-full');
    expect(screen.getByRole('menuitem', { name: 'Add card' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Add card' }));

    expect(props.onAddCard).toHaveBeenCalledOnce();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps the edit action available outside the mobile variant', () => {
    const props = baseProps({ isMobile: false });
    render(<SettingsDropdown {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
  });

  it('offers a done action in the menu while editing', () => {
    const props = baseProps({ editMode: true });
    render(<SettingsDropdown {...props} />);

    const trigger = screen.getByRole('button', { name: 'Settings' });
    fireEvent.click(trigger);

    expect(screen.queryByRole('menuitem', { name: 'Edit' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Done' }));

    expect(props.onToggleEdit).toHaveBeenCalledOnce();
    expect(screen.getByTestId('settings-dropdown-menu')).toHaveAttribute('aria-hidden', 'true');
  });
});
