import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface Task {
  id: string;
  title: string;
  description?: string;
  assignedTo: string;
  assignee?: { username: string; email: string };
  dueDate: string;
  status: string;
}

interface User {
  id: string;
  username: string;
}

interface TaskSectionProps {
  campaignId: string;
  tasks: Task[];
  onUpdate: () => void;
}

export default function TaskSection({ campaignId, tasks, onUpdate }: TaskSectionProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('TODO');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get('/users');
        setUsers(res.data.data || res.data);
      } catch (error) {
        console.error('Failed to fetch users', error);
      }
    };
    fetchUsers();
  }, []);

  const openCreateDialog = () => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setAssignedTo('');
    setDueDate('');
    setStatus('TODO');
    setIsDialogOpen(true);
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setAssignedTo(task.assignedTo);
    setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
    setStatus(task.status);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        title,
        description,
        assignedTo,
        dueDate,
        status,
      };

      if (editingTask) {
        await api.put(`/campaigns/${campaignId}/tasks/${editingTask.id}`, payload);
      } else {
        await api.post(`/campaigns/${campaignId}/tasks`, payload);
      }
      setIsDialogOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to save task', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/campaigns/${campaignId}/tasks/${id}`);
      onUpdate();
    } catch (error) {
      console.error('Delete failed', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DONE':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Done</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">In Progress</Badge>;
      default:
        return <Badge variant="secondary">To Do</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl">Tasks</CardTitle>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" /> Add Task
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No tasks yet.
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.title}</TableCell>
                  <TableCell>{task.assignee?.username || 'Unassigned'}</TableCell>
                  <TableCell>{task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : '-'}</TableCell>
                  <TableCell>{getStatusBadge(task.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(task)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(task.id)}>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'New Task'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assignedTo">Assign To</Label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODO">To Do</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="DONE">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
