import React, { useMemo, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { colors } from '../theme'
import Section from './Section'
import Badge from './Badge'
import { apiUrl } from '../lib/api'

const CROPS = ['Wheat', 'Rice', 'Potato', 'Onion', 'Maize', 'Groundnut', 'Soybean']

function currentSeason() {
  const m = new Date().getMonth()
  if (m >= 5 && m <= 9) return 'Kharif'
  if (m >= 10 || m <= 2) return 'Rabi'
  return 'Summer'
}

function toLandSizeHa(profile) {
  const area = Number(profile?.land_area ?? 0)
  if (!Number.isFinite(area) || area <= 0) return 1
  const isAcre = String(profile?.land_unit || '').toLowerCase().includes('acre')
  return isAcre ? area * 0.4047 : area
}

function defaultCrop(profile) {
  const crop = String(profile?.primary_crop || '').toLowerCase()
  const match = CROPS.find((c) => c.toLowerCase() === crop)
  if (match) return match
  if (crop.includes('tomato')) return 'Onion'
  return 'Onion'
}

export default function FertilizerTab({ profile }) {
  const [crop, setCrop] = useState(() => defaultCrop(profile))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const district = useMemo(
    () => (profile?.district || profile?.village || 'Mehsana').trim(),
    [profile?.district, profile?.village],
  )
  const landHa = useMemo(() => toLandSizeHa(profile), [profile?.land_area, profile?.land_unit])
  const season = currentSeason()

  async function loadPlan() {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const params = new URLSearchParams({
        crop,
        season,
        land_size_ha: String(landHa),
        district,
        ndvi: '0.4',
        rainfall: '750',
      })
      const res = await fetch(apiUrl(`/api/fertilizer/recommend?${params}`))
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.detail || `Fertilizer API error (${res.status})`)
      }
      setResult(data)
    } catch (err) {
      setError(err?.message || 'Could not generate fertilizer plan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View>
      <Section title="Fertilizer Plan" subtitle={`${district} · ${season} · ${landHa.toFixed(2)} ha`}>
        <View style={styles.pillRow}>
          {CROPS.map((item) => (
            <TouchableOpacity key={item} onPress={() => setCrop(item)}>
              <Badge label={item} tone={item === crop ? 'accent' : 'muted'} />
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.button} onPress={loadPlan} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Get NPK plan</Text>}
        </TouchableOpacity>
      </Section>
      {error ? <Text style={styles.error}>{String(error)}</Text> : null}
      {result ? (
        <Section title={result.crop || crop} subtitle={result.summary}>
          <Text style={styles.npk}>
            N {result.npk_total_kg?.N} · P {result.npk_total_kg?.P} · K {result.npk_total_kg?.K} kg
          </Text>
          <Text style={styles.meta}>
            Urea {result.fertilizer_products?.urea_kg} kg · DAP {result.fertilizer_products?.dap_kg} kg · MOP{' '}
            {result.fertilizer_products?.mop_kg} kg
          </Text>
          {result.soil_advisory ? <Text style={styles.note}>{result.soil_advisory}</Text> : null}
          {result.special_notes ? <Text style={styles.note}>{result.special_notes}</Text> : null}
        </Section>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  button: {
    backgroundColor: colors.accentDark,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: { color: colors.text, fontWeight: '700' },
  error: { color: '#FCA5A5', fontSize: 12, marginBottom: 8 },
  npk: { color: colors.text, fontWeight: '700', fontSize: 14 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 6 },
  note: { color: colors.text, fontSize: 12, marginTop: 8, lineHeight: 18 },
})
