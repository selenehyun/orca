/**
 * The settings-search empty state used to render as three sibling JSX nodes:
 * `translate('...3c88ec55d6', 'No settings found for "')`, the raw query, then
 * `translate('...add3b97ee6', '"')`. That only reads correctly in languages that
 * put the quoted term after the verb. Korean and Chinese put it before, so their
 * translators localized the leading fragment as a whole clause and the query was
 * appended after the sentence had already ended:
 *
 *   "에 대한 설정을 찾을 수 없습니다.screen reader"
 *   找不到“的设置screen reader”
 *
 * No split of a sentence into fixed prefix/suffix fragments can serve both word
 * orders, so the message is one catalog entry with a `{{value0}}` placeholder and
 * each locale positions the term itself. These assertions pin that: every locale
 * that translates the key must carry the placeholder, and the interpolated result
 * must keep the query inside the quotes with the clause closing after it.
 */
import { beforeEach, describe, expect, it } from 'vitest'

import { i18n, translate } from './i18n'
import en from './locales/en.json'
import es from './locales/es.json'
import fr from './locales/fr.json'
import ja from './locales/ja.json'
import ko from './locales/ko.json'
import zh from './locales/zh.json'

const KEY = 'auto.components.settings.Settings.noSettingsFoundForQuery'
const FALLBACK = 'No settings found for "{{value0}}"'
const RETIRED_FRAGMENT_KEYS = [
  'auto.components.settings.Settings.3c88ec55d6',
  'auto.components.settings.Settings.add3b97ee6'
]
const QUERY = 'screen reader'

const CATALOGS: Record<string, unknown> = { en, es, fr, ja, ko, zh }

function lookup(catalog: unknown, key: string): string | undefined {
  const value = key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object' && !Array.isArray(node)
          ? (node as Record<string, unknown>)[part]
          : undefined,
      catalog
    )
  return typeof value === 'string' ? value : undefined
}

const EXPECTED_MESSAGES: Record<string, string> = {
  en: 'No settings found for "screen reader"',
  es: 'No se encontraron configuraciones para "screen reader"',
  fr: 'Aucun paramètre trouvé pour "screen reader"',
  ja: '検索条件に一致する設定が見つかりませんでした:「screen reader」',
  ko: '"screen reader"에 대한 설정을 찾을 수 없습니다.',
  zh: '找不到“screen reader”的设置'
}

// The clause each language closes with once the quoted term is in place. A
// fragment split cannot produce these, because the text has to follow the query.
const TRAILING_CLAUSES: Record<string, string> = {
  ko: '에 대한 설정을 찾을 수 없습니다.',
  zh: '的设置'
}

describe('settings search empty-state message', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('declares one interpolated message instead of prefix and suffix fragments', () => {
    expect(lookup(en, KEY)).toBe(FALLBACK)
    for (const retired of RETIRED_FRAGMENT_KEYS) {
      for (const [locale, catalog] of Object.entries(CATALOGS)) {
        expect(lookup(catalog, retired), `${locale}: ${retired}`).toBeUndefined()
      }
    }
  })

  it('carries the query placeholder in every locale that translates the key', () => {
    for (const [locale, catalog] of Object.entries(CATALOGS)) {
      const value = lookup(catalog, KEY)
      if (value === undefined) {
        continue
      }
      expect(value, locale).toContain('{{value0}}')
    }
  })

  it.each(Object.entries(EXPECTED_MESSAGES))(
    'renders %s as one sentence with the query inside the quotes',
    async (locale, expected) => {
      await i18n.changeLanguage(locale)
      expect(translate(KEY, FALLBACK, { value0: QUERY })).toBe(expected)
    }
  )

  it.each(Object.entries(TRAILING_CLAUSES))(
    'closes the %s clause after the query rather than appending it',
    async (locale, trailing) => {
      await i18n.changeLanguage(locale)
      const message = translate(KEY, FALLBACK, { value0: QUERY })

      expect(message).toContain(QUERY)
      expect(message.endsWith(QUERY)).toBe(false)
      expect(message.endsWith(trailing)).toBe(true)
      // The clause must start after the query, not before it — the old fragment
      // split forced the reverse and produced "<clause><query>".
      expect(message.indexOf(trailing)).toBeGreaterThan(message.indexOf(QUERY))
    }
  )
})
