import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getOfficerViewData } from '../lib/officerView'
import seedFarmers from '../seed-farmers.json'

/* ── Reuse Dashboard's Icon helper exactly ── */
function Icon({ d, className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}

/* ── Exact copy of Dashboard's StatCard ── */
function StatCard({ label, value, sub, gradient, iconPath }) {
  return (
    <div className="rounded-2xl bg-white border border-stone-200/80 shadow-sm p-5 group hover:-translate-y-0.5 transition-transform duration-200">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-transform duration-300`}>
        <Icon d={iconPath} className="w-5 h-5 text-white" />
      </div>
      <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold text-stone-800 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-stone-400">{sub}</p>}
    </div>
  )
}

/* ── Icon paths (subset from Dashboard) ── */
const ICONS = {
  home:      'M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
  satellite: 'M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79M12 12h.008v.007H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z',
  chart:     'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
  alerts:    'M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0M13 10h-2v3H8v2h3v3h2v-3h3v-2h-3v-3z',
  advisory:  'M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18',
  signout:   'M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9',
}

/* ─── Helpers ─── */
function riskLevel(farmer) {
  if (farmer.alertUrgency === 'critical' || farmer.riskScore >= 80 || farmer.urgencyScore >= 70 || farmer.flood_flag) {
    return 'HIGH'
  }
  if (farmer.alertUrgency === 'high' || farmer.riskScore >= 40 || farmer.urgencyScore >= 40) {
    return 'MEDIUM'
  }
  return 'LOW'
}

function riskStyle(level) {
  if (level === 'HIGH')   return 'bg-red-100 text-red-700 border-red-200'
  if (level === 'MEDIUM') return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-emerald-100 text-emerald-700 border-emerald-200'
}

function riskDot(level) {
  if (level === 'HIGH')   return 'bg-red-500'
  if (level === 'MEDIUM') return 'bg-amber-400'
  return 'bg-emerald-500'
}

export default function OfficerView({ session, onSignOut }) {
  const navigate = useNavigate()
  const [search, setSearch]   = useState('')
  const [riskFilter, setRiskFilter] = useState('ALL') // ALL | HIGH | MEDIUM | LOW
  const [sortKey, setSortKey] = useState('_risk')
  const [sortDir, setSortDir] = useState('desc')
  const [showFormula, setShowFormula] = useState(false)

  // Real data computed from seed-farmers.json using getOfficerViewData()
  const officerData = useMemo(() => getOfficerViewData(seedFarmers), [])
  const farmers = officerData.farmers
  const priorityQueue = officerData.priorityQueue
  const aggregate = officerData.aggregate

  /* ─── Aggregate stats from getOfficerViewData() ─── */
  const totalFarmers   = farmers.length
  const criticalCount  = aggregate.farmersAtCriticalRisk
  const projectedYield = aggregate.totalProjectedYield
  const totalAlerts    = farmers.reduce((s, f) => s + (f.alert_count || 0), 0)
  const totalArea      = (farmers.reduce((s, f) => s + (f.area_hectares || f.land_area), 0)).toFixed(1)
  const avgYield       = totalFarmers > 0 ? (projectedYield / totalArea).toFixed(2) : '0.0'
  const districts      = [...new Set(farmers.map(f => f.district).filter(Boolean))]
  const districtLabel  = districts.length === 1 ? districts[0] : districts.length > 1 ? `${districts.length} Districts` : 'Mehsana'

  const RISK_WEIGHT = { HIGH: 3, MEDIUM: 2, LOW: 1 }

  /* ─── Filter & Sort ─── */
  const visible = farmers
    .filter(f => {
      const matchSearch = search === '' ||
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.village.toLowerCase().includes(search.toLowerCase()) ||
        f.primary_crop.toLowerCase().includes(search.toLowerCase())
      const matchRisk = riskFilter === 'ALL' || riskLevel(f) === riskFilter
      return matchSearch && matchRisk
    })
    .sort((a, b) => {
      if (!sortKey) return 0
      let valA, valB
      if (sortKey === '_risk') {
        valA = RISK_WEIGHT[riskLevel(a)] || 0
        valB = RISK_WEIGHT[riskLevel(b)] || 0
      } else {
        valA = a[sortKey]
        valB = b[sortKey]
      }
      if (typeof valA === 'string') {
        return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
      }
      return sortDir === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1)
    })

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-[#f8faf9]">

      {/* ── Top Nav — mirrors Dashboard's top bar ── */}
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 bg-white border-b border-stone-200/80 shadow-sm px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <img src="/tea.png" alt="CropWise" className="w-9 h-9 rounded-xl object-cover shadow-lg shrink-0" />
          <div className="min-w-0">
            <h1 className="font-extrabold text-sm text-stone-800 tracking-tight leading-tight">Cropwise</h1>
            <p className="text-[10px] text-emerald-600 font-medium leading-none">Officer / FPO Command Center</p>
          </div>
          <span className="hidden sm:inline-flex items-center text-[10px] font-bold px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
            FPO · GOVT · INSURER VIEW
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 text-xs font-bold transition-all shadow-sm hover:shadow-md shrink-0 active:scale-95"
            title="Return to Single-Farmer Dashboard"
            aria-label="Back to Farmer View"
          >
            <span className="text-emerald-200 font-normal">←</span>
            <span className="hidden sm:inline">Back to</span>
            <span>Farmer View</span>
          </button>
          <button
            onClick={onSignOut}
            className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-xl border border-red-200 transition-all"
          >
            <Icon d={ICONS.signout} className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      <main className="flex-1 p-3 sm:p-4 md:p-6 space-y-6 max-w-6xl w-full mx-auto animate-fade-in">

        {/* ── Welcome Banner — exact Dashboard emerald/teal gradient ── */}
        <div className="rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 md:p-8 text-white relative overflow-hidden">
          {/* Decorative blobs — same as Dashboard OverviewTab */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.04] rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-white/[0.03] rounded-full translate-y-1/2" />
          <div className="relative z-10">
            <p className="text-emerald-200 text-sm font-medium">Field Intelligence Platform</p>
            <h2 className="text-2xl md:text-3xl font-extrabold mt-1">
              District: {districtLabel} &nbsp;·&nbsp; {totalFarmers} farms monitored
            </h2>
            <p className="text-emerald-100/70 text-sm mt-2 max-w-lg">
              Projected yield:&nbsp;<strong className="text-white">{Number(projectedYield || 0).toFixed(2)} tonnes</strong>
              &nbsp;·&nbsp;
              <span className={criticalCount > 0 ? 'text-red-200 font-bold' : 'text-emerald-200'}>
                {criticalCount} farmer{criticalCount !== 1 ? 's' : ''} at critical risk
              </span>
              &nbsp;·&nbsp; SAR satellite · Mandi · Yield AI
            </p>
          </div>
        </div>

        {/* ── Stat Cards — same StatCard component as Dashboard ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Farmers"
            value={totalFarmers}
            sub={`${districtLabel} cluster`}
            gradient="from-emerald-500 to-teal-600"
            iconPath={ICONS.home}
          />
          <StatCard
            label="Critical Risk"
            value={criticalCount}
            sub={criticalCount > 0 ? 'Needs attention' : 'All clear'}
            gradient={criticalCount > 0 ? 'from-red-500 to-rose-600' : 'from-emerald-500 to-teal-600'}
            iconPath={ICONS.alerts}
          />
          <StatCard
            label="Proj. Yield"
            value={`${Number(projectedYield || 0).toFixed(2)} t`}
            sub={`avg ${avgYield} t/ha`}
            gradient="from-amber-500 to-orange-600"
            iconPath={ICONS.advisory}
          />
          <StatCard
            label="Total Area"
            value={`${totalArea} ha`}
            sub={`${totalFarmers} holdings`}
            gradient="from-blue-500 to-indigo-600"
            iconPath={ICONS.chart}
          />
        </div>

        {/* ══ AI Priority Score ══════════════════════════════════════════════ */}
        <div className="rounded-2xl bg-white border border-stone-200/80 shadow-sm overflow-hidden">
          {/* Section header */}
          <div className="px-6 py-4 border-b border-stone-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shrink-0">
              <Icon d={ICONS.satellite} className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-stone-800 text-sm sm:text-base">AI Priority Score</h2>
              <p className="text-[11px] text-stone-400">Top 3 farmers requiring immediate officer attention — ranked by SAR risk, disease, and alert signals</p>
            </div>
          </div>

          {/* Priority cards */}
          <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {priorityQueue.map((farmer, idx) => {
              const score = Math.round(farmer.urgencyScore ?? farmer.score ?? 0)
              /* Badge color thresholds — red 70+, amber 40-69, green under 40 */
              const badgeStyle =
                score >= 70 ? 'bg-red-100 text-red-800 border-red-300 ring-red-200' :
                score >= 40 ? 'bg-amber-100 text-amber-800 border-amber-300 ring-amber-200' :
                              'bg-emerald-100 text-emerald-800 border-emerald-300 ring-emerald-200'
              const scoreDot =
                score >= 70 ? 'bg-red-500' :
                score >= 40 ? 'bg-amber-400' :
                              'bg-emerald-500'
              const rankGradient = idx === 0
                ? 'from-red-500 to-rose-600'
                : idx === 1
                  ? 'from-amber-500 to-orange-500'
                  : 'from-emerald-500 to-teal-600'
              const rankLabel = ['#1 Urgent', '#2 High', '#3 Monitor'][idx]

              return (
                <div
                  key={farmer.id}
                  className="rounded-2xl bg-white border border-stone-200/80 shadow-sm p-5 flex flex-col gap-3 hover:-translate-y-0.5 transition-transform duration-200"
                >
                  {/* Rank + score badge row */}
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-gradient-to-r ${rankGradient} text-white shadow-sm`}>
                      {rankLabel}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 text-sm font-extrabold px-3 py-1.5 rounded-xl border ring-2 ring-offset-1 ${badgeStyle}`}>
                      <span className={`w-2 h-2 rounded-full ${scoreDot}`} />
                      {score}
                      <span className="text-[10px] font-semibold opacity-70">/ 100</span>
                    </span>
                  </div>

                  {/* Farmer info */}
                  <div>
                    <p className="font-bold text-stone-800 text-[15px] leading-tight">{farmer.name}</p>
                    <p className="text-xs text-stone-400 mt-0.5">{farmer.village} · {farmer.primary_crop}</p>
                  </div>

                  {/* Reason pill */}
                  <div className="rounded-lg bg-stone-50 border border-stone-100 px-3 py-2">
                    <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-0.5">Reason</p>
                    <p className="text-xs font-medium text-stone-700 leading-snug">{farmer.reason}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Transparency Accordion / Footer */}
          <div className="border-t border-stone-100 bg-stone-50/60 px-6 py-3">
            <button
              type="button"
              onClick={() => setShowFormula(open => !open)}
              className="w-full flex items-center justify-between text-left text-xs font-bold text-stone-600 hover:text-stone-900 transition-colors"
            >
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-violet-100 text-violet-700 text-[10px] font-extrabold inline-flex items-center justify-center">ℹ</span>
                How AI Priority Scores are calculated (total = 100 points)
              </span>
              <span className="text-stone-400 text-xs font-semibold">{showFormula ? '▲ Hide breakdown' : '▼ View formula'}</span>
            </button>

            {showFormula && (
              <div className="mt-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-4 animate-fade-in">
                <p className="text-xs font-bold text-stone-800 mb-2">
                  Urgency Score = Flood Risk (40%) + Disease Pressure (30%) + Pending Insurance Claim (30%)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-stone-600">
                  <div className="flex gap-2">
                    <span className="text-emerald-700 font-extrabold shrink-0">40%</span>
                    <span>
                      <strong className="text-stone-800">SAR Flood &amp; Moisture Risk</strong> — Detects waterlogging and soil moisture anomalies from Sentinel-1 radar backscatter.
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-teal-700 font-extrabold shrink-0">30%</span>
                    <span>
                      <strong className="text-stone-800">Crop Disease Pressure</strong> — Scored by our ViT (Vision Transformer) leaf scan diagnostic model.
                    </span>
                  </div>
                  <div className="flex gap-2 bg-white/70 border border-emerald-200/80 rounded-xl p-2">
                    <span className="text-indigo-600 font-extrabold shrink-0">30%</span>
                    <span className="text-stone-700">
                      <strong className="text-stone-800">Pending PMFBY Claim</strong> — Unresolved crop loss compensation claims requiring officer verification.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* ══════════════════════════════════════════════════════════════════ */}

        {/* ── Filters ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search farmer, village, or crop..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
          />
          <div className="flex gap-2">
            {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(r => (
              <button
                key={r}
                onClick={() => setRiskFilter(r)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                  riskFilter === r
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-emerald-300'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* ── Farmer Roster Table ── */}
        <div className="rounded-2xl bg-white border border-stone-200/80 shadow-sm overflow-hidden">

          {/* Table header row */}
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shrink-0">
                <Icon d={ICONS.home} className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-stone-800 text-sm sm:text-base">Full Farmer Roster</h2>
                <p className="text-[11px] text-stone-400">Click any column header to sort · {visible.length} of {totalFarmers} farmers</p>
              </div>
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100">
                  {[
                    { key: 'name',           label: 'Farmer'          },
                    { key: 'village',        label: 'Village'         },
                    { key: 'primary_crop',   label: 'Crop'            },
                    { key: 'area_hectares',  label: 'Land (ha)'       },
                    { key: '_risk',          label: 'Risk Level'      },
                    { key: 'projectedYield', label: 'Proj. Yield'     },
                    {
                      key: 'alert_count',
                      label: 'Alerts',
                      caption: 'Notifications sent — not all contributing risk factors',
                    },
                  ].map(({ key, label, caption }) => (
                    <th
                      key={key}
                      onClick={() => {
                        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
                        else { setSortKey(key); setSortDir('desc') }
                      }}
                      className="px-4 py-3 text-left text-[11px] font-bold text-stone-500 uppercase tracking-wider cursor-pointer select-none hover:text-stone-700 transition-colors group align-top whitespace-nowrap"
                    >
                      <span className="inline-flex items-center gap-1">
                        {label}
                        {caption && (
                          <span
                            title={caption}
                            className="cursor-help inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-stone-200 text-stone-600 text-[9px] font-bold"
                          >
                            i
                          </span>
                        )}
                        <span className="opacity-0 group-hover:opacity-60 transition-opacity">
                          {sortKey === key
                            ? sortDir === 'asc' ? '↑' : '↓'
                            : '↕'}
                        </span>
                        {sortKey === key && (
                          <span className="text-emerald-500">{sortDir === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </span>
                      {caption && (
                        <span className="block text-[9px] font-normal normal-case text-stone-400 leading-tight mt-0.5 tracking-normal max-w-[170px]">
                          {caption}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {visible.map(farmer => {
                  const level = riskLevel(farmer)
                  return (
                    <tr key={farmer.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="px-4 py-3.5 font-semibold text-stone-800 whitespace-nowrap">{farmer.name}</td>
                      <td className="px-4 py-3.5 text-stone-500 whitespace-nowrap">{farmer.village}</td>
                      <td className="px-4 py-3.5 text-stone-700 font-medium whitespace-nowrap">{farmer.primary_crop}</td>
                      <td className="px-4 py-3.5 font-semibold text-stone-700 whitespace-nowrap">{Number(farmer.area_hectares || 0).toFixed(2)} ha</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border ${riskStyle(level)}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${riskDot(level)}`} />
                          {level}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-stone-700 whitespace-nowrap">{Number(farmer.projectedYield || 0).toFixed(2)} t</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {farmer.alert_count > 0
                          ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-extrabold">{farmer.alert_count}</span>
                          : <span className="text-stone-300 text-xs">—</span>
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden divide-y divide-stone-100">
            {visible.map(farmer => {
              const level = riskLevel(farmer)
              return (
                <div key={farmer.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-stone-800">{farmer.name}</p>
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md border ${riskStyle(level)}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${riskDot(level)}`} />
                      {level}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500">{farmer.village} · {farmer.primary_crop} · {farmer.land_area} {farmer.land_unit}</p>
                  <div className="flex gap-4 text-xs">
                    <span className="text-stone-600">Yield: <strong>{Number(farmer.projectedYield || 0).toFixed(2)} t</strong></span>
                    {farmer.alert_count > 0 && <span className="text-red-600 font-bold">{farmer.alert_count} alerts</span>}
                  </div>
                </div>
              )
            })}
          </div>

          {visible.length === 0 && (
            <div className="p-12 text-center text-stone-400 text-sm">No farmers match your filter.</div>
          )}
        </div>

        {/* ── Demo banner ── */}
        <div className="rounded-xl bg-stone-50 border border-stone-200 p-4 flex items-start gap-3">
          <span className="text-stone-400 text-lg shrink-0">ℹ️</span>
          <div>
            <p className="text-sm font-bold text-stone-700">Demo Mode — Placeholder Data</p>
            <p className="text-xs text-stone-500 mt-0.5">
              Live data pulls from the Supabase <code className="bg-stone-100 px-1 rounded">farmers</code> table.
              SAR anomalies from the GEE pipeline populate Risk Level.
              Yield predictions come from the <code className="bg-stone-100 px-1 rounded">/yield</code> endpoint.
            </p>
          </div>
        </div>

      </main>
    </div>
  )
}
