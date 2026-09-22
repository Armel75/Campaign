import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { canDeleteTask } from '../src/services/taskPermissions.ts';

describe('canDeleteTask', () => {
  test('le créateur peut supprimer sa propre tâche', () => {
    assert.equal(canDeleteTask(7, { canDeleteAllCampaigns: false }, 7), true);
  });

  test('un autre utilisateur ne peut PAS supprimer la tâche (même avec canEditAllCampaigns)', () => {
    assert.equal(canDeleteTask(2, { canDeleteAllCampaigns: false }, 7), false);
  });

  test('exception administrateur : canDeleteAllCampaigns peut supprimer toute tâche', () => {
    assert.equal(canDeleteTask(2, { canDeleteAllCampaigns: true }, 7), true);
  });

  test('rôle absent ou nul : seul le créateur est autorisé', () => {
    assert.equal(canDeleteTask(7, null, 7), true);
    assert.equal(canDeleteTask(2, null, 7), false);
    assert.equal(canDeleteTask(2, undefined, 7), false);
  });
});
