export const DEFAULT_COMPANY_SIZE =
  "medium-sized (roughly 50–500 employees, Series B–D, or established regional players — not household-name tech giants)";

const LARGE_COMPANY_PREF_PATTERN =
  /\b(enterprise|faang|big.?tech|household.?name|fortune|large compan|unicorn|public compan|mega.?corp|well.?known)\b/i;

export function resolveEffectiveCompanySize(companySize?: string): string {
  return companySize?.trim() || DEFAULT_COMPANY_SIZE;
}

export function userWantsLargeCompanies(context: {
  companySize?: string;
  keywords?: string[];
  preferenceNotes?: string[];
}): boolean {
  const blob = [context.companySize, ...(context.keywords ?? []), ...(context.preferenceNotes ?? [])]
    .filter(Boolean)
    .join(" ");
  return LARGE_COMPANY_PREF_PATTERN.test(blob);
}
