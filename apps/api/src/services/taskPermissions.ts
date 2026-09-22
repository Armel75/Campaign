/**
 * Règles d'autorisation sur les tâches.
 *
 * Source unique, partagée par les DEUX chemins d'API qui suppriment une tâche
 * (`DELETE /tasks/:id` et `DELETE /campaigns/:id/tasks/:taskId`). Sans ce module, les deux
 * règles divergent et la plus permissive rend la plus stricte inutile.
 *
 * Volontairement sans dépendance Prisma : module pur, testable unitairement.
 */

/** Sous-ensemble des permissions de rôle utile à ces règles. */
export type TaskActorRole =
  | {
      canDeleteAllCampaigns?: boolean;
    }
  | null
  | undefined;

/**
 * Suppression d'une tâche : réservée à son créateur.
 *
 * Exception administrateur : un profil disposant de `canDeleteAllCampaigns` conserve la main —
 * sans quoi les tâches créées par un collaborateur parti resteraient impossibles à supprimer.
 */
export function canDeleteTask(
  actorUserId: number,
  actorRole: TaskActorRole,
  taskCreatedById: number,
): boolean {
  return !!actorRole?.canDeleteAllCampaigns || actorUserId === taskCreatedById;
}
