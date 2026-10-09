# Aegis Clinical Risk & Recommendation System

Evidence-based clinical recommendation and risk detection decision support platform with deterministic emergency rules, explainable condition scoring, doctor override safeguards, dynamic question routing, and HIPAA/EHR-ready audit logging.

---

## 🌟 Key Features

- **Deterministic Rule & Safety Engine**: Evaluates clinical flags (e.g. cardiac ischemia, stroke protocols, anaphylaxis, shock) with immediate safety-first triaging.
- **Explainable Recommendation Scoring**: Provides transparent rationale, triggered rules, and differential diagnostic guidance.
- **Dynamic Question Engine**: Intelligently identifies pertinent negatives and missing clinical information to clarify diagnostic probabilities.
- **Doctor Override Safeguards**: Clinician sign-off, risk-tolerance adjustment, and manual override tracking.
- **Comprehensive Audit Trail**:
  - Full traceability for every clinical inference, state transition, and clinician action.
  - Export audit logs formatted as **Text Summaries** (EHR-ready) or **Structured JSON**.
  - One-click copy and detail inspection drawer.
- **Dual AI & Deterministic Architecture**:
  - Powered by Google Gemini with resilient deterministic fallbacks and quota circuit breaker protections.

---

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Motion
- **Backend / API**: Express, Node.js (`tsx`)
- **AI Integration**: `@google/genai` (Gemini API)
- **Tooling**: Vite 8, TypeScript

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** or **pnpm** / **yarn**
- A **Gemini API Key** (optional, fallback deterministic triage is active if key is not present)

### 2. Clone the Repository
```bash
git clone https://github.com/<your-username>/<your-repo-name>.git
cd <your-repo-name>
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Update `.env` with your credentials:
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```

### 5. Run the Application
Start the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 Available Scripts

- `npm run dev` - Starts the full-stack server with Vite middleware on port 3000.
- `npm run build` - Builds the frontend application for production into `dist/`.
- `npm run lint` - Runs TypeScript type checking (`tsc --noEmit`).
- `npm run clean` - Cleans build output directories.

---

## ⚡ Deploying to Vercel

The application is pre-configured with `vercel.json` and a serverless API handler (`/api/index.ts`) for seamless deployment on Vercel.

### Method 1: Deploy with Vercel Web Dashboard (Recommended)

1. Push your repository to **GitHub** (see instructions above).
2. Go to [vercel.com](https://vercel.com) and log in.
3. Click **Add New...** > **Project**.
4. Import your GitHub repository (`aegis-clinical-risk-system`).
5. In the **Configure Project** screen:
   - **Framework Preset**: Vite (detected automatically).
   - **Root Directory**: `./` (default).
   - **Build Command**: `vite build` or `npm run build` (detected automatically).
   - **Output Directory**: `dist` (detected automatically).
6. Under **Environment Variables**, add:
   - `GEMINI_API_KEY`: *(Optional)* Your Google Gemini API Key.
7. Click **Deploy**.

Your app and serverless API endpoints will be live on your custom `.vercel.app` domain in seconds!

### Method 2: Deploy with Vercel CLI

```bash
# 1. Install Vercel CLI globally (if not installed)
npm i -g vercel

# 2. Log in and link your project
vercel

# 3. Deploy to production
vercel --prod
```

---

## 📄 License
This project is open-source. For clinical or medical environments, ensure compliance with local healthcare regulations, institutional policies, and professional medical judgment.
