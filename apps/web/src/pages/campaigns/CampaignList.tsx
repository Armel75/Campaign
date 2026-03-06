import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Plus, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { format } from 'date-fns';

interface Campaign {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  objective?: { label: string };
  _count?: { leads: number; tasks: number };
}

export default function CampaignList() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const res = await api.get('/campaigns');
        setCampaigns(res.data.data || res.data);
      } catch (error) {
        console.error('Failed to fetch campaigns', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaigns();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">Active</Badge>;
      case 'DRAFT':
        return <Badge variant="secondary">Draft</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200">Completed</Badge>;
      case 'PAUSED':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200">Paused</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
        <Button onClick={() => navigate('/campaigns/new')}>
          <Plus className="mr-2 h-4 w-4" /> New Campaign
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Objective</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No campaigns found.
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((campaign) => (
                  <TableRow
                    key={campaign.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/campaigns/${campaign.id}`)}
                  >
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                    <TableCell>{campaign.objective?.label || '-'}</TableCell>
                    <TableCell>{format(new Date(campaign.startDate), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{format(new Date(campaign.endDate), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/campaigns/${campaign.id}`);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
