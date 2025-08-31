export const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n)

export const fmtDate = (d: string | Date) => new Intl.DateTimeFormat("pt-BR").format(new Date(d))

// Converte string com vírgula para número
export const parseDecimal = (value: string): number => {
  console.log('parseDecimal called with value:', value)
  if (!value) {
    console.log('parseDecimal returning 0 for empty value')
    return 0
  }
  // Remove espaços e substitui vírgula por ponto
  const normalized = value.trim().replace(',', '.')
  console.log('parseDecimal normalized:', normalized)
  const parsed = parseFloat(normalized)
  console.log('parseDecimal parsed:', parsed, 'isNaN:', isNaN(parsed))
  const result = isNaN(parsed) ? 0 : parsed
  console.log('parseDecimal returning:', result)
  return result
}

// Formata número para exibição com vírgula
export const formatDecimal = (value: number | string): string => {
  if (value === '' || value === null || value === undefined) return ''
  const num = typeof value === 'string' ? parseDecimal(value) : value
  return num.toString().replace('.', ',')
}
