import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { renderDesk } from '~/test/renderDesk';
import { server } from '~/test/setup';
import { createdPetCount } from '~/test/handlers';

/**
 * Every helper re-queries the panel on each poll.
 *
 * `within(panelElement)` captures the <section> at call time, but a panel that
 * changes state (empty -> loading -> loaded) is a different component at that
 * position, so React replaces the node. Holding the old element means polling
 * a detached tree that will never update — a passing-by-luck test at best.
 */
const panel = (name: string): HTMLElement => screen.getByRole('region', { name });

const inPanel = (name: string, text: string | RegExp): Promise<HTMLElement> =>
  waitFor(() => within(panel(name)).getByText(text));

const buttonIn = (name: string, button: RegExp): Promise<HTMLElement> =>
  waitFor(() => within(panel(name)).getByRole('button', { name: button }));

/** Scoped to the results list: the "Recent" list in the same panel also holds
 *  a button named after the customer. */
const searchResult = (name: RegExp): Promise<HTMLElement> =>
  waitFor(() =>
    within(
      within(panel('Customer search')).getByRole('list', { name: 'Search results' }),
    ).getByRole('button', { name }),
  );

/** Re-queries the panel on each call, for the same reason `inPanel` does. */
const fieldIn = (name: string, label: RegExp): HTMLElement =>
  within(panel(name)).getByLabelText(label);

const SEARCH = 'Customer search';
const CUSTOMER = 'Customer details';
const PET = 'Pet details';

/** George's telephone — the marker that the customer payload has landed. */
const GEORGE_PHONE = '6085551023';
/** The action button and the form's submit button carry this exact label. */
const ADD_PET = /^add pet$/i;

