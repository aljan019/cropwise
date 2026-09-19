/**
 * client/src/lib/officerView.js
 * JavaScript mirror of AIML/officer_view.py:
 * Provides getOfficerViewData() and computeUrgencyScore()
 * over seed-farmers.json with deterministic ranking.
 */

import seedFarmers from '../seed-farmers.json'

const ACRE_TO_HECTARE = 0.4047

/** Base yield by crop in tonnes per hectare (mirrors yield_service outputs for Gujarat) */
const BASE_CROP_YIELDS = {
  Groundnut: 2.65,
  Maize: 3.85,
  Soyabean: 2.15,
  Rice: 4.10,
  Wheat: 3.60,
  Onion: 18.20,
  Potato: 22.50,
}

function boundedScore(val) {
  const n = Number(val)
  if (isNaN(n)) return 0
  return Math.max(0, Math.min(100, n))
}

export function areaInHectares(farmer) {
  const area = Number(farmer?.land_area || 0)
  if (area <= 0) return 0
  const unit = String(farmer?.land_unit || '').toLowerCase()
  return unit === 'acre' ? area * ACRE_TO_HECTARE : area
}

export function riskScore(floodFlag, moistureAnomaly) {
  if (floodFlag) return 100
  if (moistureAnomaly === 'high') return 70
  if (moistureAnomaly === 'low') return 55
  return 15
}

export function alertUrgency(floodFlag, moistureAnomaly) {
  if (floodFlag) return 'critical'
  if (moistureAnomaly === 'high') return 'high'
  if (moistureAnomaly === 'low') return 'medium'
  return 'low'
}

/**
 * Computes urgency score (0-100) exactly matching AIML/officer_view.py:
 * flood_risk (40%) + disease_pressure (30%) + pending_claim (30 pts * 0.3)
 */
export function computeUrgencyScore(farmer) {
  const floodRisk = boundedScore(
    farmer.riskScore !== undefined
      ? farmer.riskScore
      : farmer.flood_flag
        ? 100
        : farmer.moisture_anomaly === 'high'
          ? 70
          : 15
  )

  const diseasePressure = boundedScore(
    farmer.disease_pressure !== undefined
      ? farmer.disease_pressure
      : String(farmer.disease_risk).toLowerCase() === 'high'
        ? 85
        : String(farmer.disease_risk).toLowerCase() === 'moderate'
          ? 45
          : 0
  )

  const pendingInsuranceClaim = Boolean(farmer.pending_insurance_claim || farmer.pending_claim)

  const score = (floodRisk * 0.4) + (diseasePressure * 0.3) + ((pendingInsuranceClaim ? 30 : 0) * 0.3)
  return Math.round(Math.max(0, Math.min(100, score)) * 100) / 100
}

/**
 * Human-readable reason for why the farmer was placed in priority queue
 */
export function urgencyReason(farmer) {
  const parts = []
  if (farmer.flood_flag || farmer.riskScore >= 80) parts.push('Active flood risk')
  if (farmer.pending_insurance_claim || farmer.pending_claim) parts.push('Pending insurance claim')
  if (String(farmer.disease_risk).toLowerCase() === 'high' || farmer.disease_pressure >= 70) {
    parts.push('High disease pressure')
  } else if (String(farmer.disease_risk).toLowerCase() === 'moderate' || farmer.disease_pressure >= 40) {
    parts.push('Moderate disease pressure')
  }
  if (farmer.moisture_anomaly === 'high') parts.push('High SAR moisture anomaly')
  if (farmer.alert_count && farmer.alert_count > 0) parts.push(`${farmer.alert_count} active alerts`)

  return parts.length ? parts.join(' + ') : 'Routine monitoring (baseline SAR)'
}

/**
 * Enriches farmer list with SAR classifications, yield estimates, and urgency scores.
 * Exactly mirrors getOfficerViewData in AIML/officer_view.py.
 */
export function getOfficerViewData(farmers = seedFarmers) {
  const rawList = Array.isArray(farmers) ? farmers : seedFarmers

  const enriched = rawList.map(farmer => {
    const floodFlag = Boolean(farmer.flood_flag)
    const moistureAnomaly = farmer.moisture_anomaly || 'normal'

    const areaHa = areaInHectares(farmer)
    const cropYieldPerHa = BASE_CROP_YIELDS[farmer.primary_crop] || 2.80
    const projectedYield = Math.round((cropYieldPerHa * areaHa) * 100) / 100

    const rScore = farmer.riskScore !== undefined ? Number(farmer.riskScore) : riskScore(floodFlag, moistureAnomaly)
    const urgency = farmer.alertUrgency || alertUrgency(floodFlag, moistureAnomaly)

    const baseObj = {
      ...farmer,
      area_hectares: Math.round(areaHa * 100) / 100,
      flood_flag: floodFlag,
      moisture_anomaly: moistureAnomaly,
      riskScore: rScore,
      projectedYield,
      alertUrgency: urgency,
    }

    const uScore = computeUrgencyScore(baseObj)
    return {
      ...baseObj,
      urgencyScore: uScore,
      reason: urgencyReason(baseObj),
      alert_count: farmer.alert_count || (uScore >= 70 ? 3 : uScore >= 40 ? 1 : 0),
    }
  })

  // Sort descending by urgencyScore
  const rankedFarmers = [...enriched].sort((a, b) => b.urgencyScore - a.urgencyScore)

  const aggregate = {
    totalProjectedYield: Math.round(rankedFarmers.reduce((sum, f) => sum + f.projectedYield, 0) * 100) / 100,
    farmersAtCriticalRisk: rankedFarmers.filter(f => f.alertUrgency === 'critical' || f.urgencyScore >= 70 || f.riskScore >= 80).length,
  }

  return {
    farmers: rankedFarmers,
    priorityQueue: rankedFarmers.slice(0, 3),
    aggregate,
  }
}
