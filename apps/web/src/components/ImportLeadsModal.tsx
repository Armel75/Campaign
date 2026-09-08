import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Upload,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import api from '@/lib/api';

interface ImportResult {
  dryRun?: boolean;
  total: number;
  created?: number;
  valid?: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
  columns?: {
    detected: Array<{ field: string; header: string }>;
    missingRequired: string[];
    confidence?: Record<string, number>;
    candidates?: Record<
      string,
      Array<{ header: string; score: number; method: string }>
    >;
    headers?: string[];
    headerRowNumber?: number;
    campaignRequired?: boolean;
  };
  preview?: Array<{ row: number; values: Record<string, string> }>;
}

const PREVIEW_LABELS = [
  'Campagne',
  'Nom',
  'Email',
  'Téléphone',
  'Statut',
  'Utilisateur GLPI',
  'Notes',
];

const IMPORT_FIELDS: Array<{ field: string; label: string; required?: boolean }> = [
  { field: 'campaign', label: 'Campagne', required: true },
  { field: 'name', label: 'Nom', required: true },
  { field: 'email', label: 'Email' },
  { field: 'phone', label: 'Téléphone' },
  { field: 'status', label: 'Statut' },
  { field: 'assignedTo', label: 'Utilisateur GLPI' },
  { field: 'notes', label: 'Notes' },
];

const LEAD_STATUS_BADGES = [
  { label: 'Nouveau', className: 'bg-blue-100 text-blue-700' },
  { label: 'Contacté', className: 'bg-amber-100 text-amber-700' },
  { label: 'Qualifié', className: 'bg-purple-100 text-purple-700' },
  { label: 'Converti', className: 'bg-green-100 text-green-700' },
  { label: 'Perdu', className: 'bg-red-100 text-red-700' },
  { label: 'Invalide', className: 'bg-gray-200 text-gray-700' },
];

interface ImportLeadsModalProps {
  onImported?: () => void;
}

