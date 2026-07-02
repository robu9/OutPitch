type LocalizedField = {
  localized?: Record<string, string>;
  preferredLocale?: { country?: string; language?: string };
};

function pickLocalized(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null) {
    const obj = value as LocalizedField & { localizedFirstName?: string; localizedHeadline?: string };
    if (obj.localizedFirstName) return obj.localizedFirstName;
    if (obj.localizedHeadline) return obj.localizedHeadline;
    const localized = obj.localized;
    if (localized) {
      const first = Object.values(localized)[0];
      if (first) return first;
    }
  }
  return undefined;
}

export function extractPersonId(profile: Record<string, unknown>): string | undefined {
  const id = profile.id ?? profile.sub;
  if (typeof id === "string" && id.length > 0) return id;
  if (typeof profile.urn === "string") {
    return profile.urn.replace(/^urn:li:person:/, "");
  }
  return undefined;
}

export function buildLinkedInProfileSummary(profile: Record<string, unknown>): string {
  const myInfo = (profile.myInfo ?? profile) as Record<string, unknown>;
  const person = (profile.personProfile ?? {}) as Record<string, unknown>;

  const firstName =
    pickLocalized(myInfo.localizedFirstName) ??
    pickLocalized(person.localizedFirstName) ??
    pickLocalized(person.firstName);
  const lastName =
    pickLocalized(myInfo.localizedLastName) ??
    pickLocalized(person.localizedLastName) ??
    pickLocalized(person.lastName);
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();

  const headline =
    pickLocalized(myInfo.localizedHeadline) ??
    pickLocalized(myInfo.headline) ??
    pickLocalized(person.localizedHeadline) ??
    pickLocalized(person.headline);

  const vanity = (person.vanityName as string | undefined) ?? (myInfo.vanityName as string | undefined);
  const linkedinUrl = vanity ? `https://www.linkedin.com/in/${vanity}` : undefined;

  const sections: string[] = [];
  if (name) sections.push(`Name: ${name}`);
  if (headline) sections.push(`Headline: ${headline}`);
  if (linkedinUrl) sections.push(`LinkedIn URL: ${linkedinUrl}`);

  const experience = profile.experience ?? person.positions ?? person.experience;
  if (experience) {
    sections.push(`Experience: ${JSON.stringify(experience)}`);
  }

  const education = profile.education ?? person.educations ?? person.education;
  if (education) {
    sections.push(`Education: ${JSON.stringify(education)}`);
  }

  const skills = profile.skills ?? person.skills;
  if (skills) {
    sections.push(`Skills: ${JSON.stringify(skills)}`);
  }

  const projects = profile.projects ?? person.projects;
  if (projects) {
    sections.push(`Projects: ${JSON.stringify(projects)}`);
  }

  return sections.join("\n");
}

export function normalizeLinkedInProfileFields(profile: Record<string, unknown>) {
  const summary = buildLinkedInProfileSummary(profile);
  const person = (profile.personProfile ?? {}) as Record<string, unknown>;
  const myInfo = (profile.myInfo ?? profile) as Record<string, unknown>;

  const headline =
    pickLocalized(myInfo.localizedHeadline) ??
    pickLocalized(myInfo.headline) ??
    pickLocalized(person.localizedHeadline) ??
    pickLocalized(person.headline);

  const firstName =
    pickLocalized(myInfo.localizedFirstName) ??
    pickLocalized(person.localizedFirstName) ??
    pickLocalized(person.firstName);
  const lastName =
    pickLocalized(myInfo.localizedLastName) ??
    pickLocalized(person.localizedLastName) ??
    pickLocalized(person.lastName);

  const vanity = (person.vanityName as string | undefined) ?? (myInfo.vanityName as string | undefined);

  return {
    name: [firstName, lastName].filter(Boolean).join(" ").trim() || undefined,
    headline,
    summary: summary || undefined,
    linkedinUrl: vanity ? `https://www.linkedin.com/in/${vanity}` : undefined,
  };
}

export function profileHasLinkedInData(profile: Record<string, unknown> | null | undefined) {
  if (!profile) return false;
  const fields = normalizeLinkedInProfileFields(profile);
  return Boolean(fields.name || fields.headline || fields.summary);
}
