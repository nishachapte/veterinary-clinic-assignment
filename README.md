# Reception Desk — Spring PetClinic REST frontend

A single-screen workspace for a veterinary receptionist handling a customer on
the phone: find or create an owner, see their pets, open a pet's visit history,
record a visit, add a pet, and correct details — without navigating away from
the conversation.

The backend is the unmodified [Spring PetClinic
REST](https://github.com/spring-petclinic/spring-petclinic-rest) application.
Nothing in this repository changes it.

---

## Running it

**Prerequisites:** Node 20+ and Docker. A local JDK is _not_ required — the
backend runs from its published image.

```bash
npm install
```

```bash
npm run backend
```

```bash
npm run dev
```

Then open **http://localhost:5173**.

- Frontend: http://localhost:5173
- Backend API: http://localhost:9966/petclinic/api
- Swagger UI: http://localhost:9966/petclinic/swagger-ui.html

`npm run backend` starts the backend with `docker compose up -d`. The database
is H2 in-memory, so `npm run backend:reset` returns it to clean seed data, and
`npm run backend:stop` shuts it down.

### If you prefer to run the backend from source

```bash
git clone https://github.com/spring-petclinic/spring-petclinic-rest.git && cd spring-petclinic-rest && ./mvnw spring-boot:run
```

This needs a JDK 17+. The app talks to the same port either way.

### Other commands

| Command             | What it does                                                  |
| ------------------- | ------------------------------------------------------------- |
| `npm test`          | Unit, component and contract tests                            |
| `npm run typecheck` | TypeScript, strict                                            |
| `npm run lint`      | ESLint, type-aware                                            |
| `npm run gen:api`   | Regenerates `src/types/api.d.ts` from `api-spec/openapi.yml` |
| `npm run build`     | Typecheck + production build                                  |

The frontend talks to a same-origin `/api`, proxied to the backend in
`vite.config.ts`. CORS is wide open on the backend, so direct calls would also
work — the proxy exists so the app never depends on that, and so the dev setup
matches how it would be deployed.

> **Contract tests** in `src/test/contract.test.ts` run against the live backend
> and skip automatically when it is not up, so `npm test` passes without Docker.

---

## Architecture

**Feature-first.** Each business capability keeps its own components, hooks,
API calls, schemas and types together, rather than scattering them across
folders organised by technical kind.

| Folder          | Responsibility                                                      |
| --------------- | ------------------------------------------------------------------- |
| `src/features`  | `owners`, `pets`, `visits`, `reception` — each with its own `api/`, `components/`, `schemas/` and `types.ts` |
| `src/shared`    | `components/` (Panel, Field, Feedback, FormShell, QueryGate), `hooks/`, `utils/`, `schemas/` |
| `src/lib`       | `apiClient`, `apiError`, `queryKeys` — the HTTP boundary. No React. |
| `src/types`     | Branded ids, and the generated OpenAPI types                        |
| `src/app`       | `App`, `providers`, `router`, `queryClient`                         |

A feature may import another's `types.ts` — `Owner` contains `Pet[]`, which
contains `Visit[]` — because the API nests them that way. Nothing in
`src/shared`, `src/lib` or `src/types` imports a feature.

**One workspace, three persistent zones.** Search on the left, the owner in the
centre, the selected pet on the right. Selecting an owner or a pet changes
_search parameters only_ (`/desk?q=&owner=&pet=`), so the layout never
unmounts and the search results stay on screen for the whole call. Below
1100px the pet zone becomes a slide-over — still the same route.

**Why search params rather than a path hierarchy.** Both are deep-linkable and
refresh-safe, but search params keep the desk on a single route, which makes
"the zones never unmount" a structural guarantee rather than something to
maintain carefully. A path like `/desk/owners/1/pets/1` would also imply pet is
navigationally a sub-resource of owner, when here they are two independent
selections.

**State model.** Server data is TanStack Query; selection is the URL; form
values are React Hook Form; panel mode is local component state. There is no
client-side store, and none is needed: `GET /owners/{id}` returns the owner
_with_ pets _and_ their visits, so the entire desk runs on one query per
conversation and every mutation reconciles exactly one cache key.

### Using TypeScript intentionally

- **Branded ids.** `/owners/{ownerId}/pets/{petId}` is two positional `int32`s;
  brands make swapping them a compile error. Applied only at the parse boundary.
- **Branded `IsoDate`.** A `Date` is an instant; `"2013-01-01"` is a calendar
  day. Modelling the API's dates as strings removes a whole bug class (below).
- **Parse, don't validate.** Responses enter as `unknown`, are Zod-parsed, and
  leave as models with non-optional fields — no `?.` chains in components.
- **One source of truth for rules and types.** Zod schemas mirror the server's
  constraints; `z.input` / `z.output` give the form and payload types, which
  genuinely differ where `.transform()` normalises a telephone number.
- `satisfies` on query-key factories, exhaustive switches, `Result`-shaped
  error handling via typed `ApiError`.

### Dates and timezones

`new Date("2013-01-01")` parses as **UTC midnight**, so in any negative-offset
timezone it renders as _2012-12-31_. API dates therefore stay strings
end-to-end, and `src/shared/utils/date.ts` is the only module permitted to touch
`Date` — enforced by an ESLint rule, not by convention. Comparison and sorting
need no `Date` at all, since ISO dates sort chronologically as plain strings.

---

## API problems found

Full detail, with reproducible `curl` commands, in
[docs/ai/01-api-findings.md](docs/ai/01-api-findings.md). The ones that shaped
the code:

| #   | Problem                                                                                               | Workaround                                                                                                                                     | Proposed change                                     |
| --- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| B1a | `lastName` filter is a **case-sensitive prefix** match — `franklin` returns nothing for Franklin      | Send only the first character upper-cased; match the rest client-side, case- and accent-insensitively; fall back to an unfiltered bounded scan | Case-insensitive `contains`, or a `query` parameter |
| A1  | Validation errors carry **undocumented** `field` / `defaultMessage`; the spec declares only `message` | Use the structured fields when present, parse the prose when not; both paths tested                                                            | Declare them, and add a stable `code`               |
| B1  | No search by first name, telephone or pet name                                                        | Client-side matching over a bounded scan, with an empty state that states its scope                                                            | One `query` parameter across those fields           |
| A5  | Pet age rules (no future dates, max 50 years) exist only in Java                                      | Mirrored in the Zod schema so they surface as inline field errors                                                                              | Express them in the spec                            |
| A4  | ETag and `304` are declared but never sent                                                            | Rely on TanStack Query's cache                                                                                                                 | Implement, or remove from the spec                  |
| B2  | A visit records no vet and no time of day                                                             | Presented honestly as recording a visit, not booking an appointment                                                                            | Add `vetId`; make the date a `date-time`            |
| A7  | `Pet.ownerId` is optional in the contract but always sent                                             | Schema keeps it optional; the mapper supplies it from the parent                                                                               | Add it to `Pet.required`                            |
| B4  | No `PATCH`, no `If-Match`                                                                             | Full-representation `PUT`                                                                                                                      | ETags plus `If-Match`, 412 on conflict              |

Three of these — A1, A5 and B1a — are invisible in `openapi.yml` and were found
only by running the server. A2 (`title` leaks the Java exception class name)
and A3 (`rejectedValue` is the string `"null"`) are documented but not worked
around, as neither reaches the UI.

---

## Assumptions

- A receptionist works at a desktop. Below 720px the app says so rather than
  degrading silently.
- A "visit" is a record of something that happened, not an appointment — the
  API has no vet reference and no time of day.
- Deleting owners and pets is not a receptionist's job, so it is not exposed.
- No authentication: the backend ships with `petclinic.security.enable=false`.
- Vets and specialties are out of scope for this workflow.

---

## Known limitations

### Authentication

The backend runs with authentication and authorisation **disabled** — verified:
`GET /petclinic/api/pettypes` answers `200` with no credentials. Every request
this app makes is therefore unauthenticated, and there is no signed-in
receptionist, no audit trail and no per-role permission anywhere in the
system. That is acceptable for a controlled local demo and **not** acceptable
for a clinic deployment, where the backend's security would need enabling and
a token attaching in `src/lib/apiClient.ts`.

### Data availability

`lastName` is filtered server-side as a case-sensitive prefix; first name,
telephone and pet name are matched client-side inside a bounded scan of the
first 100 records (`PAGE_SIZE × MAX_PAGES` in `useOwnerLookup`).

**An empty result is not proof that a record does not exist.** It means
nothing matched within the window that was examined. The UI never claims
otherwise — it reports "searched all N records" or "searched the first N of
M", and its empty state names the limit rather than saying "no results".

### Visit history capabilities

Confirmed against `api-spec/openapi.yml`:

- There is no `GET /owners/{ownerId}/pets/{petId}/visits`. History is read
  from the nested `pets[].visits` of `GET /owners/{id}`, so it cannot be paged
  for a pet with a long history.
- `VisitFields` carries exactly two properties: `date` and `description`.
  There is **no veterinarian assignment, no appointment status, no time of day
  and no structured medical note** anywhere in the contract. None is invented
  in the UI, and none should be added without a backend change.
- `updateVisit` and `deleteVisit` *do* exist at `/visits/{visitId}`. This app
  implements neither, so visits are append-only here. That is a scope
  decision, not an API constraint.

### Offline mode and concurrency

No offline write queue and no conflict resolution are in scope. Two
receptionists editing one owner is last-write-wins, silently; the API exposes
no `ETag` or `If-Match` to build optimistic concurrency on.

**A failed request is never presented as a successful save.** The mutation
rejects, the form stays open with everything typed still in it, and the error
is shown either on the field the server named or in a form-level banner.
Covered by the tests "keeps typed input when the save fails" and "lets the
receptionist retry after a save fails".

### Other

- A visit appears once the server confirms it rather than optimistically. The
  API returns the created visit with its id, so the cache is updated without a
  refetch, but there is a brief pending state.
- Data resets when the backend container restarts (H2 in-memory).
- Below 720px the desk is unsupported by design.

---

## Current status

All six required abilities are implemented and working against the live
backend: find an owner, create one, see details and pets, open a pet with its
visit history, record a visit, add a pet, and edit owner and pet information.

88 tests pass across four tiers — unit (dates, matching, error parsing,
schema rules), component behaviour via MSW, workflow and failure-path
integration tests, and live contract tests against the running server.

Not built, and recorded as limitations rather than hidden: optimistic visit
creation (a visit appears after the server confirms, which is fast but not
instant), deletion of any kind, and vet/specialty management.

## What I would improve next

1. Server-side search, removing the scan-window caveat entirely — the single
   biggest improvement available, and it needs a backend change.
2. Optimistic visit creation rendered from the mutation's own `variables`, so
   no placeholder id is invented and no rollback path is needed.
3. Component tests for each form's validation matrix; the workflow test covers
   the happy path and two failure paths, not every field rule.
4. ETag/`If-Match` concurrency once the backend supports it.
5. A Playwright smoke test against the real container in CI.

---

## AI-assisted development artifacts

[docs/ai/](docs/ai/) holds the working artifacts, kept as the work happened:

- [`00-plan.md`](docs/ai/00-plan.md) — architecture and build plan, written
  before any code, plus a record of what the first draft got wrong and why it
  was revised.
- [`01-api-findings.md`](docs/ai/01-api-findings.md) — every API problem with
  the `curl` that reproduces it.
