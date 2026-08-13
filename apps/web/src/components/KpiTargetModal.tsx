import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Target, Save } from 'lucide-react';
import api from '@/lib/api';

interface KpiTarget {
  id?: number;
  kpiName: string;
  targetValue: number;
  label: string;
  suffix: string;
}

const KPI_DEFINITIONS: { kpiName: string; label: string; suffix: string }[] = [
  { kpiName: 'SOLD_QUANTITY', label: 'Qté globale à vendre', suffix: 'unités' },
  { kpiName: 'REVENUE', label: 'Revenu total', suffix: 'FCFA' },
  { kpiName: 'LEADS', label: 'Leads', suffix: 'leads' },
  { kpiName: 'CONVERSIONS', label: 'Conversions', suffix: 'conversions' },
  { kpiName: 'CLIENTS', label: 'Clients', suffix: 'clients' },
];

interface KpiTargetModalProps {
  campaignId: string | number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export default function KpiTargetModal({
  campaignId,
  open,
  onOpenChange,
  onSaved,
}: KpiTargetModalProps) {
  const [targets, setTargets] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchTargets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/campaigns/${campaignId}/kpi-targets`);
      const data: KpiTarget[] = res.data?.data ?? [];
      const mapped: Record<string, number> = {};
      for (const t of data) {
        mapped[t.kpiName] = Number(t.targetValue);
      }
      setTargets(mapped);
    } catch {
      // Silencieux
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    if (open) {
      fetchTargets();
    }
  }, [open, fetchTargets]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = Object.entries(targets)
        .filter(([, value]) => value > 0)
        .map(([kpiName, targetValue]) => ({ kpiName, targetValue }));

      await api.put(`/campaigns/${campaignId}/kpi-targets`, { targets: payload });
      onSaved();
      onOpenChange(false);
    } catch {
      // Silencieux
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Objectifs KPI de la campagne
          </DialogTitle>
          <DialogDescription>
            Définissez des objectifs chiffrés pour chaque indicateur. Les cibles seront
            visibles dans les cartes de statistiques avec le taux d&apos;atteinte.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {KPI_DEFINITIONS.map((kpi) => (
              <div key={kpi.kpiName} className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor={`kpi-${kpi.kpiName}`} className="text-sm font-medium">
                    {kpi.label}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    id={`kpi-${kpi.kpiName}`}
                    type="number"
                    min={0}
                    placeholder="0"
                    className="w-36 text-right"
                    value={targets[kpi.kpiName] ?? ''}
                    onChange={(e) =>
                      setTargets((prev) => ({
                        ...prev,
                        [kpi.kpiName]: e.target.value ? Number(e.target.value) : 0,
                      }))
                    }
                  />
                  <span className="text-xs text-muted-foreground w-16">{kpi.suffix}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Enregistrement…
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Enregistrer les objectifs
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
