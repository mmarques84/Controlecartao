type CardItem = {
  id: number;
  name: string;
};

export type PaymentMethod = 'card' | 'pix';

type TranscriptionResult = {
  description?: string;
  category?: string;
  amount?: number;
  installments?: number;
  paymentMethod: PaymentMethod;
  cardId?: number | null;
  purchaseDate: string;
  notes: string[];
};

const NUMBER_WORDS: Record<string, number> = {
  uma: 1,
  um: 1,
  duas: 2,
  dois: 2,
  tres: 3,
  três: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  onze: 11,
  doze: 12
};

const DESCRIPTION_KEYWORDS = [
  'mercado',
  'gasolina',
  'combustivel',
  'combustível',
  'roupa',
  'bebida',
  'farmacia',
  'farmácia',
  'curso',
  'restaurante',
  'lanche',
  'uber',
  'ifood',
  'internet',
  'luz',
  'academia',
  'seguro'
];

const CATEGORY_RULES = [
  {
    label: 'Mercado',
    keywords: ['mercado', 'supermercado', 'atacadao', 'assai', 'carrefour', 'extra', 'comida']
  },
  {
    label: 'Farmacia',
    keywords: ['farmacia', 'farmacia', 'remedio', 'drogaria', 'raia', 'drogasil', 'pharmacy', 'pharmace']
  },
  {
    label: 'Transporte',
    keywords: ['uber', '99', 'taxi', 'gasolina', 'combustivel', 'combustivel', 'posto', 'onibus', 'metro']
  },
  {
    label: 'Alimentacao',
    keywords: ['restaurante', 'lanche', 'ifood', 'pizza', 'hamburguer', 'bebida', 'bar', 'padaria']
  },
  {
    label: 'Casa',
    keywords: ['luz', 'agua', 'internet', 'aluguel', 'condominio', 'casa', 'energia']
  },
  {
    label: 'Saude',
    keywords: ['medico', 'consulta', 'exame', 'dentista', 'academia', 'seguro']
  },
  {
    label: 'Educacao',
    keywords: ['curso', 'faculdade', 'escola', 'livro', 'aula']
  },
  {
    label: 'Compras',
    keywords: ['roupa', 'sapato', 'tenis', 'loja', 'shopping', 'presente']
  },
  {
    label: 'Assinaturas',
    keywords: ['netflix', 'spotify', 'amazon', 'prime', 'assinatura', 'mensalidade']
  }
];

const MONTHS: Record<string, number> = {
  janeiro: 0,
  fevereiro: 1,
  marco: 2,
  abril: 3,
  maio: 4,
  junho: 5,
  julho: 6,
  agosto: 7,
  setembro: 8,
  outubro: 9,
  novembro: 10,
  dezembro: 11
};

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function toTitle(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function normalizeYear(year?: string) {
  if (!year) {
    return new Date().getFullYear();
  }

  const numericYear = Number(year);
  return numericYear < 100 ? 2000 + numericYear : numericYear;
}

function parsePurchaseDate(text: string) {
  const normalizedText = normalize(text);
  const today = new Date();

  if (normalizedText.includes('anteontem')) {
    const date = new Date(today);
    date.setDate(date.getDate() - 2);
    return toIsoDate(date);
  }

  if (normalizedText.includes('ontem')) {
    const date = new Date(today);
    date.setDate(date.getDate() - 1);
    return toIsoDate(date);
  }

  if (normalizedText.includes('hoje')) {
    return toIsoDate(today);
  }

  const writtenDateMatch = normalizedText.match(
    /\b(?:dia\s*)?(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{2,4}))?\b/i
  );

  if (writtenDateMatch) {
    const day = Number(writtenDateMatch[1]);
    const month = MONTHS[writtenDateMatch[2]];
    const year = normalizeYear(writtenDateMatch[3]);

    if (month !== undefined && day >= 1 && day <= 31) {
      return toIsoDate(new Date(year, month, day));
    }
  }

  const numericDateMatch = normalizedText.match(/\b(?:dia\s*)?(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?\b/i);

  if (numericDateMatch) {
    const day = Number(numericDateMatch[1]);
    const month = Number(numericDateMatch[2]) - 1;
    const year = normalizeYear(numericDateMatch[3]);

    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      return toIsoDate(new Date(year, month, day));
    }
  }

  return todayIso();
}

