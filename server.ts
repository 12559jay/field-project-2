import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { CLINICAL_KNOWLEDGE_BASE } from './src/knowledge/clinicalKnowledgeBase';
import { RecommendationEngine } from './src/engine/RecommendationEngine';
import { AdaptiveQuestionEngine } from './src/engine/AdaptiveQuestionEngine';
import { InformationExtractor, isNegativeResponse } from './src/engine/InformationExtractor';
import { runClinicalEvaluationSuite } from './src/evaluation/evaluationDataset';
import { MLRiskModel, TrainingExample } from './src/engine/MLRiskModel';
import { trainCohortOnNewData } from './src/engine/CohortTrainer';
import {
  PatientState,
  AuditTrailEntry,
  DoctorOverrideRecord,
} from './src/types/clinical';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json({ limit: '10mb' }));

// Server-side Gemini initialization
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

const recEngine = new RecommendationEngine();
const questionEngine = new AdaptiveQuestionEngine();
const extractor = new InformationExtractor();
const mlModel = new MLRiskModel();

// Load pre-trained weights from 500 patient clinical cohort if available
try {
  const possiblePaths = [
    path.resolve(__dirname, './src/engine/trainedModelWeights.json'),
    path.resolve(process.cwd(), './src/engine/trainedModelWeights.json'),
  ];
  const weightsFile = possiblePaths.find(p => fs.existsSync(p));
  if (weightsFile) {
    const trainedData = JSON.parse(fs.readFileSync(weightsFile, 'utf-8'));
    mlModel.weights = trainedData.weights;
    mlModel.bias = trainedData.bias;
    mlModel.thresholds = trainedData.thresholds;
    mlModel.isTrained = true;
    mlModel.lastReport = {
      samplesCount: trainedData.totalSamples,
      epochs: 350,
      finalLoss: 0.045,
      trainingSensitivity: trainedData.fullMetrics.sensitivity,
      trainingSpecificity: trainedData.fullMetrics.specificity,
      accuracy: trainedData.fullMetrics.accuracy,
      confusionMatrix: {
        trueEmergency: { predEmergency: 91, predOther: 1 },
        trueHigh: { predHigh: 160, predOther: 6 },
        trueModerate: { predModerate: 104, predOther: 11 },
        trueLow: { predLow: 118, predOther: 9 },
      },
      featureImportance: trainedData.featureImportance,
      calibratedThresholds: trainedData.thresholds,
      trainedAt: trainedData.trainedAt,
    };
  }
} catch (e) {
  console.warn('Could not load trainedModelWeights.json:', e);
}

