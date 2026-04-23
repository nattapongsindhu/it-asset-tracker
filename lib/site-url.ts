function getSingleValue(value: string | string[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function normalizeSiteUrl(value: string) {
  let normalized = value.trim()

  if (!normalized) {
    return ''
  }

  const isLocalhost = normalized.includes('localhost') || normalized.includes('127.0.0.1')

  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = `${isLocalhost ? 'http' : 'https'}://${normalized}`
  }

  return normalized.endsWith('/') ? normalized : `${normalized}/`
}

export function getURL(path = '/', fallbackOrigin?: string) {
  const runtimeOrigin =
    typeof window !== 'undefined' && window.location.origin ? window.location.origin : undefined
  const baseUrl =
    runtimeOrigin ??
    fallbackOrigin ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_VERCEL_URL ??
    process.env.VERCEL_URL ??
    'http://localhost:3001/'
  const normalizedBaseUrl = normalizeSiteUrl(baseUrl)
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path

  return new URL(normalizedPath, normalizedBaseUrl).toString()
}

export function getSafeRedirectPath(
  value: string | string[] | null | undefined,
  fallbackPath = '/dashboard'
) {
  const nextPath = getSingleValue(value)

  if (
    nextPath &&
    nextPath.startsWith('/') &&
    !nextPath.startsWith('//') &&
    !nextPath.startsWith('/login') &&
    !nextPath.startsWith('/auth/')
  ) {
    return nextPath
  }

  return fallbackPath
}
