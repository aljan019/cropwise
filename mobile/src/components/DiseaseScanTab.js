import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { colors } from '../theme'
import Section from './Section'
import Badge from './Badge'
import { apiUrl } from '../lib/api'

// High-quality reliable samples for instant 1-tap testing
const SAMPLE_LEAVES = [
  {
    id: 'sample_tomato_blight',
    name: 'Tomato Blight',
    crop: 'Tomato',
    condition: 'Early Blight',
    uri: 'https://images.unsplash.com/photo-1592417817098-8f3d69102353?w=500&auto=format&fit=crop&q=80',
    mockResult: {
      status: 'success',
      model: 'kimcomehome/plantvillage-vit-leaf-disease (Demo Fallback)',
      filename: 'sample_tomato_early_blight.jpg',
      prediction: {
        crop: 'Tomato',
        condition: 'Early Blight',
        confidence: 91.4,
        severity: 'High',
        advice: 'Early blight likely. Improve airflow, prune bottom leaves, and apply protectant copper fungicide.',
        treatment: {
          immediate: 'Prune and destroy lower infected leaves; do not compost diseased foliage.',
          chemical: 'Spray Mancozeb (2.5 g/L) or Copper Oxychloride (2.5 g/L) at first sign of concentric spots.',
          organic: 'Apply 0.5% neem oil emulsion or Trichoderma viride bio-fungicide weekly.',
          prevention: 'Maintain 60cm plant spacing and use drip irrigation to prevent soil-to-leaf splashing.',
        },
      },
      top3: [
        { crop: 'Tomato', condition: 'Early Blight', confidence: 91.4 },
        { crop: 'Tomato', condition: 'Late Blight', confidence: 6.2 },
        { crop: 'Potato', condition: 'Early Blight', confidence: 2.4 },
      ],
    },
  },
  {
    id: 'sample_potato_blight',
    name: 'Potato Blight',
    crop: 'Potato',
    condition: 'Late Blight',
    uri: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=500&auto=format&fit=crop&q=80',
    mockResult: {
      status: 'success',
      model: 'kimcomehome/plantvillage-vit-leaf-disease (Demo Fallback)',
      filename: 'sample_potato_late_blight.jpg',
      prediction: {
        crop: 'Potato',
        condition: 'Late Blight',
        confidence: 89.2,
        severity: 'High',
        advice: 'Late blight risk detected. Remove water-soaked foliage and apply systemic fungicide promptly.',
        treatment: {
          immediate: 'Isolate affected plants immediately. Cut and burn severely affected vines.',
          chemical: 'Apply Metalaxyl + Mancozeb (2.5 g/L) or Cymoxanil during cloudy, humid spells.',
          organic: 'Spray Bordeaux mixture (1%) or copper soap solution.',
          prevention: 'Hill up soil around tubers and avoid overhead sprinkler watering.',
        },
      },
      top3: [
        { crop: 'Potato', condition: 'Late Blight', confidence: 89.2 },
        { crop: 'Tomato', condition: 'Late Blight', confidence: 7.8 },
        { crop: 'Potato', condition: 'Healthy', confidence: 3.0 },
      ],
    },
  },
  {
    id: 'sample_healthy',
    name: 'Healthy Leaf',
    crop: 'Bell Pepper',
    condition: 'Healthy',
    uri: 'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=500&auto=format&fit=crop&q=80',
    mockResult: {
      status: 'success',
      model: 'kimcomehome/plantvillage-vit-leaf-disease (Demo Fallback)',
      filename: 'sample_healthy_leaf.jpg',
      prediction: {
        crop: 'Bell Pepper',
        condition: 'Healthy',
        confidence: 96.8,
        severity: 'None (Healthy)',
        advice: 'Leaf looks completely healthy. Maintain regular irrigation, balanced NPK nutrition, and scouting.',
        treatment: {
          immediate: 'No intervention required. Foliage displays balanced chlorophyll distribution.',
          chemical: 'None needed. Avoid prophylactic chemical spraying.',
          organic: 'Apply compost tea or foliar seaweed extract to reinforce natural vigor.',
          prevention: 'Continue weekly inspection and keep soil moisture uniform.',
        },
      },
      top3: [
        { crop: 'Bell Pepper', condition: 'Healthy', confidence: 96.8 },
        { crop: 'Tomato', condition: 'Healthy', confidence: 2.1 },
        { crop: 'Potato', condition: 'Healthy', confidence: 1.1 },
      ],
    },
  },
]

