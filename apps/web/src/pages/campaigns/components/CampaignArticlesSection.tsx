import { useMemo, useState, useEffect, Fragment, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Plus, Trash2, Loader2, Search, PackageCheck, AlertCircle, Lock, Check, ChevronsUpDown, LayoutList } from 'lucide-react';
import api from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

type ArticleSource = 'SAGE_X3' | 'SAGE_100';
type ArticleMode = 'COLLAGE' | 'BROWSE';

interface CampaignArticle {
  id: string;
  codeSageX3?: string;
  codeSage100?: string;
  designation?: string;
  currentQuantity?: number;
  quantityAtCreation?: number | null;
  quantityAtStart?: number | null;
  quantityAtClosure?: number | null;
  plannedQuantity?: number | null;
  soldQuantity?: number | null;
}

interface SearchResultArticle {
  inputCode: string;
  source: ArticleSource;
  found: boolean;
  message?: string;
  codeSageX3?: string | null;
  codeSage100?: string | null;
  designation?: string | null;
  currentQuantity?: number | null;
  famille?: string | null;
  tauxRotation?: number | null;
}

interface CatalogBrowseResult {
  codeSageX3: string;
  codeSage100: string | null;
  designation: string | null;
  currentQuantity: number;
  famille: string | null;
}

interface CampaignArticlesSectionProps {
  campaignId: string;
  articles: CampaignArticle[];
  onUpdate: () => void;
  isCampaignCompleted?: boolean;
}

