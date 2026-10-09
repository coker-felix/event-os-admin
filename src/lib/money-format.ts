/** Formats an integer amount in minor units without converting the amount to a number. */
export function formatMoney(minorUnits: string | bigint, currency: string) {
  const raw = String(minorUnits)
  if (!/^-?\d+$/.test(raw)) throw new TypeError('minorUnits must be an integer digit string')

  const scale = new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
  }).resolvedOptions().maximumFractionDigits ?? 2
  const isNegative = raw.startsWith('-')
  const digits = (isNegative ? raw.slice(1) : raw).replace(/^0+(?=\d)/, '')
  const padded = digits.padStart(scale + 1, '0')
  const whole = scale === 0 ? padded : padded.slice(0, -scale)
  const fraction = scale === 0 ? '' : `.${padded.slice(-scale)}`
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')

  return `${isNegative ? '-' : ''}${currency.toUpperCase()} ${groupedWhole}${fraction}`
}
