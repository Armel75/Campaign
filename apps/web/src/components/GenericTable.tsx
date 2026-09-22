import { useEffect, useMemo, useState } from 'react';
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

interface TableFilterOption {
  label: string;
  value: string;
}

interface TableFilter {
  key: string;
  label: string;
  options: TableFilterOption[];
}

interface GenericTableProps {
  title: string;
  endpoint: string;
  columns: Column[];
  createPath?: string;
  onEdit?: (id: string) => void;
  onViewDetails?: (id: string) => void;

  pagination?: boolean;
  pageSize?: number;
  paginationMode?: 'local' | 'server';

  searchable?: boolean;
  searchPlaceholder?: string;

  filters?: TableFilter[];

  actionsAllowed?: boolean;
  /** Masque le bouton « Créer » (ex. permission absente). Par défaut : visible. */
  canCreate?: boolean;
  /** Contrôle le bouton « Modifier » ligne par ligne. Par défaut : visible. */
  canEditRow?: (row: any) => boolean;
  /** Contrôle le bouton « Supprimer » ligne par ligne. Par défaut : visible. */
  canDeleteRow?: (row: any) => boolean;
  extraActions?: React.ReactNode;
  refreshKey?: number;
}

export default function GenericTable({
  title,
  endpoint,
  columns,
  createPath,
  onEdit,
  onViewDetails,
  pagination = false,
  pageSize = 10,
  paginationMode = 'local',
  searchable = false,
  searchPlaceholder = 'Rechercher...',
  filters = [],
  actionsAllowed = true,
  canCreate = true,
  canEditRow,
  canDeleteRow,
  extraActions,
  refreshKey,
}: GenericTableProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const filtersConfigSignature = useMemo(
    () =>
      JSON.stringify(
        filters.map((filter) => ({
          key: filter.key,
          label: filter.label,
          options: filter.options,
        }))
      ),
    [filters]
  );

  const stableFilters = useMemo(() => filters, [filtersConfigSignature]);

  const [filterValues, setFilterValues] = useState<Record<string, string>>(() =>
    stableFilters.reduce((acc, filter) => {
      acc[filter.key] = '';
      return acc;
    }, {} as Record<string, string>)
  );

  const [serverMeta, setServerMeta] = useState({
    total: 0,
    page: 1,
    limit: pageSize,
    totalPages: 1,
  });

  const navigate = useNavigate();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    setFilterValues((prev) => {
      const next = stableFilters.reduce((acc, filter) => {
        acc[filter.key] = prev[filter.key] ?? '';
        return acc;
      }, {} as Record<string, string>);

      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);

      const sameLength = prevKeys.length === nextKeys.length;
      const sameValues =
        sameLength &&
        nextKeys.every((key) => String(prev[key] ?? '') === String(next[key] ?? ''));

      return sameValues ? prev : next;
    });
  }, [filtersConfigSignature, stableFilters]);

  const filterValuesSignature = useMemo(
    () => JSON.stringify(filterValues),
    [filterValues]
  );

  const fetchData = async () => {
    try {
      setLoading(true);

      if (paginationMode === 'server') {
        const params: Record<string, any> = {};

        if (pagination) {
          params.page = currentPage;
          params.limit = pageSize;
        }

        if (searchable && debouncedSearch) {
          params.search = debouncedSearch;
        }

        stableFilters.forEach((filter) => {
          const value = filterValues[filter.key];
          if (value) {
            params[filter.key] = value;
          }
        });

        const res = await api.get(endpoint, { params });
        const payload = res.data?.data || res.data || [];

        const normalizedData = Array.isArray(payload) ? payload : [];

        setData(normalizedData);
        setServerMeta({
          total: Number(res.data?.total ?? normalizedData.length ?? 0),
          page: Number(res.data?.page ?? currentPage),
          limit: Number(res.data?.limit ?? pageSize),
          totalPages: Number(res.data?.totalPages ?? 1),
        });

        return;
      }

      const res = await api.get(endpoint);
      const payload = res.data?.data || res.data || [];
      setData(Array.isArray(payload) ? payload : []);
    } catch (error) {
      console.error(error);
      setData([]);
      setServerMeta({
        total: 0,
        page: 1,
        limit: pageSize,
        totalPages: 1,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (paginationMode === 'server') {
      fetchData();
    }
  }, [
    endpoint,
    paginationMode,
    pagination,
    currentPage,
    pageSize,
    debouncedSearch,
    filterValuesSignature,
    filtersConfigSignature,
  ]);

  useEffect(() => {
    if (paginationMode === 'local') {
      fetchData();
    }
  }, [endpoint, paginationMode]);

  useEffect(() => {
    setCurrentPage(1);
  }, [endpoint, paginationMode]);

  useEffect(() => {
    if (refreshKey === undefined) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const localFilteredData = useMemo(() => {
    if (paginationMode !== 'local') return data;

    let result = [...data];

    if (searchable && debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();

      result = result.filter((row) =>
        columns.some((col) => {
          const rawValue = row?.[col.key];

          if (rawValue === null || rawValue === undefined) return false;

          if (typeof rawValue === 'string' || typeof rawValue === 'number') {
            return String(rawValue).toLowerCase().includes(searchLower);
          }

          return false;
        })
      );
    }

    if (stableFilters.length > 0) {
      result = result.filter((row) =>
        stableFilters.every((filter) => {
          const selectedValue = filterValues[filter.key];
          if (!selectedValue) return true;

          const rowValue = row?.[filter.key];
          return String(rowValue ?? '') === selectedValue;
        })
      );
    }

    return result;
  }, [
    data,
    paginationMode,
    searchable,
    debouncedSearch,
    filterValuesSignature,
    columns,
    stableFilters,
  ]);

  const totalItems =
    paginationMode === 'server' ? serverMeta.total : localFilteredData.length;

  const totalPages =
    pagination && totalItems > 0
      ? Math.max(
          1,
          paginationMode === 'server'
            ? serverMeta.totalPages
            : Math.ceil(localFilteredData.length / pageSize)
        )
      : 1;

  const paginatedData = useMemo(() => {
    if (paginationMode === 'server') {
      return data;
    }

    if (!pagination) {
      return localFilteredData;
    }

    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;

    return localFilteredData.slice(start, end);
  }, [data, localFilteredData, paginationMode, pagination, currentPage, pageSize]);

  const displayedRows = paginatedData;

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) return;

    try {
      await api.delete(`${endpoint}/${id}`);

      const shouldGoToPreviousPage =
        pagination && currentPage > 1 && displayedRows.length === 1;

      if (shouldGoToPreviousPage) {
        setCurrentPage((prev) => prev - 1);
      } else {
        fetchData();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setCurrentPage(1);
    setFilterValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem =
    totalItems === 0
      ? 0
      : paginationMode === 'server'
      ? Math.min(currentPage * pageSize, totalItems)
      : Math.min(currentPage * pageSize, localFilteredData.length);

  if (loading) return <div>Chargement...</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <div className="flex items-center gap-2">
          {extraActions}
          {actionsAllowed && canCreate && createPath && (
            <Button onClick={() => navigate(createPath)}>
              <Plus className="mr-2 h-4 w-4" /> Créer
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {(searchable || stableFilters.length > 0) && (
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-1 flex-col gap-3 md:flex-row">
              {searchable && (
                <div className="w-full md:max-w-sm">
                  <label className="mb-1 block text-sm font-medium">Recherche</label>
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              )}

              {stableFilters.map((filter) => (
                <div key={filter.key} className="w-full md:max-w-[220px]">
                  <label className="mb-1 block text-sm font-medium">{filter.label}</label>
                  <select
                    value={filterValues[filter.key] ?? ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Tous</option>
                    {filter.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className="h-12 px-4 align-middle font-medium whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
                <th className="h-12 px-4 align-middle font-medium text-right whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {displayedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="p-4 text-center text-muted-foreground"
                  >
                    Aucune donnée trouvée.
                  </td>
                </tr>
              ) : (
                displayedRows.map((row) => (
                  <tr key={row.id} className="border-t hover:bg-muted/50">
                    {columns.map((col) => (
                      <td key={col.key} className="p-4 align-middle">
                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                      </td>
                    ))}
                    <td className="p-4 align-middle text-right">
                      <div className="flex justify-end gap-2">
                        {onViewDetails && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewDetails(String(row.id))}
                          >
                            Voir détails
                          </Button>
                        )}

                        {actionsAllowed && onEdit && (!canEditRow || canEditRow(row)) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(String(row.id))}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Modifier
                          </Button>
                        )}

                        {actionsAllowed && (!canDeleteRow || canDeleteRow(row)) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleDelete(String(row.id))}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && (
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-muted-foreground">
              {totalItems > 0
                ? `Affichage de ${startItem} à ${endItem} sur ${totalItems} élément(s)`
                : 'Aucun élément'}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                Début
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Précédent
              </Button>

              <span className="min-w-[110px] text-center text-sm">
                Page {currentPage} / {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
              >
                Suivant
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages}
              >
                Fin
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}