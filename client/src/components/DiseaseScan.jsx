import { useCallback, useEffect, useState, useRef } from "react";

const BACKEND_ORIGIN = (import.meta.env.VITE_BACKEND_ORIGIN || "").replace(/\/$/, "");
const diseaseBase = BACKEND_ORIGIN ? `${BACKEND_ORIGIN}/disease` : "/disease-api";

const SAMPLE_LEAVES = [
  {
    id: "sample_tomato_blight",
    name: "Tomato Blight",
    crop: "Tomato",
    condition: "Early Blight",
    uri: "https://images.unsplash.com/photo-1592417817098-8f3d69102353?w=500&auto=format&fit=crop&q=80",
    mockResult: {
      status: "success",
      model: "kimcomehome/plantvillage-vit-leaf-disease (Demo Fallback)",
      filename: "sample_tomato_early_blight.jpg",
      prediction: {
        crop: "Tomato",
        condition: "Early Blight",
        confidence: 91.4,
        severity: "High",
        advice: "Early blight detected. Prune infected bottom leaves, avoid overhead splashing, and spray protectant copper fungicide promptly.",
        treatment: {
          immediate: "Prune and destroy lower infected leaves; do not compost diseased foliage.",
          chemical: "Spray Mancozeb (2.5 g/L) or Copper Oxychloride (2.5 g/L) at first sign of spots.",
          organic: "Apply 0.5% neem oil emulsion or Trichoderma viride bio-fungicide weekly.",
          prevention: "Maintain 60cm plant spacing and use drip irrigation to prevent soil-to-leaf splashing.",
        },
      },
      top3: [
        { crop: "Tomato", condition: "Early Blight", confidence: 91.4 },
        { crop: "Tomato", condition: "Late Blight", confidence: 6.2 },
        { crop: "Potato", condition: "Early Blight", confidence: 2.4 },
      ],
    },
  },
  {
    id: "sample_potato_blight",
    name: "Potato Blight",
    crop: "Potato",
    condition: "Late Blight",
    uri: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=500&auto=format&fit=crop&q=80",
    mockResult: {
      status: "success",
      model: "kimcomehome/plantvillage-vit-leaf-disease (Demo Fallback)",
      filename: "sample_potato_late_blight.jpg",
      prediction: {
        crop: "Potato",
        condition: "Late Blight",
        confidence: 89.2,
        severity: "High",
        advice: "Late blight risk detected. Remove water-soaked foliage and apply systemic fungicide promptly.",
        treatment: {
          immediate: "Isolate affected plants immediately. Cut and burn severely affected vines.",
          chemical: "Apply Metalaxyl + Mancozeb (2.5 g/L) or Cymoxanil during cloudy, humid spells.",
          organic: "Spray Bordeaux mixture (1%) or copper soap solution.",
          prevention: "Hill up soil around tubers and avoid overhead sprinkler watering.",
        },
      },
      top3: [
        { crop: "Potato", condition: "Late Blight", confidence: 89.2 },
        { crop: "Tomato", condition: "Late Blight", confidence: 7.8 },
        { crop: "Potato", condition: "Healthy", confidence: 3.0 },
      ],
    },
  },
  {
    id: "sample_healthy",
    name: "Healthy Leaf",
    crop: "Bell Pepper",
    condition: "Healthy",
    uri: "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=500&auto=format&fit=crop&q=80",
    mockResult: {
      status: "success",
      model: "kimcomehome/plantvillage-vit-leaf-disease (Demo Fallback)",
      filename: "sample_healthy_leaf.jpg",
      prediction: {
        crop: "Bell Pepper",
        condition: "Healthy",
        confidence: 96.8,
        severity: "None (Healthy)",
        advice: "Leaf looks completely healthy. Maintain regular irrigation, balanced NPK nutrition, and weekly scouting.",
        treatment: {
          immediate: "No intervention required. Foliage displays balanced chlorophyll distribution.",
          chemical: "None needed. Avoid unnecessary chemical spraying.",
          organic: "Apply compost tea or foliar seaweed extract to reinforce natural vigor.",
          prevention: "Continue regular inspection and keep soil moisture uniform.",
        },
      },
      top3: [
        { crop: "Bell Pepper", condition: "Healthy", confidence: 96.8 },
        { crop: "Tomato", condition: "Healthy", confidence: 2.1 },
        { crop: "Potato", condition: "Healthy", confidence: 1.1 },
      ],
    },
  },
];

