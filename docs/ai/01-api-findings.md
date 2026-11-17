# API findings — Spring PetClinic REST

Probed 2026-11-17 against `springcommunity/spring-petclinic-rest:latest` running at
`http://localhost:9966/petclinic/api`. Every finding below is reproducible with the curl
command shown. Findings are split into *contract defects* (the spec is wrong or incomplete)
and *capability gaps* (the API cannot do something a reception desk needs).

---

## A. Contract defects

### A1. Validation errors carry undocumented structured fields

`ValidationMessage` in `openapi.yml` declares exactly one required property, `message`,
with `additionalProperties: true`. Code generated from the spec therefore exposes only a
prose string.

```bash
curl -s -X POST http://localhost:9966/petclinic/api/owners \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"Test","address":"1 St","city":"Town","telephone":"6085551023"}'
```

```json
{"detail":"The request contains invalid or missing parameters",
 "status":400,"title":"MethodArgumentNotValidException",
 "schemaValidationErrors":[{
   "message":"Field 'lastName' must not be null (rejected value: null)",
   "field":"lastName","defaultMessage":"must not be null","rejectedValue":"null"}]}
```

`field`, `defaultMessage` and `rejectedValue` are present but **undocumented**. A client
coded strictly to the contract writes a fragile prose parser for data it already has.

- **Impact:** either fragile string parsing, or depending on undocumented behaviour that
  may change without it counting as a breaking change.
- **Workaround:** read the structured fields when present; fall back to parsing the field
  name out of `message`. Both paths unit-tested.
- **Proposed change:** declare `field`, `defaultMessage`, `rejectedValue` on
  `ValidationMessage`, and add a stable machine-readable `code`.

### A2. `title` leaks an internal Java class name

`"title":"MethodArgumentNotValidException"` exposes a framework implementation detail to
every API consumer, and would change if the backend refactored.

- **Proposed change:** a stable, human-meaningful title such as `"Validation failed"`.

### A3. `rejectedValue` is the string `"null"`, not JSON `null`

Shown above. A client comparing `rejectedValue === null` silently never matches.

- **Proposed change:** serialise the actual JSON value.

### A4. ETag and 304 are declared but never sent

`listOwners` and `listOwnersPage` both document an `ETag` response header and a `304`
response. No ETag header is returned by either, nor by item endpoints:

```bash
curl -s -D - -o /dev/null http://localhost:9966/petclinic/api/owners  | grep -i etag   # nothing
curl -s -D - -o /dev/null http://localhost:9966/petclinic/api/owners/1 | grep -i etag  # nothing
```

- **Impact:** conditional requests and cheap revalidation are unavailable.
- **Workaround:** rely on TanStack Query's own caching; do not implement `If-None-Match`.
- **Proposed change:** either implement ETags or remove them from the spec.

### A5. Pet age rules exist only in Java, not in the contract

`PetFields.birthDate` carries `x-field-extra-annotation: @PetAgeValidation`. The spec states
no bounds. The server enforces two:

```bash
# future date
curl -s -X POST http://localhost:9966/petclinic/api/owners/1/pets -H 'Content-Type: application/json' \
  -d '{"name":"P","birthDate":"2030-01-01","type":{"id":1,"name":"cat"}}'
# -> 400 "Birth date cannot be in the future"

# older than 50 years
curl -s -X POST http://localhost:9966/petclinic/api/owners/1/pets -H 'Content-Type: application/json' \
  -d '{"name":"P","birthDate":"1900-01-01","type":{"id":1,"name":"cat"}}'
# -> 400 "Birth date cannot be older than 50 years"
```

- **Impact:** a client cannot derive these rules from the contract; they must be discovered
  by trial, and they can change without notice.
- **Workaround:** mirror both rules in the Zod schema so the form rejects them locally.
- **Proposed change:** express them in the spec as a documented `minimum`/`maximum` on the
  date, or at minimum in the field description.

### A6. Read-only fields are silently ignored rather than rejected

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X PUT http://localhost:9966/petclinic/api/owners/1 \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"George","lastName":"Franklin","address":"110 W. Liberty St.",
       "city":"Madison","telephone":"6085551023","pets":[]}'   # -> 204
