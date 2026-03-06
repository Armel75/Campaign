import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { Badge } from '@/components/ui/badge';

interface CampaignArticle {
  id: string;
  articleCode: string;
  designation: string;
  quantity: number;
  source: string;
}

interface CampaignArticlesSectionProps {
  campaignId: string;
  articles: CampaignArticle[];
  onUpdate: () => void;
}

export default function CampaignArticlesSection({ campaignId, articles, onUpdate }: CampaignArticlesSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [articleCode, setArticleCode] = useState('');
  const [designation, setDesignation] = useState('');
  const [quantity, setQuantity] = useState('');
  const [source, setSource] = useState('SAGE_X3');

  const openCreateDialog = () => {
    setArticleCode('');
    setDesignation('');
    setQuantity('');
    setSource('SAGE_X3');
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/campaigns/${campaignId}/articles`, {
        articleCode,
        designation,
        quantity: Number(quantity),
        source,
      });
      setIsDialogOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to add article', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this article?')) return;
    try {
      await api.delete(`/campaigns/${campaignId}/articles/${id}`);
      onUpdate();
    } catch (error) {
      console.error('Delete failed', error);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl">Campaign Articles</CardTitle>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" /> Add Article
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {articles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No articles added yet.
                </TableCell>
              </TableRow>
            ) : (
              articles.map((article) => (
                <TableRow key={article.id}>
                  <TableCell className="font-medium font-mono">{article.articleCode}</TableCell>
                  <TableCell>{article.designation}</TableCell>
                  <TableCell>{article.quantity}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{article.source}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(article.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Article</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="articleCode">Article Code</Label>
                <Input id="articleCode" value={articleCode} onChange={(e) => setArticleCode(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAGE_X3">Sage X3</SelectItem>
                    <SelectItem value="SAGE_100">Sage 100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="designation">Designation</Label>
              <Input id="designation" value={designation} onChange={(e) => setDesignation(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} required min="1" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