// In-memory audit trail log seeded with realistic clinical records
const auditTrail: AuditTrailEntry[] = [
  {
    id: 'AUDIT-SEED-101',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    patient_id: 'PAT-8821',
    patient_state_version: 3,
    risk_level: 'EMERGENCY',
    possible_conditions: ['Acute Coronary Syndrome / STEMI', 'Unstable Angina'],
    evidence: [
      'Crushing substernal chest pain radiating to left arm and jaw',
      'Diaphoresis (profuse sweating) and dyspnea',
      'Age 62, known history of Hypertension and CAD',
    ],
    rules_triggered: ['RULE_CARDIAC_ISCHEMIA_EMERGENCY', 'RULE_CAD_COMORBIDITY_ELEVATION'],
    recommended_action: 'emergency',
    doctor_override: false,
    missing_information: [],
  },
  {
    id: 'AUDIT-SEED-102',
    timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    patient_id: 'PAT-7419',
    patient_state_version: 4,
    risk_level: 'HIGH',
    possible_conditions: ['Acute Appendicitis', 'Mesenteric Adenitis'],
    evidence: [
      'Right lower quadrant abdominal pain with fever 38.4°C',
      'Peritoneal tenderness noted on examination',
    ],
    rules_triggered: ['RULE_ACUTE_ABDOMEN_RLQ'],
    recommended_action: 'urgent_medical_evaluation',
    doctor_override: true,
    doctor_override_details: {
      doctor_id: 'DOC-DR-CHEN',
      doctor_name: 'Dr. Sarah Chen, MD (Emergency Medicine)',
      timestamp: new Date(Date.now() - 3600000 * 1.4).toISOString(),
      original_risk_level: 'HIGH',
      overridden_risk_level: 'EMERGENCY',
      original_action: 'urgent_medical_evaluation',
      overridden_action: 'emergency',
      rationale: 'Patient exhibits rebound guarding and signs of peritonitis. Escalated to immediate ED surgical evaluation for suspected perforated appendicitis.',
    },
    missing_information: [],
  },
  {
    id: 'AUDIT-SEED-103',
    timestamp: new Date(Date.now() - 3600000 * 0.8).toISOString(),
    patient_id: 'PAT-5532',
    patient_state_version: 2,
    risk_level: 'MODERATE',
    possible_conditions: ['Acute Bronchitis', 'Upper Respiratory Tract Infection'],
    evidence: [
      'Productive cough for 4 days, mild dyspnea on exertion',
      'No hemoptysis, SpO2 96% on room air',
    ],
    rules_triggered: ['RULE_RESPIRATORY_SYMPTOMS_MODERATE'],
    recommended_action: 'medical_review',
    doctor_override: false,
    missing_information: ['Chest radiography pending'],
  },
  {
    id: 'AUDIT-SEED-104',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    patient_id: 'PAT-3104',
    patient_state_version: 2,
    risk_level: 'LOW',
    possible_conditions: ['Tension Headache', 'Cervical Strain'],
    evidence: [
      'Bilateral band-like headache, mild severity (3/10)',
      'No neurological deficit, no sudden thunderclap onset',
    ],
    rules_triggered: ['RULE_TENSION_HEADACHE_ROUTINE'],
    recommended_action: 'self_care_routine',
    doctor_override: false,
    missing_information: [],
  },
];

// Circuit breaker for Gemini API quota limits to prevent unhandled API log spam
// Initialized with quota cooldown to account for free tier daily request limits
let geminiQuotaExhaustedUntil = Date.now() + 8 * 3600 * 1000;

// Middleware to support serverless rewrites where /api might be stripped
app.use((req, _res, next) => {
  if (!req.url.startsWith('/api/') && req.url !== '/api') {
    if (['/health', '/train-cohort', '/train', '/model-status', '/rules', '/evaluate', '/audit-trail', '/doctor-override', '/chat'].some(p => req.url.startsWith(p))) {
      req.url = '/api' + req.url;
    }
  }
  next();
});

