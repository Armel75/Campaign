import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Trash2, Upload, File as FileIcon, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { format } from 'date-fns';

interface Attachment {
  id: string;
  fileName: string;
  filePath: string;
  uploadedAt: string;
}

interface AttachmentSectionProps {
  campaignId: string;
  attachments: Attachment[];
  onUpdate: () => void;
}

export default function AttachmentSection({ campaignId, attachments, onUpdate }: AttachmentSectionProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    // In a real app, we would upload to S3/Cloudinary and get a URL.
    // Here we will simulate it or just store the name if the backend expects a file path.
    
    try {
      await api.post(`/campaigns/${campaignId}/attachments`, {
        fileName: file.name,
        filePath: `/uploads/${file.name}`, // Mock path
        entityType: 'CAMPAIGN',
      });
      onUpdate();
    } catch (error) {
      console.error('Upload failed', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this attachment?')) return;
    try {
      await api.delete(`/campaigns/${campaignId}/attachments/${id}`);
      onUpdate();
    } catch (error) {
      console.error('Delete failed', error);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl">Attachments</CardTitle>
        <div className="flex items-center gap-2">
          <Label htmlFor="file-upload" className="cursor-pointer">
            <div className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md text-sm font-medium transition-colors">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Add Attachment
            </div>
          </Label>
          <Input
            id="file-upload"
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
          />
        </div>
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
                  <TableCell>{format(new Date(file.uploadedAt), 'MMM d, yyyy HH:mm')}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => alert(`Downloading ${file.fileName}...`)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(file.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
