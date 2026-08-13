import prisma from '../infrastructure/prisma/client';
import ExcelJS from 'exceljs';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface WeeklySalesCampaignRow {
  id: number;
  name: string;
  objective: string;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  plannedQuantity: number;
  soldQuantity: number;
  attainmentPct: number | null;
}

export interface WeeklySalesReportSummary {
  generatedAt: Date;
  totalCampaigns: number;
  totalPlanned: number;
  totalSold: number;
  overallAttainmentPct: number | null;
  rows: WeeklySalesCampaignRow[];
}

export interface WeeklySalesReportResult {
  buffer: Buffer;
  fileName: string;
  summary: WeeklySalesReportSummary;
}

/**
 * Récupère les campagnes du périmètre du rapport hebdomadaire :
 * campagnes ACTIVES + campagnes terminées au cours des 7 derniers jours.
 */
async function fetchCampaigns() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - WEEK_MS);

  return prisma.campaign.findMany({
    where: {
      OR: [
        { status: 'ACTIVE' },
        { endDate: { gte: sevenDaysAgo, lte: now } },
      ],
    },
    include: {
      objective: { select: { label: true } },
      articles: {
        select: {
          id: true,
          designation: true,
          plannedQuantity: true,
          quantityAtCreation: true,
          quantityAtStart: true,
          currentQuantity: true,
          soldQuantity: true,
          quantityAtClosure: true,
        },
      },
    },
    orderBy: [{ status: 'asc' }, { endDate: 'asc' }],
  });
}

function toRow(
  campaign: Awaited<ReturnType<typeof fetchCampaigns>>[number],
): WeeklySalesCampaignRow {
  const planned = campaign.articles.reduce((sum, a) => sum + (a.plannedQuantity ?? 0), 0);
  const sold = campaign.articles.reduce((sum, a) => sum + (a.soldQuantity ?? 0), 0);

  return {
    id: campaign.id,
    name: campaign.name,
    objective: campaign.objective?.label ?? '-',
    status: campaign.status,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    plannedQuantity: planned,
    soldQuantity: sold,
    attainmentPct: planned > 0 ? Math.min(Math.round((sold / planned) * 100), 100) : null,
  };
}

function buildSummary(rows: WeeklySalesCampaignRow[]): WeeklySalesReportSummary {
  const totalPlanned = rows.reduce((sum, r) => sum + r.plannedQuantity, 0);
  const totalSold = rows.reduce((sum, r) => sum + r.soldQuantity, 0);

  return {
    generatedAt: new Date(),
    totalCampaigns: rows.length,
    totalPlanned,
    totalSold,
    overallAttainmentPct: totalPlanned > 0 ? Math.min(Math.round((totalSold / totalPlanned) * 100), 100) : null,
    rows,
  };
}

/**
 * Construit le classeur Excel du rapport : une feuille par campagne, avec le même
 * format que l'export existant (titre bleu, Statut/Description/Objectif/Période,
 * en-tête figée, ligne TOTAL, auto-filtre) mais UNIQUEMENT les quantités.
 * Aucun appel Sage X3 (montants exclus : X3 peut être lent ou interrompu).
 */