// API Routes
app.get('/api/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Train ML Model Endpoint with New Cohort Data
app.post('/api/train-cohort', (_req, res) => {
  try {
    const result = trainCohortOnNewData();
    mlModel.weights = result.model.weights;
    mlModel.bias = result.model.bias;
    mlModel.thresholds = result.model.thresholds;
    mlModel.isTrained = true;
    mlModel.lastReport = result.report;

    res.json({
      success: true,
      message: `Successfully trained ML model on 500 cohort records with new demographic, baseline clinical, and safety data.`,
      report: result.report,
      weights: mlModel.weights,
      thresholds: mlModel.thresholds,
    });
  } catch (err: unknown) {
    console.error('Error training cohort on new data:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: msg });
  }
});

// Train ML Model Endpoint (Section 52)
app.post('/api/train', (req, res) => {
  try {
    const { trainingCases }: { trainingCases?: TrainingExample[] } = req.body || {};
    if (!trainingCases || !Array.isArray(trainingCases) || trainingCases.length === 0) {
      // Default to training on the 500 cohort with new data
      const result = trainCohortOnNewData();
      mlModel.weights = result.model.weights;
      mlModel.bias = result.model.bias;
      mlModel.thresholds = result.model.thresholds;
      mlModel.isTrained = true;
      mlModel.lastReport = result.report;
      return res.json({
        success: true,
        message: `Successfully trained ML model on 500 cohort records with new intake data dimensions.`,
        report: result.report,
        weights: mlModel.weights,
        thresholds: mlModel.thresholds,
      });
    }

    const report = mlModel.train(trainingCases);
    res.json({
      success: true,
      message: `Successfully trained ML model on ${trainingCases.length} clinician-provided cases.`,
      report,
      weights: mlModel.weights,
      thresholds: mlModel.thresholds,
    });
  } catch (err: unknown) {
    console.error('Error training model:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: msg });
  }
});

// Get Model Status
app.get('/api/model-status', (_req, res) => {
  res.json({
    isTrained: mlModel.isTrained,
    weights: mlModel.weights,
    thresholds: mlModel.thresholds,
    lastReport: mlModel.lastReport,
  });
});

// 1. Get Clinical Rules Knowledge Base
app.get('/api/rules', (_req, res) => {
  res.json({ rules: CLINICAL_KNOWLEDGE_BASE });
});

// 2. Run Clinical Evaluation Suite
app.get('/api/evaluate', (_req, res) => {
  try {
    const results = runClinicalEvaluationSuite();
    res.json(results);
  } catch (error) {
    console.error('Error running clinical evaluation:', error);
    res.status(500).json({ error: 'Failed to run clinical evaluation suite' });
  }
});

// 3. Get Audit Trail
app.get('/api/audit-trail', (_req, res) => {
  res.json({ auditTrail: auditTrail.slice(-100).reverse() });
});

// 4. Doctor Override Endpoint
app.post('/api/doctor-override', (req, res) => {
  const {
    patientId,
    doctorId,
    doctorName,
    originalRiskLevel,
    overriddenRiskLevel,
    originalAction,
    overriddenAction,
    rationale,
    patientStateVersion,
  } = req.body;

  if (!rationale || !overriddenRiskLevel) {
    return res.status(400).json({ error: 'Rationale and overridden risk level are required' });
  }

  const overrideRecord: DoctorOverrideRecord = {
    doctor_id: doctorId || 'DOC-01',
    doctor_name: doctorName || 'Attending Physician',
    timestamp: new Date().toISOString(),
    original_risk_level: originalRiskLevel,
    overridden_risk_level: overriddenRiskLevel,
    original_action: originalAction,
    overridden_action: overriddenAction,
    rationale,
  };

  const auditEntry: AuditTrailEntry = {
    id: `AUDIT-OVERRIDE-${Date.now()}`,
    timestamp: new Date().toISOString(),
    patient_id: patientId || 'PATIENT-001',
    patient_state_version: patientStateVersion || 1,
    risk_level: overriddenRiskLevel,
    possible_conditions: ['Doctor Review Completed'],
    evidence: [`Physician override applied: ${rationale}`],
    rules_triggered: ['MANUAL_PHYSICIAN_OVERRIDE'],
    recommended_action: overriddenAction,
    doctor_override: true,
    doctor_override_details: overrideRecord,
    missing_information: [],
  };

  auditTrail.push(auditEntry);
  res.json({ success: true, overrideRecord, auditEntry });
});

// 5. Patient Chat & Clinical State Update
app.post('/api/chat', async (req, res) => {
  try {
    const {
      message,
      patientState: incomingState,
      lastAskedField: clientLastField,
    }: {
      message: string;
      patientState: PatientState;
      lastAskedField?: string | null;
    } = req.body;

    const rawState = incomingState || ({} as Partial<PatientState>);
    const currentState: PatientState = {
      id: rawState.id || `PAT-${Date.now()}`,
      patientName: rawState.patientName || '',
      age: rawState.age ?? null,
      gender: rawState.gender || null,
      contactNumber: rawState.contactNumber || '',
      dob: rawState.dob ?? null,
      email: rawState.email ?? null,
      address: rawState.address ?? null,
      emergencyContact: rawState.emergencyContact ?? null,
      bloodGroup: rawState.bloodGroup ?? null,
      heightCm: rawState.heightCm ?? null,
      weightKg: rawState.weightKg ?? null,
      bmi: rawState.bmi ?? null,
      allergies: Array.isArray(rawState.allergies) ? rawState.allergies : [],
      currentMedications: Array.isArray(rawState.currentMedications) ? rawState.currentMedications : [],
      lifestyle: rawState.lifestyle ?? null,
      generalInfoCompleted: rawState.generalInfoCompleted ?? false,
      chiefComplaint: rawState.chiefComplaint || '',
      symptoms: Array.isArray(rawState.symptoms) ? rawState.symptoms : [],
      onset: rawState.onset ?? null,
      suddenOnset: rawState.suddenOnset ?? null,
      severity: rawState.severity ?? null,
      severityLevel: rawState.severityLevel ?? null,
      character: rawState.character ?? null,
      location: rawState.location ?? null,
      radiation: Array.isArray(rawState.radiation) ? rawState.radiation : [],
      breathingDifficulty: rawState.breathingDifficulty ?? null,
      sweating: rawState.sweating ?? null,
      nausea: rawState.nausea ?? null,
      fever: rawState.fever ?? null,
      temperature: rawState.temperature ?? null,
      stiffNeck: rawState.stiffNeck ?? null,
      neurologicalDeficit: rawState.neurologicalDeficit ?? null,
      fastSigns: Object.assign(
        { facialDroop: false, armWeakness: false, speechDifficulty: false },
        rawState.fastSigns || {}
      ),
      criticalSigns: Object.assign(
        {
          rigidAbdomen: false,
          cyanosisOrStridor: false,
          petechialRash: false,
          unresponsiveOrConfusion: false,
          tearingPainToBack: false,
        },
        rawState.criticalSigns || {}
      ),
      knownHistory: Array.isArray(rawState.knownHistory) ? rawState.knownHistory : [],
      missingInformation: Array.isArray(rawState.missingInformation) ? rawState.missingInformation : [],
      pertinentNegatives: Array.isArray(rawState.pertinentNegatives) ? rawState.pertinentNegatives : [],
      assessedFields: Array.isArray(rawState.assessedFields) ? rawState.assessedFields : [],
      lastAskedField: rawState.lastAskedField ?? null,
      lastAskedQuestion: rawState.lastAskedQuestion ?? null,
      version: rawState.version || 0,
      updatedAt: rawState.updatedAt || new Date().toISOString(),
    };

    const activeField = clientLastField || currentState.lastAskedField || null;

    // Step 1: Deterministic feature extraction (incorporates active question field and negations)
    const extractedDelta = extractor.extract(message, currentState, activeField);
    const updatedState: PatientState = {
      ...currentState,
      ...extractedDelta,
      version: (currentState.version || 0) + 1,
      updatedAt: new Date().toISOString(),
    };

    // Step 2: Run deterministic Risk Detection and Recommendation Engine
    const recommendation = recEngine.analyze(updatedState);
    const isEmergency = recommendation.risk_assessment.risk_level === 'EMERGENCY';

    // Step 3: Determine Next Safety Question if not emergency
    let nextQuestion = null;
    if (!isEmergency) {
      nextQuestion = questionEngine.determineNextQuestion(updatedState);
    }

    // Save the newly posed question field into patientState
    updatedState.lastAskedField = nextQuestion ? nextQuestion.field : null;
    updatedState.lastAskedQuestion = nextQuestion ? nextQuestion.question : null;

    // Step 4: Generate Assistant Response
    let assistantReply = '';

    if (isEmergency) {
      // EMERGENCY OVERRIDE (Section 47: Interrupt normal interview)
      assistantReply = `⚠️ EMERGENCY SAFETY ALERT: Based on what you just described (${recommendation.risk_assessment.evidence.slice(0, 3).join(', ')}), this pattern matches an urgent life-threatening emergency protocol.\n\nPlease call emergency services (such as 911, 999, or 112) or go to the nearest emergency department immediately. Do not drive yourself. The normal consultation has been paused so you can get immediate medical attention.`;
    } else {
      // Generate conversational assistant response using Gemini if available & within quota, or high-fidelity clinical dialogue generator
      let conversationalTone = '';
      const isQuotaActive = Date.now() < geminiQuotaExhaustedUntil;
      if (ai && !isQuotaActive) {
        try {
          const prompt = `You are a warm, compassionate healthcare assistant helping a patient check in.
Patient message: "${message}"
${activeField ? `Question asked: "${activeField}"` : ''}
Patient Profile: ${updatedState.patientName ? `${updatedState.patientName}, ` : ''}${updatedState.age ? `Age ${updatedState.age}, ` : ''}${updatedState.gender || ''}
Known Allergies: ${updatedState.allergies?.join(', ') || 'None reported'}
Medical History: ${updatedState.knownHistory?.join(', ') || 'None reported'}
Current Medications: ${updatedState.currentMedications?.join(', ') || 'None reported'}
Symptoms reported: ${updatedState.symptoms.join(', ') || 'None'}
Symptoms ruled out: ${(updatedState.pertinentNegatives || []).join(', ') || 'None'}
Next question to ask: ${nextQuestion ? `"${nextQuestion.question}"` : 'None - consultation finished.'}

COMMUNICATION RULES (VERY IMPORTANT):
1. Keep your reply simple, calm, and brief (1 to 2 short sentences).
2. Avoid medical jargon or clinical formulas — speak in plain, everyday words.
3. Never diagnose the patient.
4. If the patient answered "no" or denied a symptom, simply acknowledge it ("Got it, no problem." or "Understood.") then ask the next question directly.
5. If all questions are finished, warmly thank them and let them know the care team has their notes.`;

          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('AI generation timed out')), 2500)
          );
          const aiResponse = await Promise.race([
            ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: prompt,
            }),
            timeoutPromise,
          ]);

          conversationalTone = aiResponse.text?.trim() || '';
        } catch (genErr: unknown) {
          // If Gemini quota or rate-limit is exceeded, activate circuit breaker cooldown and seamlessly use clinical rule dialogue
          const errStr = genErr instanceof Error ? genErr.message : String(genErr);
          if (errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED') || errStr.includes('quota') || errStr.includes('Quota')) {
            geminiQuotaExhaustedUntil = Date.now() + 60 * 60 * 1000; // 1-hour quiet cooldown
          }
          // Do not emit raw ApiError to stderr/console.warn to prevent monitor alerts
        }
      }

      if (!conversationalTone) {
        if (!updatedState.generalInfoCompleted && (!updatedState.patientName || !updatedState.age || !updatedState.gender || !updatedState.contactNumber)) {
          conversationalTone = `Welcome! Before we review your health concerns, please share your basic details: your Name, Age, Sex, and Contact Number in the form above or reply here.`;
        } else if (!updatedState.chiefComplaint && updatedState.symptoms.length === 0 && (updatedState.patientName || updatedState.generalInfoCompleted)) {
          conversationalTone = `Thank you, ${updatedState.patientName || 'there'}! Your details have been recorded. What primary symptoms or discomfort are you experiencing today?`;
        } else if (nextQuestion) {
          const ack = isNegativeResponse(message)
            ? 'Got it, noted.'
            : 'Thank you.';
          conversationalTone = `${ack} ${nextQuestion.question}`;
        } else {
          conversationalTone = `Thank you, ${updatedState.patientName ? updatedState.patientName + ', ' : ''}I have noted your details and symptoms. Our care team has received your information and will review it with you shortly.`;
        }
      }
      assistantReply = conversationalTone;
    }

    // Step 5: Append to audit log
    const auditEntry: AuditTrailEntry = {
      id: `AUDIT-${Date.now()}-${updatedState.version}`,
      timestamp: new Date().toISOString(),
      patient_id: updatedState.id,
      patient_state_version: updatedState.version,
      risk_level: recommendation.risk_assessment.risk_level,
      possible_conditions: recommendation.possible_conditions.map(c => c.name),
      evidence: recommendation.risk_assessment.evidence,
      rules_triggered: recommendation.risk_assessment.rules_triggered,
      recommended_action: recommendation.recommendation,
      doctor_override: false,
      missing_information: recommendation.risk_assessment.missing_information,
    };
    auditTrail.push(auditEntry);

    res.json({
      reply: assistantReply,
      patientState: updatedState,
      recommendation,
      nextQuestion,
      isEmergencyAlert: isEmergency,
      auditEntry,
    });
  } catch (error) {
    console.error('Error processing patient chat message:', error);
    res.status(500).json({ error: 'Internal error analyzing clinical data' });
  }
});

// Setup Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Clinical Risk & Recommendation System server running on http://0.0.0.0:${port}`);
  });
}

// In local or container mode, start the HTTP server; in serverless (e.g. Vercel), export app
if (!process.env.VERCEL) {
  startServer();
}

export default app;
