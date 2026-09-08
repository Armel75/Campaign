import * as XLSX from 'xlsx';

/**
 * Moteur de détection « intelligente » des colonnes pour l'import de leads.
 *
 * Trois couches sont combinées pour mapper une colonne du fichier vers un
 * champ de la base (comportement « type IA ») :
 *   1. En-têtes : normalisation (accents, casse, ponctuation) + synonymes
 *      étendus + similarité de tokens (Dice) + sous-chaîne.
 *   2. Contenu  : analyse des valeurs réellement présentes dans la colonne
 *      (format email / téléphone / statut / nom) — reconnaît par ex. une
 *      colonne « CONTACTS » remplie de numéros comme un téléphone.
 *   3. BDD      : validation croisée pour « campagne » et « utilisateur GLPI »
 *      en confrontant les valeurs de la colonne aux données existantes.
 *
 * Le résultat fournit, pour chaque champ, le meilleur mapping avec un score
 * de confiance (0..1) et la liste des candidats (utile pour la correction
 * manuelle côté UI).
 */

export const LEAD_FIELDS = [
  'campaign',
  'name',
  'email',
  'phone',
  'status',
  'assignedTo',
  'notes',
] as const;

export type LeadField = (typeof LEAD_FIELDS)[number];

/** Champs obligatoires pour pouvoir importer un lead. */
export const REQUIRED_LEAD_FIELDS: LeadField[] = ['campaign', 'name'];

export interface ColumnCandidate {
  header: string;
  score: number;
  headerScore: number;
  contentScore: number;
  method: 'header' | 'content' | 'both';
}

export interface ColumnDetectionResult {
  colMap: Partial<Record<LeadField, string>>;
  confidence: Partial<Record<LeadField, number>>;
  candidates: Record<LeadField, ColumnCandidate[]>;
  missingRequired: LeadField[];
}

/** Résolveurs asynchrones vers la base (implémentés côté route). */
export interface LeadColumnResolvers {
  resolveCampaignIds: (values: string[]) => Promise<Record<string, number>>;
  resolveGlpiUserIds: (values: string[]) => Promise<Record<string, number>>;
}

export interface ParsedSheet {
  headers: string[];
  rows: Record<string, any>[];
  /** Numéro de ligne Excel (1-based) de la ligne d'en-tête détectée. */
  headerRowNumber: number;
}

