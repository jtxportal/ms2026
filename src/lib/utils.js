// ============================================================
// ČASY – MS 2026 probíhá celý v CEST (UTC+2)
// Vše v DB je UTC, zobrazujeme jako CEST = UTC+2
// ============================================================

export function toCEST(utcString) {
  const d = new Date(utcString)
  return new Date(d.getTime() + 2 * 60 * 60 * 1000)
}

export function formatTime(utcString) {
  const d = toCEST(utcString)
  return d.getUTCHours().toString().padStart(2, '0') + ':' +
         d.getUTCMinutes().toString().padStart(2, '0')
}

export function formatDate(utcString) {
  const d = toCEST(utcString)
  const days  = ['ne', 'po', 'út', 'st', 'čt', 'pá', 'so']
  const months = ['led','úno','bře','dub','kvě','čvn','čvc','srp','zář','říj','lis','pro']
  return `${days[d.getUTCDay()]} ${d.getUTCDate()}. ${months[d.getUTCMonth()]}`
}

export function formatDateTime(utcString) {
  return formatDate(utcString) + ' ' + formatTime(utcString)
}

export function formatDateShort(utcString) {
  const d = toCEST(utcString)
  return `${d.getUTCDate()}.${d.getUTCMonth() + 1}.`
}

export function isBeforeKickoff(utcString) {
  return new Date(utcString) > new Date()
}

export function minutesUntilKickoff(utcString) {
  return Math.floor((new Date(utcString) - new Date()) / 60000)
}

// ============================================================
// FÁZE TURNAJE
// ============================================================

export const FAZE_LABEL = {
  skupina:         'Skupiny',
  sestnactifinale: 'Šestnáctifinále',
  osmifinale:      'Osmifinále',
  ctvrtfinale:     'Čtvrtfinále',
  semifinale:      'Semifinále',
  o_3_misto:       'O 3. místo',
  finale:          'Finále',
  vlozka:          '⚽ Vložka',
}

export const FAZE_CENA = {
  skupina:         10,
  sestnactifinale: 20,
  osmifinale:      20,
  ctvrtfinale:     20,
  semifinale:      50,
  o_3_misto:       50,
  finale:          100,
  vlozka:          10,
}

export const FAZE_COLOR = {
  skupina:         'bg-gray-100 text-gray-600',
  sestnactifinale: 'bg-blue-100 text-blue-700',
  osmifinale:      'bg-blue-100 text-blue-700',
  ctvrtfinale:     'bg-purple-100 text-purple-700',
  semifinale:      'bg-orange-100 text-orange-700',
  o_3_misto:       'bg-orange-100 text-orange-700',
  finale:          'bg-yellow-100 text-yellow-700',
  vlozka:          'bg-green-100 text-green-700',
}

// ============================================================
// ČÍSLA
// ============================================================

export function formatKc(amount) {
  if (amount === null || amount === undefined) return '—'
  const n = Number(amount)
  if (n === 0) return '0 Kč'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n} Kč`
}

export function formatKcAbs(amount) {
  return `${Number(amount)} Kč`
}

// ============================================================
// SKUPINY
// ============================================================

export const SKUPINY = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
