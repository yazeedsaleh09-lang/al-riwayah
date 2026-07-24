/**
 * Localized copy. Arabic is required; English is optional and prepared for a
 * later localization pass (secondary-language readiness). Templates use
 * {{name}} placeholders resolved against player display names at reveal time.
 */

export type Locale = "ar" | "en";

export interface LocalizedText {
  ar: string;
  en?: string;
}

export function resolveText(text: LocalizedText, locale: Locale = "ar"): string {
  return (locale === "en" ? text.en : text.ar) ?? text.ar;
}

/**
 * Fill {{token}} placeholders. Missing tokens are left literal so authoring
 * mistakes are visible rather than silently dropped.
 */
export function fillTemplate(template: string, params: Record<string, string>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (whole, key: string) =>
    Object.prototype.hasOwnProperty.call(params, key) ? params[key]! : whole,
  );
}

export function fillLocalized(
  text: LocalizedText,
  params: Record<string, string>,
): LocalizedText {
  return {
    ar: fillTemplate(text.ar, params),
    ...(text.en !== undefined ? { en: fillTemplate(text.en, params) } : {}),
  };
}
