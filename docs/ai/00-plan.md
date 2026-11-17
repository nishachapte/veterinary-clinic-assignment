# Reception Desk — architecture & build plan

Planning artifact, written before any code and revised once after a critical review of its
own first draft (see §13 for what changed and why).

Verified against the real `openapi.yml` from `spring-petclinic/spring-petclinic-rest`
(2388 lines, cloned and read — not recalled). Facts marked **[spec]** come from the
document; facts marked **[runtime]** still need probing against a running server (§14).

---

## 1. Backend facts that drive the design

| Fact | Source | Consequence for the frontend |
|---|---|---|
| Base URL `http://localhost:9966/petclinic/api` | **[spec]** `application.properties` | Single `VITE_API_BASE_URL`, proxied in dev |
| `GET /owners/{id}` returns the owner **with** `pets`, each pet **with** `visits` | **[spec]** `Owner.pets` → `Pet.visits`, both `readOnly` | **One query powers the whole desk.** No waterfall; one key to invalidate |
| `GET /owners?lastName=` filters by last name only | **[spec]** `listOwners` | No server-side search by phone, first name or pet name |
| `GET /v2/owners?lastName=&page=&size=` returns `OwnerPage` | **[spec]** `listOwnersPage` | Use v2 for search; v1 is the fallback |
| Errors are RFC-7807 `ProblemDetail`; the server sends **undocumented** `field`/`defaultMessage`/`rejectedValue` | **[spec]** + **[runtime]** | Use the structured fields, prose-parse as fallback (§7) |
| `telephone` is `^[0-9]{10}$`, exactly 10 chars | **[spec]** `OwnerFields` | Normalise/strip separators before sending |
| Names match `^[\p{L}]+([ '-][\p{L}]+){0,2}$` | **[spec]** `OwnerFields` | Max 3 words, letters only; mirror client-side |
| `Pet.type` is a full `PetType` object, not a `typeId` | **[spec]** `PetFields.type` | Must load `/pettypes` and send the whole object |
| `Visit` has `date` (no time) + `description`; **no vet reference** | **[spec]** `VisitFields` | A visit is a *record*, not an appointment |
| No `GET /owners/{o}/pets/{p}/visits` — only `POST` | **[spec]** paths | History comes from the nested owner payload |
| No `PATCH`; no `If-Match` on writes | **[spec]** all write ops | Full-representation `PUT`, last-write-wins |
| ETag declared on list endpoints but **never actually sent** | **[spec]** vs **[runtime]** | No conditional GET; spec/implementation mismatch |
| `GET /oops` always errors | **[spec]** path `/oops` | Free fixture for the error UI |
| `@CrossOrigin` with no origin list on every controller | **[spec]** `*RestController*.java` | CORS wide open; Vite proxy still used for prod parity |
| `petclinic.security.enable=false`, H2 in-memory, seeded | **[spec]** `application.properties` | No auth to build; data resets on restart |
| `birthDate` rejects future dates and anything over **50 years** old | **[runtime]** probed | Zod mirrors both rules; neither appears in the spec |

## 2. Stack

| Choice | Why this and not the alternative |
|---|---|
| Vite + React 19 + TypeScript (`strict`, `noUncheckedIndexedAccess`) | Next.js adds SSR for a tool with no SEO or server need |
| TanStack Query | ~95% of state is server state; Redux would reimplement caching worse |
| React Router (URL as state) | Selection belongs in the URL: refresh-safe, deep-linkable, back button works |
| React Hook Form + Zod | Uncontrolled inputs; `z.infer` gives rule *and* type from one declaration |
| `openapi-typescript` | See the defence below |
| MSW | Same handlers for tests and offline dev, derived from the spec so they cannot drift |
| Vitest + React Testing Library | Same transform pipeline as Vite; tests behaviour, not implementation |
| CSS Modules + ~6 primitives | A component library is 60 components of dependency for a 6-component UI |

**Why both `openapi-typescript` and Zod, when they overlap.** Zod parses *responses*;
generated types also cover *request* shapes, path params and status codes, which Zod never
sees. A backend version bump then becomes a compile error rather than a runtime 400. The
cost is one build step and a committed spec file. The leaner alternative — hand-written Zod
plus a single contract test diffing schemas against the spec — is a legitimate choice; it is
rejected here only because the generated types are free once the spec is committed.

