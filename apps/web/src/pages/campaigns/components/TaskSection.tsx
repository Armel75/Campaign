import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Loader2, Lock } from 'lucide-react';
import api from '@/lib/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';


type AssignedUserLike = {
  id: string | number;
  username?: string | null;
  email?: string | null;
  name?: string | null;
};

interface Task {
  id: string;
  title?: string;
  description?: string | null;
  status?: string;
  priority?: string;
  dueDate?: string | null;

  assignedTo?: AssignedUserLike | string | number | null;
  assignedToId?: string | number | null;

  assignedToUser?: AssignedUserLike | null;
  assignedToRelation?: AssignedUserLike | null;
  assignedToData?: AssignedUserLike | null;
  assignedToInfo?: AssignedUserLike | null;
  assignedToEntity?: AssignedUserLike | null;
  assignedToProfile?: AssignedUserLike | null;
  assignedToObj?: AssignedUserLike | null;
  assignedToItem?: AssignedUserLike | null;
  assignedToMember?: AssignedUserLike | null;
  assignedToRecord?: AssignedUserLike | null;
  assignedToAccount?: AssignedUserLike | null;
  assignedToContact?: AssignedUserLike | null;

  createdBy?: {
    id: string | number;
    username?: string | null;
    email?: string | null;
  } | null;

  createdAt?: string;
  updatedAt?: string;
}

function getAssignedUserObject(task: Task): AssignedUserLike | null {
  if (task.assignedTo && typeof task.assignedTo === 'object') {
    return task.assignedTo;
  }

  return (
    task.assignedToUser ||
    task.assignedToRelation ||
    task.assignedToData ||
    task.assignedToInfo ||
    task.assignedToEntity ||
    task.assignedToProfile ||
    task.assignedToObj ||
    task.assignedToItem ||
    task.assignedToMember ||
    task.assignedToRecord ||
    task.assignedToAccount ||
    task.assignedToContact ||
    null
  );
}

interface GlpiUser {
  id: string;
  username?: string | null;
  name?: string | null;
  email?: string | null;
}

interface TaskSectionProps {
  campaignId: string;
  tasks: Task[];
  onUpdate: () => void;
  isCampaignCompleted?: boolean;
}

const TASK_STATUS_OPTIONS = [
  { label: 'À faire', value: 'A_FAIRE' },
  { label: 'En cours', value: 'EN_COURS' },
  { label: 'Terminé', value: 'TERMINE' },
  { label: 'Annulé', value: 'ANNULE' },
];

const TASK_PRIORITY_OPTIONS = [
  { label: 'Faible', value: 'FAIBLE' },
  { label: 'Moyenne', value: 'MOYENNE' },
  { label: 'Élevée', value: 'ELEVEE' },
  { label: 'Urgente', value: 'URGENTE' },
];

function getTaskStatusLabel(status?: string) {
  switch (status) {
    case 'A_FAIRE':
      return 'À faire';
    case 'EN_COURS':
      return 'En cours';
    case 'TERMINE':
      return 'Terminé';
    case 'ANNULE':
      return 'Annulé';
    default:
      return status || '—';
  }
}

function getTaskPriorityLabel(priority?: string) {
  switch (priority) {
    case 'FAIBLE':
      return 'Faible';
    case 'MOYENNE':
      return 'Moyenne';
    case 'ELEVEE':
      return 'Élevée';
    case 'URGENTE':
      return 'Urgente';
    default:
      return priority || '—';
  }
}

