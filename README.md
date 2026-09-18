# 🌾 CropWise (BeejRakshak)

> **An end-to-end AI-powered agricultural intelligence platform** for Indian farmers — spanning a full-featured web app, a React Native mobile app, a unified Python AI/ML backend, and a satellite SAR processing pipeline.

---

## 📑 Table of Contents

1. [Project Overview](#-project-overview)
2. [Key Features](#-key-features)
3. [CropWise-Ai Plant Disease Detection](#-cropwise-ai-plant-disease-detection)
4. [Mobile App Flow](#-mobile-app-flow)
5. [Architecture](#-architecture)
6. [Repository Structure](#-repository-structure)
7. [Tech Stack](#-tech-stack)
8. [Getting Started](#-getting-started)
   - [Prerequisites](#prerequisites)
   - [Environment Variables](#environment-variables)
   - [Database Setup (Supabase)](#database-setup-supabase)
   - [Running the Web Client](#running-the-web-client)
   - [Running the AI/ML Backend](#running-the-aiml-backend)
   - [Running the Mobile App](#running-the-mobile-app)
   - [Running Everything at Once](#running-everything-at-once)
9. [Module Breakdown](#-module-breakdown)
   - [Web Client (`client/`)](#web-client-client)
   - [AI/ML Backend (`AIML/`)](#aiml-backend-aiml)
   - [CropWise-Ai ViT Pipeline (`CropWise-Ai/`)](#cropwise-ai-vit-pipeline-cropwise-ai)
   - [Mobile App (`mobile/`)](#mobile-app-mobile)
   - [SAR Processing (`sar_processing/`)](#sar-processing-sar_processing)
10. [API Reference](#-api-reference)
11. [Deployment](#-deployment)
12. [Step-by-Step GitHub Push Guide](#-step-by-step-github-push-guide)
13. [Contributing](#-contributing)

---

## 🌟 Project Overview

**CropWise** (internally called *BeejRakshak* — "seed guardian" in Hindi) is a comprehensive agricultural decision-support platform built for Indian farmers. It combines real-time weather data, ML-powered crop market intelligence, **AI Vision Transformer leaf disease detection**, fertilizer optimization, and government scheme discovery — all accessible via an intuitive web dashboard and a companion mobile app.

The platform is multilingual (English, Hindi, Gujarati, and 11 other Indian languages), voice-controlled, and engineered with offline demo fallbacks so it performs flawlessly in low-bandwidth rural environments.

---

## 🚀 Key Features

| Feature | Description |
|---|---|
| 🔬 **CropWise-Ai Disease Detection** | Powered by Hugging Face Vision Transformer (`kimcomehome/plantvillage-vit-leaf-disease`). Detects 38 crop condition classes, displays confidence % meters, severity rating, and 4-tier structured treatment plans (Immediate, Chemical, Organic, Prevention). |
| 📱 **Mobile Plant Detection Flow** | React Native / Expo camera and gallery integration, cross-platform file uploads, 1-tap quick test preset leaves, and zero-config instant demo access. |
| 📊 **Mandi Price Intelligence** | XGBoost ML models for 7-day price forecasting across Gujarat mandis. Spatial + temporal arbitrage engine calculates net profit after transport, storage, and perishability costs. |
| 🧪 **Fertilizer Advisor** | District-aware NPK recommendation engine for Gujarat. Adjusts for soil pH, soil type, NDVI (vegetation index), irrigation ratio, and rainfall with a phased application schedule. |
| 📋 **Government Schemes** | Automatic matching of Central and State government agricultural schemes based on farmer profile. Includes integrated PMFBY crop insurance claim generation (PDF). |
| 🌤️ **Weather Intelligence** | Farm-specific weather via Open-Meteo (free, no key needed) or OpenWeatherMap. Includes 7-day forecast, air quality index, humidity, and wind speed. |
| 🛡️ **Alert System** | Rule-based anomaly alerts for heat stress, market price opportunities, and disease risk with automatic crop advisories. |
| 📅 **Adaptive Crop Calendar** | Smart sowing/harvesting calendar tailored to the farmer's primary crop, district, and current crop stage. |
| 🎙️ **Voice Assistant** | In-browser multilingual voice assistant (EN/HI/GU) supporting navigation commands, weather queries, mandi lookups, and disease scan via speech. |
| 🌍 **Translation** | Google Translate integration with 15 Indian languages (English, Hindi, Gujarati, Bengali, Telugu, Marathi, Tamil, Urdu, Kannada, Malayalam, Punjabi, Odia, Assamese, Nepali, Sanskrit). |
| 📡 **SAR Satellite Pipeline** | Sentinel-1 SAR backscatter processing via Google Earth Engine for field-level moisture anomaly detection and flood flagging. |

---

## 🔬 CropWise-Ai Plant Disease Detection

The plant disease detection module utilizes a fine-tuned **Vision Transformer (ViT)** trained on the PlantVillage dataset:

- **Model Identifier:** [`kimcomehome/plantvillage-vit-leaf-disease`](https://huggingface.co/kimcomehome/plantvillage-vit-leaf-disease)
- **Architecture:** ViT Image Classification Pipeline (PyTorch + Hugging Face Transformers)
- **Supported Crops:** Tomato, Potato, Bell Pepper, Apple, Corn, Grape, Peach, Strawberry, and more.
- **Classification Output:**
  - **Crop & Condition Identification** (e.g. *Tomato — Early Blight*, *Potato — Late Blight*, *Healthy*)
  - **Confidence Score (%)** with colored badge indicators
  - **Severity Rating** (*None/Healthy*, *Moderate*, *High*, *Severe*)
  - **Actionable Treatment Plans**:
    - 🚨 **Immediate Action:** Pruning, isolating infected vines, field sanitation.
    - 🧪 **Chemical Sprays:** Targeted fungicides/bactericides (e.g. Mancozeb, Copper Oxychloride, Metalaxyl) with dosage guidelines.
    - 🌿 **Organic Remedies:** Neem oil emulsions, Trichoderma bio-fungicides, baking soda / sulfur dusts.
    - 🛡️ **Prevention:** Canopy airflow spacing, drip irrigation, crop rotation families.
  - **Candidate Probabilities:** Top-3 alternative conditions with percentage bars.
- **Offline / Resilient Fallback:** When the AI server is booting or running without GPU weights, intelligent heuristic analysis provides demo advisory responses so the app never shows blank or broken screens.

---

## 📱 Mobile App Flow

The companion mobile app is built with **React Native + Expo SDK 50** for iOS, Android, and Web:

1. **Instant Access / Demo Mode:**
   - Sign in via mobile number or tap **"⚡ Enter as Demo Farmer"** to test immediately without configuring Supabase or entering an API key.
2. **Interactive Navigation:**
   - 7 tabs: **Overview**, **Mandi**, **Disease Scan**, **Fertilizer**, **Govt Schemes**, **Advisory**, and **Alerts**.
   - Prominent **"Instant Leaf Disease Diagnosis"** hero card right on the Overview screen.
3. **Disease Detection Flow:**
   - **Capture Options:** Tap **"📸 Take Photo"** to open camera, or **"🖼️ Choose Photo"** to select from gallery.
   - **Quick Test Samples:** Tap preset samples (*Tomato Blight*, *Potato Blight*, *Healthy Leaf*) to preview diagnosis with 1 click.
   - **Instant Analysis:** Tapping **"🔍 Scan & Diagnose Leaf"** uploads using cross-platform FormData (native or web blob) and displays the complete diagnostic report and treatment tabs.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                             CLIENT LAYER                                 │
│   Web App (React 18 + Vite 5)            Mobile App (Expo SDK 50)        │
│   ├── Dashboard (9 navigation tabs)       ├── Login (Supabase + Demo)     │
│   ├── Voice Assistant (EN / HI / GU)      ├── 7 Interactive Tabs          │
│   ├── Google Translate (15 languages)     ├── Camera & Gallery Pickers    │
│   └── CropWise-Ai Disease Scanner         └── DiseaseScanTab Component    │
└──────────────────────┬───────────────────────────────┬───────────────────┘
                       │  HTTP / Vite Proxy            │
                       ▼                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      UNIFIED AI/ML BACKEND (FastAPI)                     │
│   Port 8001  |  beejrakshak.onrender.com (production)                    │
│                                                                          │
│   /disease/*   CropWise-Ai Vision Transformer (Hugging Face ViT)         │
│   /mandi/*     Mandi Price Intelligence & Spatial Arbitrage (XGBoost)    │
│   /api/*       District-aware NPK Fertilizer Advisor                     │
│   /schemes/*   Government Scheme Matcher + PMFBY Claim Generator (PDF)   │
│   /yield/*     Crop Yield Estimation Service                             │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
┌──────────────────────────────┐  ┌────────────────────────────────────────┐
│     Supabase (PostgreSQL)    │  │       SAR Processing Pipeline          │
│   ├── farmers                │  │       (GEE + PostGIS + Python)         │
│   └── registrations          │  │       Sentinel-1 VV/VH backscatter     │
└──────────────────────────────┘  └────────────────────────────────────────┘
```

---

## 📁 Repository Structure

```
CropWise-main/
│
├── .env.example                 # Environment variable template
├── .gitignore                   # Ignores node_modules, venvs, and build outputs
├── package.json                 # Monorepo scripts (concurrently)
├── run-servers.bat              # Windows one-click startup script
│
├── CropWise-Ai/                 # Standalone Vision Transformer Testing
│   ├── test_model.py            # CLI script to test Hugging Face ViT model
│   └── test_leaf.JPG            # Sample leaf image for validation
│
├── client/                      # React Web Application (Vite 5 + Tailwind)
│   ├── index.html
│   ├── vite.config.js           # Proxies /mandi-api, /disease-api, /schemes-api
│   ├── vercel.json              # SPA rewrite & API proxy rules
│   └── src/
│       ├── App.jsx              # Route guard & authentication shell
│       ├── pages/
│       │   ├── Dashboard.jsx    # Main 9-tab dashboard
│       │   ├── Login.jsx        # Farmer login + localDb fallback
│       │   ├── Registration.jsx # Farmer onboarding form
│       │   └── Profile.jsx      # Profile editor
│       ├── components/
│       │   ├── DiseaseScan.jsx  # CropWise-Ai leaf scanner (camera/gallery/samples)
│       │   ├── FertilizerAdvisor.jsx
│       │   ├── GovernmentSchemes.jsx
│       │   └── VoiceAssistant/  # Multilingual voice navigation widget
│       └── lib/
│           ├── supabase.js      # Supabase client + local fallback
│           └── localDb.js       # Zero-config localStorage database
│
├── AIML/                        # Unified Python AI/ML Backend (FastAPI, port 8001)
│   ├── main.py                  # Master FastAPI app mounting all modules
│   ├── requirements.txt         # FastAPI, PyTorch, Transformers, XGBoost
│   ├── disease_detection/
│   │   ├── __init__.py
│   │   └── predict.py           # /disease/predict ViT pipeline + treatment advisor
│   ├── ml/
│   │   ├── fertilizer_router.py # NPK fertilizer recommendation router
│   │   └── gujarat_districts.csv# Soil & district agricultural data
│   ├── mandi_intelligence/      # XGBoost price prediction & arbitrage
│   └── scrapbot/                # Scheme matcher & PMFBY claim generator
│
├── mobile/                      # React Native Mobile App (Expo SDK 50)
│   ├── App.js
│   ├── app.config.js            # Expo configuration (Cropwise)
│   ├── package.json
│   └── src/
│       ├── navigation/AppNavigator.js
│       ├── context/AuthContext.js
│       ├── screens/
│       │   ├── LoginScreen.js      # Login + instant Demo Farmer mode
│       │   ├── RegistrationScreen.js
│       │   └── DashboardScreen.js  # Dashboard shell + AI Hero card
│       ├── components/
│       │   ├── DiseaseScanTab.js   # Mobile leaf scanner + treatment tabs
│       │   ├── FertilizerTab.js
│       │   ├── SchemesTab.js
│       │   ├── Section.js, StatCard.js, Badge.js
│       └── lib/
│           ├── api.js              # Dynamic API origin resolver
│           ├── supabase.js         # Supabase client + offline safety
│           └── registration.js     # AsyncStorage local registration caching
│
└── sar_processing/              # Sentinel-1 SAR Pipeline (Python + GEE)
```

---

## 🛠️ Tech Stack

### Web Client
- **Framework:** React 18, Vite 5, Tailwind CSS 3.4
- **Routing:** React Router DOM v7
- **Database / Auth:** Supabase PostgreSQL with built-in `localStorage` zero-config fallback
- **Voice & Translation:** Web Speech API, Google Translate Widget

### AI/ML Backend
- **Framework:** FastAPI, Uvicorn, Pydantic v2
- **Leaf Disease Detection:** Hugging Face Transformers (`kimcomehome/plantvillage-vit-leaf-disease`), PyTorch, Pillow
- **Mandi Intelligence:** XGBoost 2.x, pandas, scikit-learn
- **PDF Claims:** FPDF2

### Mobile Application
- **Framework:** React Native 0.73.6, Expo SDK 50
- **Camera & Photos:** `expo-image-picker`
- **Navigation:** `@react-navigation/native-stack`
- **Storage:** `@react-native-async-storage/async-storage`

---

## ⚡ Getting Started

### Prerequisites
- **Node.js** v18+ (Node 20 recommended)
- **Python** 3.10+
- **Supabase** account (optional — zero-config local demo mode available out of the box)

---

### Environment Variables

Copy `.env.example` to `.env` in the root:

```bash
cp .env.example .env
```

```env
# Optional: Supabase credentials (leave empty to use local demo mode)
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here

# Optional: Weather API Key
# VITE_OPENWEATHER_API_KEY=your-key
```

---

### Running the AI/ML Backend

```bash
cd AIML
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```
- API root: `http://localhost:8001`
- Interactive Swagger docs: `http://localhost:8001/docs`
- Disease health check: `http://localhost:8001/disease/health`

---

### Running the Web Client

```bash
cd client
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

### Running the Mobile App

```bash
cd mobile
npm install
npx expo start
```
- Press `w` to run directly in your web browser.
- Press `a` for Android emulator.
- Scan the QR code using the **Expo Go** app on your iPhone or Android phone.

---

### Running Everything on Windows

Double-click `run-servers.bat` in the root directory to launch both the Web client and the AI/ML backend simultaneously.

---

## 📡 API Reference

Interactive Swagger documentation is available at `http://localhost:8001/docs`.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server health check |
| `POST` | `/disease/predict` | CropWise-Ai ViT leaf disease detection & treatment generation |
| `GET` | `/disease/health` | Status of the disease ViT model pipeline |
| `GET` | `/mandis` | List available mandis with price records |
| `POST` | `/response` | Mandi arbitrage & net-profit recommendations |
| `GET` | `/api/fertilizer/recommend` | NPK fertilizer dosing schedule for Gujarat districts |
| `POST` | `/schemes/api/v1/schemes/recommend` | Farmer profile scheme matching |
| `POST` | `/schemes/api/v1/claims/generate` | Generate PMFBY crop insurance claim PDF |

---

## 🚀 Step-by-Step GitHub Push Guide

Follow these steps in your terminal to push this completed project to GitHub:

### 1. Verify your local status
Ensure that virtual environments (`venv/`) and build directories are ignored:
```bash
git status
```

### 2. Stage all files
```bash
git add .
```

### 3. Commit the changes
```bash
git commit -m "feat: complete CropWise-Ai leaf disease detection with mobile flow, camera capture, treatment plans, and updated docs"
```

### 4. Create your repository on GitHub
1. Go to [github.com/new](https://github.com/new).
2. Name your repository (e.g., `CropWise` or `CropWise-AI`).
3. Leave "Initialize this repository with a README" **unchecked** (since we already have a full project).
4. Click **Create repository**.

### 5. Link and push to GitHub
Replace `YOUR_USERNAME` and `YOUR_REPO` with your actual GitHub details:
```bash
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

*(If `origin` already exists, update it with: `git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO.git`)*

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m "feat: add amazing feature"`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

*Built with ❤️ for Indian farmers — empowering every hand that feeds the nation.*
