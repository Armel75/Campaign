import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2, Search, PackageCheck, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Fragment } from 'react';

type ArticleSource = 'SAGE_X3' | 'SAGE_100';

interface CampaignArticle {
  id: string;
  codeSageX3?: string;
  codeSage100?: string;
  designation?: string;
  currentQuantity?: number;
  quantityAtCreation?: number;
  quantityAtStart?: number | null;
  quantityAtClosure?: number | null;
  plannedQuantity?: number | null;
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
}

interface CampaignArticlesSectionProps {
  campaignId: string;
  articles: CampaignArticle[];
  onUpdate: () => void;
}

export default function CampaignArticlesSection({
  campaignId,
  articles,
  onUpdate,
}: CampaignArticlesSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [source, setSource] = useState<ArticleSource>('SAGE_X3');
  const [codesText, setCodesText] = useState('');
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResultArticle[]>([]);

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
    setSource('SAGE_X3');
    setCodesText('');
    setSearchResults([]);
    setIsDialogOpen(true);
  };

  const handleSearch = async () => {
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
          plannedQuantity: null,
        })),
      };

      console.log('SAVE ARTICLES PAYLOAD =>', payload);

      const res = await api.post(`/campaigns/${campaignId}/articles/bulk`, payload);

      console.log('SAVE ARTICLES RESPONSE =>', res.data);

      const createdCount = res.data?.createdCount ?? 0;
      const message =
        res.data?.message || 'Opération terminée';

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

  const handleDelete = async (id: string) => {
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
        </div>

        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter des articles
        </Button>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code Sage X3</TableHead>
              <TableHead>Code Sage 100</TableHead>
              <TableHead>Désignation</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {articles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
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

                    <TableCell className="text-right align-top" rowSpan={2}>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex items-center gap-2 ml-auto"
                        onClick={() => handleDelete(article.id)}
                        disabled={deletingId === article.id}
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
                  </TableRow>

                  <TableRow className="bg-muted/20">
                    <TableCell colSpan={3} className="pt-2 pb-4">
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
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Ajouter plusieurs articles</DialogTitle>
            <DialogDescription>
              Colle ou saisis plusieurs codes, un par ligne, puis clique sur Rechercher.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
              <div className="space-y-2">
                <Label>Source</Label>
                <Select value={source} onValueChange={(value: ArticleSource) => setSource(value)}>
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
                disabled={searching || parsedCodes.length === 0}
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
                <div className="rounded-xl border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code saisi</TableHead>
                        <TableHead>Code Sage X3</TableHead>
                        <TableHead>Code Sage 100</TableHead>
                        <TableHead>Désignation</TableHead>
                        <TableHead className="text-right">Qté prévue</TableHead>
                        <TableHead className="text-right">Qté à la création</TableHead>
                        <TableHead className="text-right">Qté au démarrage</TableHead>
                        <TableHead className="text-right">Qté courante</TableHead>
                        <TableHead className="text-right">Qté à la clôture</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {searchResults.map((item, index) => (
                        <TableRow key={`${item.inputCode}-${index}`}>
                          <TableCell className="font-mono">{item.inputCode}</TableCell>
                          <TableCell className="font-mono">{item.codeSageX3 || '—'}</TableCell>
                          <TableCell className="font-mono">{item.codeSage100 || '—'}</TableCell>
                          <TableCell className="font-medium">{item.designation || '—'}</TableCell>
                          <TableCell className="text-right">0</TableCell>
                          <TableCell className="text-right">{item.currentQuantity ?? 0}</TableCell>
                          <TableCell className="text-right">0</TableCell>
                          <TableCell className="text-right">{item.currentQuantity ?? 0}</TableCell>
                          <TableCell className="text-right">0</TableCell>
                          <TableCell>
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
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>

            <Button
              type="button"
              onClick={handleSaveMany}
              disabled={saving || foundResults.length === 0}
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}