/**
 * Export Excel du classement des ventes (page « Ventes par campagne »).
 *
 * Une seule feuille « Classement » :
 *  - bloc de synthèse (les 4 carreaux de la page) ;
 *  - tableau du classement complet (toutes les campagnes accessibles, aucun plafond) ;
 *  - horodatage d'extraction + provenance de la donnée (Sage X3) en tête de feuille.
 *
 * Le classement et la synthèse proviennent de `salesRanking` (module pur, testé), le CA
 * provient de `getCampaignSalesRevenue` (source unique partagée avec l'affichage).
 */

import ExcelJS from 'exceljs';

import {
  buildSalesRanking,
  buildSalesRankingSummary,
  SalesRankingCampaign,
} from './salesRanking';

export type SalesRankingExportInput = {
  campaigns: SalesRankingCampaign[];
  revenueByCampaignId: Record<number, number>;
  revenueErrors: Record<number, boolean>;
  generatedAt?: Date;
};

const SHEET_NAME = 'Classement';
/** Colonnes A..H : Rang | Campagne | Statut | Début | Fin | Qté vendue | Revenu X3 | % du meilleur */
const LAST_COLUMN = 8;

const COLORS = {
  primary: 'FF1F4E79',
  secondary: 'FF2E75B6',
  border: 'FFD9E1EA',
  zebra: 'FFF7F9FC',
  gold: 'FFFFE9A8',
  silver: 'FFE8EAED',
  bronze: 'FFF3DCC8',
  warning: 'FFB45309',
  muted: 'FF6B7280',
};

const FORMATS = {
  integer: '#,##0',
  currency: '#,##0" FCFA"',
  percent: '0" %"',
  date: 'DD/MM/YYYY',
};

