const DEFAULT_ASSET_ORIGIN = 'https://img.coder-f-nowork.cn'

const configuredOrigin = import.meta.env.VITE_ASSET_BASE_URL?.trim()

export const ASSET_ORIGIN = (configuredOrigin || DEFAULT_ASSET_ORIGIN).replace(/\/+$/, '')

export function assetUrl(path: string): string {
  if (!path || /^(?:https?:)?\/\//.test(path) || path.startsWith('data:') || path.startsWith('blob:')) {
    return path
  }

  return `${ASSET_ORIGIN}/static/${path.replace(/^\/+/, '')}`
}
