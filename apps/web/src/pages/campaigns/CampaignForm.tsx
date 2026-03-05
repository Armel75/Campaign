import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';

export default function CampaignForm() {
  const { register, handleSubmit, setValue } = useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [objectives, setObjectives] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [targetAudiences, setTargetAudiences] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);

  useEffect(() => {
    const fetchObjectives = async () => {
      const res = await api.get('/objectives');
      setObjectives(res.data.data);
    };

    const fetchChannels = async () => {
      const res = await api.get('/channels');
      setChannels(res.data.data);
    };

    const fetchTargetAudiences = async () => {
      // adapte ce endpoint si chez toi c'est /target_audiences ou autre
      const res = await api.get('/target-audiences');
      setTargetAudiences(res.data.data);
    };

    fetchObjectives();
    fetchChannels();
    fetchTargetAudiences();

    if (isEdit) {
      const fetchCampaign = async () => {
        const res = await api.get(`/campaigns/${id}`);
        const data = res.data;
        setValue('name', data.name);
        setValue('description', data.description);
        setValue('objectiveId', data.objectiveId);
        setValue('startDate', data.startDate.split('T')[0]);
        setValue('endDate', data.endDate.split('T')[0]);
        setValue('status', data.status);
        setValue('channelId', data.channelId);
        setValue('targetAudienceId', data.targetAudienceId);
      };
      fetchCampaign();
    }
  }, [id, isEdit, setValue]);

  const onSubmit = async (data: any) => {
    try {
      // ✅ on envoie en multipart pour inclure les pièces jointes
      const formData = new FormData();

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });

      attachments.forEach((file) => {
        // champ backend: "attachments" (à adapter si ton API attend un autre nom)
        formData.append('attachments', file);
      });

      if (isEdit) {
        await api.put(`/campaigns/${id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/campaigns', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      navigate('/campaigns');
    } catch (error) {
      console.error(error);
    }
  };

  const onFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // ✅ ajoute aux fichiers déjà sélectionnés (évite doublons par nom+taille+date)
    setAttachments((prev) => {
      const merged = [...prev];
      for (const f of files) {
        const exists = merged.some(
          (x) => x.name === f.name && x.size === f.size && x.lastModified === f.lastModified
        );
        if (!exists) merged.push(f);
      }
      return merged;
    });

    // ✅ permet de re-sélectionner le même fichier si besoin
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit Campaign' : 'Create Campaign'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register('name', { required: true })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              rows={3}
              {...register('description')}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="objectiveId">Objective</Label>
            <select
              id="objectiveId"
              {...register('objectiveId', { required: true })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Select Objective</option>
              {objectives.map((obj) => (
                <option key={obj.id} value={obj.id}>
                  {obj.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" type="date" {...register('startDate', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input id="endDate" type="date" {...register('endDate', { required: true })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              {...register('status', { required: true })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="channelId">Channel</Label>
            <select
              id="channelId"
              {...register('channelId', { required: true })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Select Channel</option>
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetAudienceId">Target Audience</Label>
            <select
              id="targetAudienceId"
              {...register('targetAudienceId', { required: true })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Select Target Audience</option>
              {targetAudiences.map((ta) => (
                <option key={ta.id} value={ta.id}>
                  {ta.name}
                </option>
              ))}
            </select>
          </div>

          {/* ✅ nouveau : Pièces jointes (après Target Audience) */}
          <div className="space-y-2">
            <Label htmlFor="attachments">Attachments</Label>
            <Input id="attachments" type="file" multiple onChange={onFilesSelected} />

            {attachments.length > 0 && (
              <div className="mt-2 space-y-2">
                {attachments.map((file, index) => (
                  <div
                    key={`${file.name}-${file.size}-${file.lastModified}`}
                    className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <span className="truncate">{file.name}</span>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 px-2"
                      onClick={() => removeAttachment(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="outline" onClick={() => navigate('/campaigns')}>
              Cancel
            </Button>
            <Button type="submit">Save Campaign</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}