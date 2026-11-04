import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PageNavigation from '../components/pages/PageNavigation';

const mockUsePages = vi.fn();
const mockUseModalActions = vi.fn();

vi.mock('../contexts', () => ({
  usePages: () => mockUsePages(),
  useModalActions: () => mockUseModalActions(),
}));

const MockIcon = (props) => <svg data-testid="mock-icon" {...props} />;

describe('PageNavigation', () => {
  it('hides single page pill outside edit mode when hideSinglePagePill is enabled', () => {
    mockUsePages.mockReturnValue({
      pagesConfig: { pages: ['home'] },
      persistConfig: vi.fn(),
      pageSettings: {
        home: { hideSinglePagePill: true },
      },
    });
    mockUseModalActions.mockReturnValue({ setShowAddPageModal: vi.fn() });

    render(
      <PageNavigation
        pages={[{ id: 'home', label: 'Home', icon: MockIcon }]}
        activePage="home"
        setActivePage={vi.fn()}
        editMode={false}
        setEditingPage={vi.fn()}
        t={(k) => k}
      />
    );

    expect(screen.queryByText('Home')).not.toBeInTheDocument();
  });

  it('still shows single page pill in edit mode when hideSinglePagePill is enabled', () => {
    mockUsePages.mockReturnValue({
      pagesConfig: { pages: ['home'] },
      persistConfig: vi.fn(),
      pageSettings: {
        home: { hideSinglePagePill: true },
      },
    });
    mockUseModalActions.mockReturnValue({ setShowAddPageModal: vi.fn() });

    render(
      <PageNavigation
        pages={[{ id: 'home', label: 'Home', icon: MockIcon }]}
        activePage="home"
        setActivePage={vi.fn()}
        editMode={true}
        setEditingPage={vi.fn()}
        t={(k) => k}
      />
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('uses a larger mobile page button and icon', () => {
    mockUsePages.mockReturnValue({
      pagesConfig: { pages: ['home'] },
      persistConfig: vi.fn(),
      pageSettings: {},
      headerSettings: { showPagePillLabelsOnMobile: true },
    });
    mockUseModalActions.mockReturnValue({ setShowAddPageModal: vi.fn() });

    render(
      <PageNavigation
        pages={[{ id: 'home', label: 'Home', icon: MockIcon }]}
        activePage="home"
        setActivePage={vi.fn()}
        editMode={false}
        setEditingPage={vi.fn()}
        t={(k) => k}
      />
    );

    const button = screen.getByRole('button', { name: 'Home' });
    expect(button).toHaveClass('min-h-11', 'min-w-11', 'px-3', 'py-2.5');
    expect(screen.getByTestId('mock-icon')).toHaveClass('h-5', 'w-5', 'sm:h-4', 'sm:w-4');
  });

  it('reorders pages from the edit-mode page manager', () => {
    const persistConfig = vi.fn();
    mockUsePages.mockReturnValue({
      pagesConfig: { pages: ['home', 'page2'] },
      persistConfig,
      pageSettings: {},
      persistPageSettings: vi.fn(),
    });
    mockUseModalActions.mockReturnValue({ setShowAddPageModal: vi.fn() });

    render(
      <PageNavigation
        pages={[
          { id: 'home', label: 'Home', icon: MockIcon },
          { id: 'page2', label: 'Page 2', icon: MockIcon },
        ]}
        activePage="home"
        setActivePage={vi.fn()}
        editMode
        setEditingPage={vi.fn()}
        t={(k) => k}
      />
    );

    fireEvent.click(screen.getByTestId('page-manager-trigger'));
    fireEvent.click(screen.getAllByRole('button', { name: 'nav.moveDown' })[0]);
    expect(persistConfig).toHaveBeenCalledWith(
      expect.objectContaining({ pages: ['page2', 'home'] })
    );
  });

  it('deletes a page from the edit-mode page manager after confirmation', () => {
    const persistConfig = vi.fn();
    const persistPageSettings = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockUsePages.mockReturnValue({
      pagesConfig: { pages: ['home', 'page2'], page2: ['light.bedroom'] },
      persistConfig,
      pageSettings: { home: {}, page2: { label: 'Page 2' } },
      persistPageSettings,
    });
    mockUseModalActions.mockReturnValue({ setShowAddPageModal: vi.fn() });

    render(
      <PageNavigation
        pages={[
          { id: 'home', label: 'Home', icon: MockIcon },
          { id: 'page2', label: 'Page 2', icon: MockIcon },
        ]}
        activePage="home"
        setActivePage={vi.fn()}
        editMode
        setEditingPage={vi.fn()}
        t={(k) => k}
      />
    );

    fireEvent.click(screen.getByTestId('page-manager-trigger'));
    fireEvent.click(screen.getAllByRole('button', { name: 'nav.deletePage' })[0]);
    expect(window.confirm).toHaveBeenCalled();
    expect(persistConfig).toHaveBeenCalledWith(
      expect.objectContaining({ pages: ['home'] })
    );
    expect(persistPageSettings).toHaveBeenCalledWith({ home: {} });
  });
});