export default function TaskSection({
  campaignId,
  tasks,
  onUpdate,
  isCampaignCompleted = false,
}: TaskSectionProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<GlpiUser[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('A_FAIRE');
  const [priority, setPriority] = useState('MOYENNE');

  const canManageTasks = !!user?.permissions?.canManageTasks;
  const canAssignTasks = !!user?.permissions?.canAssignTasks;
  const canMutateTasks = canManageTasks && !isCampaignCompleted;

  useEffect(() => {
    const fetchUsers = async () => {
      if (!canManageTasks) {
        setUsers([]);
        return;
      }

      if (!canAssignTasks) {
        setUsers([]);
        return;
      }

      try {
        const res = await api.get('/glpi-users');
        setUsers(res.data?.data || []);
      } catch (error: any) {
        console.error('Failed to fetch GLPI users', error);
        alert(
          error?.response?.data?.message ||
            "Impossible de charger la liste des utilisateurs GLPI."
        );
      }
    };

    fetchUsers();
  }, [canManageTasks, canAssignTasks]);

  const openCreateDialog = () => {
    if (!canMutateTasks) return;

    setEditingTask(null);
    setTitle('');
    setDescription('');
    setAssignedTo('');
    setDueDate('');
    setStatus('A_FAIRE');
    setPriority('MOYENNE');
    setIsDialogOpen(true);
  };

  const openEditDialog = (task: Task) => {
    if (!canMutateTasks) return;

    const assignedUser = getAssignedUserObject(task);

    const taskAssignedToId =
      assignedUser?.id != null
        ? String(assignedUser.id)
        : task.assignedToId != null
          ? String(task.assignedToId)
          : typeof task.assignedTo === 'string' || typeof task.assignedTo === 'number'
            ? String(task.assignedTo)
            : '';

    setEditingTask(task);
    setTitle(task.title ?? '');
    setDescription(task.description || '');
    setAssignedTo(taskAssignedToId);
    setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
    setStatus(task.status || 'A_FAIRE');
    setPriority(task.priority || 'MOYENNE');
    setIsDialogOpen(true);
  };

  // const openEditDialog = (task: Task) => {
  //   if (!canMutateTasks) return;

  //   const taskAssignedToId =
  //     typeof task.assignedTo === 'object' && task.assignedTo
  //       ? String(task.assignedTo.id)
  //       : task.assignedToId
  //         ? String(task.assignedToId)
  //         : typeof task.assignedTo === 'string' || typeof task.assignedTo === 'number'
  //           ? String(task.assignedTo)
  //           : '';

  //   setEditingTask(task);
  //   setTitle(task.title ?? '');
  //   setDescription(task.description || '');
  //   setAssignedTo(taskAssignedToId);
  //   setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
  //   setStatus(task.status || 'A_FAIRE');
  //   setPriority(task.priority || 'MOYENNE');
  //   setIsDialogOpen(true);
  // };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canManageTasks) {
      alert('Accès refusé : gestion des tâches non autorisée.');
      return;
    }

    if (isCampaignCompleted) {
      alert('Impossible d’ajouter une tâche à une campagne terminée.');
      return;
    }

    if (!title.trim()) {
      alert('Le titre est obligatoire.');
      return;
    }

    if (!assignedTo) {
      alert("L'utilisateur GLPI assigné est obligatoire.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        assignedTo,
        dueDate: dueDate || null,
        status,
        priority,
      };

      if (editingTask) {
        await api.put(`/campaigns/${campaignId}/tasks/${editingTask.id}`, payload);
      } else {
        await api.post(`/campaigns/${campaignId}/tasks`, payload);
      }

      setIsDialogOpen(false);
      await onUpdate();
    } catch (error: any) {
      console.error('Failed to save task', error);
      alert(
        error?.response?.data?.message ||
          "Erreur lors de l'enregistrement de la tâche."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canManageTasks) {
      alert('Accès refusé : gestion des tâches non autorisée.');
      return;
    }

    if (isCampaignCompleted) {
      alert('Impossible de modifier les tâches d’une campagne terminée.');
      return;
    }

    if (!confirm('Supprimer cette tâche ?')) return;

    try {
      await api.delete(`/campaigns/${campaignId}/tasks/${id}`);
      await onUpdate();
    } catch (error: any) {
      console.error('Delete failed', error);
      alert(
        error?.response?.data?.message ||
          'Erreur lors de la suppression de la tâche.'
      );
    }
  };

  const getStatusBadge = (taskStatus: string) => {
    switch (taskStatus) {
      case 'A_FAIRE':
        return <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-200">À faire</Badge>;
      case 'EN_COURS':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">En cours</Badge>;
      case 'TERMINE':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Terminé</Badge>;
      case 'ANNULE':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Annulé</Badge>;
      default:
        return <Badge variant="secondary">{getTaskStatusLabel(taskStatus)}</Badge>;
    }
  };

  const getAssignedUserLabel = (task: Task) => {
  const assignedUser = getAssignedUserObject(task);

  if (assignedUser) {
    return (
      assignedUser.username ||
      assignedUser.name ||
      assignedUser.email ||
      `#${assignedUser.id}`
    );
  }

  if (typeof task.assignedTo === 'string' || typeof task.assignedTo === 'number') {
    return String(task.assignedTo);
  }

  if (task.assignedToId) {
    return `#${task.assignedToId}`;
  }

  return 'Non assigné';
  };

  // const getAssignedUserLabel = (task: Task) => {
  //   if (typeof task.assignedTo === 'object' && task.assignedTo) {
  //     return task.assignedTo.username || task.assignedTo.name || task.assignedTo.email || 'Non assigné';
  //   }

  //   return 'Non assigné';
  // };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle className="text-xl">Tâches</CardTitle>
          {isCampaignCompleted && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              Campagne terminée : ajout et modification désactivés
            </div>
          )}
        </div>

        {canManageTasks && (
          <Button
            onClick={openCreateDialog}
            disabled={isCampaignCompleted}
            title={isCampaignCompleted ? 'Campagne terminée' : 'Ajouter une tâche'}
          >
            <Plus className="mr-2 h-4 w-4" /> Ajout tâche
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-6 w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Assigné à</TableHead>
              <TableHead>Priorité</TableHead>
              <TableHead>Échéance</TableHead>
              <TableHead>Statut</TableHead>
              {canManageTasks && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>

          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canManageTasks ? 6 : 5}
                  className="h-24 text-center text-muted-foreground"
                >
                  Aucune tâche pour le moment.
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.title}</TableCell>
                  <TableCell>{getAssignedUserLabel(task)}</TableCell>
                  <TableCell>{getTaskPriorityLabel(task.priority)}</TableCell>
                  <TableCell>
                    {task.dueDate
                      ? format(new Date(task.dueDate), 'dd/MM/yyyy', { locale: fr })
                      : '-'}
                  </TableCell>
                  <TableCell>{getStatusBadge(task.status ?? 'A_FAIRE')}</TableCell>
                  {canManageTasks && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isCampaignCompleted}
                          onClick={() => openEditDialog(task)}
                          className="flex items-center gap-2"
                          title={isCampaignCompleted ? 'Campagne terminée' : 'Modifier'}
                        >
                          <Pencil className="h-4 w-4" />
                          Modifier
                        </Button>

                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={isCampaignCompleted}
                          onClick={() => handleDelete(task.id)}
                          className="flex items-center gap-2"
                          title={isCampaignCompleted ? 'Campagne terminée' : 'Supprimer'}
                        >
                          <Trash2 className="h-4 w-4" />
                          Supprimer
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      {canManageTasks && (
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            if (isCampaignCompleted) return;
            setIsDialogOpen(open);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Modifier la tâche' : 'Nouvelle tâche'}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titre</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={isCampaignCompleted}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isCampaignCompleted}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assignedTo">Utilisateur GLPI assigné</Label>
                  <Select
                    value={assignedTo}
                    onValueChange={setAssignedTo}
                    disabled={isCampaignCompleted}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un utilisateur GLPI" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((userItem) => (
                        <SelectItem key={userItem.id} value={String(userItem.id)}>
                          {userItem.username || userItem.name || userItem.email || `#${userItem.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueDate">Date d’échéance</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    disabled={isCampaignCompleted}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Statut</Label>
                  <Select value={status} onValueChange={setStatus} disabled={isCampaignCompleted}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priorité</Label>
                  <Select value={priority} onValueChange={setPriority} disabled={isCampaignCompleted}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_PRIORITY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={loading || isCampaignCompleted}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}