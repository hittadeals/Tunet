import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AddPageModal from '../modals/AddPageModal';

describe('AddPageModal', () => {
  it('creates an appliances page from the consumption tab', () => {
    const onCreateAppliances = vi.fn();
    render(
      <AddPageModal
        isOpen
        onClose={vi.fn()}
        t={(key) => key}
        newPageLabel=""
        setNewPageLabel={vi.fn()}
        newPageIcon={null}
        setNewPageIcon={vi.fn()}
        onCreate={vi.fn()}
        onCreateMedia={vi.fn()}
        onCreateSonos={vi.fn()}
        onCreateLights={vi.fn()}
        onCreateBattery={vi.fn()}
        onCreateAppliances={onCreateAppliances}
        onCreateRoomExplorer={vi.fn()}
        onCreateHouse3D={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'addCard.type.appliances' }));
    expect(screen.getByText('appliances.createDescription')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'page.create' }).at(-1));
    expect(onCreateAppliances).toHaveBeenCalledTimes(1);
  });
});
