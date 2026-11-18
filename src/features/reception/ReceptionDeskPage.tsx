/**
 * The reception desk.
 *
 * One route, three persistent zones. Selecting an owner or a pet changes search
 * parameters only, so nothing unmounts and the search results stay on screen
 * throughout the conversation.
 */

import { useEffect, useState } from 'react';
import { useOwner } from '~/features/owners/api/ownerApi';
import { findPet, fullName } from '~/features/owners/types';
import { OwnerSearch } from '~/features/owners/components/OwnerSearch';
import { useRecentOwners } from '~/features/owners/hooks/useRecentOwners';
import { OwnerZone } from '~/features/owners/components/OwnerZone';
import { NewOwnerPanel } from '~/features/owners/components/NewOwnerPanel';
import { PetZone } from '~/features/pets/components/PetZone';
import { useSelection } from './selection';
import styles from './ReceptionDeskPage.module.css';

export const ReceptionDeskPage = () => {
  const { selection, select } = useSelection();
  const { recent, remember } = useRecentOwners();
  const [creatingOwner, setCreatingOwner] = useState(false);

  const owner = useOwner(selection.ownerId);

  // Remember whoever is on screen, however they were selected — including by
  // someone opening a deep link.
  const loaded = owner.data;
  useEffect(() => {
    if (loaded !== undefined) remember({ id: loaded.id, label: fullName(loaded) });
  }, [loaded, remember]);

  const pet =
    loaded !== undefined && selection.petId !== null
      ? findPet(loaded, selection.petId)
      : undefined;

  return (
    <>
      <div className={styles.desk}>
        <header className={styles.masthead}>
          <h1 className={styles.brand}>Reception Desk</h1>
          <p className={styles.hint}>City Vet Clinic</p>
        </header>

        <div className={styles.zone}>
          <OwnerSearch
            query={selection.query}
            onQueryChange={(query) => {
              select({ query });
            }}
            onSelect={(found) => {
              setCreatingOwner(false);
              select({ ownerId: found.id });
            }}
            onSelectRecent={(id) => {
              select({ ownerId: id });
            }}
            selectedOwnerId={selection.ownerId}
            recent={recent}
            onNewOwner={() => {
              setCreatingOwner(true);
            }}
          />
        </div>

        <div className={styles.zone}>
          {creatingOwner ? (
            <NewOwnerPanel
              onCreated={(id) => {
                setCreatingOwner(false);
                select({ ownerId: id });
              }}
              onCancel={() => {
                setCreatingOwner(false);
              }}
            />
          ) : (
            <OwnerZone
              ownerId={selection.ownerId}
              owner={owner}
              selectedPetId={selection.petId}
              onSelectPet={(id) => {
                select({ petId: id });
              }}
            />
          )}
        </div>

        <div
          className={`${styles.zone} ${styles.petZone} ${
            pet === undefined ? styles.petZoneEmpty : ''
          }`}
        >
          <PetZone
            pet={pet}
            hasOwner={loaded !== undefined}
            onClose={() => {
              select({ petId: null });
            }}
          />
        </div>
      </div>

      <div className={styles.unsupported}>
        <h1>Screen too narrow</h1>
        <p>
          The reception desk needs at least 720 pixels of width. Open it on the desk
          terminal or widen this window.
        </p>
      </div>
    </>
  );
};
