import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import { useNavigate, useParams } from 'react-router-dom';

interface Field {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}

interface GenericFormProps {
  title: string;
  endpoint: string;
  fields: Field[];
  redirectPath: string;
}

export default function GenericForm({ title, endpoint, fields, redirectPath }: GenericFormProps) {
  const { register, handleSubmit, reset, setValue } = useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  useEffect(() => {
    if (isEdit) {
      const fetchData = async () => {
        try {
          const { data } = await api.get(`${endpoint}/${id}`);
          fields.forEach((field) => {
            setValue(field.name, data[field.name]);
          });
        } catch (error) {
          console.error(error);
        }
      };
      fetchData();
    }
  }, [id, endpoint, fields, setValue]);

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`${endpoint}/${id}`, data);
      } else {
        await api.post(endpoint, data);
      }
      navigate(redirectPath);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isEdit ? `Edit ${title}` : `Create ${title}`}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>{field.label}</Label>
              <Input
                id={field.name}
                type={field.type || 'text'}
                {...register(field.name, { required: field.required })}
              />
            </div>
          ))}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate(redirectPath)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