function buildWorkbook(
  campaigns: Awaited<ReturnType<typeof fetchCampaigns>>,
): ExcelJS.Workbook {
  const blueDark = 'FF1F4E79';
  const blueLight = 'FFD6E4F0';
  const green = 'FF27AE60';
  const grayBg = 'FFF5F5F5';
  const white = 'FFFFFFFF';
  const darkText = 'FF333333';
  const borderGray = 'FFD9D9D9';

  const thinBorder = {
    top: { style: 'thin' as const, color: { argb: borderGray } },
    bottom: { style: 'thin' as const, color: { argb: borderGray } },
    left: { style: 'thin' as const, color: { argb: borderGray } },
    right: { style: 'thin' as const, color: { argb: borderGray } },
  };

  const headers = [
    'Désignation', 'Quantité prévue', 'Quantité à la création', 'Quantité au démarrage',
    'Quantité courante', 'Quantité vendue', 'Quantité à la clôture',
  ];
  const lastCol = headers.length - 1;
  const headerRowNum = 8;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Campaign App';
  wb.created = new Date();

  // Noms de feuille UNIQUES : 2 campagnes peuvent partager le même nom nettoyé/tronqué (31 car.)
  const usedSheetNames = new Set<string>();

  for (const c of campaigns) {
    const cleanName = c.name.replace(/[^a-zA-Z0-9-_ àâäéèêëîïôöùûü]/g, '_').trim();
    const baseName = (cleanName || 'Campagne').substring(0, 31);

    let sheetName = baseName;
    if (usedSheetNames.has(sheetName)) {
      let n = 2;
      do {
        // Réserve la place pour le suffixe -N (garde le nom ≤ 31 caractères)
        const prefix = baseName.substring(0, 30 - String(n).length);
        sheetName = `${prefix}-${n}`.substring(0, 31);
        n += 1;
      } while (usedSheetNames.has(sheetName));
    }
    usedSheetNames.add(sheetName);

    const ws = wb.addWorksheet(sheetName, {
      properties: { tabColor: { argb: blueDark } },
      pageSetup: { orientation: 'landscape', fitToPage: true },
    });

    const data = c.articles.map((a) => [
      a.designation,
      a.plannedQuantity ?? 0,
      a.quantityAtCreation ?? 0,
      a.quantityAtStart ?? 0,
      a.currentQuantity ?? 0,
      a.soldQuantity ?? 0,
      a.quantityAtClosure ?? 0,
    ]);

    const nbData = data.length;
    const totalRowNum = headerRowNum + 1 + nbData;

    // ─── LIGNE 1 : Titre ───
    ws.mergeCells(1, 1, 1, lastCol + 1);
    const titleCell = ws.getCell(1, 1);
    titleCell.value = c.name;
    titleCell.font = { bold: true, size: 16, color: { argb: white }, name: 'Calibri' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: blueDark } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 36;

    // ─── LIGNES 2-5 : Infos ───
    const infoData = [
      `Statut : ${c.status}`,
      `Description : ${c.description || '-'}`,
      `Objectif : ${c.objective?.label || '-'}`,
      `Période : du ${c.startDate ? new Date(c.startDate).toLocaleDateString('fr-FR') : '-'} au ${c.endDate ? new Date(c.endDate).toLocaleDateString('fr-FR') : '-'}`,
    ];
    infoData.forEach((text, i) => {
      const rowNum = i + 2;
      ws.mergeCells(rowNum, 1, rowNum, lastCol + 1);
      const cell = ws.getCell(rowNum, 1);
      const isPeriodRow = i === 3;
      cell.value = text;
      cell.font = {
        size: isPeriodRow ? 12 : 11,
        bold: isPeriodRow,
        color: { argb: isPeriodRow ? blueDark : darkText },
        name: 'Calibri',
      };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isPeriodRow ? blueLight : grayBg } };
      cell.alignment = { vertical: 'middle' };
      ws.getRow(rowNum).height = isPeriodRow ? 26 : 22;
    });

    // Statut vert si ACTIVE
    if (c.status === 'ACTIVE') {
      const statusCell = ws.getCell(2, 1);
      statusCell.font = { bold: true, size: 11, color: { argb: white }, name: 'Calibri' };
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: green } };
    }

    // ─── LIGNE 7 : Séparateur ───
    ws.getRow(7).height = 6;

    // ─── LIGNE 8 : En-têtes ───
    ws.getRow(headerRowNum).height = 28;
    headers.forEach((h, i) => {
      const cell = ws.getCell(headerRowNum, i + 1);
      cell.value = h;
      cell.font = { bold: true, size: 11, color: { argb: white }, name: 'Calibri' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: blueDark } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: blueDark } },
        bottom: { style: 'medium', color: { argb: blueDark } },
        left: { style: 'thin', color: { argb: blueDark } },
        right: { style: 'thin', color: { argb: blueDark } },
      };
    });

    // ─── LIGNES DE DONNÉES ───
    data.forEach((row, rIdx) => {
      const rowNum = headerRowNum + 1 + rIdx;
      ws.getRow(rowNum).height = 22;
      const isEven = rIdx % 2 === 0;
      row.forEach((val, cIdx) => {
        const cell = ws.getCell(rowNum, cIdx + 1);
        const isDesignation = cIdx === 0;
        cell.value = val;
        cell.font = { size: 10, name: 'Calibri' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? white : 'FFF5F8FC' } };
        cell.alignment = { horizontal: isDesignation ? 'left' : 'right', vertical: 'middle' };
        cell.border = thinBorder;
        if (!isDesignation) cell.numFmt = '#,##0';
      });
    });

    // ─── LIGNE DE TOTAL ───
    if (nbData > 0) {
      const row = ws.getRow(totalRowNum);
      row.height = 26;
      const totalLabel = ws.getCell(totalRowNum, 1);
      totalLabel.value = 'TOTAL';
      totalLabel.font = { bold: true, size: 11, color: { argb: blueDark }, name: 'Calibri' };
      totalLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: blueLight } };
      totalLabel.alignment = { horizontal: 'left', vertical: 'middle' };
      totalLabel.border = {
        top: { style: 'medium', color: { argb: blueDark } },
        bottom: { style: 'medium', color: { argb: blueDark } },
        left: { style: 'thin', color: { argb: borderGray } },
        right: { style: 'thin', color: { argb: borderGray } },
      };

      for (let col = 2; col <= lastCol + 1; col++) {
        let sum = 0;
        data.forEach((d) => {
          const v = Number(d[col - 1]);
          if (!isNaN(v)) sum += v;
        });
        const cell = ws.getCell(totalRowNum, col);
        cell.value = sum || 0;
        cell.font = { bold: true, size: 11, color: { argb: blueDark }, name: 'Calibri' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: blueLight } };
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0';
        cell.border = {
          top: { style: 'medium', color: { argb: blueDark } },
          bottom: { style: 'medium', color: { argb: blueDark } },
          left: { style: 'thin', color: { argb: borderGray } },
          right: { style: 'thin', color: { argb: borderGray } },
        };
      }
    }

    // ─── LARGEURS DE COLONNES ───
    ws.getColumn(1).width = 48;
    ws.getColumn(2).width = 18;
    ws.getColumn(3).width = 20;
    ws.getColumn(4).width = 20;
    ws.getColumn(5).width = 18;
    ws.getColumn(6).width = 18;
    ws.getColumn(7).width = 20;

    // ─── AUTO-FILTRE ───
    if (nbData > 0) {
      ws.autoFilter = {
        from: { row: headerRowNum, column: 1 },
        to: { row: headerRowNum, column: lastCol + 1 },
      };
    }

    // ─── FIGER L'EN-TÊTE ───
    ws.views = [
      { state: 'frozen', ySplit: headerRowNum, activeCell: `A${headerRowNum + 1}` },
    ];
  }

  return wb;
}

/**
 * Génère le rapport hebdomadaire des ventes des campagnes (fichier Excel .xlsx).
 *
 * Format identique à l'export existant (titre bleu, infos Statut/Description/
 * Objectif/Période, en-tête figée, ligne TOTAL, auto-filtre) mais UNIQUEMENT les
 * quantités : aucun appel Sage X3 (montants exclus, X3 pouvant être lent/interrompu).
 */
export async function generateWeeklySalesReport(): Promise<WeeklySalesReportResult> {
  const campaigns = await fetchCampaigns();
  const rows = campaigns.map(toRow);
  const summary = buildSummary(rows);

  const dateStr = summary.generatedAt.toISOString().slice(0, 10);
  const fileName = `rapport-ventes-campagnes-${dateStr}.xlsx`;

  const wb = buildWorkbook(campaigns);
  const buffer = await wb.xlsx.writeBuffer();

  return {
    buffer: Buffer.from(buffer),
    fileName,
    summary,
  };
}
