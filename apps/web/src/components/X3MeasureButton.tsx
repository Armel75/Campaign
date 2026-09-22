import { Loader2, RefreshCw } from 'lucide-react';

/**
 * Bouton d'actualisation des indicateurs Sage X3 (CA facturé, clients distincts).
 *
 * Pourquoi un bouton plutôt qu'un simple « — » : sur le tableau de bord la passe X3 est
 * plafonnée (10 s) et couvre plusieurs campagnes — la mesure n'aboutit donc pas toujours.
 * Une mesure À LA DEMANDE ne concerne qu'une seule campagne (≈ 3 s mesurés sur données
 * réelles) : elle aboutit quasi systématiquement.
 *
 * L'appelant ne doit afficher ce bouton que lorsque la mesure est POSSIBLE (au moins un
 * article codifié dans Sage) : on ne promet jamais une issue quand il n'y en a pas.
 *
 * Les libellés sont configurables (`label` / `busyLabel`) : le tableau de bord dit
 * « Actualiser », la fiche campagne conserve « Mesurer » (relance d'une mesure).
 *
 * `stopPropagation` : le carreau de campagne est lui-même cliquable (navigation vers la
 * campagne) — sans cela, le clic déclencherait aussi la navigation.
 */
export default function X3MeasureButton({
  onClick,
  busy,
  label = 'Mesurer',
  busyLabel = 'Mesure…',
}: {
  onClick: () => void;
  busy: boolean;
  /** Libellé au repos (défaut : « Mesurer »). */
  label?: string;
  /** Libellé pendant le calcul (défaut : « Mesure… »). */
  busyLabel?: string;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      title="Relancer la mesure X3 pour cette campagne (quelques secondes)."
      className="mt-1 inline-flex items-center gap-1 rounded-md border border-primary/25 bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary transition-all hover:bg-primary/10 active:scale-[0.97] disabled:opacity-60"
    >
      {busy ? (
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
      ) : (
        <RefreshCw className="h-2.5 w-2.5" />
      )}
      {busy ? busyLabel : label}
    </button>
  );
}
