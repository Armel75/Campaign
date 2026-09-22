import ExcelJS from 'exceljs';
import { getProfitabilityReport } from './campaignProfitability.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value) + ' XAF';
}

function formatPercent(value: number | null): string {
  if (value === null) return 'N/A';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)} %`;
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)} k`;
  return value.toLocaleString('fr-FR');
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const STYLES = {
  header: {
    font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 14 },
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF1F4E79' } },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
    border: {
      top: { style: 'thin' as const }, bottom: { style: 'thin' as const },
      left: { style: 'thin' as const }, right: { style: 'thin' as const },
    },
  },
  subheader: {
    font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF2E75B6' } },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true },
    border: {
      top: { style: 'thin' as const }, bottom: { style: 'thin' as const },
      left: { style: 'thin' as const }, right: { style: 'thin' as const },
    },
  },
  data: {
    font: { size: 10 },
    alignment: { vertical: 'middle' as const },
    border: {
      top: { style: 'thin' as const }, bottom: { style: 'thin' as const },
      left: { style: 'thin' as const }, right: { style: 'thin' as const },
    },
  },
  number: {
    font: { size: 10 },
    alignment: { horizontal: 'right' as const, vertical: 'middle' as const },
    border: {
      top: { style: 'thin' as const }, bottom: { style: 'thin' as const },
      left: { style: 'thin' as const }, right: { style: 'thin' as const },
    },
  },
  positive: {
    font: { size: 10, color: { argb: 'FF22C55E' }, bold: true },
    alignment: { vertical: 'middle' as const },
  },
  negative: {
    font: { size: 10, color: { argb: 'FFEF4444' }, bold: true },
    alignment: { vertical: 'middle' as const },
  },
  titleRow: {
    font: { bold: true, size: 16, color: { argb: 'FF1F4E79' } },
    alignment: { vertical: 'middle' as const },
  },
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export async function exportProfitabilityToExcel(
  month?: number,
  year?: number,
): Promise<Buffer> {
  const report = await getProfitabilityReport(month, year);
  const { currentMonth, previousMonth, comparison, overview, acquisitionCosts, profitabilityByObjective, topCampaignsByRoi, bottomCampaignsByRoi } = report;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Campaign App - Rapport Rentabilité';
  wb.created = new Date();

  // ── Feuille 1 : Résumé Exécutif ──────────────────────────────────────
  const ws1 = wb.addWorksheet('Résumé Exécutif', {
    properties: { tabColor: { argb: 'FF1F4E79' } },
    pageSetup: { orientation: 'landscape', fitToPage: true },
  });

  // Titre
  ws1.mergeCells('A1:G1');
  const titleCell = ws1.getCell('A1');
  titleCell.value = `Rapport de Rentabilité - ${currentMonth?.label ?? 'N/A'}`;
  titleCell.font = STYLES.titleRow.font;
  titleCell.alignment = STYLES.titleRow.alignment;

  ws1.mergeCells('A2:G2');
  ws1.getCell('A2').value = `Généré le ${new Date(report.reportGeneratedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
  ws1.getCell('A2').font = { size: 10, italic: true, color: { argb: 'FF666666' } };

  // ─ KPIs ─
  ws1.getRow(4).values = ['Indicateur', 'Valeur', 'Variation', '', 'Indicateur', 'Valeur', 'Variation'];
  const headerRow = ws1.getRow(4);
  headerRow.eachCell((cell) => { cell.style = STYLES.subheader; });

  const metricsLeft = [
    ['ROI Mensuel', currentMonth ? formatPercent(currentMonth.roiPercent) : 'N/A', comparison && comparison.roiChange !== null && comparison.roiChange !== undefined ? formatPercent(comparison.roiChange) : 'N/A'],
    ['Revenu', currentMonth ? formatCurrency(currentMonth.totalRevenue) : 'N/A', comparison && comparison.revenueChangePercent !== null ? formatPercent(comparison.revenueChangePercent) : 'N/A'],
    ['Profit Net', currentMonth ? formatCurrency(currentMonth.totalProfit) : 'N/A', comparison && comparison.profitChangePercent !== null ? formatPercent(comparison.profitChangePercent) : 'N/A'],
    ['Coût Total', currentMonth ? formatCurrency(currentMonth.totalCost) : 'N/A', comparison && comparison.costChangePercent !== null ? formatPercent(comparison.costChangePercent) : 'N/A'],
  ];

  const metricsRight = [
    ['ROI Global', formatPercent(overview.globalRoiPercent), ''],
    ['Budget Total', formatCurrency(overview.totalBudget), ''],
    // Le coût d'une campagne = son budget total : une ligne « Dépenses » ferait doublon
    // avec « Budget Total » et serait trompeuse (aucune dépense n'entre dans le calcul).
    ['Profit Net (cumul)', formatCurrency(overview.totalProfit), ''],
    ['Revenu Total', formatCurrency(overview.totalRevenue), ''],
  ];

  for (let i = 0; i < 4; i++) {
    const rowNum = 5 + i;
    ws1.getRow(rowNum).values = [
      metricsLeft[i][0], metricsLeft[i][1], metricsLeft[i][2],
      '',
      metricsRight[i][0], metricsRight[i][1], metricsRight[i][2],
    ];
    ws1.getRow(rowNum).eachCell((cell, col) => {
      if (col <= 3 || col >= 5) cell.style = STYLES.data;
      if (col === 2 || col === 6) cell.style = { ...STYLES.number, font: { bold: true, size: 11 } };
    });
  }

  // ─ Coûts d'acquisition ─
  ws1.mergeCells('A10:G10');
  ws1.getCell('A10').value = 'Coûts d\'Acquisition';
  ws1.getCell('A10').style = STYLES.header;

  ws1.getRow(11).values = ['Métrique', 'Valeur'];
  ws1.getRow(11).eachCell((cell) => { cell.style = STYLES.subheader; });

  const acqRows = [
    ['Cost Per Lead (CPL)', acquisitionCosts.costPerLead !== null ? formatCurrency(acquisitionCosts.costPerLead) : 'N/A'],
    ['Cost Per Sale (CPS)', acquisitionCosts.costPerSale !== null ? formatCurrency(acquisitionCosts.costPerSale) : 'N/A'],
    ['ROAS', acquisitionCosts.roas !== null ? formatPercent(acquisitionCosts.roas) : 'N/A'],
    ['Total Leads', acquisitionCosts.totalLeads.toLocaleString('fr-FR')],
    ['Conversions confirmées', acquisitionCosts.totalConfirmedConversions.toLocaleString('fr-FR')],
  ];

  for (let i = 0; i < acqRows.length; i++) {
    const rowNum = 12 + i;
    ws1.getRow(rowNum).values = acqRows[i];
    ws1.getRow(rowNum).eachCell((cell) => { cell.style = STYLES.data; });
  }

  // ─ Top / Bottom ─
  ws1.mergeCells('A19:G19');
  ws1.getCell('A19').value = 'Top 5 Campagnes';
  ws1.getCell('A19').style = STYLES.header;

  ws1.getRow(20).values = ['Campagne', 'ROI', 'Profit', 'Revenu', 'Coût', 'Ventes'];
  ws1.getRow(20).eachCell((cell) => { cell.style = STYLES.subheader; });

  for (let i = 0; i < Math.min(topCampaignsByRoi.length, 5); i++) {
    const c = topCampaignsByRoi[i];
    ws1.getRow(21 + i).values = [
      c.name,
      formatPercent(c.roiPercent),
      formatCurrency(c.netProfit),
      formatCurrency(c.totalRevenue),
      formatCurrency(c.totalCost),
      c.confirmedSalesCount,
    ];
    ws1.getRow(21 + i).eachCell((cell) => { cell.style = STYLES.data; });
  }

  // Largeur colonnes
  ws1.getColumn(1).width = 25;
  ws1.getColumn(2).width = 22;
  ws1.getColumn(3).width = 18;
  ws1.getColumn(4).width = 4;
  ws1.getColumn(5).width = 25;
  ws1.getColumn(6).width = 22;
  ws1.getColumn(7).width = 18;

  // ── Feuille 2 : Rentabilité par Objectif ─────────────────────────────
  const ws2 = wb.addWorksheet('Par Objectif', {
    properties: { tabColor: { argb: 'FF2E75B6' } },
    pageSetup: { orientation: 'landscape', fitToPage: true },
  });

  ws2.mergeCells('A1:G1');
  ws2.getCell('A1').value = 'Rentabilité par Objectif';
  ws2.getCell('A1').style = STYLES.titleRow;

  ws2.getRow(3).values = ['Objectif', 'Campagnes', 'Budget', 'Revenu', 'Coût', 'Profit', 'ROI'];
  ws2.getRow(3).eachCell((cell) => { cell.style = STYLES.subheader; });

  for (let i = 0; i < profitabilityByObjective.length; i++) {
    const obj = profitabilityByObjective[i];
    ws2.getRow(4 + i).values = [
      obj.objectiveLabel,
      obj.campaignCount,
      formatCurrency(obj.totalBudget),
      formatCurrency(obj.totalRevenueFromConversions),
      formatCurrency(obj.totalCost),
      formatCurrency(obj.totalProfit),
      formatPercent(obj.roiPercent),
    ];
    ws2.getRow(4 + i).eachCell((cell) => { cell.style = STYLES.data; });
  }

  ws2.getColumn(1).width = 30;
  ws2.getColumn(2).width = 14;
  ws2.getColumn(3).width = 20;
  ws2.getColumn(4).width = 20;
  ws2.getColumn(5).width = 20;
  ws2.getColumn(6).width = 20;
  ws2.getColumn(7).width = 16;

  // ── Feuille 3 : Campagnes Performantes ──────────────────────────────
  if (topCampaignsByRoi.length > 0) {
    const ws3 = wb.addWorksheet('Top Campagnes', {
      properties: { tabColor: { argb: 'FF22C55E' } },
      pageSetup: { orientation: 'landscape', fitToPage: true },
    });

    ws3.mergeCells('A1:F1');
    ws3.getCell('A1').value = 'Top 5 Campagnes par ROI';
    ws3.getCell('A1').style = STYLES.titleRow;

    ws3.getRow(3).values = ['Campagne', 'ROI', 'Profit Net', 'Revenu', 'Coût', 'Ventes'];
    ws3.getRow(3).eachCell((cell) => { cell.style = STYLES.subheader; });

    for (let i = 0; i < topCampaignsByRoi.length; i++) {
      const c = topCampaignsByRoi[i];
      ws3.getRow(4 + i).values = [
        c.name,
        formatPercent(c.roiPercent),
        formatCurrency(c.netProfit),
        formatCurrency(c.totalRevenue),
        formatCurrency(c.totalCost),
        c.confirmedSalesCount,
      ];
      ws3.getRow(4 + i).eachCell((cell) => { cell.style = STYLES.data; });
    }

    ws3.getColumn(1).width = 35;
    ws3.getColumn(2).width = 16;
    ws3.getColumn(3).width = 20;
    ws3.getColumn(4).width = 20;
    ws3.getColumn(5).width = 20;
    ws3.getColumn(6).width = 10;
  }

  // ── Feuille 4 : Campagnes non performantes ──────────────────────────
  if (bottomCampaignsByRoi.length > 0) {
    const ws4 = wb.addWorksheet('Campagnes en difficulté', {
      properties: { tabColor: { argb: 'FFEF4444' } },
      pageSetup: { orientation: 'landscape', fitToPage: true },
    });

    ws4.mergeCells('A1:F1');
    ws4.getCell('A1').value = 'Campagnes avec ROI négatif';
    ws4.getCell('A1').style = STYLES.titleRow;

    ws4.getRow(3).values = ['Campagne', 'ROI', 'Profit Net', 'Revenu', 'Coût', 'Ventes'];
    ws4.getRow(3).eachCell((cell) => { cell.style = STYLES.subheader; });

    for (let i = 0; i < bottomCampaignsByRoi.length; i++) {
      const c = bottomCampaignsByRoi[i];
      ws4.getRow(4 + i).values = [
        c.name,
        formatPercent(c.roiPercent),
        formatCurrency(c.netProfit),
        formatCurrency(c.totalRevenue),
        formatCurrency(c.totalCost),
        c.confirmedSalesCount,
      ];
      ws4.getRow(4 + i).eachCell((cell) => { cell.style = STYLES.data; });
    }

    ws4.getColumn(1).width = 35;
    ws4.getColumn(2).width = 16;
    ws4.getColumn(3).width = 20;
    ws4.getColumn(4).width = 20;
    ws4.getColumn(5).width = 20;
    ws4.getColumn(6).width = 10;
  }

  return (await wb.xlsx.writeBuffer()) as unknown as Buffer;
}
