import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronsUpDown, X } from 'lucide-react';

type Option = { id: number; name: string };

type CampaignFormValues = {
  name: string;
  description: string;
  objectiveId: string;
  startDate: string;
  endDate: string;
  status: string;
  channelIds: number[];
  targetAudienceIds: number[];
};

function MultiSelect({
  labelId,
  placeholder,
  options,
  selectedIds,
  onChange,
}: {
  labelId: string;
  placeholder: string;
  options: Option[];
  selectedIds: number[];
  onChange: (next: number[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedOptions = useMemo(
    () => options.filter((o) => selectedSet.has(Number(o.id))),
    [options, selectedSet]
  );

  const toggle = (id: number) => {
    const has = selectedSet.has(id);
    const next = has ? selectedIds.filter((x) => x !== id) : [...selectedIds, id];
    onChange(next);
  };

  const remove = (id: number) => {
    onChange(selectedIds.filter((x) => x !== id));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-controls={labelId}
          className="flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div className="flex flex-1 flex-wrap gap-2">
            {selectedOptions.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              selectedOptions.map((opt) => (
                <Badge
                  key={opt.id}
                  variant="secondary"
                  className="flex items-center gap-2 px-2 py-1"
                >
                  <span className="max-w-[260px] truncate">{opt.name}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      remove(opt.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        remove(opt.id);
                      }
                    }}
                    className="rounded-sm p-0.5 hover:bg-muted cursor-pointer"
                    aria-label={`Remove ${opt.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </span>
                </Badge>
              ))
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>Aucun résultat.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => {
                const isSelected = selectedSet.has(Number(opt.id));
                return (
                  <CommandItem
                    key={opt.id}
                    value={opt.name}
                    onSelect={() => toggle(Number(opt.id))}
                    className="flex items-center justify-between"
                  >
                    <span className="truncate">{opt.name}</span>
                    {isSelected ? <Check className="h-4 w-4 opacity-80" /> : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function CampaignForm() {
  const { register, handleSubmit, setValue } = useForm<CampaignFormValues>({
    defaultValues: {
      name: '',
      description: '',
      objectiveId: '',
      startDate: '',
      endDate: '',
      status: 'BROUILLON',
      channelIds: [],
      targetAudienceIds: [],
    },
  });

  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [objectives, setObjectives] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [targetAudiences, setTargetAudiences] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);

  const [selectedChannelIds, setSelectedChannelIds] = useState<number[]>([]);
  const [selectedTargetAudienceIds, setSelectedTargetAudienceIds] = useState<number[]>([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      const [objectivesRes, channelsRes, targetAudiencesRes] = await Promise.all([
        api.get('/objectives'),
        api.get('/channels'),
        api.get('/target-audiences'),
      ]);

      setObjectives(objectivesRes.data.data);
      setChannels(channelsRes.data.data);
      setTargetAudiences(targetAudiencesRes.data.data);
    };

    const fetchCampaign = async () => {
      const res = await api.get(`/campaigns/${id}`);
      const data = res.data.data;

      setValue('name', data.name ?? '');
      setValue('description', data.description ?? '');
      setValue('objectiveId', String(data.objectiveId ?? ''));
      setValue('startDate', data.startDate ? data.startDate.split('T')[0] : '');
      setValue('endDate', data.endDate ? data.endDate.split('T')[0] : '');
      setValue('status', data.status ?? 'BROUILLON');

      const chIds: number[] = Array.isArray(data.channels)
        ? data.channels.map((c: any) => Number(c.channelId))
        : [];

      const taIds: number[] = Array.isArray(data.targetAudiences)
        ? data.targetAudiences.map((t: any) => Number(t.targetAudienceId))
        : [];

      setSelectedChannelIds(chIds);
      setSelectedTargetAudienceIds(taIds);

      setValue('channelIds', chIds);
      setValue('targetAudienceIds', taIds);
    };

    (async () => {
      await fetchInitialData();

      if (isEdit) {
        await fetchCampaign();
      } else {
        setValue('channelIds', []);
        setValue('targetAudienceIds', []);
      }
    })();
  }, [id, isEdit, setValue]);

  const onFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

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

    console.log('files selected =', files);
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: CampaignFormValues) => {
    try {
      const formData = new FormData();

      formData.append('name', data.name);
      formData.append('description', data.description || '');
      formData.append('objectiveId', String(data.objectiveId));
      formData.append('startDate', data.startDate);
      formData.append('endDate', data.endDate);
      formData.append('status', data.status);

      selectedChannelIds.forEach((channelId) => {
        formData.append('channelIds', String(channelId));
      });

      selectedTargetAudienceIds.forEach((targetAudienceId) => {
        formData.append('targetAudienceIds', String(targetAudienceId));
      });

      attachments.forEach((file) => {
        formData.append('attachments', file, file.name);
      });

      console.log('attachments state before submit =', attachments);
      console.log('attachments count before submit =', attachments.length);

      for (const [key, value] of formData.entries()) {
        console.log('formData entry =', key, value);
      }

      const token = localStorage.getItem('accessToken');
      const baseUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3004/api/v1';
      const url = isEdit ? `${baseUrl}/campaigns/${id}` : `${baseUrl}/campaigns`;

      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        body: formData,
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      const responseText = await response.text();
      console.log('submit response status =', response.status);
      console.log('submit response body =', responseText);

      if (!response.ok) {
        throw new Error(responseText || "Erreur lors de l'enregistrement de la campagne");
      }

      navigate('/campaigns');
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'enregistrement de la campagne");
    }
  };

  const channelOptions: Option[] = useMemo(
    () => channels.map((c) => ({ id: Number(c.id), name: c.name })),
    [channels]
  );

  const targetAudienceOptions: Option[] = useMemo(
    () => targetAudiences.map((t) => ({ id: Number(t.id), name: t.name })),
    [targetAudiences]
  );

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
              <option value="BROUILLON">BROUILLON (campagne en préparation)</option>
              <option value="PLANIFIEE">PLANIFIEE (prête mais pas encore lancée)</option>
              <option value="ACTIVE">ACTIVE (campagne en cours)</option>
              <option value="EN_PAUSE">EN PAUSE (arrêt temporaire)</option>
              <option value="TERMINEE">TERMINEE (campagne terminée)</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="channelIds">Channel</Label>
            <MultiSelect
              labelId="channelIds"
              placeholder="Choisir un ou plusieurs channels..."
              options={channelOptions}
              selectedIds={selectedChannelIds}
              onChange={(next) => {
                setSelectedChannelIds(next);
                setValue('channelIds', next);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetAudienceIds">Target Audience</Label>
            <MultiSelect
              labelId="targetAudienceIds"
              placeholder="Choisir une ou plusieurs audiences..."
              options={targetAudienceOptions}
              selectedIds={selectedTargetAudienceIds}
              onChange={(next) => {
                setSelectedTargetAudienceIds(next);
                setValue('targetAudienceIds', next);
              }}
            />
          </div>

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