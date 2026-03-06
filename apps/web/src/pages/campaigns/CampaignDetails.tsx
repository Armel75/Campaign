import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calendar, User, Target, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { format } from 'date-fns';
import AttachmentSection from './components/AttachmentSection';
import TaskSection from './components/TaskSection';
import CampaignArticlesSection from './components/CampaignArticlesSection';
import ExportButtons from './components/ExportButtons';

interface CampaignDetails {
  id: string;
  name: string;
  description?: string;
  status: string;
  startDate: string;
  endDate: string;
  objective?: { label: string };
  createdBy?: { username: string; email: string };
  createdAt: string;
  updatedAt: string;
  attachments: any[];
  tasks: any[];
  articles: any[];
}

export default function CampaignDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<CampaignDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCampaign = async () => {
    try {
      const res = await api.get(`/campaigns/${id}`);
      setCampaign(res.data);
    } catch (error) {
      console.error('Failed to fetch campaign details', error);
      // navigate('/campaigns'); // Optional: redirect on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchCampaign();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!campaign) {
    return <div>Campaign not found</div>;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
      case 'DRAFT':
        return <Badge variant="secondary">Draft</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Completed</Badge>;
      case 'PAUSED':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Paused</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header Navigation */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/campaigns')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Campaigns
        </Button>
      </div>

      {/* Main Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">{campaign.name}</h1>
            {getStatusBadge(campaign.status)}
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {format(new Date(campaign.startDate), 'MMM d, yyyy')} - {format(new Date(campaign.endDate), 'MMM d, yyyy')}
            </div>
            <div className="flex items-center gap-1">
              <Target className="h-4 w-4" />
              {campaign.objective?.label || 'No Objective'}
            </div>
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              Created by {campaign.createdBy?.username || 'Unknown'}
            </div>
          </div>
        </div>
        <ExportButtons campaignId={campaign.id} />
      </div>

      {/* Description & Meta */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {campaign.description || 'No description provided.'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Meta Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Created At</span>
              <span>{format(new Date(campaign.createdAt), 'PP p')}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Last Updated</span>
              <span>{format(new Date(campaign.updatedAt), 'PP p')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Creator Email</span>
              <span>{campaign.createdBy?.email || '-'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Articles */}
      <CampaignArticlesSection 
        campaignId={campaign.id} 
        articles={campaign.articles} 
        onUpdate={fetchCampaign} 
      />

      {/* Tasks */}
      <TaskSection 
        campaignId={campaign.id} 
        tasks={campaign.tasks} 
        onUpdate={fetchCampaign} 
      />

      {/* Attachments */}
      <AttachmentSection 
        campaignId={campaign.id} 
        attachments={campaign.attachments} 
        onUpdate={fetchCampaign} 
      />
    </div>
  );
}