Explicitly rejected: Redux Toolkit, Next.js, a component library, a GraphQL gateway.

## 3. Workflow — one workspace, three zones

The requirement is "no continuous navigation between unrelated screens". So: **one
workspace, three persistent zones, nothing ever replaces anything.**

```
+-----------------+---------------------------+------------------+
|  SEARCH         |  OWNER CONTEXT            |  PET CONTEXT     |
|  [lastName...]  |  George Franklin      (e) |  Leo - cat   (e) |
|  > Franklin, G. |  110 W. Liberty St.       |  b. 2010-09-07   |
|  > Franklin, M. |  Madison - 6085551023     |  15 years        |
|                 |  PETS (2)                 |  VISITS (3)      |
|  + New owner    |  [ Leo  cat  3 visits ]   |  2013-01-01      |
|  Recent:        |  [ Max  dog  0 visits ]   |   rabies shot    |
|   Davis, Rodriq |  + Add pet                |  + New visit     |
+-----------------+---------------------------+------------------+
```

1. **Zones never navigate.** Selecting an owner fills zone 2; selecting a pet fills zone 3.
   Search results stay visible so the next lookup is free.
2. **Edit in place** — a panel flips read→edit inside the same box. No modals.
3. **Create is inline** — "New owner" in zone 2, "Add pet" in zone 3.
4. **URL mirrors selection**: `/desk/owners/:ownerId/pets/:petId?q=franklin`.
5. **Keyboard-first**: `/` focuses search, arrows move results, Enter selects, `v` new visit.
6. **Recent owners** strip (last 5 this session) — customers call back.
7. **Optimistic visit creation** — see §9.

### 3.1 Responsive behaviour

Three zones need roughly 1280px. Below ~1100px the layout collapses to two columns and the
pet zone becomes a slide-over panel anchored to the right — **still without a route change**,
so rule 1 survives. Below ~720px the desk is not supported; the app shows an explicit
message rather than degrading silently. A receptionist on a phone is out of scope and is
recorded as a limitation, not left to chance.

### 3.2 Failure of the single owner query

Because one request feeds zones 2 and 3, its failure blanks both. Zone 2 therefore renders
an inline error with a retry button scoped to `['owner', ownerId]`; **zone 1 keeps its
results throughout**, so a failed load never costs the receptionist their search.

## 4. State model

| Kind of state | Owner | Example |
|---|---|---|
| Server data | TanStack Query | `['owner', ownerId]`, `['owners', {lastName, page}]`, `['petTypes']` |
| Selection / navigation | URL (React Router) | `ownerId`, `petId`, `q` |
| Form values | React Hook Form | owner edit, pet edit, new visit |
| Panel mode | local `useState`, discriminated union | `{mode:'view'} \| {mode:'edit'} \| {mode:'create'}` |
| Session memory | `sessionStorage` | recent owners |

Every mutation invalidates `['owner', ownerId]`. A name change also invalidates `['owners']`.

## 5. Layering

```
src/
  api/        generated types, fetch client, ProblemDetail parser   (no React)
  domain/     branded ids, models, mappers, zod schemas, date helpers (no features)
  features/   owner-search/ owner-detail/ pet-detail/ visits/
  components/ Panel, Field, Button, EmptyState, ErrorBanner
  app/        providers, routes, DeskLayout
  test/       msw handlers, fixtures, setup
```

Dependency rule: `features` → `domain`, `api`. `domain` imports no feature. `api` knows no React.

## 6. Using TypeScript intentionally

1. **Generated contract types** from `openapi.yml`.
2. **Branded IDs** — `type OwnerId = number & { readonly __brand: 'OwnerId' }`. The route
   `/owners/{ownerId}/pets/{petId}` is two positional `int32`s; without brands the compiler
   cannot stop a swap. Brands are applied **only at the parse boundary** so they do not
   become ceremony in every component prop.
3. **Parse, don't validate** — responses enter as `unknown`, are Zod-parsed, and leave as
   models whose required fields are non-optional. No `?.` chains in views.
