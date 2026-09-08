import prisma from '../infrastructure/prisma/client';
import ExcelJS from 'exceljs';
import {
  getSalesAmountByArticle,
  getMonthlySoldQuantitiesByArticle,
  getSoldQuantitiesByArticle,
  getCurrentStockByArticle,
  ArticleCodeRef,
} from './x3Sales.service';

interface SalesMonthColumn {
  label: string;      // "Ventes Mai" (en-tête export Excel)
  monthLabel: string; // "Mai 2026" (affichage page détail)
  key: string;        // 'YYYY-MM'
}

/**
 * Calcule la fenêtre des 3 mois calendaires complets qui précèdent le mois de la
 * date de référence (début de campagne) ainsi que les 3 colonnes mensuelles associées.
 * Ex. référence = 01/08/2026 → fenêtre 01/05/2026 → 31/07/2026 (mai, juin, juillet).
 */
export function getPrecedingSalesMonths(refDate: Date): { columns: SalesMonthColumn[]; start: Date; end: Date } {
  // Premier jour du mois (mois de référence - 3)
  const start = new Date(refDate.getFullYear(), refDate.getMonth() - 3, 1);
  // Dernier jour du mois précédant le mois de référence (jour 0 du mois de référence)
  const end = new Date(refDate.getFullYear(), refDate.getMonth(), 0);

  const columns: SalesMonthColumn[] = [3, 2, 1].map((offset) => {
    const month = new Date(refDate.getFullYear(), refDate.getMonth() - offset, 1);
    const monthName = month.toLocaleDateString('fr-FR', { month: 'long' });
    const capitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    return {
      label: `Ventes ${capitalized}`,
      monthLabel: `${capitalized} ${month.getFullYear()}`,
      key: `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`,
    };
  });

  return { columns, start, end };
}

export interface CampaignMonthlySales {
  months: Array<{ key: string; monthLabel: string; quantity: number }>;
  startDate: Date;
  endDate: Date;
}

/**
 * Quantités vendues agrégées par mois pour les 3 mois calendaires complets précédant le
 * début de campagne (même fenêtre que l'export Excel). Source Sage X3.
 * En cas d'indisponibilité de X3 → mois renvoyés à 0 (non bloquant, cohérent avec l'export).
 */
export async function getCampaignSalesLast3Months(campaignId: number): Promise<CampaignMonthlySales> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      startDate: true,
      articles: { select: { id: true, codeSageX3: true, codeSage100: true } },
    },
  });

  if (!campaign || !campaign.startDate) {
    return { months: [], startDate: new Date(), endDate: new Date() };
  }

  const salesMonths = getPrecedingSalesMonths(campaign.startDate);

  const articleRefs: ArticleCodeRef[] = campaign.articles
    .filter(a => a.codeSage100 || a.codeSageX3)
    .map(a => ({ articleId: a.id, codeSage100: a.codeSage100, codeSageX3: a.codeSageX3 }));

  let monthlyByArticle: Record<number, Record<string, number>> = {};
  if (articleRefs.length > 0) {
    try {
      monthlyByArticle = await getMonthlySoldQuantitiesByArticle(articleRefs, salesMonths.start, salesMonths.end);
    } catch (error) {
      console.error('Erreur ventes des 3 derniers mois:', error);
    }
  }

  const months = salesMonths.columns.map(col => ({
    key: col.key,
    monthLabel: col.monthLabel,
    quantity: campaign.articles.reduce(
      (sum, a) => sum + (monthlyByArticle[a.id]?.[col.key] ?? 0),
      0,
    ),
  }));

  return { months, startDate: salesMonths.start, endDate: salesMonths.end };
}

/**
 * Génère un fichier Excel (.xlsx) contenant les informations et quantités d'une campagne marketing.
 * @param campaignId ID de la campagne
 * @returns Buffer du fichier Excel généré
 */

