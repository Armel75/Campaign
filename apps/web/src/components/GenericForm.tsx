import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import { useNavigate, useParams } from 'react-router-dom';

interface FieldOption {
  label: string;
  value: string;
}

interface Field {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: FieldOption[];
  endpoint?: string;
  optionValue?: string;
  optionLabel?: string;
}

interface GenericFormProps {
  title: string;
  endpoint: string;
  fields: Field[];
  redirectPath: string;
}

const TASK_STATUS_LABEL_TO_CODE: Record<string, string> = {
  'À faire': 'A_FAIRE',
  'A faire': 'A_FAIRE',
  A_FAIRE: 'A_FAIRE',
  'En cours': 'EN_COURS',
  EN_COURS: 'EN_COURS',
  Terminé: 'TERMINE',
  Termine: 'TERMINE',
  TERMINE: 'TERMINE',
  Annulé: 'ANNULE',
  Annule: 'ANNULE',
  ANNULE: 'ANNULE',
};

const TASK_PRIORITY_LABEL_TO_CODE: Record<string, string> = {
  Faible: 'FAIBLE',
  FAIBLE: 'FAIBLE',
  Moyenne: 'MOYENNE',
  MOYENNE: 'MOYENNE',
  Élevée: 'ELEVEE',
  Elevee: 'ELEVEE',
  ELEVEE: 'ELEVEE',
  Urgente: 'URGENTE',
  URGENTE: 'URGENTE',
};

function normalizeSelectLikeValue(fieldName: string, rawValue: any, record: any) {
  if (fieldName === 'campaignId') {
    if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
      return String(rawValue);
    }
    if (record?.campaignId !== undefined && record?.campaignId !== null) {
      return String(record.campaignId);
    }
    if (record?.campaign?.id !== undefined && record?.campaign?.id !== null) {
      return String(record.campaign.id);
    }
    return '';
  }

  if (fieldName === 'assignedTo') {
    if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
      return String(rawValue);
    }
    if (record?.assignedToId !== undefined && record?.assignedToId !== null) {
      return String(record.assignedToId);
    }
    if (record?.assignedTo?.id !== undefined && record?.assignedTo?.id !== null) {
      return String(record.assignedTo.id);
    }
    return '';
  }

  if (fieldName === 'assignedToId') {
    if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
      return String(rawValue);
    }
    if (record?.assignedToId !== undefined && record?.assignedToId !== null) {
      return String(record.assignedToId);
    }
    if (record?.assignedTo?.id !== undefined && record?.assignedTo?.id !== null) {
      return String(record.assignedTo.id);
    }
    return '';
  }

  if (fieldName === 'status') {
    const value =
      rawValue !== undefined && rawValue !== null && rawValue !== ''
        ? String(rawValue).trim()
        : '';
    return TASK_STATUS_LABEL_TO_CODE[value] || value;
  }

  if (fieldName === 'priority') {
    const value =
      rawValue !== undefined && rawValue !== null && rawValue !== ''
        ? String(rawValue).trim()
        : '';
    return TASK_PRIORITY_LABEL_TO_CODE[value] || value;
  }

  if (rawValue !== undefined && rawValue !== null) {
    return String(rawValue);
  }

  return '';
}