4. **Zod mirrors the server's constraints** (10-digit phone, name pattern, 255-char
   description, pet age once probed) — fail fast, and make server rejections rare.
5. **Discriminated unions + `assertNever`** for panel modes and request outcomes.
6. **`Result<T>` for mutations** — `{ok:true,data:T} | {ok:false,problem:ApiProblem}`.
7. `satisfies` for query-key factories, `as const` for route tables.
8. **`IsoDate` as a branded string** (§8) so a date can never be passed where a `Date` is
   expected, or vice versa.

## 7. Validation errors — the spec under-documents the response

`ValidationMessage` **[spec]** declares exactly one required property, `message`, with
`additionalProperties: true`. A generated type therefore exposes only `message`, which looks
like it forces regex-parsing of English prose.

The running server **[runtime]** actually sends structured fields:

```json
{ "message": "Field 'lastName' must not be null (rejected value: null)",
  "field": "lastName", "defaultMessage": "must not be null", "rejectedValue": "null" }
```

So the real defect is not a missing capability — it is that **the contract hides a
capability the implementation already has**. Anyone coding to the spec writes a fragile
prose parser for data that is sitting right there, undocumented and therefore unguaranteed.

Workaround: `parseProblemDetail` reads `field` and `defaultMessage` when present, and only
falls back to extracting the field name from `message` when they are absent. Both paths are
unit-tested, because the structured fields are undocumented and so could vanish in any
backend version without it being a breaking change by the contract's own terms.

**Proposed API change:** declare `field`, `defaultMessage` and `rejectedValue` on
`ValidationMessage` so they become part of the contract, and add a stable machine `code`.
Also note `rejectedValue` arrives as the *string* `"null"` rather than JSON `null`, and
`title` leaks the Java class name `MethodArgumentNotValidException` — both worth fixing.

## 8. Dates and timezones

The API uses `format: date` strings (`"2013-01-01"`). `new Date("2013-01-01")` parses as
**UTC midnight**, so in any negative-offset timezone it renders as *2012-12-31*. Visit dates
silently shifting a day backwards is a correctness bug that reads as carelessness.

Rules, enforced by an ESLint rule banning the `Date` constructor outside `domain/date`:

- API dates stay **strings** end-to-end, typed as a branded `IsoDate`.
- Parsing to a calendar date goes through one helper that builds a **local** date explicitly.
- Formatting for display goes through one helper; nothing else calls `toLocaleDateString`.
- "Today" for the visit-date default is computed locally, never from a UTC timestamp.

## 9. Search strategy — and an honest empty state

`lastName` goes to `/v2/owners` (paginated). The loaded results are then additionally
filtered client-side on first name, telephone and pet name, so typing a phone number finds a
customer. This is the chosen workaround for the missing server-side search.

**The trap this avoids:** a naive client filter over page 1 reports *"no results"* for an
owner sitting on page 3 — the UI claiming absence when it only means "I did not look".
Therefore:

- When the query matches no loaded row, the desk fetches further pages in bounded fashion
  (up to 5 pages / 100 owners) behind a visible "searching more records…" state.
- The empty state says **"No match in the first 100 records — refine by last name"**, never
  a bare "no results".
- The result list always labels its scope, so the receptionist knows what was searched.

**Proposed API change:** a single `query` parameter on `/v2/owners` matching across last
name, first name, telephone and pet name.

## 10. Optimistic visit creation

Kept, because the receptionist is saying "yes, that is recorded" while the customer is on the
line. It is only safe because §6.4 mirrors the server's constraints client-side, making
rejection rare. The rollback path is still implemented and tested: on failure the optimistic
row is removed, an error banner names the reason from `parseProblemDetail`, and the form
reopens with the values preserved.

The simpler alternative — a pending row with a spinner and no rollback — is recorded as a
valid trade-off that was considered and rejected.

## 11. Accessibility

Beyond a general pass:

- Search results are announced via an `aria-live="polite"` region carrying the result count
  and the scope label from §9.
- When a panel flips read→edit, focus moves to its first input; on cancel it returns to the
  control that opened it.
- Visit history is a list with a real heading, not a styled table of divs.
- All icon-only controls carry accessible names; the keyboard shortcuts of §3.5 are
  discoverable from a help affordance, never the only route to an action.
