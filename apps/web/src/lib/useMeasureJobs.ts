import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '@/lib/api';

/**
 * Suit des mesures exécutées en TÂCHE DE FOND côté API (une par URL).
 *
 * Pourquoi : ces mesures interrogent Sage X3 et peuvent durer longtemps. On ne tient donc pas une
 * requête HTTP ouverte — un reverse proxy la couperait. On démarre la mesure (`POST …/measure`),
 * puis on interroge son état (`GET …/measure`). Les requêtes de suivi sont très courtes, donc
 * insensibles au proxy : la tuile peut rester sur « Calcul… » aussi longtemps qu'il faut.
 *
 * L'API limite elle-même la concurrence (3 mesures simultanées) : demander toutes les mesures d'un
 * coup est donc sans danger, les suivantes attendent leur tour côté serveur.
 *
 * Une seule implémentation pour les deux usages : la fiche campagne (une URL) et le tableau de
 * bord (une URL par campagne).
 */

/** Réponse des routes `…/measure` (démarrage et état). */
export type MeasureJobPayload<T> = {
  status?: 'running' | 'done' | 'error' | 'unknown';
  data?: T;
  error?: string;
};

/** Intervalle entre deux interrogations d'état. */
const POLL_INTERVAL_MS = 2_000;

/**
 * Garde-fou d'interrogation : au-delà, on cesse de suivre plutôt que de tourner indéfiniment sur
 * une panne silencieuse (la tuile repasse alors sur « — » + bouton).
 */
const MAX_WAIT_MS = 15 * 60_000;

export type MeasureJobsState<T> = {
  /** Résultat par URL de mesure, dès que la mesure est terminée. */
  dataByKey: Record<string, T>;
  /** `true` tant qu'aucun résultat n'est connu ET qu'aucun échec n'est constaté. */
  loadingKeys: Record<string, boolean>;
  /** URLs dont la mesure a échoué (X3 en échec, mesure inconnue, garde-fou, réseau). */
  failedKeys: Record<string, boolean>;
  /** Relance la mesure d'une URL (bouton « Mesurer » / « Actualiser »). */
  restart: (baseUrl: string) => void;
};

export function useMeasureJobs<T>(baseUrls: string[]): MeasureJobsState<T> {
  // Clé stable : le tableau est recréé à chaque rendu, on ne doit pas relancer les mesures pour
  // autant. `useMeasureJobs` ne se relance que si la LISTE des URL change ou sur demande explicite.
  const urlsKey = baseUrls.join('|');

  const [dataByKey, setDataByKey] = useState<Record<string, T>>({});
  const [failedKeys, setFailedKeys] = useState<Record<string, boolean>>({});
  const [restartNonce, setRestartNonce] = useState(0);
  /** Intentions « forcer une nouvelle mesure », consommées par l'effet au démarrage suivant. */
  const forceRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!urlsKey) {
      setDataByKey({});
      setFailedKeys({});
      return;
    }

    const urls = urlsKey.split('|');
    let cancelled = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const startedAt = Date.now();

    const schedule = (run: () => void, delay: number) => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        if (!cancelled) run();
      }, delay);
      timers.add(timer);
    };

    const markFailed = (url: string) => {
      setFailedKeys((prev) => ({ ...prev, [url]: true }));
    };

    const markSucceeded = (url: string, payload: T | undefined) => {
      // Un `done` sans données ne permet pas d'afficher une valeur : on le traite comme un échec
      // (jamais de 0 inventé).
      if (payload === undefined) {
        markFailed(url);
        return;
      }
      setDataByKey((prev) => ({ ...prev, [url]: payload }));
    };

    const poll = async (url: string) => {
      if (cancelled) return;

      try {
        const res = await api.get(`${url}/measure`);
        if (cancelled) return;

        const body = res.data?.data as MeasureJobPayload<T> | undefined;

        if (body?.status === 'done') {
          markSucceeded(url, body.data);
          return;
        }
        // `error` = source en échec ; `unknown` = API redémarrée ou résultat expiré.
        if (body?.status === 'error' || body?.status === 'unknown') {
          markFailed(url);
          return;
        }
      } catch (error) {
        if (!cancelled) {
          console.error(`Erreur de suivi de mesure [${url}] :`, error);
          markFailed(url);
        }
        return;
      }

      if (cancelled) return;
      if (Date.now() - startedAt > MAX_WAIT_MS) {
        markFailed(url);
        return;
      }
      schedule(() => void poll(url), POLL_INTERVAL_MS);
    };

    const start = async (url: string) => {
      if (cancelled) return;

      // `force` : uniquement au redémarrage demandé par l'utilisateur (bouton).
      const force = forceRef.current.delete(url);

      try {
        const res = await api.post(`${url}/measure`, undefined, {
          params: force ? { force: 1 } : undefined,
        });
        if (cancelled) return;

        const body = res.data?.data as MeasureJobPayload<T> | undefined;

        if (body?.status === 'done') {
          markSucceeded(url, body.data);
          return;
        }
        if (body?.status === 'error') {
          markFailed(url);
          return;
        }
        // `running` (ou en file d'attente côté API) : on suit l'état jusqu'au résultat.
        schedule(() => void poll(url), POLL_INTERVAL_MS);
      } catch (error) {
        if (cancelled) return;
        console.error(`Erreur de démarrage de mesure [${url}] :`, error);
        markFailed(url);
      }
    };

    for (const url of urls) {
      void start(url);
    }

    return () => {
      cancelled = true;
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
    };
  }, [urlsKey, restartNonce]);

  const restart = useCallback((baseUrl: string) => {
    forceRef.current.add(baseUrl);
    // On repart de zéro pour cette URL : la tuile revient sur « Calcul… » pendant la relance.
    setDataByKey((prev) => {
      if (!(baseUrl in prev)) return prev;
      const next = { ...prev };
      delete next[baseUrl];
      return next;
    });
    setFailedKeys((prev) => {
      if (!(baseUrl in prev)) return prev;
      const next = { ...prev };
      delete next[baseUrl];
      return next;
    });
    setRestartNonce((nonce) => nonce + 1);
  }, []);

  // Dérivé plutôt que stocké : au tout premier rendu (avant l'effet) une URL est déjà « en cours »,
  // ce qui évite l'affichage fugace d'un « — » avant même que la mesure ne soit demandée.
  const loadingKeys = useMemo(() => {
    const result: Record<string, boolean> = {};
    for (const url of urlsKey ? urlsKey.split('|') : []) {
      result[url] = !dataByKey[url] && !failedKeys[url];
    }
    return result;
  }, [urlsKey, dataByKey, failedKeys]);

  return { dataByKey, loadingKeys, failedKeys, restart };
}
