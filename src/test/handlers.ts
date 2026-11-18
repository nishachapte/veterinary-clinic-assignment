import { http, HttpResponse } from 'msw';
import { george, owners, petTypes } from './fixtures';
import type { PetRequestBody } from '~/features/pets/api/petApi';
import type { OwnerRequestBody } from '~/features/owners/api/ownerApi';
import type { VisitRequestBody } from '~/features/visits/api/visitApi';

/** Mirrors the real server, including its case-sensitive prefix filter. */
const filterByLastName = (lastName: string) =>
  lastName === ''
    ? owners
    : owners.filter((o) => o.lastName.startsWith(lastName));

/**
 * Entities created during a test, so the owner payload reflects what was
 * posted. DERIVED from the fixtures rather than restated: the created rows are
 * spread into the same arrays as the fixture rows, so the two shapes must
 * agree, and deriving them means they cannot drift apart.
 */
type CreatedPet = (typeof george.pets)[number];
type CreatedVisit = CreatedPet['visits'][number];

/** One store and one reset, so a new entity type cannot leave a stale line behind. */
let created = {
  pets: [] as CreatedPet[],
  visits: [] as CreatedVisit[],
  nextId: 100,
};

/** Field edits applied by a PUT, so a refetch reflects what was saved. */
let ownerEdits: Partial<OwnerRequestBody> = {};
let petEdits = new Map<number, PetRequestBody>();

export const resetCreated = (): void => {
  created = { pets: [], visits: [], nextId: 100 };
  ownerEdits = {};
  petEdits = new Map();
};

/** Lets a test assert that a form did NOT reach the server. */
export const createdPetCount = (): number => created.pets.length;

const withCreatedVisits = (pet: CreatedPet): CreatedPet => ({
  ...pet,
  ...petEdits.get(pet.id),
  visits: [...pet.visits, ...created.visits.filter((v) => v.petId === pet.id)],
});

// One rule for every pet, whether it came from the fixtures or from a POST.
const ownerWithCreated = () => ({
  ...george,
  ...ownerEdits,
  pets: [...george.pets, ...created.pets].map(withCreatedVisits),
});

export const handlers = [
  http.get('/api/pettypes', () => HttpResponse.json(petTypes)),

  http.get('/api/v2/owners', ({ request }) => {
    const url = new URL(request.url);
    const lastName = url.searchParams.get('lastName') ?? '';
    const size = Number(url.searchParams.get('size') ?? '20');
    const content = filterByLastName(lastName).map((o) => ({
      ...o,
      ...(o.id === george.id ? ownerEdits : {}),
      pets: o.pets.map((pet) => ({ ...pet, ...petEdits.get(pet.id) })),
    }));
    return HttpResponse.json({
      content,
      page: 0,
      size,
      totalElements: content.length,
      totalPages: content.length === 0 ? 0 : 1,
    });
  }),

  // The real server answers 204 with no body, so the client must refetch.
  http.put<{ ownerId: string }, OwnerRequestBody>(
    '/api/owners/:ownerId',
    async ({ request }) => {
      ownerEdits = await request.json();
      return new HttpResponse(null, { status: 204 });
    },
  ),

  http.put<{ petId: string }, PetRequestBody>(
    '/api/owners/:ownerId/pets/:petId',
    async ({ request, params }) => {
      petEdits.set(Number(params.petId), await request.json());
      return new HttpResponse(null, { status: 204 });
    },
  ),

  http.get('/api/owners/:ownerId', ({ params }) =>
    params.ownerId === '1'
      ? HttpResponse.json(ownerWithCreated())
      : HttpResponse.json(betty()),
  ),

  // The request body is typed from `~/features/*/api`, the same type the client
  // builds, so a change to what the app sends fails to compile HERE rather than
  // leaving the mock quietly accepting a shape nothing produces.
  http.post<{ ownerId: string }, PetRequestBody>(
    '/api/owners/:ownerId/pets',
    async ({ request, params }) => {
      const pet: CreatedPet = {
        ...(await request.json()),
        id: (created.nextId += 1),
        ownerId: Number(params.ownerId),
        visits: [],
      };
      created.pets.push(pet);
      // The real server always sends `ownerId`, though the contract makes it
      // optional (finding A7).
      return HttpResponse.json(pet, { status: 201 });
    },
  ),

  http.post<{ petId: string }, VisitRequestBody>(
    '/api/owners/:ownerId/pets/:petId/visits',
    async ({ request, params }) => {
      const { date, description } = await request.json();
      const visit: CreatedVisit = {
        id: (created.nextId += 1),
        petId: Number(params.petId),
        date,
        description,
      };
      created.visits.push(visit);
      // The real server returns the created visit WITH its id (finding C2).
      return HttpResponse.json(visit, { status: 201 });
    },
  ),
];

function betty() {
  return owners[1];
}