```

Sending the `readOnly` `pets` array succeeds with 204 and no effect.

- **Impact:** safe to round-trip a whole object, but a client that *believes* it is updating
  pets this way gets no feedback at all.
- **Proposed change:** reject unknown or read-only properties with 400, or document the
  ignore behaviour explicitly.

### A7. `Pet.ownerId` is optional in the contract but always sent

`Pet` lists only `id`, `type` and `visits` as required, so `ownerId` may legally
be absent — yet the running server always includes it, even on pets nested
inside an owner.

```bash
curl -s http://localhost:9966/petclinic/api/owners/1 | head -c 200   # pets[0].ownerId == 1
```

- **Impact:** a client coding to the contract must treat it as optional and
  carry the owner id down from the parent, which is extra work for a field that
  is in practice always there.
- **Workaround:** the wire schema keeps it optional; the mapper takes the owner
  id as a required argument so a domain `Pet` always knows its owner. A live
  contract test asserts the current behaviour so a change is noticed.
- **Proposed change:** add `ownerId` to `Pet.required`.

---

## B. Capability gaps

### B1. Owner search is last-name only

`GET /owners?lastName=` and `GET /v2/owners?lastName=&page=&size=` accept no other filter.
A receptionist most often has a phone number, a first name, or a pet's name.

- **Workaround:** server-side `lastName` filtering, plus client-side matching on first name,
  telephone and pet name across a bounded number of pages, with an empty state that states
  the scope searched rather than claiming "no results".
- **Proposed change:** one `query` parameter matching across those fields server-side.

### B1a. The `lastName` filter is a CASE-SENSITIVE prefix match

Probed on `/v2/owners`:

```
lastName='Franklin' -> 1      lastName='franklin' -> 0
lastName='Fran'     -> 1      lastName='ranklin'  -> 0
lastName='Davis'    -> 2      lastName='davis'    -> 0
lastName='McT'      -> 1      lastName='Mct'      -> 0
```

So it is `startsWith`, and it is case-sensitive. A receptionist typing
`franklin` in a hurry gets **zero results for a customer who exists** — the
worst possible failure for this application.

- **Impact:** the obvious implementation (send what the user typed) is wrong
  for any input that is not capitalised exactly as stored.
- **Workaround:** only the first character, upper-cased, is sent as the server
  filter; the full query is then matched client-side, case- and
  accent-insensitively. If that yields nothing, the lookup falls back to an
  unfiltered bounded scan, which also covers surnames stored in lower case.
- **Proposed change:** make the filter case-insensitive and `contains` rather
  than `startsWith`, or expose a dedicated `query` parameter that is.

### B2. A visit cannot record a vet, or a time of day

`VisitFields` has only `date` (`format: date`) and `description`. `Visit` adds `id` and
`petId`. There is no vet reference, despite `/vets` existing, and no time component —
although the spec's own prose calls visits "bookings".

- **Impact:** the application can record that a visit happened, but cannot schedule one or
  say who will perform it.
- **Workaround:** present the feature honestly as recording a visit, not booking an
  appointment. Documented as a limitation rather than faked in the UI.
- **Proposed change:** add `vetId` and make the date a `date-time`, or introduce a separate
  appointment resource.

### B3. No endpoint lists a single pet's visits

The path `/owners/{ownerId}/pets/{petId}/visits` exists for `POST` only. Visit history is
available solely nested inside the owner payload, or via the unfiltered global `/visits`.

- **Workaround:** the desk reads history from `GET /owners/{id}`, which nests pets and their
  visits — convenient here, but it means history cannot be paged for a long-lived pet.
- **Proposed change:** add `GET /owners/{o}/pets/{p}/visits` with pagination.

### B4. No PATCH, and no optimistic-concurrency control

All writes are full-representation `PUT`/`POST`. No `If-Match`, and (per A4) no ETag to
match on.

- **Impact:** two receptionists editing one owner is last-write-wins, silently.
- **Proposed change:** ETags plus `If-Match` on write operations, returning 412 on conflict.

---

## C. Useful behaviours worth relying on

- **`GET /owners/{id}` nests pets *and* their visits** — one request renders the entire
  desk, and one cache key is invalidated after any mutation.
- **`POST .../visits` returns the created visit including its `id`** — an optimistic row can
  be reconciled with the real id without a refetch.
- **`/v2/owners` provides real pagination** (`content`, `page`, `size`, `totalElements`,
  `totalPages`) — worth using in preference to the unpaginated v1 list.
- **`GET /oops` always errors** — a free fixture for exercising the error UI.
- **CORS is open** (`@CrossOrigin` with no origin list on every controller) and security is
  disabled by default, so no auth work is required for this exercise.
