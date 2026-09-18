import { Platform } from 'react-native'
import Constants from 'expo-constants'
import { config } from './config'

const PROD_ORIGIN = 'https://beejrakshak.onrender.com'

function stripTrailingSlash(value) {
  return String(value || '').replace(/\/$/, '')
}

function hostFromExpo() {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.manifest?.debuggerHost ||
    ''
  return String(hostUri).split(':')[0] || ''
}

function rewriteDevHost(origin) {
  if (!/localhost|127\.0\.0\.1/.test(origin)) return origin
  if (Platform.OS === 'web') return origin
  if (Platform.OS === 'android' && !Constants.isDevice) {
    return origin.replace(/localhost|127\.0\.0\.1/g, '10.0.2.2')
  }
  const lanHost = hostFromExpo()
  if (lanHost && lanHost !== 'localhost') {
    return origin.replace(/localhost|127\.0\.0\.1/g, lanHost)
  }
  return origin
}

export function getApiOrigin() {
  const configured = stripTrailingSlash(config.API_ORIGIN || config.MANDI_API_BASE || '')
  let origin = configured.replace(/\/mandi$/i, '')
  if (!origin) {
    origin = typeof __DEV__ !== 'undefined' && __DEV__ ? 'http://localhost:8001' : PROD_ORIGIN
  }
  return rewriteDevHost(stripTrailingSlash(origin))
}

export function apiUrl(path) {
  const origin = getApiOrigin()
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${origin}${suffix}`
}
