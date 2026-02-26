import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface GenericTableProps {
  title: string;
  endpoint: string;
  columns: Column[];
  createPath?: string;
  onEdit?: (id: string) => void;
}

export default function GenericTable({ title, endpoint, columns, createPath, onEdit }: GenericTableProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const res = await api.get(endpoint);
      setData(res.data.data || res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [endpoint]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await api.delete(`${endpoint}/${id}`);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        {createPath && (
          <Button onClick={() => navigate(createPath)}>
            <Plus className="mr-2 h-4 w-4" /> Create
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className="h-12 px-4 align-middle font-medium">
                    {col.label}
                  </th>
                ))}
                <th className="h-12 px-4 align-middle font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="p-4 text-center text-muted-foreground">
                    No data found.
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id} className="border-t hover:bg-muted/50">
                    {columns.map((col) => (
                      <td key={col.key} className="p-4 align-middle">
                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                      </td>
                    ))}
                    <td className="p-4 align-middle text-right">
                      <div className="flex justify-end gap-2">
                        {onEdit && (
                          <Button variant="ghost" size="icon" onClick={() => onEdit(row.id)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(row.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
