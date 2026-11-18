import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ownerId, petId } from '~/types/ids';
import { useSelection } from './selection';

/**
 * The desk keeps its selection in the URL rather than a reducer, so this is
 * the state-transition test: no DOM, no network, no query client — just the
 * rule that one selection invalidates another.
 */
const at = (entry: string) =>
  renderHook(() => useSelection(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>
    ),
  });

describe('useSelection', () => {
  it('clears the selected pet when another owner is selected', () => {
    const { result } = at('/desk?owner=1&pet=10');
    expect(result.current.selection.ownerId).toBe(1);
    expect(result.current.selection.petId).toBe(10);

    act(() => {
      result.current.select({ ownerId: ownerId(2) });
    });

    // A pet id is only meaningful inside its owner. Carrying it across would
    // leave the desk pointing at a pet the new customer does not have.
    expect(result.current.selection.ownerId).toBe(2);
    expect(result.current.selection.petId).toBeNull();
  });

  it('keeps the selected pet when the SAME owner is reselected', () => {
    const { result } = at('/desk?owner=1&pet=10');

    // Clicking the customer you are already looking at must not throw away
    // the pet you have open mid-call.
    act(() => {
      result.current.select({ ownerId: ownerId(1) });
    });

    expect(result.current.selection.petId).toBe(10);
  });

  it('clears both when the owner selection is cleared', () => {
    const { result } = at('/desk?owner=1&pet=10');

    act(() => {
      result.current.select({ ownerId: null });
    });

    expect(result.current.selection.ownerId).toBeNull();
    expect(result.current.selection.petId).toBeNull();
  });

  it('leaves the owner alone when only the pet changes', () => {
    const { result } = at('/desk?owner=1&pet=10');

    act(() => {
      result.current.select({ petId: petId(11) });
    });

    expect(result.current.selection.ownerId).toBe(1);
    expect(result.current.selection.petId).toBe(11);
  });

  it('keeps the query across an owner switch, so the results stay usable', () => {
    const { result } = at('/desk?q=Franklin&owner=1&pet=10');

    act(() => {
      result.current.select({ ownerId: ownerId(2) });
    });

    expect(result.current.selection.query).toBe('Franklin');
    expect(result.current.selection.petId).toBeNull();
  });
});