export default function ImportLeadsModal({ onImported }: ImportLeadsModalProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [defaultCampaignId, setDefaultCampaignId] = useState('');
  const [campaigns, setCampaigns] = useState<Array<{ id: number; name: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || campaigns.length > 0) return;
    api
      .get('/campaigns', { params: { limit: 1000 } })
      .then((resp) => {
        const data = resp.data?.data;
        if (Array.isArray(data)) setCampaigns(data);
      })
      .catch(() => {
        /* silencieux : le sélecteur restera vide si la liste échoue */
      });
  }, [open, campaigns.length]);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setHeaders([]);
    setMapping({});
    setDefaultCampaignId('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    setOpen(false);
    reset();
  };

  const runPreview = async (
    selectedFile: File,
    overrides?: { mapping?: Record<string, string>; defaultCampaignId?: string },
  ) => {
    setPreviewing(true);
    setError(null);
    setPreview(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (overrides?.mapping && Object.keys(overrides.mapping).length > 0) {
        formData.append('mapping', JSON.stringify(overrides.mapping));
      }
      if (overrides?.defaultCampaignId) {
        formData.append('defaultCampaignId', overrides.defaultCampaignId);
      }
      const resp = await api.post('/leads/import?dryRun=true', formData);
      setPreview(resp.data.data);
      const cols = resp.data.data?.columns;
      if (cols?.headers) setHeaders(cols.headers);
      if (cols) {
        // Le mapping détecté n'écrase le mapping manuel que lors du 1er aperçu.
        if (!overrides?.mapping) {
          const detected: Record<string, string> = {};
          for (const d of cols.detected ?? []) {
            if (d.header) detected[d.field] = d.header;
          }
          setMapping(detected);
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Erreur lors de l'analyse du fichier.");
    } finally {
      setPreviewing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(null);
    setResult(null);
    setError(null);
    if (f) void runPreview(f);
  };

  const handleMappingChange = (field: string, header: string) => {
    if (!file) return;
    const next = { ...mapping };
    if (header) next[field] = header;
    else delete next[field];
    setMapping(next);
    void runPreview(file, { mapping: next, defaultCampaignId });
  };

  const handleDefaultCampaignChange = (value: string) => {
    if (!file) return;
    setDefaultCampaignId(value);
    void runPreview(file, { mapping, defaultCampaignId: value });
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (Object.keys(mapping).length > 0) {
        formData.append('mapping', JSON.stringify(mapping));
      }
      if (defaultCampaignId) {
        formData.append('defaultCampaignId', defaultCampaignId);
      }
      const resp = await api.post('/leads/import', formData);
      setResult(resp.data.data);
      if (onImported) onImported();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Erreur lors de l'import.");
    } finally {
      setImporting(false);
    }
  };

  const validCount = preview?.valid ?? 0;
  const canImport = !!file && !importing && !previewing && !!mapping.name;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" /> Importer leads
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importer des leads</DialogTitle>
          <DialogDescription>
            Choisissez un fichier Excel (.xlsx) ou CSV. Chaque ligne = un lead. Un aperçu
            est affiché avant l'import.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground"
          />

          <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
            <p className="mb-1 font-medium">Colonnes attendues :</p>
            <ul className="list-inside list-disc space-y-0.5">
              <li>
                <strong>Campagne</strong> (nom ou id) — facultatif
              </li>
              <li>
                <strong>Nom</strong> — obligatoire
              </li>
              <li>Email</li>
              <li>Téléphone</li>
              <li>Statut</li>
              <li>Utilisateur GLPI</li>
              <li>Notes</li>
            </ul>
            <div className="mt-2">
              <p className="mb-1.5 font-medium">Statuts acceptés :</p>
              <div className="flex flex-wrap gap-1.5">
                {LEAD_STATUS_BADGES.map((s) => (
                  <span
                    key={s.label}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.className}`}
                  >
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
            <p className="mt-1">
              Campagne, Email, Téléphone, Statut, Utilisateur GLPI et Notes peuvent
              rester vides (facultatives). Sans campagne, le lead est créé dans le
              vivier. Les doublons (même email <em>ou</em> téléphone dans la même
              campagne) sont automatiquement ignorés.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {previewing && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Analyse du fichier en cours…
            </div>
          )}

          {preview && !previewing && (
            <div className="space-y-3">
              {/* Correspondance des colonnes (modifiable) */}
              <div className="rounded-md border bg-muted/40 p-3 text-xs">
                <p className="mb-2 font-medium">
                  Correspondance des colonnes{' '}
                  <span className="font-normal text-muted-foreground">
                    (détection automatique — vous pouvez ajuster avant l'import)
                  </span>
                </p>
                <div className="space-y-1.5">
                  {IMPORT_FIELDS.map((f) => (
                    <div key={f.field} className="flex items-center gap-2">
                      <span
                        className={`w-40 shrink-0 font-medium ${
                          f.required ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {f.label}
                        {f.required && <span className="text-red-500"> *</span>}
                      </span>
                      <select
                        className="w-full rounded border bg-background px-2 py-1 text-xs"
                        value={mapping[f.field] ?? ''}
                        onChange={(e) => handleMappingChange(f.field, e.target.value)}
                      >
                        <option value="">— Non mappé —</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                {!mapping.campaign && (
                  <div className="mt-3 rounded border border-amber-300 bg-amber-50 p-2 text-amber-800">
                    <p className="mb-1 font-medium">
                      Aucune colonne « Campagne » n'a été trouvée (facultatif) — les
                      leads seront créés sans campagne.
                    </p>
                    <label
                      className="mb-1 block font-medium"
                      htmlFor="default-campaign"
                    >
                      Vous pouvez rattacher toutes les lignes à une campagne :
                    </label>
                    <select
                      id="default-campaign"
                      className="w-full rounded border bg-background px-2 py-1 text-xs"
                      value={defaultCampaignId}
                      onChange={(e) => handleDefaultCampaignChange(e.target.value)}
                    >
                      <option value="">— Aucune (vivier) —</option>
                      {campaigns.map((c) => (
                        <option key={c.id} value={String(c.id)}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    {campaigns.length === 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Aucune campagne chargée.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Colonnes détectées */}
              <div className="rounded-md border bg-muted/40 p-3 text-xs">
                <p className="mb-1 font-medium">Colonnes détectées :</p>
                <div className="flex flex-wrap gap-1.5">
                  {preview.columns?.detected.map((c) => (
                    <span
                      key={c.field}
                      className="rounded bg-primary/10 px-2 py-0.5 font-medium text-primary"
                    >
                      {c.header}
                    </span>
                  ))}
                  {preview.columns?.missingRequired.map((f) => (
                    <span
                      key={f}
                      className="rounded bg-red-100 px-2 py-0.5 font-medium text-red-700"
                    >
                      {f} : introuvable
                    </span>
                  ))}
                </div>
              </div>

              {/* Résumé de validation */}
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="rounded-md border px-2 py-1">
                  Total : <strong>{preview.total}</strong>
                </span>
                <span className="rounded-md border border-green-300 bg-green-50 px-2 py-1 text-green-700">
                  Valides : <strong>{preview.valid}</strong>
                </span>
                <span className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-amber-700">
                  Doublons : <strong>{preview.skipped}</strong>
                </span>
                <span className="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-red-700">
                  Erreurs : <strong>{preview.errors.length}</strong>
                </span>
              </div>

              {/* Aperçu des premières lignes */}
              {preview.preview && preview.preview.length > 0 && (
                <div className="overflow-auto rounded-md border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/60">
                      <tr>
                        <th className="px-2 py-1 text-left font-medium">Ligne</th>
                        {PREVIEW_LABELS.map((l) => (
                          <th key={l} className="px-2 py-1 text-left font-medium">
                            {l}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.preview.map((p) => (
                        <tr key={p.row} className="border-t">
                          <td className="px-2 py-1 text-muted-foreground">{p.row}</td>
                          {PREVIEW_LABELS.map((l) => (
                            <td key={l} className="max-w-[140px] truncate px-2 py-1">
                              {p.values[l] || ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Erreurs de validation */}
              {preview.errors.length > 0 && (
                <div className="max-h-32 overflow-auto rounded-md border border-red-200 bg-red-50/50 p-2 text-xs text-red-700">
                  {preview.errors.slice(0, 50).map((e, i) => (
                    <div key={i}>
                      Ligne {e.row} : {e.message}
                    </div>
                  ))}
                  {preview.errors.length > 50 && (
                    <div>… et {preview.errors.length - 50} autre(s)</div>
                  )}
                </div>
              )}
            </div>
          )}

          {result && !importing && (
            <div className="space-y-2 rounded-md border border-green-200 bg-green-50/50 p-3 text-sm text-green-800">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Import terminé : {result.created ?? 0} créé(s), {result.skipped} doublon(s)
                ignoré(s), {result.errors.length} erreur(s)
              </div>
              {result.errors.length > 0 && (
                <ul className="max-h-32 overflow-auto rounded border bg-white/50 p-2 text-xs text-red-700">
                  {result.errors.slice(0, 50).map((e, i) => (
                    <li key={i}>
                      Ligne {e.row} : {e.message}
                    </li>
                  ))}
                  {result.errors.length > 50 && (
                    <li>… et {result.errors.length - 50} autre(s)</li>
                  )}
                </ul>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={importing || previewing}>
            Fermer
          </Button>
          <Button
            onClick={handleImport}
            disabled={!canImport}
          >
            {importing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {importing
              ? 'Import en cours…'
              : validCount > 0
                ? `Importer (${validCount})`
                : 'Importer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
