/** Wire-shaped fixtures: exactly what the server sends, not what we wish it sent. */

export const petTypes = [
  { id: 1, name: 'cat' },
  { id: 2, name: 'dog' },
];

export const leo = {
  id: 1,
  ownerId: 1,
  name: 'Leo',
  birthDate: '2010-09-07',
  type: { id: 1, name: 'cat' },
  visits: [{ id: 1, petId: 1, date: '2013-01-01', description: 'rabies shot' }],
};

export const george = {
  id: 1,
  firstName: 'George',
  lastName: 'Franklin',
  address: '110 W. Liberty St.',
  city: 'Madison',
  telephone: '6085551023',
  pets: [leo],
};

export const betty = {
  id: 2,
  firstName: 'Betty',
  lastName: 'Davis',
  address: '638 Cardinal Ave.',
  city: 'Sun Prairie',
  telephone: '6085551749',
  pets: [],
};

export const owners = [george, betty];
