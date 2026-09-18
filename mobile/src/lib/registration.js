import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase, isSupabaseConfigured } from './supabase'

const LOCAL_REG_KEY = 'beejrakshak_local_registration_'

const REGISTRATION_TABLE = 'registrations'

const COLUMNS = {
  user_id: 'user_id',
  farmer_name: 'farmer_name',
  aadhaar: 'aadhaar',
  mobile: 'mobile',
  preferred_language: 'preferred_language',
  village: 'village',
  district: 'district',
  state: 'state',
  latitude: 'latitude',
  longitude: 'longitude',
  land_area: 'land_area',
  land_unit: 'land_unit',
  primary_crop: 'primary_crop',
  crop_stage: 'crop_stage',
  satellite_consent: 'satellite_consent',
  market_preference: 'market_preference',
}

export async function hasCompletedRegistration(userId) {
  if (!userId) return false
  if (!isSupabaseConfigured()) {
    try {
      const raw = await AsyncStorage.getItem(LOCAL_REG_KEY + userId)
      return !!raw
    } catch {
      return false
    }
  }
  const { data, error } = await supabase
    .from(REGISTRATION_TABLE)
    .select(COLUMNS.user_id)
    .eq(COLUMNS.user_id, userId)
    .maybeSingle()
  if (error) {
    // If Supabase call failed, check local fallback
    try {
      const raw = await AsyncStorage.getItem(LOCAL_REG_KEY + userId)
      if (raw) return true
    } catch {}
    return false
  }
  return !!data
}

export async function saveRegistration(userId, data) {
  if (!userId) return { ok: false, error: 'Not signed in.' }
  const row = {
    [COLUMNS.user_id]: userId,
    [COLUMNS.farmer_name]: data.farmerName ?? null,
    [COLUMNS.aadhaar]: data.aadhaar ?? '',
    [COLUMNS.mobile]: data.mobile ?? null,
    [COLUMNS.preferred_language]: data.preferredLanguage ?? null,
    [COLUMNS.village]: data.village ?? null,
    [COLUMNS.district]: data.district ?? null,
    [COLUMNS.state]: data.state ?? null,
    [COLUMNS.latitude]: data.latitude ?? null,
    [COLUMNS.longitude]: data.longitude ?? null,
    [COLUMNS.land_area]: data.landArea != null ? Number(data.landArea) : null,
    [COLUMNS.land_unit]: data.landUnit ?? null,
    [COLUMNS.primary_crop]: data.primaryCrop ?? null,
    [COLUMNS.crop_stage]: data.cropStage ?? null,
    [COLUMNS.satellite_consent]: Boolean(data.satelliteConsent),
    [COLUMNS.market_preference]: data.marketPreference ?? null,
  }

  // Always cache locally so offline / demo mode works
  try {
    await AsyncStorage.setItem(LOCAL_REG_KEY + userId, JSON.stringify(row))
  } catch {}

  if (!isSupabaseConfigured()) {
    return { ok: true }
  }

  const { error } = await supabase
    .from(REGISTRATION_TABLE)
    .upsert(row, { onConflict: COLUMNS.user_id })
  if (error) {
    console.warn('Supabase save error, saved locally:', error.message)
    return { ok: true }
  }
  return { ok: true }
}

export async function fetchRegistration(userId) {
  if (!userId) return null
  if (!isSupabaseConfigured()) {
    try {
      const raw = await AsyncStorage.getItem(LOCAL_REG_KEY + userId)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }
  const { data, error } = await supabase
    .from(REGISTRATION_TABLE)
    .select('*')
    .eq(COLUMNS.user_id, userId)
    .maybeSingle()
  if (error || !data) {
    try {
      const raw = await AsyncStorage.getItem(LOCAL_REG_KEY + userId)
      if (raw) return JSON.parse(raw)
    } catch {}
    return null
  }
  return data || null
}