function confidenceColor(pct) {
  if (pct >= 75) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (pct >= 40) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-stone-600 bg-stone-50 border-stone-200";
}

function severityColor(sev) {
  const s = String(sev || "").toLowerCase();
  if (s.includes("high") || s.includes("severe")) return "text-red-700 bg-red-50 border-red-200";
  if (s.includes("mod")) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-emerald-700 bg-emerald-50 border-emerald-200";
}

export default function DiseaseScan({ profile }) {
  const [file, setFile] = useState(null);
  const [selectedSample, setSelectedSample] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [health, setHealth] = useState(null);
  const [activeTab, setActiveTab] = useState("immediate");
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${diseaseBase}/health`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setHealth(data);
      })
      .catch(() => {
        if (!cancelled) setHealth({ status: "offline" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onPick = useCallback((nextFile) => {
    if (!nextFile) return;
    setFile(nextFile);
    setSelectedSample(null);
    setResult(null);
    setError("");
    const url = URL.createObjectURL(nextFile);
    setPreview((prev) => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return url;
    });
  }, []);

  const onSelectSample = useCallback((sample) => {
    setSelectedSample(sample);
    setFile(null);
    setResult(null);
    setError("");
    setPreview(sample.uri);
  }, []);

  const onClear = useCallback(() => {
    if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setFile(null);
    setSelectedSample(null);
    setPreview("");
    setResult(null);
    setError("");
  }, [preview]);

  useEffect(() => {
    return () => {
      if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function analyze() {
    if (!file && !selectedSample) {
      setError("Please choose a photo or select a sample leaf first.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);

    try {
      let uploadPayload = file;
      if (!uploadPayload && selectedSample) {
        // Fetch image blob from sample url
        try {
          const resp = await fetch(selectedSample.uri);
          uploadPayload = await resp.blob();
        } catch {
          // If internet fails to fetch sample, directly use precomputed sample
          setResult(selectedSample.mockResult);
          setError("ℹ️ Displaying offline verified diagnostic results for this sample.");
          setLoading(false);
          return;
        }
      }

      const body = new FormData();
      body.append("file", uploadPayload, selectedSample ? `${selectedSample.id}.jpg` : file?.name || "leaf.jpg");

      const res = await fetch(`${diseaseBase}/predict`, {
        method: "POST",
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || data.message || `API returned ${res.status}`);
      }
      setResult(data);
    } catch (err) {
      if (selectedSample?.mockResult) {
        setResult(selectedSample.mockResult);
        setError("ℹ️ AI server is offline (port 8001). Showing pre-evaluated diagnosis for this sample leaf.");
      } else {
        setError(
          err.message ||
            "Could not reach the disease API. Start the AIML server on port 8001 or use one of the sample leaves."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  const top = result?.prediction;
  const treatments = top?.treatment || {};
  const cropHint = profile?.primary_crop
    ? `Best results: photograph ${profile.primary_crop} leaves in daylight, filling the frame.`
    : "Photograph one leaf in bright natural daylight, filling the frame with a clean background.";

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div>
        <h2 className="text-2xl font-extrabold text-stone-800 tracking-tight">CropWise-Ai Disease Scan</h2>
        <p className="text-sm text-stone-500 mt-1">
          Powered by Hugging Face Vision Transformer (ViT PlantVillage) for real-time crop pathology and actionable treatments.
        </p>
      </div>

      <div className="rounded-2xl bg-white border border-stone-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🍃</span>
            <div>
              <h3 className="font-bold text-stone-800">Upload or Photograph Leaf</h3>
              <p className="text-xs text-stone-400 mt-0.5">{cropHint}</p>
            </div>
          </div>
          {preview && (
            <button
              onClick={onClear}
              className="text-xs font-semibold text-stone-500 hover:text-red-600 transition-colors"
            >
              ✕ Clear
            </button>
          )}
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col items-center justify-center min-h-[220px] rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 p-4 text-center relative overflow-hidden">
            {/* Hidden file inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => onPick(e.target.files?.[0])}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPick(e.target.files?.[0])}
            />

            {preview ? (
              <img src={preview} alt="Leaf preview" className="max-h-56 rounded-xl object-contain shadow-sm" />
            ) : (
              <div className="space-y-3">
                <span className="text-4xl block">📷</span>
                <p className="font-semibold text-stone-700">Select a leaf photo</p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
                  >
                    📸 Take Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 text-xs font-semibold hover:bg-stone-50 transition-colors"
                  >
                    🖼️ Choose File
                  </button>
                </div>
                <p className="text-[11px] text-stone-400">JPEG, PNG, or WEBP · Max 12 MB</p>
              </div>
            )}
          </div>

          <div className="flex flex-col justify-between gap-4">
            <div className="space-y-3">
              {/* Sample leaves */}
              <div>
                <p className="text-xs font-semibold text-stone-600 mb-2">⚡ Quick Test with Sample Leaves:</p>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_LEAVES.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => onSelectSample(sample)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                        selectedSample?.id === sample.id
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                          : "bg-stone-50 text-stone-700 border-stone-200 hover:bg-emerald-50"
                      }`}
                    >
                      {sample.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-xs text-stone-600 space-y-1.5 pt-2 border-t border-stone-100">
                <p>
                  Model:{" "}
                  <span className="font-mono text-[11px] text-stone-500">
                    {health?.model || "kimcomehome/plantvillage-vit-leaf-disease"}
                  </span>
                </p>
                <p>
                  API Status:{" "}
                  {health?.status === "offline" ? (
                    <span className="text-amber-700 font-medium">Offline (Demo mode enabled)</span>
                  ) : (
                    <span className="text-emerald-700 font-medium">Connected (Port 8001)</span>
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={analyze}
              disabled={loading || (!file && !selectedSample)}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/35 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing leaf with ViT model...
                </>
              ) : (
                <>🔍 Scan & Diagnose Leaf</>
              )}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      {top && (
        <div className="rounded-2xl bg-white border border-stone-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-bold text-stone-800">Diagnostic Report</h3>
            <span className="text-xs text-stone-400 font-mono">Vision Transformer Analysis</span>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xl font-extrabold text-stone-800">
                  {top.crop} — {top.condition}
                </span>
                <p className="text-xs text-stone-500 mt-0.5">Automated classification</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${confidenceColor(top.confidence)}`}>
                  {top.confidence}% Confidence
                </span>
                {top.severity && (
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${severityColor(top.severity)}`}>
                    Severity: {top.severity}
                  </span>
                )}
              </div>
            </div>

            <p className="text-sm text-stone-700 leading-relaxed bg-stone-50 p-4 rounded-xl border border-stone-100">
              {top.advice}
            </p>

            {/* Treatment tabs */}
            <div>
              <div className="flex border-b border-stone-200 gap-2 mb-3">
                {[
                  { id: "immediate", label: "🚨 Immediate Action" },
                  { id: "chemical", label: "🧪 Chemical Sprays" },
                  { id: "organic", label: "🌿 Organic Remedies" },
                  { id: "prevention", label: "🛡️ Prevention" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`pb-2 px-2 text-xs font-bold transition-colors border-b-2 ${
                      activeTab === t.id
                        ? "border-emerald-600 text-emerald-700"
                        : "border-transparent text-stone-400 hover:text-stone-700"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 text-sm text-stone-700">
                {activeTab === "immediate" && (
                  <p>{treatments.immediate || "Inspect nearby crop foliage and prune badly infected leaves."}</p>
                )}
                {activeTab === "chemical" && (
                  <p>{treatments.chemical || "Consult local agricultural extension for labelled crop fungicides."}</p>
                )}
                {activeTab === "organic" && (
                  <p>{treatments.organic || "Spray 0.5% neem oil emulsion or biocontrol agents like Trichoderma."}</p>
                )}
                {activeTab === "prevention" && (
                  <p>{treatments.prevention || "Ensure good soil drainage, sanitize tools, and rotate crop families."}</p>
                )}
              </div>
            </div>

            {/* Other possibilities */}
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                Other Candidate Predictions:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(result.top3 || []).map((item) => (
                  <div
                    key={item.label || item.condition}
                    className="rounded-xl border border-stone-100 bg-stone-50 p-3 text-sm"
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="font-semibold text-stone-700 truncate">
                        {item.crop} · {item.condition}
                      </span>
                      <span className="font-bold text-stone-600 text-xs ml-2">{item.confidence}%</span>
                    </div>
                    <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full"
                        style={{ width: `${Math.min(item.confidence, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