function mimeFromUri(uri) {
  const lower = String(uri || '').toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  return 'image/jpeg'
}

export default function DiseaseScanTab({ profile }) {
  const [asset, setAsset] = useState(null)
  const [selectedSample, setSelectedSample] = useState(null)
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [activeAdvisoryTab, setActiveAdvisoryTab] = useState('immediate')

  useEffect(() => {
    let cancelled = false
    fetch(apiUrl('/disease/health'))
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setHealth(data)
      })
      .catch(() => {
        if (!cancelled) setHealth({ status: 'offline' })
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function pick(fromCamera) {
    setError('')
    setSelectedSample(null)

    try {
      const permission = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (permission.status !== 'granted') {
        setError(fromCamera ? 'Camera permission is required.' : 'Photo library permission is required.')
        return
      }

      const launcher = fromCamera
        ? ImagePicker.launchCameraAsync
        : ImagePicker.launchImageLibraryAsync

      const picked = await launcher({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: false,
      })

      if (picked.canceled || !picked.assets?.[0]) return
      setAsset(picked.assets[0])
      setResult(null)
    } catch (err) {
      setError('Unable to open camera/gallery: ' + (err?.message || String(err)))
    }
  }

  function handleSelectSample(sample) {
    setError('')
    setSelectedSample(sample)
    setAsset({
      uri: sample.uri,
      fileName: sample.id + '.jpg',
      mimeType: 'image/jpeg',
    })
    setResult(null)
  }

  async function analyze() {
    if (!asset?.uri) {
      setError('Choose or photograph a crop leaf first.')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const form = new FormData()

      // Cross-platform FormData handling (Web vs iOS/Android Native)
      if (Platform.OS === 'web') {
        const resp = await fetch(asset.uri)
        const blob = await resp.blob()
        form.append('file', blob, asset.fileName || 'leaf.jpg')
      } else {
        form.append('file', {
          uri: Platform.OS === 'android' ? asset.uri : asset.uri.replace('file://', ''),
          name: asset.fileName || 'leaf.jpg',
          type: asset.mimeType || mimeFromUri(asset.uri),
        })
      }

      const res = await fetch(apiUrl('/disease/predict'), {
        method: 'POST',
        body: form,
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.detail || data.message || `API returned ${res.status}`)
      }
      setResult(data)
    } catch (err) {
      // If API server is unreachable and this is a preset sample or demo fallback
      if (selectedSample?.mockResult) {
        setResult(selectedSample.mockResult)
        setError('ℹ️ Live AI server is offline. Showing pre-evaluated diagnosis for this sample leaf.')
      } else {
        setError(
          err?.message ||
            'Could not reach the disease API. Ensure the AIML server is running on port 8001.',
        )
      }
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setAsset(null)
    setSelectedSample(null)
    setResult(null)
    setError('')
  }

  const top = result?.prediction
  const treatments = top?.treatment || {}
  const cropHint = profile?.primary_crop
    ? `Best results: photograph ${profile.primary_crop} leaves in bright natural light.`
    : 'Photograph one leaf in clear daylight, filling the frame.'
  const apiOnline = health && health.status !== 'offline'

  const severityTone =
    top?.severity?.toLowerCase().includes('high') || top?.severity?.toLowerCase().includes('severe')
      ? 'warn'
      : top?.severity?.toLowerCase().includes('moderate')
      ? 'warn'
      : 'accent'

  return (
    <View style={styles.container}>
      <Section title="CropWise-Ai Leaf Disease Scan" subtitle={cropHint}>
        {/* Preview Frame */}
        <View style={styles.previewWrap}>
          {asset?.uri ? (
            <Image source={{ uri: asset.uri }} style={styles.preview} />
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.leafIcon}>🍃</Text>
              <Text style={styles.placeholder}>No leaf photo selected yet</Text>
              <Text style={styles.placeholderSub}>Capture a photo or pick a sample below</Text>
            </View>
          )}
        </View>

        {/* Capture Buttons */}
        <View style={styles.row}>
          <TouchableOpacity style={styles.button} onPress={() => pick(true)}>
            <Text style={styles.buttonText}>📸 Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => pick(false)}>
            <Text style={styles.buttonText}>🖼️ Choose Photo</Text>
          </TouchableOpacity>
          {asset?.uri && (
            <TouchableOpacity style={[styles.button, styles.resetButton]} onPress={handleReset}>
              <Text style={styles.resetButtonText}>✕ Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Test Preset Samples */}
        <View style={styles.samplesSection}>
          <Text style={styles.samplesLabel}>⚡ Quick Test with Sample Leaves:</Text>
          <View style={styles.samplesRow}>
            {SAMPLE_LEAVES.map((sample) => (
              <TouchableOpacity
                key={sample.id}
                style={[
                  styles.samplePill,
                  selectedSample?.id === sample.id && styles.samplePillActive,
                ]}
                onPress={() => handleSelectSample(sample)}
              >
                <Text
                  style={[
                    styles.samplePillText,
                    selectedSample?.id === sample.id && styles.samplePillTextActive,
                  ]}
                >
                  {sample.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Server Status Pill */}
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: apiOnline ? colors.accent : '#F59E0B' }]} />
          <Text style={styles.meta}>
            AI Model:{' '}
            <Text style={styles.metaBold}>
              {apiOnline ? 'ViT PlantVillage (kimcomehome)' : 'Offline / Demo Ready'}
            </Text>
          </Text>
        </View>

        {/* Primary Scan Button */}
        <TouchableOpacity
          style={[styles.scanButton, (!asset || loading) && styles.scanDisabled]}
          onPress={analyze}
          disabled={!asset || loading}
        >
          {loading ? (
            <View style={styles.loaderRow}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.scanText}>Analyzing with CropWise-Ai...</Text>
            </View>
          ) : (
            <Text style={styles.scanText}>🔍 Scan & Diagnose Leaf</Text>
          )}
        </TouchableOpacity>
        {loading ? (
          <Text style={styles.hint}>Running Vision Transformer classification across 38 crop condition classes...</Text>
        ) : null}
      </Section>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Diagnosis Report Card */}
      {top ? (
        <Section title="Diagnostic Report" subtitle={`${top.crop} · ${top.condition}`}>
          <View style={styles.resultHeader}>
            <View>
              <Text style={styles.diagnosisTitle}>
                {top.crop} — {top.condition}
              </Text>
              <Text style={styles.diagnosisSubtitle}>Classified by Vision Transformer</Text>
            </View>
            <View style={styles.badgesCol}>
              <Badge
                label={`${top.confidence}% Match`}
                tone={top.confidence >= 75 ? 'accent' : 'warn'}
              />
              {top.severity ? (
                <Badge label={`Severity: ${top.severity}`} tone={severityTone} />
              ) : null}
            </View>
          </View>

          <Text style={styles.advice}>{top.advice}</Text>

          {/* Treatment Advisory Tabs */}
          <View style={styles.advisoryWrap}>
            <View style={styles.advisoryTabs}>
              <TouchableOpacity
                style={[styles.advTab, activeAdvisoryTab === 'immediate' && styles.advTabActive]}
                onPress={() => setActiveAdvisoryTab('immediate')}
              >
                <Text
                  style={[
                    styles.advTabText,
                    activeAdvisoryTab === 'immediate' && styles.advTabTextActive,
                  ]}
                >
                  Immediate
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.advTab, activeAdvisoryTab === 'chemical' && styles.advTabActive]}
                onPress={() => setActiveAdvisoryTab('chemical')}
              >
                <Text
                  style={[
                    styles.advTabText,
                    activeAdvisoryTab === 'chemical' && styles.advTabTextActive,
                  ]}
                >
                  Chemical
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.advTab, activeAdvisoryTab === 'organic' && styles.advTabActive]}
                onPress={() => setActiveAdvisoryTab('organic')}
              >
                <Text
                  style={[
                    styles.advTabText,
                    activeAdvisoryTab === 'organic' && styles.advTabTextActive,
                  ]}
                >
                  Organic
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.advTab, activeAdvisoryTab === 'prevention' && styles.advTabActive]}
                onPress={() => setActiveAdvisoryTab('prevention')}
              >
                <Text
                  style={[
                    styles.advTabText,
                    activeAdvisoryTab === 'prevention' && styles.advTabTextActive,
                  ]}
                >
                  Prevention
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.advContent}>
              {activeAdvisoryTab === 'immediate' && (
                <Text style={styles.advText}>
                  {treatments.immediate || 'Inspect nearby crop leaves and prune badly infected tissue.'}
                </Text>
              )}
              {activeAdvisoryTab === 'chemical' && (
                <Text style={styles.advText}>
                  {treatments.chemical || 'Consult local KVK / agricultural extension officer for labelled sprays.'}
                </Text>
              )}
              {activeAdvisoryTab === 'organic' && (
                <Text style={styles.advText}>
                  {treatments.organic || 'Spray 0.5% neem oil emulsion or biocontrol agents like Trichoderma.'}
                </Text>
              )}
              {activeAdvisoryTab === 'prevention' && (
                <Text style={styles.advText}>
                  {treatments.prevention || 'Ensure good soil drainage, sanitize tools, and rotate crop families.'}
                </Text>
              )}
            </View>
          </View>

          {/* Probable Alternatives */}
          <Text style={styles.altHeading}>Top Probable Conditions:</Text>
          {(result.top3 || []).map((item) => (
            <View key={item.label || item.condition} style={styles.altRow}>
              <View style={styles.altInfo}>
                <Text style={styles.altLabel}>
                  {item.crop} · {item.condition}
                </Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${Math.min(item.confidence, 100)}%`,
                        backgroundColor: item.confidence >= 70 ? colors.accent : '#F59E0B',
                      },
                    ]}
                  />
                </View>
              </View>
              <Text style={styles.altPct}>{item.confidence}%</Text>
            </View>
          ))}
        </Section>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  previewWrap: {
    minHeight: 200,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.cardLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },
  preview: {
    width: '100%',
    height: 240,
    resizeMode: 'cover',
  },
  emptyWrap: {
    alignItems: 'center',
    padding: 24,
  },
  leafIcon: {
    fontSize: 42,
    marginBottom: 8,
  },
  placeholder: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  placeholderSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  button: {
    flex: 1,
    backgroundColor: colors.cardLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  resetButton: {
    flex: 0.5,
    borderColor: '#7F1D1D',
    backgroundColor: '#381212',
  },
  resetButtonText: {
    color: '#FCA5A5',
    fontWeight: '700',
    fontSize: 13,
  },
  samplesSection: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  samplesLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
  },
  samplesRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  samplePill: {
    backgroundColor: colors.cardLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  samplePillActive: {
    backgroundColor: '#103126',
    borderColor: colors.accent,
  },
  samplePillText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  samplePillTextActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  metaBold: {
    color: colors.text,
    fontWeight: '600',
  },
  scanButton: {
    backgroundColor: colors.accentDark,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  scanDisabled: {
    opacity: 0.5,
  },
  loaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: '#351616',
    borderWidth: 1,
    borderColor: '#7F1D1D',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 12,
    lineHeight: 18,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8,
  },
  diagnosisTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  diagnosisSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  badgesCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  advice: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  advisoryWrap: {
    backgroundColor: colors.cardLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 14,
  },
  advisoryTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  advTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  advTabActive: {
    borderBottomColor: colors.accent,
    backgroundColor: '#103126',
  },
  advTabText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  advTabTextActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  advContent: {
    padding: 12,
  },
  advText: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
  },
  altHeading: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  altRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardLight,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  altInfo: {
    flex: 1,
    marginRight: 10,
  },
  altLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  barTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  altPct: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 12,
  },
})
