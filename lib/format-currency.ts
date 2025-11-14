export function formatCurrency(value: number): string {
  if (value >= 1000000) {
    // Values >= 1 million: show as M
    return `R$ ${(value / 1000000).toFixed(2)}M`
  } else if (value >= 1000) {
    // Values >= 1 thousand: show as k
    return `R$ ${(value / 1000).toFixed(2)}k`
  } else {
    // Values < 1 thousand: show as is
    return `R$ ${value.toFixed(2)}`
  }
}

export function formatCompactCurrency(value: number): string {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`
  } else if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}k`
  } else {
    return `R$ ${value.toFixed(0)}`
  }
}
