/**
 * Exécuteur de mesures « longues » en tâche de fond, avec file d'attente.
 *
 * Pourquoi : certaines mesures interrogent Sage X3 et peuvent durer plusieurs dizaines de
 * secondes. Garder la requête HTTP ouverte l'expose au timeout du reverse proxy ; on rend donc
 * la main immédiatement et le client interroge l'état via `getMeasureJob`.
 *
 * Deux garanties apportées ici :
 *  - FIL D'ATTENTE : au plus `MAX_CONCURRENT_JOBS` mesures s'exécutent simultanément. Les autres
 *    attendent leur tour SANS consommer de connexion X3 — sinon un écran qui demande dix mesures
 *    saturerait le pool partagé avec les crons.
 *  - UNICITÉ : une mesure déjà en cours pour la même clé est REJOINTE, jamais dupliquée (deux
 *    clics, deux onglets ou un rechargement ne déclenchent pas une seconde passe X3).
 *
 * Registre EN MÉMOIRE (process API unique, comme les caches du projet) : un redémarrage perd les
 * mesures en cours — le client reçoit alors `unknown` et peut relancer.
 */

import { TtlCache } from '../cache/ttlCache';

export type MeasureJobStatus = 'running' | 'done' | 'error';

export type MeasureJob<T> = {
  /** Clé d'unicité de la mesure (type + campagne). */
  key: string;
  status: MeasureJobStatus;
  startedAt: string;
  finishedAt?: string;
  /** Renseigné uniquement quand `status === 'done'`. */
  data?: T;
  /** Renseigné uniquement quand `status === 'error'`. */
  error?: string;
};

/** Mesures exécutées simultanément ; au-delà, elles attendent leur tour. */
const MAX_CONCURRENT_JOBS = 3;

/**
 * Durée pendant laquelle un résultat reste consultable par le client : assez long pour qu'un
 * onglet qui revient au premier plan retrouve son résultat, assez court pour ne pas resservir
 * indéfiniment une valeur ancienne.
 */
const FINISHED_JOB_TTL_MS = 15 * 60_000;

type QueueItem = { key: string; work: () => Promise<unknown> };

const runningJobs = new Map<string, MeasureJob<unknown>>();
const finishedJobs = new TtlCache(FINISHED_JOB_TTL_MS);
const queue: QueueItem[] = [];
let activeJobCount = 0;

export function measureJobKey(kind: string, campaignId: number): string {
  return `${kind}:campaign:${campaignId}`;
}

/**
 * État d'une mesure : en cours, terminée, ou `undefined` si aucune mesure n'est connue
 * (première demande, API redémarrée, ou résultat expiré).
 */
export function getMeasureJob<T>(kind: string, campaignId: number): MeasureJob<T> | undefined {
  const key = measureJobKey(kind, campaignId);
  return (
    (runningJobs.get(key) as MeasureJob<T> | undefined) ??
    finishedJobs.get<MeasureJob<T>>(key)
  );
}

/**
 * Démarre la mesure — ou rejoint celle déjà en cours — et rend la main IMMÉDIATEMENT.
 *
 * `force` (bouton « Actualiser » / « Mesurer ») : ignore un résultat récent déjà connu.
 * Sans `force`, un résultat connu est renvoyé tel quel : aucune requête X3 inutile.
 */
export function startMeasureJob<T>(
  kind: string,
  campaignId: number,
  work: () => Promise<T>,
  options: { force?: boolean } = {},
): MeasureJob<T> {
  const key = measureJobKey(kind, campaignId);

  const running = runningJobs.get(key) as MeasureJob<T> | undefined;
  if (running) return running;

  if (options.force) {
    finishedJobs.delete(key);
  } else {
    const finished = finishedJobs.get<MeasureJob<T>>(key);
    if (finished) return finished;
  }

  const job: MeasureJob<T> = {
    key,
    status: 'running',
    startedAt: new Date().toISOString(),
  };

  runningJobs.set(key, job as MeasureJob<unknown>);
  queue.push({ key, work: work as () => Promise<unknown> });
  drainQueue();

  return job;
}

/** Démarre les mesures en attente tant qu'un créneau de concurrence est libre. */
function drainQueue(): void {
  while (activeJobCount < MAX_CONCURRENT_JOBS && queue.length > 0) {
    const item = queue.shift();
    if (!item) return;

    activeJobCount += 1;

    void (async () => {
      const startedAt = runningJobs.get(item.key)?.startedAt ?? new Date().toISOString();
      let finished: MeasureJob<unknown>;

      try {
        const data = await item.work();
        finished = {
          key: item.key,
          status: 'done',
          startedAt,
          finishedAt: new Date().toISOString(),
          data,
        };
      } catch (error) {
        finished = {
          key: item.key,
          status: 'error',
          startedAt,
          finishedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Erreur inconnue',
        };
        console.error(`Erreur mesure [${item.key}]:`, error);
      }

      runningJobs.delete(item.key);
      finishedJobs.set(item.key, finished);
      activeJobCount -= 1;
      drainQueue();
    })();
  }
}