function cellText(v: unknown): string {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

export function normalizeHeaderKey(key: string): string {
  return String(key ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────
// Synonymes par champ (en-têtes français/anglais, communs en entreprise)
// ─────────────────────────────────────────────────────────────────────────
const FIELD_ALIASES: Record<LeadField, string[]> = {
  campaign: [
    'campagne',
    'campaign',
    'nom campagne',
    'nom de la campagne',
    'id campagne',
    'code campagne',
    'libelle campagne',
    'campagne commerciale',
  ],
  name: [
    'nom',
    'name',
    'nom du client',
    'nom client',
    'client',
    'nom du prospect',
    'prospect',
    'raison sociale',
    'nom complet',
    'nom et prenom',
    'prenom et nom',
    'nom du contact',
    'contact nom',
  ],
  email: [
    'email',
    'mail',
    'courriel',
    'adresse email',
    'adresse mail',
    'e mail',
    'email client',
    'mail client',
  ],
  phone: [
    'telephone',
    'tel',
    'phone',
    'portable',
    'mobile',
    'gsm',
    'contact',
    'contacts',
    'numero',
    'numero de telephone',
    'tel whatsapp',
    'numero whatsapp',
    'whatsapp',
    'telephone client',
  ],
  status: [
    'statut',
    'status',
    'etat',
    'situation',
    'etape',
    'etat du lead',
    'avancement',
    'phase',
  ],
  assignedTo: [
    'utilisateur glpi',
    'glpi',
    'assign',
    'assigne a',
    'responsable',
    'agent',
    'commercial',
    'charge de clientele',
    'charge de compte',
    'vendeur',
    'conseiller',
    'utilisateur',
    'attribue a',
  ],
  notes: [
    'notes',
    'note',
    'commentaire',
    'remarques',
    'remarque',
    'observations',
    'description',
    'details',
    'infos complementaires',
  ],
};

// ─────────────────────────────────────────────────────────────────────────
// Score sur l'en-tête
// ─────────────────────────────────────────────────────────────────────────
function tokenize(s: string): string[] {
  return s.split(' ').filter((t) => t.length > 0);
}

/** Similarité de Dice sur les tokens (0..1). */
function dice(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  let inter = 0;
  const seen = new Set<string>();
  for (const t of b) {
    if (!seen.has(t) && setA.has(t)) {
      inter += 1;
      seen.add(t);
    }
  }
  return (2 * inter) / (a.length + b.length);
}

function headerScoreForField(headerNorm: string, field: LeadField): number {
  let best = 0;
  for (const alias of FIELD_ALIASES[field]) {
    const a = normalizeHeaderKey(alias);
    if (!a) continue;
    if (headerNorm === a) {
      best = Math.max(best, 1);
      continue;
    }
    const d = dice(tokenize(headerNorm), tokenize(a));
    if (d >= 0.66) best = Math.max(best, 0.8);
    if (a.length >= 3 && headerNorm.length >= 3) {
      // L'en-tête contient l'alias ("NOM DU CLIENT" contient "nom") : fiable.
      if (headerNorm.includes(a)) {
        best = Math.max(best, 0.7);
      }
      // L'alias contient l'en-tête : uniquement si l'en-tête est assez explicite
      // (>= 4 lettres) pour éviter les faux positifs type « nom » → « nom campagne ».
      else if (a.includes(headerNorm) && headerNorm.length >= 4) {
        best = Math.max(best, 0.7);
      }
    }
  }
  return best;
}

// ─────────────────────────────────────────────────────────────────────────
// Score sur le contenu des cellules
// ─────────────────────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function looksLikeEmail(v: string): boolean {
  return EMAIL_RE.test(v);
}

function looksLikePhone(v: string): boolean {
  let s = String(v).replace(/[\s().\-/]/g, '');
  if (s.startsWith('+')) s = s.slice(1);
  return /^\d{7,15}$/.test(s);
}

const STATUS_VALUES = new Set([
  'nouveau',
  'contacte',
  'contacté',
  'qualifie',
  'qualifié',
  'converti',
  'perdu',
  'invalide',
]);

function looksLikeStatus(v: string): boolean {
  return STATUS_VALUES.has(String(v).trim().toLowerCase());
}

function looksLikeName(v: string): boolean {
  const s = String(v).trim();
  if (!s) return false;
  if (looksLikeEmail(s) || looksLikePhone(s)) return false;
  // au moins une lettre, pas de chiffre, longueur raisonnable
  return /\p{L}/u.test(s) && /^[^0-9]{2,}$/.test(s);
}

/** Échantillonne des valeurs distinctes non vides d'une colonne. */
function sampleColumnValues(
  rows: Record<string, any>[],
  header: string,
  max = 25,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of rows) {
    const v = row[header];
    const s = v === undefined || v === null ? '' : String(v).trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

function contentScoreForField(values: string[], field: LeadField): number {
  if (values.length === 0) return 0;
  let hit = 0;
  for (const v of values) {
    switch (field) {
      case 'email':
        if (looksLikeEmail(v)) hit += 1;
        break;
      case 'phone':
        if (looksLikePhone(v)) hit += 1;
        break;
      case 'status':
        if (looksLikeStatus(v)) hit += 1;
        break;
      case 'name':
        if (looksLikeName(v)) hit += 1;
        break;
      default:
        break;
    }
  }
  return hit / values.length;
}

// ─────────────────────────────────────────────────────────────────────────
// Localisation automatique de la ligne d'en-tête
// ─────────────────────────────────────────────────────────────────────────
function scoreHeaderRow(row: unknown[]): number {
  let score = 0;
  for (const cell of row) {
    const norm = normalizeHeaderKey(cellText(cell));
    if (!norm) continue;
    for (const field of LEAD_FIELDS) {
      const s = headerScoreForField(norm, field);
      if (s >= 0.7) score += 1;
      else if (s > 0) score += 0.5;
    }
  }
  return score;
}

/**
 * Analyse une feuille Excel/CSV : détecte la ligne d'en-tête (qui n'est pas
 * forcément la première ligne — ex. fichier avec titre en ligne 1), puis
 * construit les objets ligne à partir de cette ligne.
 */
export function parseSheet(sheet: XLSX.WorkSheet): ParsedSheet {
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
  }) as unknown[][];

  let bestIdx = 0;
  let bestScore = -1;
  const scanLimit = Math.min(raw.length, 15);
  for (let i = 0; i < scanLimit; i++) {
    const s = scoreHeaderRow(raw[i] ?? []);
    if (s > bestScore) {
      bestScore = s;
      bestIdx = i;
    }
  }

  if (bestScore <= 0) bestIdx = 0;

  const headerRow = (raw[bestIdx] ?? []).map(cellText);
  while (headerRow.length > 0 && headerRow[headerRow.length - 1] === '') {
    headerRow.pop();
  }

  const rows: Record<string, any>[] = [];
  for (let i = bestIdx + 1; i < raw.length; i++) {
    const line = raw[i] ?? [];
    if (line.length === 0 || line.every((c) => cellText(c) === '')) continue;
    const obj: Record<string, any> = {};
    for (let j = 0; j < headerRow.length; j++) {
      if (headerRow[j]) obj[headerRow[j]] = line[j] ?? '';
    }
    rows.push(obj);
  }

  return {
    headers: headerRow,
    rows,
    headerRowNumber: bestIdx + 1,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Détection principale
// ─────────────────────────────────────────────────────────────────────────
const MIN_SCORE = 0.35;

export async function detectColumnMap(
  headers: string[],
  rows: Record<string, any>[],
  resolvers: LeadColumnResolvers,
): Promise<ColumnDetectionResult> {
  const normalizedHeaders = headers.map(normalizeHeaderKey);
  const validIndexes = normalizedHeaders
    .map((h, i) => (h ? i : -1))
    .filter((i) => i >= 0);

  // 1) Scores de contenu (champs synchrones) par colonne
  const contentCache: Record<string, Partial<Record<LeadField, number>>> = {};
  for (const i of validIndexes) {
    const header = headers[i];
    const values = sampleColumnValues(rows, header);
    contentCache[header] = {
      email: contentScoreForField(values, 'email'),
      phone: contentScoreForField(values, 'phone'),
      status: contentScoreForField(values, 'status'),
      name: contentScoreForField(values, 'name'),
    };
  }

  // 2) Scores de contenu (campagne + GLPI) par croisement BDD — 2 requêtes max
  const sampledByHeader: Record<string, string[]> = {};
  const allValues = new Set<string>();
  for (const i of validIndexes) {
    const header = headers[i];
    const values = sampleColumnValues(rows, header);
    sampledByHeader[header] = values;
    values.forEach((v) => allValues.add(v));
  }
  const allValuesArr = [...allValues];
  const campaignMap = allValuesArr.length
    ? await resolvers.resolveCampaignIds(allValuesArr)
    : {};
  const glpiMap = allValuesArr.length
    ? await resolvers.resolveGlpiUserIds(allValuesArr)
    : {};

  const hitRatio = (map: Record<string, number>, header: string): number => {
    const values = sampledByHeader[header] ?? [];
    if (values.length === 0) return 0;
    let hit = 0;
    for (const v of values) if (map[v] !== undefined) hit += 1;
    return hit / values.length;
  };

  // 3) Combinaison en-tête + contenu
  const rawScores: Record<
    LeadField,
    Array<{
      header: string;
      headerScore: number;
      contentScore: number;
      combined: number;
    }>
  > = {
    campaign: [],
    name: [],
    email: [],
    phone: [],
    status: [],
    assignedTo: [],
    notes: [],
  };

  for (const field of LEAD_FIELDS) {
    for (const i of validIndexes) {
      const header = headers[i];
      const norm = normalizedHeaders[i];
      const headerScore = headerScoreForField(norm, field);
      let contentScore = 0;
      if (field === 'campaign') contentScore = hitRatio(campaignMap, header);
      else if (field === 'assignedTo') contentScore = hitRatio(glpiMap, header);
      else contentScore = contentCache[header]?.[field] ?? 0;

      let combined: number;
      if (headerScore > 0 && contentScore > 0) {
        combined = headerScore * 0.7 + contentScore * 0.3;
      } else {
        combined = Math.max(headerScore, contentScore);
      }
      rawScores[field].push({ header, headerScore, contentScore, combined });
    }
  }

  const candidates: Record<LeadField, ColumnCandidate[]> = {
    campaign: [],
    name: [],
    email: [],
    phone: [],
    status: [],
    assignedTo: [],
    notes: [],
  };

  for (const field of LEAD_FIELDS) {
    rawScores[field].sort((a, b) => b.combined - a.combined);
    candidates[field] = rawScores[field].slice(0, 3).map((c) => ({
      header: c.header,
      score: c.combined,
      headerScore: c.headerScore,
      contentScore: c.contentScore,
      method:
        c.headerScore > 0 && c.contentScore > 0
          ? 'both'
          : c.headerScore > 0
            ? 'header'
            : 'content',
    }));
  }

  // 4) Affectation gloutonne : chaque colonne sert au plus un champ,
  //    chaque champ prend le meilleur score global.
  //    Règle de fiabilité : si un champ a une correspondance d'en-tête, on
  //    ignore les colonnes détectées par le SEUL contenu (l'en-tête prime).
  const colMap: Partial<Record<LeadField, string>> = {};
  const confidence: Partial<Record<LeadField, number>> = {};
  const usedHeaders = new Set<string>();
  const assignedFields = new Set<LeadField>();

  const pairs: Array<{ field: LeadField; header: string; score: number }> = [];
  for (const field of LEAD_FIELDS) {
    const fieldScores = rawScores[field];
    const hasHeaderMatch = fieldScores.some((c) => c.headerScore > 0);
    for (const c of fieldScores) {
      if (hasHeaderMatch && c.headerScore <= 0) continue;
      pairs.push({ field, header: c.header, score: c.combined });
    }
  }
  pairs.sort((a, b) => b.score - a.score);

  for (const p of pairs) {
    if (assignedFields.has(p.field)) continue;
    if (usedHeaders.has(p.header)) continue;
    if (p.score < MIN_SCORE) continue;
    colMap[p.field] = p.header;
    confidence[p.field] = p.score;
    assignedFields.add(p.field);
    usedHeaders.add(p.header);
  }

  const missingRequired = REQUIRED_LEAD_FIELDS.filter((f) => !colMap[f]);

  return { colMap, confidence, candidates, missingRequired };
}