export default function CampaignArticlesSection({
  campaignId,
  articles,
  onUpdate,
  isCampaignCompleted = false,
}: CampaignArticlesSectionProps) {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [source, setSource] = useState<ArticleSource>('SAGE_X3');
  const [unitPrices, setUnitPrices] = useState<Record<string, number>>({});

  // Récupération des montants de vente réels (CA) depuis Sage X3
  useEffect(() => {
    api.get(`/campaigns/${campaignId}/sales-amounts`).then(res => {
      setUnitPrices(res.data?.data || {});
    }).catch(() => {
      // Silence: les montants ne sont pas bloquants
    });
  }, [campaignId]);
  const [codesText, setCodesText] = useState('');
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResultArticle[]>([]);
  const [plannedQuantities, setPlannedQuantities] = useState<Record<string, string>>({});

  // Mode Parcourir
  const [activeMode, setActiveMode] = useState<ArticleMode>('COLLAGE');
  const [families, setFamilies] = useState<string[]>([]);
  const [familiesOpen, setFamiliesOpen] = useState(false);
  const [browseFamilie, setBrowseFamilie] = useState('');
  const [browseSearchQuery, setBrowseSearchQuery] = useState('');
  const [browseTauxOperator, setBrowseTauxOperator] = useState<'GT' | 'LT' | 'EQ'>('GT');
  const [browseTauxValue, setBrowseTauxValue] = useState('');
  const [browseResults, setBrowseResults] = useState<CatalogBrowseResult[]>([]);
  const [browseSearching, setBrowseSearching] = useState(false);
  const [browseSelectedCodes, setBrowseSelectedCodes] = useState<Set<string>>(new Set());
  const [browseSaving, setBrowseSaving] = useState(false);

  const canManageCampaignArticles = !!user?.permissions?.canManageCampaignArticles;
  const canMutateArticles = canManageCampaignArticles && !isCampaignCompleted;

  const parsedCodes = useMemo(() => {
    return Array.from(
      new Set(
        codesText
          .split(/[\n,;]+/)
          .map((item) => item.trim())
          .filter(Boolean)
      )
    );
  }, [codesText]);

  const foundResults = useMemo(
    () => searchResults.filter((item) => item.found),
    [searchResults]
  );

  const notFoundResults = useMemo(
    () => searchResults.filter((item) => !item.found),
    [searchResults]
  );

  const openCreateDialog = () => {
    if (!canMutateArticles) return;

    setSource('SAGE_X3');
    setActiveMode('COLLAGE');
    setCodesText('');
    setSearchResults([]);
    setPlannedQuantities({});
    setBrowseFamilie('');
    setBrowseSearchQuery('');
    setBrowseTauxValue('');
    setBrowseTauxOperator('GT');
    setBrowseResults([]);
    setBrowseSelectedCodes(new Set());
    setIsDialogOpen(true);
  };

  const handleSearch = async () => {
    if (!canManageCampaignArticles) return;

    if (isCampaignCompleted) {
      alert('Impossible d’ajouter des articles à une campagne terminée.');
      return;
    }

    if (parsedCodes.length === 0) {
      alert('Saisis au moins un code article.');
      return;
    }

    setSearching(true);
    try {
      const res = await api.post('/campaigns/articles/search-catalog', {
        source,
        codes: parsedCodes,
      });

      const data = res.data?.data || res.data || [];
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to search articles', error);
      setSearchResults([]);
      alert(
        error?.response?.data?.message ||
          'Erreur lors de la recherche des articles.'
      );
    } finally {
      setSearching(false);
    }
  };

  const handleSaveMany = async () => {
    if (!canManageCampaignArticles) return;

    if (isCampaignCompleted) {
      alert('Impossible d’ajouter des articles à une campagne terminée.');
      return;
    }

    if (foundResults.length === 0) {
      alert('Aucun article trouvé à enregistrer.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        articles: foundResults.map((item) => ({
          source: item.source,
          codeSageX3: item.codeSageX3 || null,
          codeSage100: item.codeSage100 || null,
          designation: item.designation || '',
          currentQuantity: Number(item.currentQuantity ?? 0),
          quantityAtCreation: Number(item.currentQuantity ?? 0),
          quantityAtStart: null,
          quantityAtClosure: null,
          plannedQuantity: plannedQuantities[item.inputCode] ? Number(plannedQuantities[item.inputCode]) : null,
        })),
      };

      console.log('SAVE ARTICLES PAYLOAD =>', payload);

      const res = await api.post(`/campaigns/${campaignId}/articles/bulk`, payload);

      console.log('SAVE ARTICLES RESPONSE =>', res.data);

      const createdCount = res.data?.createdCount ?? 0;
      const message = res.data?.message || 'Opération terminée';

      alert(`${message} (${createdCount} article(s) créé(s))`);

      if (createdCount > 0) {
        setIsDialogOpen(false);
        setCodesText('');
        setSearchResults([]);
        await onUpdate();
      }
    } catch (error: any) {
      console.error('Failed to save articles', error);
      alert(
        error?.response?.data?.message ||
          'Erreur lors de l’enregistrement des articles.'
      );
    } finally {
      setSaving(false);
    }
  };

  // ─── Chargement des familles à l'ouverture du dropdown ───
  const loadAllFamilies = useCallback(async () => {
    try {
      const res = await api.get('/campaigns/articles/catalog-families/search', {
        params: { source },
      });
      const data = res.data?.data || [];
      setFamilies(Array.isArray(data) ? data : []);
    } catch {
      setFamilies([]);
    }
  }, [source]);

  useEffect(() => {
    if (isDialogOpen && activeMode === 'BROWSE') {
      loadAllFamilies();
    } else {
      setFamilies([]);
    }
  }, [isDialogOpen, activeMode, loadAllFamilies]);

  // ─── Mode Parcourir : Recherche ───
  const handleBrowseSearch = async () => {
    if (!canManageCampaignArticles) return;
    if (isCampaignCompleted) {
      alert('Impossible d\'ajouter des articles à une campagne terminée.');
      return;
    }

    setBrowseSearching(true);
    setBrowseResults([]);
    setBrowseSelectedCodes(new Set());

    try {
      const res = await api.post('/campaigns/articles/catalog-browse', {
        source,
        famille: browseFamilie || undefined,
        searchQuery: browseSearchQuery.trim() || undefined,
        tauxRotationOperator: browseTauxValue ? browseTauxOperator : undefined,
        tauxRotationValue: browseTauxValue ? Number(browseTauxValue) : undefined,
      });

      const data = res.data?.data || [];
      setBrowseResults(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Browse search failed', error);
      setBrowseResults([]);
      alert(
        error?.response?.data?.message ||
          'Erreur lors de la recherche des articles.'
      );
    } finally {
      setBrowseSearching(false);
    }
  };

  // ─── Mode Parcourir : Tout sélectionner / tout désélectionner ───
  const toggleSelectAllBrowse = () => {
    if (browseSelectedCodes.size === browseResults.length) {
      setBrowseSelectedCodes(new Set());
    } else {
      setBrowseSelectedCodes(new Set(browseResults.map((r) => r.codeSageX3)));
    }
  };

  const toggleBrowseItem = (codeSageX3: string) => {
    setBrowseSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(codeSageX3)) {
        next.delete(codeSageX3);
      } else {
        next.add(codeSageX3);
      }
      return next;
    });
  };

  // ─── Mode Parcourir : Enregistrer la sélection ───
  const handleBrowseSaveSelection = async () => {
    if (!canManageCampaignArticles) return;
    if (isCampaignCompleted) {
      alert('Impossible d\'ajouter des articles à une campagne terminée.');
      return;
    }

    const selectedArticles = browseResults.filter((r) =>
      browseSelectedCodes.has(r.codeSageX3)
    );

    if (selectedArticles.length === 0) {
      alert('Sélectionne au moins un article.');
      return;
    }

    setBrowseSaving(true);
    try {
      const payload = {
        articles: selectedArticles.map((item) => ({
          source,
          codeSageX3: item.codeSageX3,
          codeSage100: item.codeSage100,
          designation: item.designation || '',
          currentQuantity: Number(item.currentQuantity ?? 0),
          quantityAtCreation: Number(item.currentQuantity ?? 0),
          quantityAtStart: null,
          quantityAtClosure: null,
          plannedQuantity: plannedQuantities[item.codeSageX3] ? Number(plannedQuantities[item.codeSageX3]) : null,
        })),
      };

      const res = await api.post(`/campaigns/${campaignId}/articles/bulk`, payload);

      const createdCount = res.data?.createdCount ?? 0;
      const message = res.data?.message || 'Opération terminée';

      alert(`${message} (${createdCount} article(s) créé(s))`);

      if (createdCount > 0) {
        setIsDialogOpen(false);
        setCodesText('');
        setSearchResults([]);
        setBrowseResults([]);
        setBrowseSelectedCodes(new Set());
        await onUpdate();
      }
    } catch (error: any) {
      console.error('Failed to save selected articles', error);
      alert(
        error?.response?.data?.message ||
          'Erreur lors de l\'enregistrement des articles.'
      );
    } finally {
      setBrowseSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canManageCampaignArticles) return;

    if (isCampaignCompleted) {
      alert('Impossible de supprimer un article d’une campagne terminée.');
      return;
    }

    if (!window.confirm('Supprimer cet article de la campagne ?')) return;

    setDeletingId(id);
    try {
      await api.delete(`/campaigns/${campaignId}/articles/${id}`);
      await onUpdate();
    } catch (error: any) {
      console.error('Delete failed', error);
      alert(
        error?.response?.data?.message ||
          'Erreur lors de la suppression de l’article.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="text-xl">Articles de la campagne</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Rechercher plusieurs articles par code, prévisualiser, puis enregistrer en une seule fois.
          </p>
          {isCampaignCompleted && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
              <Lock className="h-3.5 w-3.5" />
              Campagne terminée : ajout et suppression désactivés
            </div>
          )}
        </div>

        {canManageCampaignArticles && (
          <Button
            onClick={openCreateDialog}
            disabled={isCampaignCompleted}
            title={isCampaignCompleted ? 'Campagne terminée' : 'Ajouter des articles'}
          >
            <Plus className="mr-2 h-4 w-4" />
            Ajouter des articles
          </Button>
        )}
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code Sage X3</TableHead>
                <TableHead>Code Sage 100</TableHead>
                <TableHead>Désignation</TableHead>
                <TableHead className="text-right">Quantité vendue</TableHead>
                <TableHead>Montant total des ventes de l'article en (FCFA)</TableHead>
                {canManageCampaignArticles && (
                  <TableHead className="text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>

            <TableBody>
              {articles.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={canManageCampaignArticles ? 6 : 5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Aucun article ajouté pour cette campagne.
                  </TableCell>
                </TableRow>
              ) : (
                articles.map((article) => (
                  <Fragment key={article.id}>
                    <TableRow className="align-top">
                      <TableCell className="font-mono align-top">
                        <div className="text-xs text-muted-foreground mb-1">Code Sage X3</div>
                        <div className="font-medium">{article.codeSageX3 || '—'}</div>
                      </TableCell>

                      <TableCell className="font-mono align-top">
                        <div className="text-xs text-muted-foreground mb-1">Code Sage 100</div>
                        <div className="font-medium">{article.codeSage100 || '—'}</div>
                      </TableCell>

                      <TableCell className="align-top">
                        <div className="text-xs text-muted-foreground mb-1">Désignation</div>
                        <div className="font-medium break-words">{article.designation || '—'}</div>
                      </TableCell>

                      <TableCell className="text-right align-top whitespace-nowrap">
                        <div className="text-xs text-muted-foreground mb-1">Quantité vendue</div>
                        <div className="font-medium">
                          {article.soldQuantity != null ? Number(article.soldQuantity).toLocaleString('fr-FR') : '—'}
                        </div>
                      </TableCell>

                      <TableCell className="align-top">
                        <div className="text-xs text-muted-foreground mb-1">Montant total des ventes de l'article en (FCFA)</div>
                        <div className="font-medium">
                          {(() => {
                            const amount = unitPrices[Number(article.id)];
                            if (amount == null || amount === 0) return '—';
                            return Number(amount).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                          })()}
                        </div>
                      </TableCell>

                      {canManageCampaignArticles && (
                        <TableCell className="text-right align-top" rowSpan={2}>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="flex items-center gap-2 ml-auto"
                            onClick={() => handleDelete(article.id)}
                            disabled={deletingId === article.id || isCampaignCompleted}
                            title={isCampaignCompleted ? 'Campagne terminée' : 'Supprimer'}
                          >
                            {deletingId === article.id ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Suppression...
                              </>
                            ) : (
                              <>
                                <Trash2 className="h-4 w-4" />
                                Supprimer
                              </>
                            )}
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>

                    <TableRow className="bg-muted/20">
                      <TableCell colSpan={canManageCampaignArticles ? 6 : 5} className="pt-2 pb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                          <div className="rounded-lg border bg-background px-3 py-3">
                            <div className="text-xs text-muted-foreground leading-5">
                              Quantité prévue
                            </div>
                            <div className="mt-1 text-base font-semibold">
                              {article.plannedQuantity ?? 0}
                            </div>
                          </div>

                          <div className="rounded-lg border bg-background px-3 py-3">
                            <div className="text-xs text-muted-foreground leading-5">
                              Quantité à la création
                            </div>
                            <div className="mt-1 text-base font-semibold">
                              {article.quantityAtCreation ?? 0}
                            </div>
                          </div>

                          <div className="rounded-lg border bg-background px-3 py-3">
                            <div className="text-xs text-muted-foreground leading-5">
                              Quantité au démarrage
                            </div>
                            <div className="mt-1 text-base font-semibold">
                              {article.quantityAtStart ?? 0}
                            </div>
                          </div>

                          <div className="rounded-lg border bg-background px-3 py-3">
                            <div className="text-xs text-muted-foreground leading-5">
                              Quantité courante
                            </div>
                            <div className="mt-1 text-base font-semibold">
                              {article.currentQuantity ?? 0}
                            </div>
                          </div>

                          <div className="rounded-lg border bg-background px-3 py-3">
                            <div className="text-xs text-muted-foreground leading-5">
                              Quantité vendue
                            </div>
                            <div className="mt-1 text-base font-semibold">
                              {article.soldQuantity ?? 0}
                            </div>
                          </div>

                          <div className="rounded-lg border bg-background px-3 py-3">
                            <div className="text-xs text-muted-foreground leading-5">
                              Quantité à la clôture
                            </div>
                            <div className="mt-1 text-base font-semibold">
                              {article.quantityAtClosure ?? 0}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {canManageCampaignArticles && (
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            if (isCampaignCompleted) return;
            setIsDialogOpen(open);
          }}
        >
          <DialogContent className="w-[95vw] max-w-[95vw] lg:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Ajouter plusieurs articles</DialogTitle>
              <DialogDescription>
                Choisis le mode d'ajout : Coller des codes ou Parcourir le catalogue.
              </DialogDescription>
            </DialogHeader>

            {/* Bascule mode Collage / Parcourir */}
            <div className="flex gap-2 mb-4">
              <Button
                type="button"
                variant={activeMode === 'COLLAGE' ? 'default' : 'outline'}
                onClick={() => setActiveMode('COLLAGE')}
              >
                <LayoutList className="mr-2 h-4 w-4" />
                Collage
              </Button>
              <Button
                type="button"
                variant={activeMode === 'BROWSE' ? 'default' : 'outline'}
                onClick={() => setActiveMode('BROWSE')}
              >
                <Search className="mr-2 h-4 w-4" />
                Parcourir
              </Button>
            </div>

            <div className="space-y-6 flex-1 overflow-y-auto pr-1">
              {/* ─── Mode Collage ─── */}
              {activeMode === 'COLLAGE' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
                    <div className="space-y-2">
                      <Label>Source</Label>
                      <Select
                        value={source}
                        onValueChange={(value: ArticleSource) => setSource(value)}
                        disabled={isCampaignCompleted}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir la source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SAGE_X3">Code Sage X3</SelectItem>
                          <SelectItem value="SAGE_100">Code Sage 100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Codes articles</Label>
                      <Textarea
                        value={codesText}
                        onChange={(e) => setCodesText(e.target.value)}
                        placeholder={
                          source === 'SAGE_X3'
                            ? 'Exemple :\nART-X3-001\nART-X3-002\nART-X3-003'
                            : 'Exemple :\nART-100-001\nART-100-002\nART-100-003'
                        }
                        className="min-h-[180px]"
                        disabled={isCampaignCompleted}
                      />
                      <p className="text-xs text-muted-foreground">
                        Tu peux coller plusieurs codes. Un code par ligne, ou séparés par virgule / point-virgule.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      onClick={handleSearch}
                      disabled={searching || parsedCodes.length === 0 || isCampaignCompleted}
                    >
                      {searching ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Recherche en cours...
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 h-4 w-4" />
                          Rechercher les articles
                        </>
                      )}
                    </Button>

                    <Badge variant="outline">{parsedCodes.length} code(s) détecté(s)</Badge>
                    <Badge variant="outline">{foundResults.length} trouvé(s)</Badge>
                    <Badge variant="outline">{notFoundResults.length} non trouvé(s)</Badge>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="space-y-4">
                      <div className="rounded-xl border overflow-x-auto">
                        <Table className="min-w-[1200px]">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Code saisi</TableHead>
                              <TableHead>Code Sage X3</TableHead>
                              <TableHead>Code Sage 100</TableHead>
                              <TableHead>Désignation</TableHead>
                              <TableHead>Famille</TableHead>
                              <TableHead className="text-right">Taux rotation</TableHead>
                              <TableHead className="text-right">Qté prévue</TableHead>
                              <TableHead className="text-right">Qté à la création</TableHead>
                              <TableHead className="text-right">Qté au démarrage</TableHead>
                              <TableHead className="text-right">Qté courante</TableHead>
                              <TableHead className="text-right">Qté vendue</TableHead>
                              <TableHead className="text-right">Qté à la clôture</TableHead>
                              <TableHead>Statut</TableHead>
                            </TableRow>
                          </TableHeader>

                          <TableBody>
                            {searchResults.map((item, index) => (
                              <TableRow key={`${item.inputCode}-${index}`}>
                                <TableCell className="font-mono whitespace-nowrap">{item.inputCode}</TableCell>
                                <TableCell className="font-mono whitespace-nowrap">{item.codeSageX3 || '—'}</TableCell>
                                <TableCell className="font-mono whitespace-nowrap">{item.codeSage100 || '—'}</TableCell>
                                <TableCell className="font-medium min-w-[280px]">{item.designation || '—'}</TableCell>
                                <TableCell className="whitespace-nowrap">{item.famille || '—'}</TableCell>
                                <TableCell className="text-right whitespace-nowrap">
                                  {item.tauxRotation != null ? item.tauxRotation.toFixed(2) : '—'}
                                </TableCell>
                                <TableCell className="text-right whitespace-nowrap">
                                  <Input
                                    type="number"
                                    min="0"
                                    placeholder="Ex: 100"
                                    className="h-8 w-24 text-right"
                                    value={plannedQuantities[item.inputCode] ?? ''}
                                    onChange={(e) =>
                                      setPlannedQuantities((prev) => ({
                                        ...prev,
                                        [item.inputCode]: e.target.value,
                                      }))
                                    }
                                  />
                                </TableCell>
                                <TableCell className="text-right whitespace-nowrap">{item.currentQuantity ?? 0}</TableCell>
                                <TableCell className="text-right whitespace-nowrap">0</TableCell>
                                <TableCell className="text-right whitespace-nowrap">{item.currentQuantity ?? 0}</TableCell>
                                <TableCell className="text-right whitespace-nowrap">0</TableCell>
                                <TableCell className="text-right whitespace-nowrap">0</TableCell>
                                <TableCell className="whitespace-nowrap">
                                  {item.found ? (
                                    <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
                                      <PackageCheck className="mr-1 h-3 w-3" />
                                      Trouvé
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
                                      <AlertCircle className="mr-1 h-3 w-3" />
                                      {item.message || 'Introuvable'}
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ─── Mode Parcourir ─── */}
              {activeMode === 'BROWSE' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Source</Label>
                      <Select
                        value={source}
                        onValueChange={(value: ArticleSource) => setSource(value)}
                        disabled={isCampaignCompleted}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir la source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SAGE_X3">Code Sage X3</SelectItem>
                          <SelectItem value="SAGE_100">Code Sage 100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Famille</Label>
                      <Popover open={familiesOpen} onOpenChange={setFamiliesOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={familiesOpen}
                            className="w-full justify-between"
                          >
                            {browseFamilie
                              ? families.find((f) => f === browseFamilie)
                              : 'Toutes les familles'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0">
                          <Command>
                            <CommandInput placeholder="Rechercher une famille..." />
                            <CommandList>
                              <CommandEmpty>Aucune famille trouvée.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  value=""
                                  onSelect={() => {
                                    setBrowseFamilie('');
                                    setFamiliesOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      browseFamilie === '' ? 'opacity-100' : 'opacity-0'
                                    )}
                                  />
                                  Toutes les familles
                                </CommandItem>
                                {families.map((famille) => (
                                  <CommandItem
                                    key={famille}
                                    value={famille}
                                    onSelect={() => {
                                      setBrowseFamilie(famille);
                                      setFamiliesOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        'mr-2 h-4 w-4',
                                        browseFamilie === famille ? 'opacity-100' : 'opacity-0'
                                      )}
                                    />
                                    {famille}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_160px] gap-4 items-end">
                    <div className="space-y-2">
                      <Label>Recherche (désignation / code)</Label>
                      <Input
                        value={browseSearchQuery}
                        onChange={(e) => setBrowseSearchQuery(e.target.value)}
                        placeholder="Filtrer par désignation ou code..."
                        disabled={isCampaignCompleted}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Opérateur taux rotation</Label>
                      <Select
                        value={browseTauxOperator}
                        onValueChange={(value: 'GT' | 'LT' | 'EQ') => setBrowseTauxOperator(value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GT">&gt;</SelectItem>
                          <SelectItem value="LT">&lt;</SelectItem>
                          <SelectItem value="EQ">=</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Valeur taux rotation</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={browseTauxValue}
                        onChange={(e) => setBrowseTauxValue(e.target.value)}
                        placeholder="Ex: 0.5"
                        disabled={isCampaignCompleted}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      onClick={handleBrowseSearch}
                      disabled={browseSearching || isCampaignCompleted}
                    >
                      {browseSearching ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Recherche en cours...
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 h-4 w-4" />
                          Parcourir
                        </>
                      )}
                    </Button>

                    <Badge variant="outline">{browseResults.length} article(s)</Badge>
                    {browseResults.length > 0 && (
                      <Badge variant="outline">{browseSelectedCodes.size} sélectionné(s)</Badge>
                    )}
                  </div>

                  {browseResults.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={toggleSelectAllBrowse}
                        >
                          {browseSelectedCodes.size === browseResults.length
                            ? 'Tout désélectionner'
                            : 'Tout sélectionner'}
                        </Button>
                      </div>

                      <div className="rounded-xl border overflow-x-auto">
                        <Table className="min-w-[1000px]">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">
                                <input
                                  type="checkbox"
                                  checked={browseSelectedCodes.size === browseResults.length}
                                  onChange={toggleSelectAllBrowse}
                                  className="h-4 w-4"
                                />
                              </TableHead>
                              <TableHead>Code Sage X3</TableHead>
                              <TableHead>Code Sage 100</TableHead>
                              <TableHead>Désignation</TableHead>
                              <TableHead className="text-right">Qté courante</TableHead>
                              <TableHead className="text-right">Qté prévue</TableHead>
                              <TableHead>Famille</TableHead>
                            </TableRow>
                          </TableHeader>

                          <TableBody>
                            {browseResults.map((item) => (
                              <TableRow key={item.codeSageX3}>
                                <TableCell>
                                  <input
                                    type="checkbox"
                                    checked={browseSelectedCodes.has(item.codeSageX3)}
                                    onChange={() => toggleBrowseItem(item.codeSageX3)}
                                    className="h-4 w-4"
                                  />
                                </TableCell>
                                <TableCell className="font-mono whitespace-nowrap">{item.codeSageX3}</TableCell>
                                <TableCell className="font-mono whitespace-nowrap">{item.codeSage100 || '—'}</TableCell>
                                <TableCell className="font-medium min-w-[280px]">{item.designation || '—'}</TableCell>
                                <TableCell className="text-right whitespace-nowrap">{item.currentQuantity ?? 0}</TableCell>
                                <TableCell className="text-right whitespace-nowrap">
                                  <Input
                                    type="number"
                                    min="0"
                                    placeholder="Ex: 100"
                                    className="h-8 w-24 text-right"
                                    value={plannedQuantities[item.codeSageX3] ?? ''}
                                    onChange={(e) =>
                                      setPlannedQuantities((prev) => ({
                                        ...prev,
                                        [item.codeSageX3]: e.target.value,
                                      }))
                                    }
                                  />
                                </TableCell>
                                <TableCell className="whitespace-nowrap">{item.famille || '—'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <DialogFooter className="gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>

              {activeMode === 'COLLAGE' && (
                <Button
                  type="button"
                  onClick={handleSaveMany}
                  disabled={saving || foundResults.length === 0 || isCampaignCompleted}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Enregistrer {foundResults.length} article(s)
                    </>
                  )}
                </Button>
              )}

              {activeMode === 'BROWSE' && (
                <Button
                  type="button"
                  onClick={handleBrowseSaveSelection}
                  disabled={browseSaving || browseSelectedCodes.size === 0 || isCampaignCompleted}
                >
                  {browseSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Enregistrer {browseSelectedCodes.size} article(s)
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}