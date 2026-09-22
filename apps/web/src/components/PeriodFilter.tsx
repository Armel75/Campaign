import { useState } from 'react';
import { CalendarRange, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  CalendarPeriod,
  MONTH_SHORT_LABELS,
  PERIOD_PRESETS,
  PeriodPreset,
  ResolvedPeriod,
  getSelectableYears,
} from '@/lib/period';

type PeriodFilterProps = {
  /** Période effectivement appliquée (résolue par l'appelant). */
  period: ResolvedPeriod;
  onSelectPreset: (preset: PeriodPreset) => void;
  onSelectCalendar: (calendar: CalendarPeriod) => void;
  onClearCalendar: () => void;
};

/**
 * Filtre de période hybride :
 *  - chips de fenêtres GLISSANTES (7j / 30j / 90j / Année / Tout) → 1 clic, usage opérationnel
 *  - popover CALENDAIRE (année + mois / tous les mois) → analyse historique, comme le reporting
 *  - libellé de période résolue → lève toute ambiguïté entre glissant et calendaire
 */
export default function PeriodFilter({
  period,
  onSelectPreset,
  onSelectCalendar,
  onClearCalendar,
}: PeriodFilterProps) {
  const [open, setOpen] = useState(false);
  const years = getSelectableYears();
  const activeYear = period.calendar?.year ?? new Date().getFullYear();
  const activeMonth = period.calendar?.month ?? null;

  const applyCalendar = (calendar: CalendarPeriod) => {
    onSelectCalendar(calendar);
    setOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* 1. Fenêtres glissantes */}
      <div
        className={`flex items-center gap-0.5 rounded-xl border-2 px-2 py-1.5 shadow-sm transition-colors ${
          period.source === 'preset'
            ? 'border-primary/15 bg-primary/[0.04]'
            : 'border-slate-200/70 bg-transparent dark:border-slate-700/70'
        }`}
      >
        <CalendarRange className="mr-1 h-4 w-4 shrink-0 text-primary" />
        {PERIOD_PRESETS.map((preset) => {
          const isActive = period.source === 'preset' && period.preset === preset.value;

          return (
            <button
              key={preset.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => onSelectPreset(preset.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* 2. Période calendaire (année / mois) */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-medium shadow-sm transition-colors ${
              period.source === 'calendrier'
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-slate-200/70 hover:border-primary/25 hover:bg-primary/5 dark:border-slate-700/70'
            }`}
          >
            <CalendarRange className="h-4 w-4 shrink-0" />
            <span>Période…</span>
            {period.source === 'calendrier' && (
              <span className="rounded-md bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
                {period.shortLabel}
              </span>
            )}
          </button>
        </PopoverTrigger>

        <PopoverContent align="end" className="w-[340px] space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              1. Choisir une année
            </p>
            <div className="grid grid-cols-3 gap-2">
              {years.map((year) => (
                <button
                  key={year}
                  type="button"
                  aria-pressed={period.source === 'calendrier' && activeYear === year}
                  onClick={() => applyCalendar({ year, month: activeMonth })}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                    period.source === 'calendrier' && activeYear === year
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-slate-200 hover:border-primary/40 hover:bg-primary/5 dark:border-slate-700'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              2. Choisir un mois
            </p>
            <button
              type="button"
              onClick={() => applyCalendar({ year: activeYear, month: null })}
              className={`w-full rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                period.source === 'calendrier' && activeMonth === null
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-slate-200 hover:border-primary/40 hover:bg-primary/5 dark:border-slate-700'
              }`}
            >
              Tous les mois
            </button>
            <div className="grid grid-cols-4 gap-2">
              {MONTH_SHORT_LABELS.map((monthLabel, monthIndex) => {
                const isActive =
                  period.source === 'calendrier' && activeMonth === monthIndex;

                return (
                  <button
                    key={monthLabel}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => applyCalendar({ year: activeYear, month: monthIndex })}
                    className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                      isActive
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-slate-200 hover:border-primary/40 hover:bg-primary/5 dark:border-slate-700'
                    }`}
                  >
                    {monthLabel}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-xs text-muted-foreground">{period.label}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onClearCalendar();
                setOpen(false);
              }}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Réinitialiser
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* 3. Libellé résolu : glissant vs calendaire */}
      <span
        className="max-w-[280px] truncate rounded-full border border-slate-200 px-3 py-1 text-xs text-muted-foreground dark:border-slate-700"
        title={period.label}
      >
        {period.label}
      </span>
    </div>
  );
}