/** Habillage podium : identique à la hiérarchie visuelle de l'écran (or, argent, bronze). */
const RANK_FILLS: Record<number, string> = {
  1: COLORS.gold,
  2: COLORS.silver,
  3: COLORS.bronze,
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  PLANIFIEE: 'Planifiée',
  EN_PAUSE: 'En pause',
  PAUSED: 'En pause',
  TERMINEE: 'Terminée',
  COMPLETED: 'Terminée',
  ANNULEE: 'Annulée',
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function solidFill(argb: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function thinBorder(argb: string = COLORS.border): Partial<ExcelJS.Borders> {
  const line: Partial<ExcelJS.Border> = { style: 'thin', color: { argb } };
  return { top: line, left: line, bottom: line, right: line };
}

function statusLabel(status: string): string {
  const normalized = String(status || '').trim().toUpperCase();
  return STATUS_LABELS[normalized] ?? (status || '—');
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export async function exportSalesRankingToExcel(
  input: SalesRankingExportInput,
): Promise<Buffer> {
  const generatedAt = input.generatedAt ?? new Date();

  const rows = buildSalesRanking(
    input.campaigns,
    input.revenueByCampaignId,
    input.revenueErrors,
  );
  const summary = buildSalesRankingSummary(rows);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Campaign App - Ventes par campagne';
  wb.created = generatedAt;

  const ws = wb.addWorksheet(SHEET_NAME, {
    properties: { tabColor: { argb: COLORS.primary } },
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  ws.columns = [
    { width: 7 },  // A - Rang
    { width: 46 }, // B - Campagne
    { width: 14 }, // C - Statut
    { width: 12 }, // D - Début
    { width: 12 }, // E - Fin
    { width: 17 }, // F - Quantité vendue
    { width: 22 }, // G - Revenu X3
    { width: 13 }, // H - % du meilleur
  ];

  // ── En-tête du document ────────────────────────────────────────────────
  ws.mergeCells(1, 1, 1, LAST_COLUMN);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = 'Ventes par campagne — Classement des ventes';
  titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  titleCell.fill = solidFill(COLORS.primary);
  ws.getRow(1).height = 30;

  const generatedLabel = `${generatedAt.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })} à ${generatedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

  ws.mergeCells(2, 1, 2, LAST_COLUMN);
  const subtitleCell = ws.getCell(2, 1);
  subtitleCell.value =
    `Extrait le ${generatedLabel} · Source : Sage X3 (CA facturé à titre indicatif, non attribué à la campagne) · ` +
    'Quantités issues de la synchronisation automatique des campagnes actives.';
  subtitleCell.font = { italic: true, size: 10, color: { argb: COLORS.muted } };
  subtitleCell.alignment = { vertical: 'middle', wrapText: true, indent: 1 };
  ws.getRow(2).height = 30;

  ws.getRow(3).height = 8;

  // ── Bloc de synthèse (les 4 carreaux de la page) ───────────────────────
  const kpiHeaderRow = 4;
  ws.mergeCells(kpiHeaderRow, 1, kpiHeaderRow, 2);
  const kpiLabelHeader = ws.getCell(kpiHeaderRow, 1);
  kpiLabelHeader.value = 'Indicateur';
  ws.mergeCells(kpiHeaderRow, 3, kpiHeaderRow, LAST_COLUMN);
  const kpiValueHeader = ws.getCell(kpiHeaderRow, 3);
  kpiValueHeader.value = 'Valeur';

  for (const cell of [kpiLabelHeader, kpiValueHeader]) {
    cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    cell.fill = solidFill(COLORS.secondary);
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = thinBorder();
  }
  ws.getRow(kpiHeaderRow).height = 20;

  const kpis: Array<{ label: string; value: string | number; numFmt?: string }> = [
    { label: 'Total articles vendus', value: summary.totalSold, numFmt: FORMATS.integer },
    { label: 'Revenu total (Sage X3)', value: summary.totalRevenue, numFmt: FORMATS.currency },
    {
      label: 'Meilleure campagne',
      value: summary.best
        ? `${summary.best.name} — ${summary.best.soldQuantity.toLocaleString('fr-FR')} articles vendus`
        : '—',
    },
    {
      label: 'Campagnes avec ventes',
      value: `${summary.campaignsWithSales} / ${summary.totalCampaigns}`,
    },
  ];

  let cursor = kpiHeaderRow;

  for (const kpi of kpis) {
    cursor += 1;

    ws.mergeCells(cursor, 1, cursor, 2);
    const labelCell = ws.getCell(cursor, 1);
    labelCell.value = kpi.label;
    labelCell.font = { size: 10, bold: true };
    labelCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    labelCell.border = thinBorder();

    ws.mergeCells(cursor, 3, cursor, LAST_COLUMN);
    const valueCell = ws.getCell(cursor, 3);
    valueCell.value = kpi.value;
    valueCell.font = { size: 10 };
    valueCell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
    valueCell.border = thinBorder();
    if (kpi.numFmt) valueCell.numFmt = kpi.numFmt;
  }

  // Signalement des CA indisponibles (échec Sage X3) : le tableau porte « N/A ».
  if (summary.revenueUnavailableCount > 0) {
    cursor += 1;
    ws.mergeCells(cursor, 1, cursor, LAST_COLUMN);
    const warningCell = ws.getCell(cursor, 1);
    warningCell.value =
      `⚠ ${summary.revenueUnavailableCount} campagne(s) sans CA disponible (Sage X3) : ` +
      'signalée(s) « N/A » dans le tableau — leur revenu est inconnu, pas nul.';
    warningCell.font = { italic: true, bold: true, size: 10, color: { argb: COLORS.warning } };
    warningCell.alignment = { vertical: 'middle', wrapText: true, indent: 1 };
    ws.getRow(cursor).height = 20;
  }

  cursor += 1;
  ws.getRow(cursor).height = 8;

  // ── Tableau du classement ──────────────────────────────────────────────
  const headerRow = cursor + 1;
  const headers = [
    'Rang',
    'Campagne',
    'Statut',
    'Début',
    'Fin',
    'Quantité vendue',
    'Revenu X3 (FCFA)',
    '% du meilleur',
  ];

  headers.forEach((header, index) => {
    const cell = ws.getCell(headerRow, index + 1);
    cell.value = header;
    cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    cell.fill = solidFill(COLORS.primary);
    cell.alignment = {
      vertical: 'middle',
      horizontal: index >= 5 ? 'right' : 'center',
      wrapText: true,
      indent: index >= 5 ? 1 : 0,
    };
    cell.border = thinBorder();
  });
  ws.getRow(headerRow).height = 24;

  let lastDataRow = headerRow;

  rows.forEach((row, index) => {
    const dataRow = headerRow + index + 1;
    lastDataRow = dataRow;

    const rankFill = RANK_FILLS[row.rank];
    const rowFill = rankFill ?? (index % 2 === 1 ? COLORS.zebra : undefined);

    const cells: Array<{ column: number; value: ExcelJS.CellValue; numFmt?: string; align: 'center' | 'left' | 'right'; color?: string; bold?: boolean; muted?: boolean }> = [
      {
        column: 1,
        value: row.rank,
        align: 'center',
        bold: row.rank <= 3,
      },
      {
        column: 2,
        value: row.name,
        align: 'left',
        bold: true,
      },
      {
        column: 3,
        value: statusLabel(row.status),
        align: 'center',
      },
      {
        column: 4,
        value: row.startDate ?? '—',
        numFmt: row.startDate ? FORMATS.date : undefined,
        align: 'center',
        muted: !row.startDate,
      },
      {
        column: 5,
        value: row.endDate ?? '—',
        numFmt: row.endDate ? FORMATS.date : undefined,
        align: 'center',
        muted: !row.endDate,
      },
      {
        column: 6,
        value: row.soldQuantity,
        numFmt: FORMATS.integer,
        align: 'right',
        bold: row.soldQuantity > 0,
        muted: row.soldQuantity === 0,
      },
      row.revenueUnavailable
        ? { column: 7, value: 'N/A', align: 'right', color: COLORS.warning, bold: true }
        : row.revenue === null
          ? { column: 7, value: '—', align: 'right', muted: true }
          : { column: 7, value: row.revenue, numFmt: FORMATS.currency, align: 'right' },
      {
        column: 8,
        value: row.shareOfBest,
        numFmt: FORMATS.percent,
        align: 'right',
        muted: row.shareOfBest === 0,
      },
    ];

    for (const definition of cells) {
      const cell = ws.getCell(dataRow, definition.column);
      cell.value = definition.value;
      cell.font = {
        size: 10,
        bold: definition.bold === true,
        italic: definition.color !== undefined,
        color: { argb: definition.color ?? (definition.muted ? COLORS.muted : 'FF111827') },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: definition.align,
        indent: definition.align === 'right' ? 1 : 0,
      };
      cell.border = thinBorder();
      if (definition.numFmt) cell.numFmt = definition.numFmt;
      if (rowFill) cell.fill = solidFill(rowFill);
    }
  });

  if (rows.length === 0) {
    lastDataRow = headerRow + 1;
    ws.mergeCells(lastDataRow, 1, lastDataRow, LAST_COLUMN);
    const emptyCell = ws.getCell(lastDataRow, 1);
    emptyCell.value = 'Aucune campagne trouvée.';
    emptyCell.font = { italic: true, size: 10, color: { argb: COLORS.muted } };
    emptyCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  }

  // Filtre + en-tête figé : le tableau reste exploitable sur plusieurs milliers de lignes.
  if (rows.length > 0) {
    ws.autoFilter = {
      from: { row: headerRow, column: 1 },
      to: { row: lastDataRow, column: LAST_COLUMN },
    };
  }
  ws.views = [{ state: 'frozen', ySplit: headerRow, activeCell: `A${headerRow + 1}` }];

  // ── Notes de lecture ───────────────────────────────────────────────────
  const notes = [
    'Note : « Quantité vendue » = somme des quantités vendues par article sur la période de la campagne ; ' +
      'les périodes de deux campagnes peuvent se chevaucher.',
  ];

  if (summary.revenueUnavailableCount > 0) {
    notes.push(
      '« N/A » = CA Sage X3 indisponible au moment de l’extraction (valeur inconnue, différente d’un 0).',
    );
  }

  let noteRow = lastDataRow;

  for (const note of notes) {
    noteRow += 1;
    ws.mergeCells(noteRow, 1, noteRow, LAST_COLUMN);
    const noteCell = ws.getCell(noteRow, 1);
    noteCell.value = note;
    noteCell.font = { italic: true, size: 9, color: { argb: COLORS.muted } };
    noteCell.alignment = { vertical: 'middle', wrapText: true, indent: 1 };
    ws.getRow(noteRow).height = 18;
  }

  const buffer = (await wb.xlsx.writeBuffer()) as unknown as Buffer;

  return Buffer.from(buffer);
}
