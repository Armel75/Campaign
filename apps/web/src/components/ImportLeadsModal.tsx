import { useRef, useState } from 'react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    setOpen(false);
    reset();
  };

  const runPreview = async (selectedFile: File) => {
    setPreviewing(true);
    setError(null);
    setPreview(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const resp = await api.post('/leads/import?dryRun=true', formData);
      setPreview(resp.data.data);
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

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
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
          <Upload className="mr-2 h-4 w-4" /> Importer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importer des leads</DialogTitle>
          <DialogDescription>
            Choisissez un fichier Excel (.xlsx) ou CSV. Chaque ligne = un lead. Un aperçu
            est affiché avant l'import.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
                <strong>Campagne</strong> (nom ou id) — obligatoire
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
            <p className="mt-2">
              Statut accepté : Nouveau, Contacté, Qualifié, Converti, Perdu, Invalide.
            </p>
            <p className="mt-1">
              Email, Téléphone, Statut, Utilisateur GLPI et Notes peuvent rester vides
              (facultatives). Les doublons (même email <em>ou</em> téléphone dans la même
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
            disabled={!file || importing || previewing || validCount === 0}
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
