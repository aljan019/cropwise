import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { colors } from '../theme'
import Section from './Section'
import Badge from './Badge'
import { apiUrl } from '../lib/api'

export default function SchemesTab({ profile }) {
  const [schemes, setSchemes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const landHa = String(profile?.land_unit || '').toLowerCase().includes('acre')
          ? (Number(profile?.land_area) || 2) * 0.4047
          : Number(profile?.land_area) || 2
        const category = landHa < 2 ? 'small_farmer' : 'large_farmer'
        const res = await fetch(apiUrl('/schemes/api/v1/schemes/recommend'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            state: profile?.state || 'Gujarat',
            land_size_hectares: landHa,
            category,
          }),
        })
        if (!res.ok) throw new Error(`Schemes API returned ${res.status}`)
        const data = await res.json()
        if (!cancelled) setSchemes(data.schemes || [])
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Could not load schemes.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [profile?.state, profile?.land_area, profile?.land_unit])

  return (
    <View>
      <Section title="Govt Schemes" subtitle={profile?.state || 'Gujarat'}>
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.meta}>Matching schemes to your farm...</Text>
          </View>
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : schemes.length === 0 ? (
          <Text style={styles.meta}>No matching schemes yet.</Text>
        ) : (
          schemes.slice(0, 8).map((scheme, idx) => (
            <View key={scheme.id || scheme.name || idx} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.name}>{scheme.name || scheme.title || 'Scheme'}</Text>
                {scheme.scope ? <Badge label={scheme.scope} tone="accent" /> : null}
              </View>
              <Text style={styles.detail}>{scheme.description || scheme.benefit || scheme.summary || ''}</Text>
            </View>
          ))
        )}
      </Section>
    </View>
  )
}

const styles = StyleSheet.create({
  loader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meta: { color: colors.textMuted, fontSize: 12 },
  error: { color: '#FCA5A5', fontSize: 12 },
  card: {
    backgroundColor: colors.cardLight,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  name: { color: colors.text, fontWeight: '700', fontSize: 13, flex: 1 },
  detail: { color: colors.textMuted, fontSize: 12, marginTop: 6, lineHeight: 17 },
})
