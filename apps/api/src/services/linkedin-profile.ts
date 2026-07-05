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

  const vanity =
    (person.vanityName as string | undefined) ??
    (myInfo.vanityName as string | undefined) ??
    (profile.vanityName as string | undefined);
  const linkedinUrl = vanity ? `https://www.linkedin.com/in/${vanity}` : undefined;

  const sections: string[] = [];
  if (name) sections.push(`Name: ${name}`);
  if (headline) sections.push(`Headline: ${headline}`);
  if (linkedinUrl) sections.push(`LinkedIn URL: ${linkedinUrl}`);

  // Location (from scraped data)
  const location = profile.location as string | undefined;
  if (location) sections.push(`Location: ${location}`);

  // About section (from scraped data)
  const about = profile.about as string | undefined;
  if (about) sections.push(`About: ${about}`);

  // Experience (API or scraped)
  const experience = profile.experience ?? person.positions ?? person.experience;
  if (experience) {
    if (Array.isArray(experience)) {
      const expLines = experience.map((e: Record<string, unknown>) =>
        [e.title, e.company, e.duration].filter(Boolean).join(" at ")
      );
      sections.push(`Experience:\n${expLines.map((l: string) => `  - ${l}`).join("\n")}`);
    } else {
      sections.push(`Experience: ${JSON.stringify(experience)}`);
    }
  }

  // Education (API or scraped)
  const education = profile.education ?? person.educations ?? person.education;
  if (education) {
    if (Array.isArray(education)) {
      const eduLines = education.map((e: Record<string, unknown>) =>
        [e.school, e.degree, e.field, e.years].filter(Boolean).join(" | ")
      );
      sections.push(`Education:\n${eduLines.map((l: string) => `  - ${l}`).join("\n")}`);
    } else {
      sections.push(`Education: ${JSON.stringify(education)}`);
    }
  }

  // Skills (API or scraped)
  const skills = profile.skills ?? person.skills;
  if (skills) {
    if (Array.isArray(skills)) {
      sections.push(`Skills: ${skills.join(", ")}`);
    } else {
      sections.push(`Skills: ${JSON.stringify(skills)}`);
    }
  }

  // Certifications (from scraped data)
  const certifications = profile.certifications as Array<{ name?: string; issuer?: string }> | undefined;
  if (certifications?.length) {
    const certLines = certifications.map((c) =>
      `${c.name}${c.issuer ? ` (${c.issuer})` : ""}`
    );
    sections.push(`Certifications:\n${certLines.map((l) => `  - ${l}`).join("\n")}`);
  }

  // Projects
  const projects = profile.projects ?? person.projects;
  if (projects) {
    if (Array.isArray(projects)) {
      const projLines = projects.map((p: Record<string, unknown>) =>
        `${p.name}${p.description ? `: ${p.description}` : ""}`
      );
      sections.push(`Projects:\n${projLines.map((l: string) => `  - ${l}`).join("\n")}`);
    } else {
      sections.push(`Projects: ${JSON.stringify(projects)}`);
    }
  }

  // Activity (from scraped data)
  const activity = profile.activity as Array<{ text: string }> | undefined;
  if (activity?.length) {
    sections.push(
      `Recent Activity:\n${activity.slice(0, 5).map((a) => `  - ${a.text.slice(0, 150)}`).join("\n")}`
    );
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

  const vanity =
    (person.vanityName as string | undefined) ??
    (myInfo.vanityName as string | undefined) ??
    (profile.vanityName as string | undefined);

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