describe('reception desk workflow', () => {
  it('search → owner → pet → record a visit, all without navigating', async () => {
    const user = userEvent.setup();
    const { paths } = renderDesk('/desk');

    // 1. Find the customer.
    await user.type(screen.getByLabelText(/search by last name/i), 'Franklin');

    // 2. Open them.
    await user.click(await searchResult(/George Franklin/));
    await inPanel(CUSTOMER, GEORGE_PHONE);

    // 3. Open the pet and read its history.
    await user.click(await buttonIn(CUSTOMER, /Leo/));
    await inPanel(PET, 'rabies shot');

    // 4. Record a visit.
    await user.click(await buttonIn(PET, /new visit/i));
    await user.type(
      fieldIn(PET, /description/i),
      'Annual vaccination',
    );
    await user.click(await buttonIn(PET, /record visit/i));

    // 5. It appears in the history immediately.
    expect(await inPanel(PET, 'Annual vaccination')).toBeVisible();

    // The search results are STILL on screen: the next lookup costs nothing.
    expect(await searchResult(/George Franklin/)).toBeVisible();

    // The whole workflow happened on a single route. This assertion is the
    // proof of "without continuous navigation between unrelated screens".
    expect([...new Set(paths)]).toEqual(['/desk']);
  });

  it('keeps the search results when the owner request fails', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/api/owners/:ownerId', () =>
        HttpResponse.json(
          { status: 500, detail: 'Database unavailable' },
          { status: 500 },
        ),
      ),
    );

    renderDesk('/desk');
    await user.type(screen.getByLabelText(/search by last name/i), 'Franklin');
    await user.click(await searchResult(/George Franklin/));

    await waitFor(() => {
      expect(within(panel(CUSTOMER)).getByRole('alert')).toHaveTextContent(
        /database unavailable/i,
      );
    });
    // One query feeds two zones, but its failure must not cost the search.
    expect(await searchResult(/George Franklin/)).toBeVisible();
  });

  it('reports the scope it searched rather than claiming "no results"', async () => {
    const user = userEvent.setup();
    renderDesk('/desk');

    await user.type(screen.getByLabelText(/search by last name/i), 'Nonexistent');

    await waitFor(() => {
      expect(within(panel(SEARCH)).getByRole('status')).toHaveTextContent(
        /0 matches, searched all/i,
      );
    });
  });

  it('finds a customer by telephone, which the server cannot filter on', async () => {
    const user = userEvent.setup();
    renderDesk('/desk');

    await user.type(screen.getByLabelText(/search by last name/i), '6085551023');

    expect(await searchResult(/George Franklin/)).toBeVisible();
  });

  /**
   * Regression guard — see the comment on `isoDateSchema` in ~/domain/schemas.
   * The form used to refuse to submit in SILENCE, so what is asserted here is
   * not that it rejects, but that it SAYS SO.
   */
  it('says why it will not add a pet, rather than doing nothing', async () => {
    const user = userEvent.setup();
    renderDesk('/desk?owner=1');
    await inPanel(CUSTOMER, GEORGE_PHONE);
    await user.click(await buttonIn(CUSTOMER, ADD_PET));

    await user.type(fieldIn(CUSTOMER, /^name$/i), 'Rex');
    // Date of birth left empty — exactly the state the form opens in.
    await user.click(await buttonIn(CUSTOMER, ADD_PET));

    expect(await inPanel(CUSTOMER, /use the format yyyy-mm-dd/i)).toBeVisible();
    // Still on the form, with the typed name intact, and nothing sent.
    expect(fieldIn(CUSTOMER, /^name$/i)).toHaveValue('Rex');
    expect(createdPetCount()).toBe(0);
  });

  it('adds a pet and lists it under the customer', async () => {
    const user = userEvent.setup();
    renderDesk('/desk?owner=1');
    await inPanel(CUSTOMER, GEORGE_PHONE);
    await user.click(await buttonIn(CUSTOMER, ADD_PET));

    await user.type(fieldIn(CUSTOMER, /^name$/i), 'Mittens');
    await user.type(fieldIn(CUSTOMER, /date of birth/i), '2021-03-04');
    await user.selectOptions(fieldIn(CUSTOMER, /species/i), '2');
    await user.click(await buttonIn(CUSTOMER, ADD_PET));

    // The form closes and the new pet is in the list, from the refetched owner.
    expect(await inPanel(CUSTOMER, 'Mittens')).toBeVisible();
    expect(await inPanel(CUSTOMER, /dog/)).toBeVisible();
  });

  it('offers a retry when the species list fails to load', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/api/pettypes', () =>
        HttpResponse.json({ status: 500, detail: 'Species unavailable' }, { status: 500 }),
      ),
    );

    renderDesk('/desk?owner=1');
    await inPanel(CUSTOMER, GEORGE_PHONE);
    await user.click(await buttonIn(CUSTOMER, ADD_PET));

    // The pet form cannot be completed without the species list, so the panel
    // must say so AND offer a way forward rather than stranding the
    // receptionist on a dead end mid-call.
    expect(await inPanel(CUSTOMER, /species list is required/i)).toBeVisible();
    expect(await buttonIn(CUSTOMER, /try again/i)).toBeVisible();
  });

  // The two tests below cover `useSearchHotkey` and `useListKeyboard`. Both
  // are keyboard-only paths with no on-screen affordance, so nothing else in
  // the suite would notice if they stopped working.
  it('focuses the search box when / is pressed', async () => {
    const user = userEvent.setup();
    renderDesk('/desk');

    const search = screen.getByLabelText(/search by last name/i);
    expect(search).not.toHaveFocus();

    await user.keyboard('/');

    expect(search).toHaveFocus();
  });

  it('picks a customer with the arrow keys and Enter', async () => {
    const user = userEvent.setup();
    renderDesk('/desk');

    // A numeric query matches both fixtures, so there is a list to move down.
    await user.type(screen.getByLabelText(/search by last name/i), '608555');
    await searchResult(/George Franklin/);

    // Focus stays in the input throughout — the list is driven from there.
    await user.keyboard('{ArrowDown}{Enter}');

    expect(await inPanel(CUSTOMER, 'Betty Davis')).toBeVisible();
  });

  it('keeps typed input when the save fails', async () => {
    const user = userEvent.setup();
    server.use(
      http.put('/api/owners/:ownerId', () =>
        HttpResponse.json(
          { status: 500, detail: 'Database unavailable' },
          { status: 500 },
        ),
      ),
    );

    renderDesk('/desk?owner=1');
    await inPanel(CUSTOMER, GEORGE_PHONE);
    await user.click(await buttonIn(CUSTOMER, /^edit$/i));

    const city = fieldIn(CUSTOMER, /^city$/i);
    await user.clear(city);
    await user.type(city, 'Middleton');
    await user.click(await buttonIn(CUSTOMER, /save changes/i));

    // The failure is reported...
    expect(await inPanel(CUSTOMER, /database unavailable/i)).toBeVisible();
    // ...and nothing the receptionist typed has to be typed again.
    expect(fieldIn(CUSTOMER, /^city$/i)).toHaveValue('Middleton');
    expect(fieldIn(CUSTOMER, /first name/i)).toHaveValue('George');
  });

  it('sends one request when Save is clicked twice', async () => {
    const user = userEvent.setup();
    let puts = 0;
    server.use(
      http.put('/api/owners/:ownerId', async () => {
        puts += 1;
        // A slow server widens the window a second click could slip through.
        await delay(150);
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderDesk('/desk?owner=1');
    await inPanel(CUSTOMER, GEORGE_PHONE);
    await user.click(await buttonIn(CUSTOMER, /^edit$/i));

    // 50ms apart: faster than any human double-click, which an OS reports at
    // 100-500ms. `disabled={pending}` is a render-dependent guard, so it holds
    // from about 10ms onwards. Two clicks dispatched in the SAME TICK still
    // get through, because React has had no chance to re-render — reachable
    // synthetically, not by a person with a mouse.
    const save = await buttonIn(CUSTOMER, /save changes/i);
    fireEvent.click(save);
    await new Promise((resolve) => setTimeout(resolve, 50));
    fireEvent.click(save);

    await waitFor(() => {
      expect(puts).toBeGreaterThan(0);
    });
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(puts).toBe(1);
  });

  it('opens a deep link straight to a pet', async () => {
    renderDesk('/desk?owner=1&pet=1');
    // The owner payload carries the pet and its visits, so one request fills
    // both zones.
    expect(await inPanel(CUSTOMER, GEORGE_PHONE)).toBeVisible();
    expect(await inPanel(PET, 'rabies shot')).toBeVisible();
  });
});
