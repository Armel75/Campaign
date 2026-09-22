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
import { Check, ChevronsUpDown, X, Lock } from 'lucide-react';

type Option = { id: number; name: string };

type CampaignFormValues = {
  name: string;
  description: string;
  strategy: string;
  objectiveId: string;
  startDate: string;
  endDate: string;
  status: string;
  totalBudget: string;
  channelIds: number[];
  targetAudienceIds: number[];
};

function MultiSelect({
  labelId,
  placeholder,
  options,
  selectedIds,
  onChange,
  disabled = false,
}: {
  labelId: string;
  placeholder: string;
  options: Option[];
  selectedIds: number[];
  onChange: (next: number[]) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedOptions = useMemo(
    () => options.filter((o) => selectedSet.has(Number(o.id))),
    [options, selectedSet]
  );

  const toggle = (id: number) => {
    if (disabled) return;
    const has = selectedSet.has(id);
    const next = has ? selectedIds.filter((x) => x !== id) : [...selectedIds, id];
    onChange(next);
  };

  const remove = (id: number) => {
    if (disabled) return;
    onChange(selectedIds.filter((x) => x !== id));
  };

  return (
    <Popover open={disabled ? false : open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-controls={labelId}
          disabled={disabled}
          className="flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
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
                  {!disabled && (
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
                  )}
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
      strategy: '',
      objectiveId: '',
      startDate: '',
      endDate: '',
      status: 'BROUILLON',
      totalBudget: '',
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
  const [isCompletedCampaign, setIsCompletedCampaign] = useState(false);

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
      setValue('strategy', data.strategy ?? '');
      setValue('objectiveId', String(data.objectiveId ?? ''));
      setValue('startDate', data.startDate ? data.startDate.split('T')[0] : '');
      setValue('endDate', data.endDate ? data.endDate.split('T')[0] : '');
      setValue('status', data.status ?? 'BROUILLON');
      setValue('totalBudget', data.totalBudget ?? '');

      setIsCompletedCampaign(data.status === 'TERMINEE');

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
        setIsCompletedCampaign(false);
      }
    })();
  }, [id, isEdit, setValue]);

  const onFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isCompletedCampaign) {
      e.target.value = '';
      return;
    }

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
    if (isCompletedCampaign) return;
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: CampaignFormValues) => {
    try {
      if (isEdit && isCompletedCampaign) {
        alert('Impossible de modifier une campagne terminée.');
        return;
      }

      const formData = new FormData();

      formData.append('name', data.name);
      formData.append('description', data.description || '');
      formData.append('strategy', data.strategy || '');
      formData.append('objectiveId', String(data.objectiveId));
      formData.append('startDate', data.startDate);
      formData.append('endDate', data.endDate);
      formData.append('status', data.status);
      formData.append('totalBudget', data.totalBudget || '0');

      formData.append('channelIds', JSON.stringify(selectedChannelIds));
      formData.append('targetAudienceIds', JSON.stringify(selectedTargetAudienceIds));

      attachments.forEach((file) => {
        formData.append('attachments', file, file.name);
      });

      console.log('attachments state before submit =', attachments);
      console.log('attachments count before submit =', attachments.length);

      for (const [key, value] of formData.entries()) {
        console.log('formData entry =', key, value);
      }

      const response = isEdit
        ? await api.put(`/campaigns/${id}`, formData)
        : await api.post('/campaigns', formData);

      console.log('submit response status =', response.status);
      console.log('submit response body =', response.data);

      navigate('/campaigns');
    } catch (error: any) {
      console.error(error);
      console.log('submit response status =', error?.response?.status);
      console.log('submit response body =', error?.response?.data);
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
        <CardTitle>{isEdit ? 'Modification Campagne' : 'Création Campagne'}</CardTitle>
      </CardHeader>

      <CardContent>
        {isEdit && isCompletedCampaign && (
          <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <div className="flex items-start gap-2">
              <Lock className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Cette campagne est terminée. La modification est désactivée.</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" autoComplete="off">
          <div className="space-y-2">
            <Label htmlFor="name">Nom <span className="text-red-500">*</span></Label>
            <Input id="name" {...register('name', { required: true })} autoComplete="off" disabled={isCompletedCampaign} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              rows={3}
              {...register('description')}
              autoComplete="off"
              disabled={isCompletedCampaign}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="strategy">Stratégie</Label>
            <textarea
              id="strategy"
              rows={4}
              {...register('strategy')}
              autoComplete="off"
              disabled={isCompletedCampaign}
              placeholder="Décrivez votre stratégie marketing pour cette campagne…"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="objectiveId">Objectif <span className="text-red-500">*</span></Label>
            <select
              id="objectiveId"
              {...register('objectiveId', { required: true })}
              autoComplete="off"
              disabled={isCompletedCampaign}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
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
              <Label htmlFor="startDate">Date Début campagne <span className="text-red-500">*</span></Label>
              <Input id="startDate" type="date" {...register('startDate', { required: true })} autoComplete="off" disabled={isCompletedCampaign} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Date Fin campagne <span className="text-red-500">*</span></Label>
              <Input id="endDate" type="date" {...register('endDate', { required: true })} autoComplete="off" disabled={isCompletedCampaign} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="totalBudget">Budget total (FCFA) | Tout budget erroné est passible de sanction.<span className="text-red-500">*</span></Label>
            <Input
              id="totalBudget"
              type="number"
              min="0"
              step="1"
              placeholder="0"
              {...register('totalBudget', { required: true })}
              autoComplete="off"
              disabled={isCompletedCampaign}
            />
            <p className="text-xs text-muted-foreground/70 italic">
              Tout budget erroné est passible de sanction.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status <span className="text-red-500">*</span></Label>
            <select
              id="status"
              {...register('status', { required: true })}
              autoComplete="off"
              disabled={isCompletedCampaign}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="BROUILLON">BROUILLON (campagne en préparation)</option>
              <option value="PLANIFIEE">PLANIFIEE (prête mais pas encore lancée)</option>
              <option value="ACTIVE">ACTIVE (campagne en cours)</option>
              <option value="EN_PAUSE">EN PAUSE (arrêt temporaire)</option>
              <option value="TERMINEE">TERMINEE (campagne terminée)</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="channelIds">Canal de communication</Label>
            <MultiSelect
              labelId="channelIds"
              placeholder="Choisir un ou plusieurs Canal..."
              options={channelOptions}
              selectedIds={selectedChannelIds}
              disabled={isCompletedCampaign}
              onChange={(next) => {
                setSelectedChannelIds(next);
                setValue('channelIds', next);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetAudienceIds">Audience Cible</Label>
            <MultiSelect
              labelId="targetAudienceIds"
              placeholder="Choisir une ou plusieurs audiences..."
              options={targetAudienceOptions}
              selectedIds={selectedTargetAudienceIds}
              disabled={isCompletedCampaign}
              onChange={(next) => {
                setSelectedTargetAudienceIds(next);
                setValue('targetAudienceIds', next);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="attachments">Pièce(s) jointe(s)</Label>
            <Input id="attachments" type="file" multiple onChange={onFilesSelected} disabled={isCompletedCampaign} />

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
                      disabled={isCompletedCampaign}
                    >
                      Supprimer
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="outline" onClick={() => navigate('/campaigns')}>
              Annuler
            </Button>
            <Button type="submit" disabled={isEdit && isCompletedCampaign}>
              Enregistrer Campagne
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}