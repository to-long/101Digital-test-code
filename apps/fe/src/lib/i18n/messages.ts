/**
 * Loads per-screen JSON catalogs and merges them into a flat key→string map
 * for each locale.
 *
 * Add a new screen → drop a new `<screen>.json` into each `messages/<locale>/`
 * folder. No registry to update — `import.meta.glob` picks them up at build
 * time.
 *
 * Add a new locale → create a new folder `messages/<locale>/` mirroring the
 * existing per-screen files, then add the locale code to `SUPPORTED_LOCALES`
 * in `index.tsx`.
 */

type Catalog = Record<string, string>;

// `eager: true` loads all JSONs synchronously at module init — fine for a
// small handful of files. Switch to lazy `import()` here if catalogs grow
// large and you want per-locale code-splitting.
const enModules = import.meta.glob('./messages/en/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, Catalog>;

const viModules = import.meta.glob('./messages/vi/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, Catalog>;

const zhModules = import.meta.glob('./messages/zh/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, Catalog>;

function merge(modules: Record<string, Catalog>): Catalog {
  return Object.values(modules).reduce<Catalog>(
    (acc, mod) => Object.assign(acc, mod),
    {},
  );
}

export const en: Catalog = merge(enModules);
export const vi: Catalog = merge(viModules);
export const zh: Catalog = merge(zhModules);

/**
 * The canonical key set is derived from English at runtime. For compile-time
 * typing, message keys are widened to `string` — strict typing would require
 * generating a `.d.ts` from the JSON, which we skip to keep tooling minimal.
 */
export type MessageKey = string;
export type Messages = Catalog;

export const catalogs: Record<string, Messages> = { en, vi, zh };