function removeDateExpressions(text: string) {
  return text
    .replace(/\b(?:dia\s*)?\d{1,2}\s+de\s+[a-zA-Z\u00C0-\u017F]+(?:\s+de\s+\d{2,4})?\b/gi, '')
    .replace(/\b(?:dia\s*)?\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?\b/gi, '')
    .replace(/\b(?:hoje|ontem|anteontem)\b/gi, '');
}

function parseAmount(text: string) {
  const textWithoutDates = removeDateExpressions(text);
  const match = textWithoutDates.match(/(?:r\$\s*)?(\d{1,6}(?:[.,]\d{1,2})?)(?!\s*(?:x|vez|vezes|parcela|parcelas))/i);

  if (!match) {
    return undefined;
  }

  return Number(match[1].replace(',', '.'));
}

function parseInstallments(text: string) {
  const numericMatch = text.match(/(?:em\s*)?(\d{1,2})\s*(?:x|vezes|vez|parcelas|parcela)/i);

  if (numericMatch) {
    return Math.max(Number(numericMatch[1]), 1);
  }

  const words = Object.keys(NUMBER_WORDS).join('|');
  const wordMatch = text.match(new RegExp(`(?:em\\s*)?(${words})\\s*(?:vezes|vez|parcelas|parcela)`, 'i'));

  if (!wordMatch) {
    return 1;
  }

  return NUMBER_WORDS[wordMatch[1].toLowerCase()] ?? 1;
}

function findCardId(text: string, cards: CardItem[]) {
  const normalizedText = normalize(text);

  return (
    cards.find((card) => {
      const normalizedCard = normalize(card.name);
      return normalizedText.includes(normalizedCard) || normalizedCard.split(/\s+/).some((part) => part.length > 2 && normalizedText.includes(part));
    })?.id ?? null
  );
}

function parseDescription(text: string) {
  const normalizedText = normalize(text);
  const keyword = DESCRIPTION_KEYWORDS.find((item) => normalizedText.includes(normalize(item)));

  if (keyword) {
    return toTitle(keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  }

  const cleaned = text
    .replace(/r\$\s*\d{1,6}(?:[.,]\d{1,2})?/gi, '')
    .replace(/\d{1,6}(?:[.,]\d{1,2})?/g, '')
    .replace(/\b(?:em\s*)?(?:\d{1,2}|uma|um|duas|dois|tres|três|quatro|cinco|seis|sete|oito|nove|dez|onze|doze)\s*(?:x|vezes|vez|parcelas|parcela)\b/gi, '')
    .replace(/\b(?:comprei|compra|comprei uma|coloquei|paguei|no|na|com|cartao|cartão|pix|credito|crédito|debito|débito)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned ? toTitle(cleaned) : undefined;
}

function parseCategory(text: string) {
  const normalizedText = normalize(text);
  const match = CATEGORY_RULES.find((rule) => (
    rule.keywords.some((keyword) => normalizedText.includes(normalize(keyword)))
  ));

  return match?.label ?? 'Outros';
}

export function transcribeTransaction(text: string, cards: CardItem[]): TranscriptionResult {
  const paymentMethod: PaymentMethod = normalize(text).includes('pix') ? 'pix' : 'card';
  const amount = parseAmount(text);
  const installments = paymentMethod === 'pix' ? 1 : parseInstallments(text);
  const cardId = paymentMethod === 'card' ? findCardId(text, cards) : null;
  const purchaseDate = parsePurchaseDate(text);
  const notes: string[] = [];

  if (!amount) {
    notes.push('Nao encontrei o valor.');
  }

  if (paymentMethod === 'card' && !cardId) {
    notes.push('Nao identifiquei o cartao, mantive o selecionado.');
  }

  if (paymentMethod === 'pix') {
    notes.push('Pix entra no historico, sem gerar fatura do cartao.');
  }

  return {
    description: parseDescription(text),
    category: parseCategory(text),
    amount,
    installments,
    paymentMethod,
    cardId,
    purchaseDate,
    notes
  };
}