export async function exportCampaignToExcel(campaignId: number): Promise<{ buffer: Buffer, fileName: string }> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      objective: { select: { label: true } },
      articles: {
        select: {
          id: true, designation: true, plannedQuantity: true,
          quantityAtCreation: true, quantityAtStart: true,
          quantityAtClosure: true, soldQuantity: true, currentQuantity: true,
          codeSageX3: true, codeSage100: true,
        },
      },
    },
  });

  if (!campaign) throw new Error('Campagne introuvable');

  // Montants CA depuis Sage X3
  const articleRefs: ArticleCodeRef[] = campaign.articles
    .filter(a => a.codeSage100 || a.codeSageX3)
    .map(a => ({ articleId: a.id, codeSage100: a.codeSage100, codeSageX3: a.codeSageX3 }));

  let salesAmountByArticleId: Record<number, number> = {};
  if (articleRefs.length > 0 && campaign.startDate && campaign.endDate) {
    try {
      salesAmountByArticleId = await getSalesAmountByArticle(articleRefs, campaign.startDate, campaign.endDate);
    } catch (error) {
      console.error('Erreur montants de vente:', error);
    }
  }

  // Ventes des 3 mois précédant le début de campagne (quantités par mois, source Sage X3)
  const salesMonths = getPrecedingSalesMonths(campaign.startDate);
  let monthlyQtyByArticle: Record<number, Record<string, number>> = {};
  if (articleRefs.length > 0) {
    try {
      monthlyQtyByArticle = await getMonthlySoldQuantitiesByArticle(articleRefs, salesMonths.start, salesMonths.end);
    } catch (error) {
      console.error('Erreur quantités mensuelles de vente:', error);
    }
  }

  // Lecture LIVE Sage X3 des ventes & stocks au moment de l'export (cohérence avec Montant).
  // Si X3 est indisponible → repli silencieux sur les dernières valeurs synchronisées en base.
  let liveStockByArticleId: Record<number, number> = {};
  if (articleRefs.length > 0) {
    try {
      liveStockByArticleId = await getCurrentStockByArticle(articleRefs);
    } catch (error) {
      console.error('Erreur lecture live du stock (repli base):', error);
    }
  }

  let liveSoldByArticleId: Record<number, number> = {};
  if (articleRefs.length > 0 && campaign.startDate && campaign.endDate) {
    try {
      const effectiveEnd = campaign.endDate > new Date() ? new Date() : campaign.endDate;
      liveSoldByArticleId = await getSoldQuantitiesByArticle(articleRefs, campaign.startDate, effectiveEnd);
    } catch (error) {
      console.error('Erreur lecture live des ventes (repli base):', error);
    }
  }

  const headers = [
    'Désignation',
    ...salesMonths.columns.map(c => c.label),
    'Quantité prévue', 'Quantité à la création', 'Quantité au démarrage',
    'Quantité courante', 'Quantité vendue', 'Quantité à la clôture',
    'Montant (FCFA) total perçu pendant la période',
  ];

  const data = campaign.articles.map(a => [
    a.designation,
    ...salesMonths.columns.map(c => monthlyQtyByArticle[a.id]?.[c.key] ?? 0),
    a.plannedQuantity ?? 0, a.quantityAtCreation ?? 0, a.quantityAtStart ?? 0,
    liveStockByArticleId[a.id] ?? a.currentQuantity ?? 0,
    liveSoldByArticleId[a.id] ?? a.soldQuantity ?? 0,
    a.quantityAtClosure ?? 0,
    salesAmountByArticleId[a.id] ?? 0,
  ]);

  // Création du classeur avec exceljs
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Campaign App';
  wb.created = new Date();
  const ws = wb.addWorksheet('Quantités Campagne', {
    properties: { tabColor: { argb: 'FF1F4E79' } },
    pageSetup: { orientation: 'landscape', fitToPage: true },
  });

  const lastCol = headers.length - 1;
  const nbData = data.length;
  const headerRowNum = 8; // ligne 8 (indexée à 1)
  const totalRowNum = headerRowNum + 1 + nbData;

  // ─── STYLES ───
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

  // ─── LIGNE 1 : Titre ───
  ws.mergeCells(1, 1, 1, lastCol + 1);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = campaign.name;
  titleCell.font = { bold: true, size: 16, color: { argb: white }, name: 'Calibri' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: blueDark } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 36;

  // ─── LIGNES 2-6 : Infos ───
  const infoData = [
    `Statut : ${campaign.status}`,
    `Description : ${campaign.description || '-'}`,
    `Objectif : ${campaign.objective?.label || '-'}`,
    `Période : du ${campaign.startDate ? new Date(campaign.startDate).toLocaleDateString('fr-FR') : '-'} au ${campaign.endDate ? new Date(campaign.endDate).toLocaleDateString('fr-FR') : '-'}`,
  ];

  infoData.forEach((text, i) => {
    const rowNum = i + 2;
    ws.mergeCells(rowNum, 1, rowNum, lastCol + 1);
    const cell = ws.getCell(rowNum, 1);
    const isPeriodRow = i === 3; // Dernière ligne = Période
    cell.value = text;
    cell.font = {
      size: isPeriodRow ? 12 : 11,
      bold: isPeriodRow,
      color: { argb: isPeriodRow ? blueDark : darkText },
      name: 'Calibri',
    };
    cell.fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: isPeriodRow ? blueLight : grayBg },
    };
    cell.alignment = { vertical: 'middle' };
    ws.getRow(rowNum).height = isPeriodRow ? 26 : 22;
  });

  // Coloriser le statut (ligne 2) en vert si ACTIVE
  if (campaign.status === 'ACTIVE') {
    const statusCell = ws.getCell(2, 1);
    statusCell.font = { bold: true, size: 11, color: { argb: white }, name: 'Calibri' };
    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: green } };
  }

  // ─── LIGNE 7 : Bandeau « Trois derniers mois » ───
  const salesBannerRow = 7;
  const salesColStart = 2; // 1ère colonne des 3 mois (après Désignation)
  const salesColEnd = salesColStart + salesMonths.columns.length - 1;
  ws.mergeCells(salesBannerRow, salesColStart, salesBannerRow, salesColEnd);
  const bannerCell = ws.getCell(salesBannerRow, salesColStart);
  bannerCell.value = 'Trois derniers mois';
  bannerCell.font = { bold: true, size: 11, color: { argb: white }, name: 'Calibri' };
  bannerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: green } };
  bannerCell.alignment = { horizontal: 'center', vertical: 'middle' };
  bannerCell.border = {
    top: { style: 'thin', color: { argb: green } },
    bottom: { style: 'thin', color: { argb: green } },
    left: { style: 'thin', color: { argb: green } },
    right: { style: 'thin', color: { argb: green } },
  };
  ws.getRow(salesBannerRow).height = 20;

  // ─── LIGNE 8 : En-têtes ───
  const headerRow = ws.getRow(headerRowNum);
  headerRow.height = 28;
  headers.forEach((h, i) => {
    const col = i + 1;
    // Les 3 colonnes « Ventes … » sont mises en vert pour attirer l'attention
    const isSalesMonth = i >= salesColStart - 1 && i < salesColStart - 1 + salesMonths.columns.length;
    const headerColor = isSalesMonth ? green : blueDark;
    const cell = ws.getCell(headerRowNum, col);
    cell.value = h;
    cell.font = { bold: true, size: 11, color: { argb: white }, name: 'Calibri' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColor } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: headerColor } },
      bottom: { style: 'medium', color: { argb: headerColor } },
      left: { style: 'thin', color: { argb: headerColor } },
      right: { style: 'thin', color: { argb: headerColor } },
    };
  });

  // ─── LIGNES DE DONNÉES ───
  data.forEach((row, rIdx) => {
    const rowNum = headerRowNum + 1 + rIdx;
    const isEven = rIdx % 2 === 0;
    const excelRow = ws.getRow(rowNum);
    excelRow.height = 22;

    row.forEach((val, cIdx) => {
      const col = cIdx + 1;
      const cell = ws.getCell(rowNum, col);
      const isMontant = cIdx === lastCol;
      const isDesignation = cIdx === 0;

      cell.value = val;
      cell.font = {
        size: 10, name: 'Calibri',
        ...(isMontant && val ? { bold: true, color: { argb: blueDark } } : {}),
      };
      cell.fill = {
        type: 'pattern', pattern: 'solid',
        fgColor: { argb: isEven ? white : 'FFF5F8FC' },
      };
      cell.alignment = {
        horizontal: isDesignation ? 'left' : 'right',
        vertical: 'middle',
      };
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

    for (let c = 2; c <= lastCol + 1; c++) {
      let sum = 0;
      data.forEach(d => { const v = Number(d[c - 1]); if (!isNaN(v)) sum += v; });
      const cell = ws.getCell(totalRowNum, c);
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
  ws.getColumn(1).width = 48;  // Désignation
  ws.getColumn(2).width = 16;  // Ventes M-3
  ws.getColumn(3).width = 16;  // Ventes M-2
  ws.getColumn(4).width = 16;  // Ventes M-1
  ws.getColumn(5).width = 18;  // Qté prévue
  ws.getColumn(6).width = 20;  // Qté création
  ws.getColumn(7).width = 20;  // Qté démarrage
  ws.getColumn(8).width = 18;  // Qté courante
  ws.getColumn(9).width = 18;  // Qté vendue
  ws.getColumn(10).width = 20; // Qté clôture
  ws.getColumn(11).width = 30; // Montant (FCFA)

  // ─── AUTO-FILTRE ───
  if (nbData > 0) {
    ws.autoFilter = {
      from: { row: headerRowNum, column: 1 },
      to: { row: headerRowNum, column: lastCol + 1 },
    };
  }

  // ─── FIGER LA LIGNE D'EN-TÊTE ───
  ws.views = [
    { state: 'frozen', ySplit: headerRowNum, activeCell: `A${headerRowNum + 1}` },
  ];

  // Génération du buffer
  const buffer = await wb.xlsx.writeBuffer() as unknown as Buffer;
  const safeName = campaign.name.replace(/[^a-zA-Z0-9-_]/g, '_');
  return { buffer, fileName: `${safeName}.xlsx` };
}

/**
 * Génère un fichier Excel multi-feuilles pour plusieurs campagnes.
 * Chaque campagne a sa propre feuille avec le même format que exportCampaignToExcel.
 */
export async function exportMultipleCampaignsToExcel(
  campaigns: Array<{ id: number; startDate: Date; endDate: Date; name: string; status: string; description?: string | null; objective?: { label?: string } | null }>,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Campaign App';
  wb.created = new Date();

  for (const c of campaigns) {
    const articles = await prisma.article.findMany({
      where: { campaignId: c.id },
      select: {
        id: true, designation: true, plannedQuantity: true,
        quantityAtCreation: true, quantityAtStart: true,
        quantityAtClosure: true, soldQuantity: true, currentQuantity: true,
        codeSageX3: true, codeSage100: true,
      },
    });

    const articleRefs: ArticleCodeRef[] = articles
      .filter(a => a.codeSage100 || a.codeSageX3)
      .map(a => ({ articleId: a.id, codeSage100: a.codeSage100, codeSageX3: a.codeSageX3 }));

    let salesAmounts: Record<number, number> = {};
    if (articleRefs.length > 0 && c.startDate && c.endDate) {
      try {
        const effectiveEnd = c.endDate > new Date() ? new Date() : c.endDate;
        salesAmounts = await getSalesAmountByArticle(articleRefs, c.startDate, effectiveEnd);
      } catch { /* silence */ }
    }

    // Ventes des 3 mois précédant le début de campagne (quantités par mois, source Sage X3)
    const salesMonths = getPrecedingSalesMonths(c.startDate);
    let monthlyQtyByArticle: Record<number, Record<string, number>> = {};
    if (articleRefs.length > 0) {
      try {
        monthlyQtyByArticle = await getMonthlySoldQuantitiesByArticle(articleRefs, salesMonths.start, salesMonths.end);
      } catch { /* silence */ }
    }

    // Lecture LIVE Sage X3 des ventes & stocks au moment de l'export (cohérence avec Montant).
    // Si X3 est indisponible → repli silencieux sur les dernières valeurs synchronisées en base.
    let liveSoldByArticleId: Record<number, number> = {};
    let liveStockByArticleId: Record<number, number> = {};
    if (articleRefs.length > 0) {
      if (c.startDate && c.endDate) {
        try {
          const effectiveEnd = c.endDate > new Date() ? new Date() : c.endDate;
          liveSoldByArticleId = await getSoldQuantitiesByArticle(articleRefs, c.startDate, effectiveEnd);
        } catch { /* silence */ }
      }
      try {
        liveStockByArticleId = await getCurrentStockByArticle(articleRefs);
      } catch { /* silence */ }
    }

    const sheetName = c.name.replace(/[^a-zA-Z0-9-_ àâäéèêëîïôöùûü]/g, '_').substring(0, 31);
    const ws = wb.addWorksheet(sheetName || 'Campagne');

    const headers = [
      'Désignation',
      ...salesMonths.columns.map(c => c.label),
      'Quantité prévue', 'Quantité à la création', 'Quantité au démarrage',
      'Quantité courante', 'Quantité vendue', 'Quantité à la clôture',
      'Montant (FCFA) total perçu pendant la période',
    ];
    const data = articles.map(a => [
      a.designation,
      ...salesMonths.columns.map(c => monthlyQtyByArticle[a.id]?.[c.key] ?? 0),
      a.plannedQuantity ?? 0, a.quantityAtCreation ?? 0, a.quantityAtStart ?? 0,
      liveStockByArticleId[a.id] ?? a.currentQuantity ?? 0,
      liveSoldByArticleId[a.id] ?? a.soldQuantity ?? 0,
      a.quantityAtClosure ?? 0,
      salesAmounts[a.id] ?? 0,
    ]);

    const lastCol = headers.length - 1;
    const nbData = data.length;
    const headerRowNum = 8;
    const totalRowNum = headerRowNum + 1 + nbData;

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

    // Titre
    ws.mergeCells(1, 1, 1, lastCol + 1);
    const t = ws.getCell(1, 1);
    t.value = c.name;
    t.font = { bold: true, size: 16, color: { argb: white }, name: 'Calibri' };
    t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: blueDark } };
    t.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 36;

    // Infos
    const infoData = [
      `Statut : ${c.status}`,
      `Description : ${c.description || '-'}`,
      `Objectif : ${c.objective?.label || '-'}`,
      `Période : du ${new Date(c.startDate).toLocaleDateString('fr-FR')} au ${new Date(c.endDate).toLocaleDateString('fr-FR')}`,
    ];
    infoData.forEach((text, i) => {
      const rn = i + 2;
      ws.mergeCells(rn, 1, rn, lastCol + 1);
      const cell = ws.getCell(rn, 1);
      const isPeriodRow = i === 3; // Dernière ligne = Période
      cell.value = text;
      cell.font = {
        size: isPeriodRow ? 12 : 11,
        bold: isPeriodRow,
        color: { argb: isPeriodRow ? blueDark : darkText },
        name: 'Calibri',
      };
      cell.fill = {
        type: 'pattern', pattern: 'solid',
        fgColor: { argb: isPeriodRow ? blueLight : grayBg },
      };
      cell.alignment = { vertical: 'middle' };
      ws.getRow(rn).height = isPeriodRow ? 26 : 22;
    });

    if (c.status === 'ACTIVE') {
      const sc = ws.getCell(2, 1);
      sc.font = { bold: true, size: 11, color: { argb: white }, name: 'Calibri' };
      sc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: green } };
    }

    // Ligne 7 : Bandeau « Trois derniers mois » (au-dessus des 3 colonnes ventes)
    const salesBannerRow = 7;
    const salesColStart = 2; // 1ère colonne des 3 mois (après Désignation)
    const salesColEnd = salesColStart + salesMonths.columns.length - 1;
    ws.mergeCells(salesBannerRow, salesColStart, salesBannerRow, salesColEnd);
    const bannerCell = ws.getCell(salesBannerRow, salesColStart);
    bannerCell.value = 'Trois derniers mois';
    bannerCell.font = { bold: true, size: 11, color: { argb: white }, name: 'Calibri' };
    bannerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: green } };
    bannerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    bannerCell.border = {
      top: { style: 'thin', color: { argb: green } },
      bottom: { style: 'thin', color: { argb: green } },
      left: { style: 'thin', color: { argb: green } },
      right: { style: 'thin', color: { argb: green } },
    };
    ws.getRow(salesBannerRow).height = 20;

    // En-têtes
    const hr = ws.getRow(headerRowNum);
    hr.height = 28;
    headers.forEach((h, i) => {
      // Les 3 colonnes « Ventes … » sont mises en vert pour attirer l'attention
      const isSalesMonth = i >= salesColStart - 1 && i < salesColStart - 1 + salesMonths.columns.length;
      const headerColor = isSalesMonth ? green : blueDark;
      const cell = ws.getCell(headerRowNum, i + 1);
      cell.value = h;
      cell.font = { bold: true, size: 11, color: { argb: white }, name: 'Calibri' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColor } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: headerColor } },
        bottom: { style: 'medium', color: { argb: headerColor } },
        left: { style: 'thin', color: { argb: headerColor } },
        right: { style: 'thin', color: { argb: headerColor } },
      };
    });

    // Données
    data.forEach((row, rIdx) => {
      const rn = headerRowNum + 1 + rIdx;
      ws.getRow(rn).height = 22;
      row.forEach((val, cIdx) => {
        const cell = ws.getCell(rn, cIdx + 1);
        const isMontant = cIdx === lastCol;
        cell.value = val;
        cell.font = {
          size: 10, name: 'Calibri',
          ...(isMontant && val ? { bold: true, color: { argb: blueDark } } : {}),
        };
        cell.fill = {
          type: 'pattern', pattern: 'solid',
          fgColor: { argb: rIdx % 2 === 0 ? white : 'FFF5F8FC' },
        };
        cell.alignment = { horizontal: cIdx === 0 ? 'left' : 'right', vertical: 'middle' };
        cell.border = thinBorder;
        if (cIdx > 0) cell.numFmt = '#,##0';
      });
    });

    // Total
    if (nbData > 0) {
      const row = ws.getRow(totalRowNum);
      row.height = 26;
      const tl = ws.getCell(totalRowNum, 1);
      tl.value = 'TOTAL';
      tl.font = { bold: true, size: 11, color: { argb: blueDark }, name: 'Calibri' };
      tl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: blueLight } };
      tl.alignment = { horizontal: 'left', vertical: 'middle' };
      tl.border = {
        top: { style: 'medium', color: { argb: blueDark } },
        bottom: { style: 'medium', color: { argb: blueDark } },
        left: { style: 'thin', color: { argb: borderGray } },
        right: { style: 'thin', color: { argb: borderGray } },
      };

      for (let ci = 2; ci <= lastCol + 1; ci++) {
        let sum = 0;
        data.forEach(d => { const v = Number(d[ci - 1]); if (!isNaN(v)) sum += v; });
        const cell = ws.getCell(totalRowNum, ci);
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

    // Largeurs
    ws.getColumn(1).width = 48;
    ws.getColumn(2).width = 16;
    ws.getColumn(3).width = 16;
    ws.getColumn(4).width = 16;
    ws.getColumn(5).width = 18;
    ws.getColumn(6).width = 20;
    ws.getColumn(7).width = 20;
    ws.getColumn(8).width = 18;
    ws.getColumn(9).width = 18;
    ws.getColumn(10).width = 20;
    ws.getColumn(11).width = 30;

    if (nbData > 0) {
      ws.autoFilter = { from: { row: headerRowNum, column: 1 }, to: { row: headerRowNum, column: lastCol + 1 } };
    }
    ws.views = [{ state: 'frozen', ySplit: headerRowNum, activeCell: `A${headerRowNum + 1}` }];
  }

  return await wb.xlsx.writeBuffer() as unknown as Buffer;
}
