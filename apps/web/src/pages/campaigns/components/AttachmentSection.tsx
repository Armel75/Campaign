import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Trash2, Upload, File as FileIcon, Loader2, Lock } from 'lucide-react';
import api from '@/lib/api';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth';

interface Attachment {
  id: string;
  fileName?: string | null;
  originalName?: string | null;
  filePath?: string | null;
  uploadedAt?: string | null;
  createdAt?: string | null;
  uploadedBy?: {
    id: string | number;
    username?: string | null;
    email?: string | null;
  } | null;
}

interface AttachmentSectionProps {
  campaignId: string;
  attachments: Attachment[];
  onUpdate: () => void;
  isCampaignCompleted?: boolean;
}

export default function AttachmentSection({
  campaignId,
  attachments,
  onUpdate,
  isCampaignCompleted = false,
}: AttachmentSectionProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  const canManageAttachments = !!user?.permissions?.canManageAttachments;
  const canMutateAttachments = canManageAttachments && !isCampaignCompleted;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canManageAttachments) return;

    if (isCampaignCompleted) {
      alert('Impossible d’ajouter une pièce jointe à une campagne terminée.');
      e.target.value = '';
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('attachment', file);

      await api.post(`/campaigns/${campaignId}/attachments`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      onUpdate();
      e.target.value = '';
    } catch (error: any) {
      console.error('Upload failed', error);
      alert(
        error?.response?.data?.message ||
        "Erreur lors de l'ajout de la pièce jointe."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!canManageAttachments) return;

    if (isCampaignCompleted) {
      alert('Impossible de modifier les pièces jointes d’une campagne terminée.');
      return;
    }

    if (!confirm('Delete this attachment?')) return;

    try {
      await api.delete(`/campaigns/${campaignId}/attachments/${id}`);
      onUpdate();
    } catch (error: any) {
      console.error('Delete failed', error);
      alert(
        error?.response?.data?.message ||
        'Erreur lors de la suppression de la pièce jointe.'
      );
    }
  };

  const handleDownload = async (file: Attachment) => {
    if (!file.filePath) return;

    try {
      const response = await api.get(`/campaigns/${campaignId}/attachments/${file.id}/download`, {
        responseType: 'blob',
      });

      const disposition = response.headers['content-disposition'];
      let fileName = file.fileName ?? 'download';
      if (disposition) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match) fileName = match[1];
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed', err);
      alert('Erreur lors du téléchargement de la pièce jointe.');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle className="text-xl">Pièce(s) Jointe(s)</CardTitle>
          {isCampaignCompleted && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              Campagne terminée : ajout et modification désactivés
            </div>
          )}
        </div>

        {canManageAttachments && (
          <div className="flex items-center gap-2">
            <Label
              htmlFor="file-upload"
              className={`cursor-pointer ${isCampaignCompleted ? 'pointer-events-none opacity-60' : ''}`}
            >
              <div className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Ajout Pièce Jointe
              </div>
            </Label>
            <Input
              id="file-upload"
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading || isCampaignCompleted}
            />
          </div>
        )}
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File Name</TableHead>
              <TableHead>Uploaded At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {attachments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  No attachments yet.
                </TableCell>
              </TableRow>
            ) : (
              attachments.map((file) => (
                <TableRow key={file.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <FileIcon className="h-4 w-4 text-muted-foreground" />
                    {file.fileName}
                  </TableCell>

                  <TableCell>
                    {file.uploadedAt ? format(new Date(file.uploadedAt), 'MMM d, yyyy HH:mm') : '-'}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(file)}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Télécharger
                      </Button>

                      {canManageAttachments && (
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={!canMutateAttachments}
                          onClick={() => handleDelete(file.id)}
                          className="flex items-center gap-2"
                          title={isCampaignCompleted ? 'Campagne terminée' : 'Supprimer'}
                        >
                          <Trash2 className="h-4 w-4" />
                          Supprimer
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}