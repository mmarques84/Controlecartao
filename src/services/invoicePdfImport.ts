export type InvoiceImportItem = {
  id: string;
  selected: boolean;
  description: string;
  category: string;
  amount: number;
  purchaseDate: string;
  rawLine: string;
  installmentLabel: string;
};

const IGNORE_WORDS = [
  'total',
  'pagamento',
  'saldo',
  'limite',
  'vencimento',
  'fatura',
  'encargos',
  'juros',
  'iof',
  'anuidade',
  'cashback'
];

const CATEGORY_RULES = [
  { category: 'Mercado', words: ['mercado', 'super', 'hiper', 'atacad', 'carrefour', 'assai', 'extra'] },
  { category: 'Farmacia', words: ['farmacia', 'drogaria', 'droga', 'raia', 'pacheco'] },
  { category: 'Transporte', words: ['uber', '99', 'posto', 'combust', 'shell', 'ipiranga', 'petrobras'] },
  { category: 'Alimentacao', words: ['ifood', 'restaurante', 'burger', 'pizza', 'lanch', 'padaria'] },
  { category: 'Assinaturas', words: ['netflix', 'spotify', 'google', 'apple', 'prime', 'amazon', 'disney'] },
  { category: 'Saude', words: ['clinica', 'medico', 'laboratorio', 'hospital'] },
  { category: 'Educacao', words: ['curso', 'faculdade', 'escola', 'alura', 'udemy'] }
];

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function parseAmount(value: string) {
  const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  return Number(normalized || 0);
}

function toIsoDate(dateText: string, fallbackYear: number) {
  const [day, month, year] = dateText.split(/[/-]/).map(Number);
  const resolvedYear = year && year > 99 ? year : fallbackYear;

  if (!day || !month || day > 31 || month > 12) {
    return '';
  }

  return `${resolvedYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function inferCategory(description: string) {
  const normalized = normalizeText(description);
  const match = CATEGORY_RULES.find((rule) => rule.words.some((word) => normalized.includes(word)));
  return match?.category ?? 'Outros';
}

function cleanupDescription(value: string) {
  return value
    .replace(/\b\d{1,2}\/\d{1,2}\b/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[-–—|]+$/g, '')
    .trim();
}

function shouldIgnoreLine(line: string) {
  const normalized = normalizeText(line);
  return IGNORE_WORDS.some((word) => normalized.includes(word));
}

function parseLine(line: string, index: number, fallbackYear: number): InvoiceImportItem | null {
  const cleanLine = line.replace(/\s+/g, ' ').trim();

  if (cleanLine.length < 8 || shouldIgnoreLine(cleanLine)) {
    return null;
  }

  const amountMatches = [...cleanLine.matchAll(/(?:R\$\s*)?(-?\d{1,3}(?:\.\d{3})*,\d{2})/g)];
  const amountMatch = amountMatches[amountMatches.length - 1];

  if (!amountMatch?.[1]) {
    return null;
  }

  const amount = Math.abs(parseAmount(amountMatch[1]));

  if (!amount || amount > 100000) {
    return null;
  }

  const beforeAmount = cleanLine.slice(0, amountMatch.index).trim();
  const dateMatch = beforeAmount.match(/\b(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\b/);
  const purchaseDate = dateMatch ? toIsoDate(dateMatch[1], fallbackYear) : '';

  if (!purchaseDate) {
    return null;
  }

  const installmentMatch = beforeAmount.match(/\b(\d{1,2}\/\d{1,2})\b/);
  const description = cleanupDescription(beforeAmount.replace(dateMatch[0], ''));

  if (!description || description.length < 3) {
    return null;
  }

  return {
    id: `${index}-${purchaseDate}-${amount}`,
    selected: true,
    description,
    category: inferCategory(description),
    amount,
    purchaseDate,
    rawLine: cleanLine,
    installmentLabel: installmentMatch?.[1] ?? ''
  };
}

async function loadPdfJs() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  return pdfjs as any;
}

function buildLines(items: any[]) {
  const rows = new Map<number, { y: number; parts: { x: number; text: string }[] }>();

  items.forEach((item) => {
    const text = String(item.str || '').trim();

    if (!text) {
      return;
    }

    const x = Math.round(item.transform?.[4] || 0);
    const y = Math.round(item.transform?.[5] || 0);
    const key = Math.round(y / 3) * 3;
    const row = rows.get(key) ?? { y, parts: [] };

    row.parts.push({ x, text });
    rows.set(key, row);
  });

  return [...rows.values()]
    .sort((a, b) => b.y - a.y)
    .map((row) => row.parts.sort((a, b) => a.x - b.x).map((part) => part.text).join(' '))
    .filter(Boolean);
}

export async function extractInvoiceItemsFromPdf(file: File, fallbackYear = new Date().getFullYear()) {
  const buffer = await file.arrayBuffer();
  const pdfjs = await loadPdfJs();
  const document = await pdfjs.getDocument({ data: new Uint8Array(buffer), disableWorker: true }).promise;
  const lines: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    lines.push(...buildLines(content.items));
  }

  const parsed = lines
    .map((line, index) => parseLine(line, index, fallbackYear))
    .filter(Boolean) as InvoiceImportItem[];

  const unique = new Map<string, InvoiceImportItem>();
  parsed.forEach((item) => {
    const key = `${item.purchaseDate}-${item.description}-${item.amount}`;
    if (!unique.has(key)) {
      unique.set(key, item);
    }
  });

  return {
    items: [...unique.values()],
    lineCount: lines.length
  };
}