export default function GenericForm({
  title,
  endpoint,
  fields,
  redirectPath,
}: GenericFormProps) {
  const [loading, setLoading] = useState(false);
  const [hydrating, setHydrating] = useState(true);
  const [selectOptions, setSelectOptions] = useState<Record<string, FieldOption[]>>({});
  const [formData, setFormData] = useState<Record<string, string>>({});

  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const fieldsSignature = useMemo(
    () =>
      JSON.stringify(
        fields.map((field) => ({
          name: field.name,
          label: field.label,
          type: field.type,
          required: field.required,
          endpoint: field.endpoint,
          optionValue: field.optionValue,
          optionLabel: field.optionLabel,
          options: field.options ?? [],
        }))
      ),
    [fields]
  );

  const stableFields = useMemo(() => fields, [fieldsSignature]);

  const selectFields = useMemo(
    () => stableFields.filter((field) => field.type === 'select'),
    [stableFields]
  );

  useEffect(() => {
    let cancelled = false;

    const hydrateForm = async () => {
      try {
        setHydrating(true);

        const optionEntries = await Promise.all(
          selectFields.map(async (field) => {
            if (field.options?.length) {
              return [field.name, field.options] as const;
            }

            if (field.endpoint) {
              const res = await api.get(field.endpoint);
              const rawData = res.data?.data || res.data || [];
              const list = Array.isArray(rawData) ? rawData : [];

              const mappedOptions: FieldOption[] = list
                .map((item: any) => ({
                  value: String(item[field.optionValue || 'id'] ?? ''),
                  label: String(
                    item[field.optionLabel || 'name'] ??
                      item.name ??
                      item.label ??
                      item.title ??
                      item.username ??
                      item.email ??
                      item.id
                  ),
                }))
                .filter((option) => option.value !== '');

              return [field.name, mappedOptions] as const;
            }

            return [field.name, []] as const;
          })
        );

        const optionsMap = Object.fromEntries(optionEntries);

        let record: any = null;
        if (isEdit) {
          const editEndpoint = endpoint.includes('/:') ? endpoint : `${endpoint}/${id}`;
          const res = await api.get(editEndpoint);
          record = res.data?.data || res.data;
        }

        const nextFormData = stableFields.reduce<Record<string, string>>((acc, field) => {
          if (!isEdit) {
            acc[field.name] = '';
            return acc;
          }

          const rawValue = record?.[field.name];

          if (field.type === 'date') {
            acc[field.name] = rawValue
              ? new Date(rawValue).toISOString().split('T')[0]
              : '';
            return acc;
          }

          if (field.type === 'select') {
            const normalized = normalizeSelectLikeValue(field.name, rawValue, record);
            acc[field.name] = normalized ? String(normalized) : '';
            return acc;
          }

          acc[field.name] =
            rawValue !== undefined && rawValue !== null ? String(rawValue) : '';
          return acc;
        }, {});

        if (!cancelled) {
          setSelectOptions(optionsMap);
          setFormData(nextFormData);
          setHydrating(false);
        }
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          setSelectOptions({});
          setFormData(
            stableFields.reduce<Record<string, string>>((acc, field) => {
              acc[field.name] = '';
              return acc;
            }, {})
          );
          setHydrating(false);
        }
      }
    };

    hydrateForm();

    return () => {
      cancelled = true;
    };
  }, [id, isEdit, endpoint, stableFields, selectFields, fieldsSignature]);

  const buildEndpoint = (baseEndpoint: string, data: Record<string, any>) => {
    let resolvedEndpoint = baseEndpoint;
    const matches = baseEndpoint.match(/:([a-zA-Z0-9_]+)/g) || [];

    for (const match of matches) {
      const key = match.replace(':', '');
      const value = data[key];

      if (value === undefined || value === null || String(value).trim() === '') {
        throw new Error(`Le champ ${key} est requis pour construire l'endpoint.`);
      }

      resolvedEndpoint = resolvedEndpoint.replace(match, String(value));
    }

    return resolvedEndpoint;
  };

  const removeEndpointParamsFromPayload = (
    baseEndpoint: string,
    data: Record<string, any>
  ) => {
    const cleanedData = { ...data };
    const matches = baseEndpoint.match(/:([a-zA-Z0-9_]+)/g) || [];

    matches.forEach((match) => {
      const key = match.replace(':', '');
      delete cleanedData[key];
    });

    return cleanedData;
  };

  const handleChange = (fieldName: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const resolvedEndpoint = buildEndpoint(endpoint, formData);
      const payload = removeEndpointParamsFromPayload(endpoint, formData);

      if (isEdit) {
        await api.put(`${resolvedEndpoint}/${id}`, payload);
      } else {
        await api.post(resolvedEndpoint, payload);
      }

      navigate(redirectPath);
    } catch (error: any) {
      console.error(error);
      alert(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Erreur lors de l'enregistrement."
      );
    } finally {
      setLoading(false);
    }
  };

  if (hydrating) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>{isEdit ? `Modifier ${title}` : `Créer ${title}`}</CardTitle>
        </CardHeader>
        <CardContent>Chargement...</CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isEdit ? `Modifier ${title}` : `Créer ${title}`}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {stableFields.map((field) => {
            const currentValue = formData[field.name] ?? '';
            const fieldOptions = selectOptions[field.name] || [];

            return (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>{field.label}</Label>

                {field.type === 'select' ? (
                  <select
                    id={field.name}
                    value={currentValue}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    required={field.required}
                  >
                    <option value="">Sélectionner {field.label}</option>
                    {fieldOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <Textarea
                    id={field.name}
                    value={currentValue}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                  />
                ) : (
                  <Input
                    id={field.name}
                    type={field.type || 'text'}
                    value={currentValue}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                  />
                )}
              </div>
            );
          })}

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate(redirectPath)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}