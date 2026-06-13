const ROMAN_MARKS: Record<string, string> = {
  '2': 'II',
  '3': 'III',
  '4': 'IV',
  '5': 'V',
  '6': 'VI',
  '7': 'VII',
  '8': 'VIII',
  '9': 'IX',
};

const ILCE_PATTERN = /^ILCE-(\d+)(CR|[RSC])?(?:M(\d+))?$/;
const ILCA_PATTERN = /^ILCA-(\d+)(?:M(\d+))?$/;
const DSC_PATTERN = /^DSC-([A-Z]+\d+[A-Z]*?)(?:M(\d+))?$/;

function isSonyMake(make: string | null | undefined): boolean {
  return !!make && make.trim().toUpperCase().startsWith('SONY');
}

function markSuffix(markDigit: string | undefined): string | null {
  if (!markDigit) return '';
  const roman = ROMAN_MARKS[markDigit];
  return roman ? ` ${roman}` : null;
}

export function formatSonyModel(
  make: string | null | undefined,
  model: string | null | undefined
): string | null {
  if (!model) return null;
  if (!isSonyMake(make)) return model;

  const normalized = model.trim().toUpperCase();

  const ilce = ILCE_PATTERN.exec(normalized);
  if (ilce) {
    const [, digits, variant, mark] = ilce;
    const suffix = markSuffix(mark);
    if (suffix === null) return model;
    return `α${digits}${variant ?? ''}${suffix}`;
  }

  const ilca = ILCA_PATTERN.exec(normalized);
  if (ilca) {
    const [, digits, mark] = ilca;
    const suffix = markSuffix(mark);
    if (suffix === null) return model;
    return `α${digits}${suffix}`;
  }

  const dsc = DSC_PATTERN.exec(normalized);
  if (dsc) {
    const [, captured, mark] = dsc;
    const suffix = markSuffix(mark);
    if (suffix === null) return model;
    return `${captured}${suffix}`;
  }

  return model;
}
