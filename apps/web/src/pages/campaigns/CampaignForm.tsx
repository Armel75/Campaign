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

  useEffect(() => {
    const fetchObjectives = async () => {
      const res = await api.get('/objectives');
      setObjectives(res.data.data);
    };
    fetchObjectives();

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
      };
      fetchCampaign();
    }
  }, [id, isEdit, setValue]);

  const onSubmit = async (data: any) => {
    try {
      if (isEdit) {
        await api.put(`/campaigns/${id}`, data);
      } else {
        await api.post('/campaigns', data);
      }
      navigate('/campaigns');
    } catch (error) {
      console.error(error);
    }
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
            <Input id="description" {...register('description')} />
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
                <option key={obj.id} value={obj.id}>{obj.label}</option>
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

          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="outline" onClick={() => navigate('/campaigns')}>Cancel</Button>
            <Button type="submit">Save Campaign</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