- The `/pettypes` request failing makes "Add pet" unusable, so that form has its own error
  state with retry rather than rendering an empty, silently broken select.

## 12. Testing — what, and how much

| Tier | Examples |
|---|---|
| Unit | `parseProblemDetail` matrix, date helpers (incl. the UTC-shift case), phone normaliser, pet age, Zod valid/invalid |
| Component (+MSW) | visit form required-fields and server-error rendering; owner edit dirty/cancel/save; search debounce, empty, bounded-fetch, no-results wording |
| **Workflow integration** | search → open owner → open pet → add visit → visit appears, **asserting the router location is identical before and after** — that assertion is the proof of the headline requirement |
| Smoke (optional) | one Playwright happy path against the real container |

Declared non-goals: visual regression, full WCAG audit, performance budgets, CRUD for vets
and specialties.

## 13. Revisions to the first draft

1. Search empty state was a correctness bug, not copy — §9 now bounds the fetch and states scope.
2. Responsive behaviour was missing entirely — §3.1 added.
3. Date/timezone handling was missing — §8 added, with a lint rule to enforce it.
4. The single-query design's failure mode was unaddressed — §3.2 added.
5. Optimistic creation needed its trade-off stated rather than assumed — §10.
6. The `openapi-typescript` + Zod overlap needed an explicit defence — §2.
7. Accessibility was one word ("a11y pass") — §11 added.
8. Spec-derived and runtime-derived facts are now distinguished — §1, §14.

## 14. Runtime findings (probed 2026-11-17, answers to the draft's open questions)

1. **`@PetAgeValidation` rejects two cases**: a birth date in the future
   (*"Birth date cannot be in the future"*) and one more than **50 years** ago
   (*"Birth date cannot be older than 50 years"*). Both return 400. The Zod schema mirrors
   exactly these two rules, so the form catches them before the request.
2. **`POST .../visits` returns the created visit with its `id` and `petId`** — so the
   optimistic row in §10 can be reconciled with the server id without a refetch.
3. **`PUT /owners/{id}` with the `readOnly` `pets` field present returns 204** — extra
   read-only fields are silently ignored, not rejected. Round-tripping a whole owner object
   is safe, though the silence means a typo in a read-only field is never reported.
4. **No `ETag` header is sent on either item or list endpoints**, although the spec declares
   ETag and `304` on the list responses. Conditional requests are therefore not available;
   this is a spec/implementation mismatch worth reporting upstream.

## 15. Build order

```
 0. Prereqs: Node 20+, Docker (no local Java required)
 1. Backend up; verify Swagger UI
 2. Record §14 findings in 01-api-findings.md; save openapi.yml; generate types; write 01-api-findings.md
 3. Scaffold Vite+TS, strict tsconfig, ESLint (incl. the Date-constructor ban), Vitest, CI
 4. api/ client + domain/ models, Zod, date helpers, parseProblemDetail (+ unit tests)
 5. DeskLayout three-zone shell with the §3.1 breakpoints, routes, query provider
 6. Owner search zone: v2 paginated, debounced, bounded extra fetch, keyboard nav
 7. Owner detail zone + inline edit + §3.2 retry
 8. Pet zone: details, inline edit, visit history
 9. New visit (optimistic + rollback), add pet, new owner
10. Loading / empty / error states; accessibility per §11
11. Tests per §12
12. README, decision log, prompt log, screenshots, docker-compose.yml
```

## 16. Decisions taken (2026-11-17)

**Search: hybrid server + client, with bounded extra fetching** (§9). Rejected last-name-only
(no help for a phone lookup) and fetch-everything (ignores the pagination the API added).

**Scope: core flows, deep quality.** All six required abilities plus the full state matrix,
optimistic visits, keyboard navigation and the four test tiers. Vets, specialties, pet-type
management and all deletes are deliberately out and recorded as limitations.

## 17. Known limitations for the README

- Search matches last name server-side; other fields match only within the first 100 records.
- A visit cannot record a vet or a time of day — the API has no field for either.
- No concurrency control: two receptionists editing one owner is last-write-wins.
- Delete operations are not exposed in the receptionist UI.
- Below 720px the desk is unsupported by design.
- Data resets when the backend container restarts (H2 in-memory).
