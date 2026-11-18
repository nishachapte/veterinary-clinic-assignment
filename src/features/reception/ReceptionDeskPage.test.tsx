import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { renderDesk } from '~/test/renderDesk';
import { betty, george, owners } from '~/test/fixtures';
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

  it('sends one request however fast Save is clicked', async () => {
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

    // Dispatched in the SAME TICK, which is the hardest case: React has had
    // no chance to re-render, so `disabled={pending}` is not in effect yet.
    // Only the ref latch in `useGuardedSubmit` can stop this one.
    const save = await buttonIn(CUSTOMER, /save changes/i);
    fireEvent.click(save);
    fireEvent.click(save);
    fireEvent.click(save);

    await waitFor(() => {
      expect(puts).toBeGreaterThan(0);
    });
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(puts).toBe(1);
  });

  it('lets the receptionist retry after a save fails', async () => {
    const user = userEvent.setup();
    let puts = 0;
    server.use(
      http.put('/api/owners/:ownerId', () => {
        puts += 1;
        // Fail once, then accept — the shape of a blip the user retries past.
        return puts === 1
          ? HttpResponse.json({ status: 503, detail: 'Try again' }, { status: 503 })
          : new HttpResponse(null, { status: 204 });
      }),
    );

    renderDesk('/desk?owner=1');
    await inPanel(CUSTOMER, GEORGE_PHONE);
    await user.click(await buttonIn(CUSTOMER, /^edit$/i));
    await user.click(await buttonIn(CUSTOMER, /save changes/i));
    expect(await inPanel(CUSTOMER, /try again/i)).toBeVisible();

    // The guard latch MUST have released; otherwise the form is bricked and
    // this second click does nothing at all, silently.
    await user.click(await buttonIn(CUSTOMER, /save changes/i));

    await waitFor(() => {
      expect(puts).toBe(2);
    });
    // Succeeded, so the form closed and the summary is back.
    expect(await inPanel(CUSTOMER, GEORGE_PHONE)).toBeVisible();
  });

  it('does not fire a request per keystroke', async () => {
    const user = userEvent.setup();
    let scans = 0;
    server.use(
      http.get('/api/v2/owners', ({ request }) => {
        scans += 1;
        const url = new URL(request.url);
        const lastName = url.searchParams.get('lastName') ?? '';
        const content = owners.filter((o) => o.lastName.startsWith(lastName));
        return HttpResponse.json({
          content,
          page: 0,
          size: 20,
          totalElements: content.length,
          totalPages: content.length === 0 ? 0 : 1,
        });
      }),
    );

    renderDesk('/desk');
    await user.type(screen.getByLabelText(/search by last name/i), 'Franklin');
    await searchResult(/George Franklin/);

    // Eight characters, one bounded scan — the debounce is on the LOOKUP, not
    // merely on the URL write.
    expect(scans).toBe(1);
  });

  it('refreshes the search row when the owner behind it is edited', async () => {
    const user = userEvent.setup();
    renderDesk('/desk');

    await user.type(screen.getByLabelText(/search by last name/i), 'Franklin');
    await user.click(await searchResult(/George Franklin/));
    await inPanel(CUSTOMER, GEORGE_PHONE);

    await user.click(await buttonIn(CUSTOMER, /^edit$/i));
    const city = fieldIn(CUSTOMER, /^city$/i);
    await user.clear(city);
    await user.type(city, 'Stoughton');
    await user.click(await buttonIn(CUSTOMER, /save changes/i));

    // The list on the LEFT must follow, not just the panel in the middle. It
    // did not before `useOwnerLookup` was keyed under ['owners']: the
    // mutation invalidated a key nothing was subscribed to.
    await waitFor(() => {
      expect(
        within(panel(SEARCH)).getByText(/Stoughton/),
      ).toBeVisible();
    });
  });

  it('cannot let a slow earlier search overwrite a newer one', async () => {
    const user = userEvent.setup();
    const filters: string[] = [];
    server.use(
      http.get('/api/v2/owners', async ({ request }) => {
        const lastName = new URL(request.url).searchParams.get('lastName') ?? '';
        filters.push(lastName);
        // The FIRST query resolves last. That is the out-of-order hazard.
        if (lastName === 'F') await delay(500);
        const content = owners.filter((o) => o.lastName.startsWith(lastName));
        return HttpResponse.json({
          content,
          page: 0,
          size: 20,
          totalElements: content.length,
          totalPages: content.length === 0 ? 0 : 1,
        });
      }),
    );

    renderDesk('/desk');
    const box = screen.getByLabelText(/search by last name/i);

    // Wait past the debounce so the slow 'F' request is genuinely in flight
    // before switching. Typing straight through would simply coalesce, which
    // is the debounce doing its job but tests nothing about ordering.
    await user.type(box, 'Franklin');
    await waitFor(() => {
      expect(filters).toContain('F');
    });

    await user.clear(box);
    await user.type(box, 'Davis');
    expect(await searchResult(/Betty Davis/)).toBeVisible();

    // Long enough for the stale 'F' response to land if it could.
    await new Promise((resolve) => setTimeout(resolve, 700));

    // Scoped to the RESULTS list: "Recent" holds owner-named buttons too.
    const results = within(panel(SEARCH)).getByRole('list', {
      name: 'Search results',
    });
    expect(
      within(results).queryByRole('button', { name: /George Franklin/ }),
    ).toBeNull();
    expect(
      within(results).getByRole('button', { name: /Betty Davis/ }),
    ).toBeVisible();
  });

  it('keeps the visit form filled when recording fails, then retries', async () => {
    const user = userEvent.setup();
    let posts = 0;
    server.use(
      http.post('/api/owners/:ownerId/pets/:petId/visits', async ({ request, params }) => {
        posts += 1;
        if (posts === 1) {
          return HttpResponse.json(
            { status: 503, detail: 'Visit service unavailable' },
            { status: 503 },
          );
        }
        const body = (await request.json()) as { date: string; description: string };
        return HttpResponse.json(
          { id: 999, petId: Number(params.petId), ...body },
          { status: 201 },
        );
      }),
    );

    renderDesk('/desk?owner=1&pet=1');
    await inPanel(PET, 'rabies shot');
    await user.click(await buttonIn(PET, /new visit/i));

    const dateBefore = (fieldIn(PET, /^date$/i) as HTMLInputElement).value;
    await user.type(fieldIn(PET, /description/i), 'Annual vaccination');
    await user.click(await buttonIn(PET, /record visit/i));

    expect(await inPanel(PET, /visit service unavailable/i)).toBeVisible();

    // Neither field has to be entered again — the form is still standing with
    // exactly what was typed into it.
    expect(fieldIn(PET, /description/i)).toHaveValue('Annual vaccination');
    expect(fieldIn(PET, /^date$/i)).toHaveValue(dateBefore);
    expect(dateBefore).not.toBe('');

    // And the retry is a real second request that actually lands in history.
    await user.click(await buttonIn(PET, /record visit/i));
    await waitFor(() => {
      expect(posts).toBe(2);
    });
    expect(await inPanel(PET, 'Annual vaccination')).toBeVisible();
  });

  it('cannot leak a slow owner response into the next owner workspace', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/api/owners/:ownerId', async ({ params }) => {
        // Owner 1 resolves LAST, after the desk has moved on to Betty.
        if (params.ownerId === '1') {
          await delay(700);
          return HttpResponse.json(george);
        }
        return HttpResponse.json(betty);
      }),
    );

    // Deep-linked into George WITH a pet open, so there is dependent state to
    // leak, not just an owner panel.
    renderDesk('/desk?owner=1&pet=1');

    await user.type(screen.getByLabelText(/search by last name/i), 'Davis');
    await user.click(await searchResult(/Betty Davis/));

    await inPanel(CUSTOMER, '6085551749');

    // Long enough for George's response to arrive if it could.
    await new Promise((resolve) => setTimeout(resolve, 900));

    // Betty is still the customer, and nothing of George's — not his
    // telephone, not his pet — has appeared anywhere on the desk.
    expect(within(panel(CUSTOMER)).getByText('6085551749')).toBeVisible();
    expect(within(panel(CUSTOMER)).queryByText(GEORGE_PHONE)).toBeNull();
    expect(screen.queryByRole('button', { name: /Leo/ })).toBeNull();
    expect(screen.queryByText('rabies shot')).toBeNull();
  });

  // P0: a visit cannot be recorded without BOTH an owner and one of their pets.
  // The invariant is structural — the control does not exist — rather than a
  // validation message, so the assertion is that nothing is offered at all.
  it.each([
    ['nothing selected', '/desk', /no customer selected/i],
    ['an owner but no pet', '/desk?owner=1', /choose a pet/i],
    ['a pet id this owner does not have', '/desk?owner=1&pet=999', /choose a pet/i],
  ])('offers no way to record a visit with %s', async (_label, entry, message) => {
    renderDesk(entry);

    expect(await inPanel(PET, message)).toBeVisible();
    expect(screen.queryByRole('button', { name: /new visit/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /record visit/i })).toBeNull();
  });

  it('sends the owner id, pet id, date and description the server expects', async () => {
    const user = userEvent.setup();
    let sent: { path: string; body: unknown } | null = null;
    server.use(
      http.post('/api/owners/:ownerId/pets/:petId/visits', async ({ request }) => {
        sent = {
          path: new URL(request.url).pathname,
          body: await request.json(),
        };
        return HttpResponse.json(
          { id: 900, petId: 1, date: '2026-02-03', description: 'Dental check' },
          { status: 201 },
        );
      }),
    );

    renderDesk('/desk?owner=1&pet=1');
    await inPanel(PET, 'rabies shot');
    await user.click(await buttonIn(PET, /new visit/i));

    // The ids travel in the PATH and the body carries only the editable
    // fields — `toEqual` is deliberate, so an extra field would fail here.
    const date = (fieldIn(PET, /^date$/i) as HTMLInputElement).value;
    await user.type(fieldIn(PET, /description/i), 'Dental check');
    await user.click(await buttonIn(PET, /record visit/i));

    await waitFor(() => {
      expect(sent).not.toBeNull();
    });
    expect(sent).toEqual({
      path: '/api/owners/1/pets/1/visits',
      body: { date, description: 'Dental check' },
    });
  });

  it('shows a server validation error on the field it names', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('/api/owners/:ownerId/pets/:petId/visits', () =>
        HttpResponse.json(
          {
            status: 400,
            title: 'MethodArgumentNotValidException',
            detail: 'The request contains invalid or missing parameters',
            schemaValidationErrors: [
              {
                message:
                  "Field 'description' size must be between 1 and 255 (rejected value: Dental check)",
                field: 'description',
                defaultMessage: 'size must be between 1 and 255',
                rejectedValue: 'Dental check',
              },
            ],
          },
          { status: 400 },
        ),
      ),
    );

    renderDesk('/desk?owner=1&pet=1');
    await inPanel(PET, 'rabies shot');
    await user.click(await buttonIn(PET, /new visit/i));
    await user.type(fieldIn(PET, /description/i), 'Dental check');
    await user.click(await buttonIn(PET, /record visit/i));

    // Attached to the input, not dumped in a banner: that is what tells the
    // receptionist WHICH box to fix.
    await waitFor(() => {
      expect(fieldIn(PET, /description/i)).toHaveAccessibleDescription(
        /size must be between 1 and 255/,
      );
    });
    expect(fieldIn(PET, /description/i)).toBeInvalid();
    expect(fieldIn(PET, /description/i)).toHaveValue('Dental check');
  });

  it('updates the detail view AND the search row when a pet is renamed', async () => {
    const user = userEvent.setup();
    renderDesk('/desk');

    await user.type(screen.getByLabelText(/search by last name/i), 'Franklin');
    await user.click(await searchResult(/George Franklin/));
    await user.click(await buttonIn(CUSTOMER, /Leo/));
    await inPanel(PET, 'rabies shot');

    await user.click(await buttonIn(PET, /^edit$/i));
    const name = fieldIn(PET, /^name$/i);
    await user.clear(name);
    await user.type(name, 'Leo Minor');
    await user.click(await buttonIn(PET, /save changes/i));

    // All three places the pet's name is rendered must agree.
    expect(await inPanel(PET, 'Leo Minor')).toBeVisible();
    expect(await inPanel(CUSTOMER, 'Leo Minor')).toBeVisible();
    await waitFor(() => {
      expect(within(panel(SEARCH)).getByText(/Leo Minor/)).toBeVisible();
    });
  });

  it('opens a deep link straight to a pet', async () => {
    renderDesk('/desk?owner=1&pet=1');
    // The owner payload carries the pet and its visits, so one request fills
    // both zones.
    expect(await inPanel(CUSTOMER, GEORGE_PHONE)).toBeVisible();
    expect(await inPanel(PET, 'rabies shot')).toBeVisible();
  });
});
