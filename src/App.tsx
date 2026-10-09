import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { PatientInterview } from './components/PatientInterview';
import { DoctorDashboard } from './components/DoctorDashboard';
import { AuditTrailView } from './components/AuditTrailView';
import { KnowledgeBaseView } from './components/KnowledgeBaseView';
import { EvaluationSuiteView } from './components/EvaluationSuiteView';
import { ModelTrainingView } from './components/ModelTrainingView';
import {
  PatientState,
  ClinicalRecommendation,
  ChatMessage,
  AuditTrailEntry,
  RiskLevel,
  RecommendationAction,
} from './types/clinical';
import { RecommendationEngine } from './engine/RecommendationEngine';
import { AdaptiveQuestionEngine, NextQuestionResult } from './engine/AdaptiveQuestionEngine';
import { InformationExtractor, isNegativeResponse } from './engine/InformationExtractor';

const INITIAL_PATIENT_STATE: PatientState = {
  id: 'PAT-9482',
  patientName: '',
  age: null,
  gender: null,
  contactNumber: '',
  dob: '',
  email: '',
  address: '',
  emergencyContact: null,
  bloodGroup: null,
  heightCm: null,
  weightKg: null,
  bmi: null,
  allergies: [],
  currentMedications: [],
  lifestyle: null,
  generalInfoCompleted: false,
  chiefComplaint: '',
  symptoms: [],
  onset: null,
  suddenOnset: null,
  severity: null,
  severityLevel: null,
  character: null,
  location: null,
  radiation: [],
  breathingDifficulty: null,
  sweating: null,
  nausea: null,
  fever: null,
  temperature: null,
  stiffNeck: null,
  neurologicalDeficit: null,
  fastSigns: { facialDroop: false, armWeakness: false, speechDifficulty: false },
  criticalSigns: {
    rigidAbdomen: false,
    cyanosisOrStridor: false,
    petechialRash: false,
    unresponsiveOrConfusion: false,
    tearingPainToBack: false,
  },
  knownHistory: [],
  missingInformation: ['General patient information (Name, Age, Sex, Contact)', 'Chief complaint and symptoms'],
  pertinentNegatives: [],
  assessedFields: [],
  lastAskedField: null,
  lastAskedQuestion: null,
  version: 0,
  updatedAt: new Date().toISOString(),
};

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-init-1',
    sender: 'assistant',
    content:
      'Welcome to Health Consultation. Before we discuss your symptoms, please share your basic details (Name, Age, Sex, and Contact Number) in the form above or reply here.',
    timestamp: new Date().toISOString(),
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'patient' | 'doctor' | 'audit' | 'knowledge' | 'evaluation' | 'train'>('patient');
  const [patientState, setPatientState] = useState<PatientState>(INITIAL_PATIENT_STATE);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [recommendation, setRecommendation] = useState<ClinicalRecommendation | null>(null);
  const [nextQuestion, setNextQuestion] = useState<NextQuestionResult | null>(null);
  const [isEmergency, setIsEmergency] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [auditTrail, setAuditTrail] = useState<AuditTrailEntry[]>([]);

  // Local fallback engine instances for resilience
  const localRecEngine = React.useMemo(() => new RecommendationEngine(), []);
  const localQuestionEngine = React.useMemo(() => new AdaptiveQuestionEngine(), []);
  const localExtractor = React.useMemo(() => new InformationExtractor(), []);

  // Initial evaluation on mount
  useEffect(() => {
    const initRec = localRecEngine.analyze(INITIAL_PATIENT_STATE);
    setRecommendation(initRec);
    const initQ = localQuestionEngine.determineNextQuestion(INITIAL_PATIENT_STATE);
    setNextQuestion(initQ);

    // Load persisted audit records from server
    fetch('/api/audit-trail')
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data && Array.isArray(data.auditTrail) && data.auditTrail.length > 0) {
          setAuditTrail(data.auditTrail);
        }
      })
      .catch(() => {
        // Fallback gracefully
      });
  }, [localRecEngine, localQuestionEngine]);

  const handleSendMessage = async (text: string) => {
    const patientMsg: ChatMessage = {
      id: `msg-${Date.now()}-patient`,
      sender: 'patient',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, patientMsg]);
    setIsLoading(true);

    const activeField = nextQuestion?.field || patientState.lastAskedField || null;

    try {
      // Attempt full-stack server API call
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, patientState, lastAskedField: activeField }),
      });

      if (res.ok) {
        const data = await res.json();
        setPatientState(data.patientState);
        setRecommendation(data.recommendation);
        setNextQuestion(data.nextQuestion);
        setIsEmergency(data.isEmergencyAlert);

        const assistantMsg: ChatMessage = {
          id: `msg-${Date.now()}-assistant`,
          sender: 'assistant',
          content: data.reply,
          timestamp: new Date().toISOString(),
          isEmergencyAlert: data.isEmergencyAlert,
        };
        setMessages((prev) => [...prev, assistantMsg]);

        if (data.auditEntry) {
          setAuditTrail((prev) => [data.auditEntry, ...prev]);
        }
      } else {
        throw new Error('Server returned non-200');
      }
    } catch {
      // In-browser deterministic fallback
      const delta = localExtractor.extract(text, patientState, activeField);
      const updatedState: PatientState = {
        ...patientState,
        ...delta,
        version: patientState.version + 1,
        updatedAt: new Date().toISOString(),
      };

      const rec = localRecEngine.analyze(updatedState);
      const isEmerg = rec.risk_assessment.risk_level === 'EMERGENCY';
      const nq = isEmerg ? null : localQuestionEngine.determineNextQuestion(updatedState);

      updatedState.lastAskedField = nq ? nq.field : null;
      updatedState.lastAskedQuestion = nq ? nq.question : null;

      let reply = '';
      if (isEmerg) {
        reply = `⚠️ EMERGENCY SAFETY ALERT: Based on what you just described (${rec.risk_assessment.evidence.slice(0, 3).join(', ')}), this pattern matches an urgent life-threatening emergency protocol.\n\nPlease call emergency services (such as 911, 999, or 112) or go to the nearest emergency department immediately. Do not drive yourself. The normal consultation has been paused.`;
      } else if (!updatedState.generalInfoCompleted && (!updatedState.patientName || !updatedState.age || !updatedState.gender || !updatedState.contactNumber)) {
        reply = `Welcome! Before we evaluate your symptoms, please share your basic details (Name, Age, Sex, and Contact Number) in the form above or reply here.`;
      } else if (!updatedState.chiefComplaint && updatedState.symptoms.length === 0 && (updatedState.patientName || updatedState.generalInfoCompleted)) {
        reply = `Thank you, ${updatedState.patientName || 'there'}! Your details have been noted. What symptoms or health concerns are you experiencing today?`;
      } else if (nq) {
        const isNeg = isNegativeResponse(text);
        const ack = isNeg ? 'Got it, noted.' : 'Thank you.';
        reply = `${ack} ${nq.question}`;
      } else {
        reply = `Thank you, I have recorded your symptoms and details. Our care team will review this with you.`;
      }

      setPatientState(updatedState);
      setRecommendation(rec);
      setNextQuestion(nq);
      setIsEmergency(isEmerg);

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-assistant`,
        sender: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
        isEmergencyAlert: isEmerg,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      const auditEntry: AuditTrailEntry = {
        id: `AUDIT-${Date.now()}-${updatedState.version}`,
        timestamp: new Date().toISOString(),
        patient_id: updatedState.id,
        patient_state_version: updatedState.version,
        risk_level: rec.risk_assessment.risk_level,
        possible_conditions: rec.possible_conditions.map((c) => c.name),
        evidence: rec.risk_assessment.evidence,
        rules_triggered: rec.risk_assessment.rules_triggered,
        recommended_action: rec.recommendation,
        doctor_override: false,
        missing_information: rec.risk_assessment.missing_information,
      };
      setAuditTrail((prev) => [auditEntry, ...prev]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyOverride = async (overrideData: {
    overriddenRiskLevel: RiskLevel;
    overriddenAction: RecommendationAction;
    rationale: string;
    doctorName: string;
  }) => {
    try {
      const res = await fetch('/api/doctor-override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patientState.id,
          doctorId: 'DOC-01',
          doctorName: overrideData.doctorName,
          originalRiskLevel: recommendation?.risk_assessment.risk_level,
          overriddenRiskLevel: overrideData.overriddenRiskLevel,
          originalAction: recommendation?.recommendation,
          overriddenAction: overrideData.overriddenAction,
          rationale: overrideData.rationale,
          patientStateVersion: patientState.version,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.auditEntry) {
          setAuditTrail((prev) => [data.auditEntry, ...prev]);
        }
      }
    } catch {
      // Local fallback
      const auditEntry: AuditTrailEntry = {
        id: `AUDIT-OVERRIDE-${Date.now()}`,
        timestamp: new Date().toISOString(),
        patient_id: patientState.id,
        patient_state_version: patientState.version,
        risk_level: overrideData.overriddenRiskLevel,
        possible_conditions: ['Doctor Review Completed'],
        evidence: [`Physician override applied: ${overrideData.rationale}`],
        rules_triggered: ['MANUAL_PHYSICIAN_OVERRIDE'],
        recommended_action: overrideData.overriddenAction,
        doctor_override: true,
        doctor_override_details: {
          doctor_id: 'DOC-01',
          doctor_name: overrideData.doctorName,
          timestamp: new Date().toISOString(),
          original_risk_level: recommendation?.risk_assessment.risk_level || 'HIGH',
          overridden_risk_level: overrideData.overriddenRiskLevel,
          original_action: recommendation?.recommendation || 'urgent_medical_evaluation',
          overridden_action: overrideData.overriddenAction,
          rationale: overrideData.rationale,
        },
        missing_information: [],
      };
      setAuditTrail((prev) => [auditEntry, ...prev]);
    }

    // Update active recommendation view
    if (recommendation) {
      setRecommendation({
        ...recommendation,
        risk_assessment: {
          ...recommendation.risk_assessment,
          risk_level: overrideData.overriddenRiskLevel,
          recommended_action: overrideData.overriddenAction,
          reason: `Doctor Override Applied: ${overrideData.rationale}`,
        },
        recommendation: overrideData.overriddenAction,
      });
      setIsEmergency(overrideData.overriddenRiskLevel === 'EMERGENCY');
    }
  };

  const handleUpdateGeneralInfo = (info: Partial<PatientState>) => {
    const updatedState: PatientState = {
      ...patientState,
      ...info,
      generalInfoCompleted: true,
      missingInformation: patientState.missingInformation.filter(
        (m) => !m.toLowerCase().includes('general')
      ),
      version: patientState.version + 1,
      updatedAt: new Date().toISOString(),
    };
    setPatientState(updatedState);

    const name = info.patientName || patientState.patientName || 'there';
    const followUpMsg: ChatMessage = {
      id: `msg-${Date.now()}-assistant`,
      sender: 'assistant',
      content: `Thank you, ${name}! Your intake profile and health details have been recorded. Now, please describe what symptoms or health concerns you are experiencing today.`,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, followUpMsg]);
  };

  const handleReset = () => {
    setPatientState({
      ...INITIAL_PATIENT_STATE,
      id: `PAT-${Math.floor(1000 + Math.random() * 9000)}`,
      updatedAt: new Date().toISOString(),
    });
    setMessages(INITIAL_MESSAGES);
    const rec = localRecEngine.analyze(INITIAL_PATIENT_STATE);
    setRecommendation(rec);
    const nq = localQuestionEngine.determineNextQuestion(INITIAL_PATIENT_STATE);
    setNextQuestion(nq);
    setIsEmergency(false);
  };

  const handleSelectPreset = (presetKey: string) => {
    let presetState: Partial<PatientState> = {};
    let presetUserMsg = '';

    switch (presetKey) {
      case 'thunderclap':
        presetUserMsg = 'I have an extremely severe headache that started suddenly 20 minutes ago out of nowhere.';
        presetState = {
          chiefComplaint: 'headache',
          symptoms: ['headache', 'sudden severe headache'],
          onset: 'Suddenly, approx 20 minutes ago',
          suddenOnset: true,
          severity: 10,
          severityLevel: 'extreme',
        };
        break;
      case 'acs_chest':
        presetUserMsg = 'I have severe chest pressure, shortness of breath, sweating, and pain spreading down to my left arm.';
        presetState = {
          chiefComplaint: 'chest_pain',
          symptoms: ['chest discomfort', 'shortness of breath', 'sweating'],
          radiation: ['left_arm'],
          breathingDifficulty: true,
          sweating: true,
          severity: 8,
          severityLevel: 'severe',
          character: 'pressure / squeezing',
        };
        break;
      case 'stroke_fast':
        presetUserMsg = 'My face suddenly feels crooked when I smile and my speech is slurred and hard to understand.';
        presetState = {
          chiefComplaint: 'neurological_symptoms',
          symptoms: ['facial droop', 'speech difficulty'],
          suddenOnset: true,
          fastSigns: { facialDroop: true, armWeakness: false, speechDifficulty: true },
          neurologicalDeficit: true,
        };
        break;
      case 'appendicitis':
        presetUserMsg = 'I have sharp pain in the lower right side of my stomach with nausea and a mild fever.';
        presetState = {
          chiefComplaint: 'abdominal_pain',
          symptoms: ['abdominal pain', 'nausea', 'fever'],
          location: 'right_lower_quadrant',
          fever: true,
          nausea: true,
          severity: 7,
          severityLevel: 'severe',
        };
        break;
      case 'tension_headache':
        presetUserMsg = 'I have a mild band-like pressure across my forehead for 2 days from computer work, no nausea.';
        presetState = {
          chiefComplaint: 'headache',
          symptoms: ['headache', 'neck tension'],
          onset: 'Gradual onset over 2 days',
          suddenOnset: false,
          severity: 3,
          severityLevel: 'mild',
          character: 'pressure',
        };
        break;
      case 'mild_cold':
        presetUserMsg = 'I have a runny nose and low fever for yesterday, no difficulty breathing.';
        presetState = {
          chiefComplaint: 'fever',
          symptoms: ['fever', 'nasal congestion'],
          onset: '1 day ago',
          suddenOnset: false,
          severity: 2,
          severityLevel: 'mild',
          breathingDifficulty: false,
        };
        break;
    }

    const updatedState: PatientState = {
      ...patientState,
      patientName: patientState.patientName || 'Sarah Jenkins',
      age: patientState.age || 52,
      gender: patientState.gender || 'Female',
      contactNumber: patientState.contactNumber || '+1 (555) 839-2041',
      dob: patientState.dob || '1974-06-14',
      email: patientState.email || 'sarah.jenkins@example.com',
      address: patientState.address || '742 Evergreen Terrace, Springfield',
      bloodGroup: patientState.bloodGroup || 'O+',
      heightCm: patientState.heightCm || 168,
      weightKg: patientState.weightKg || 68,
      bmi: patientState.bmi || 24.1,
      allergies: patientState.allergies && patientState.allergies.length ? patientState.allergies : ['Penicillin (Hives)'],
      currentMedications: patientState.currentMedications && patientState.currentMedications.length ? patientState.currentMedications : ['Lisinopril 10mg', 'Aspirin 81mg'],
      emergencyContact: patientState.emergencyContact || {
        name: 'Mark Jenkins',
        relation: 'Spouse',
        phone: '+1 (555) 839-2042',
      },
      generalInfoCompleted: true,
      ...presetState,
      version: patientState.version + 1,
      updatedAt: new Date().toISOString(),
    };

    const rec = localRecEngine.analyze(updatedState);
    const isEmerg = rec.risk_assessment.risk_level === 'EMERGENCY';
    const nq = isEmerg ? null : localQuestionEngine.determineNextQuestion(updatedState);

    setPatientState(updatedState);
    setRecommendation(rec);
    setNextQuestion(nq);
    setIsEmergency(isEmerg);

    const newMsgs: ChatMessage[] = [
      ...INITIAL_MESSAGES,
      {
        id: `preset-user-${Date.now()}`,
        sender: 'patient',
        content: presetUserMsg,
        timestamp: new Date().toISOString(),
      },
      {
        id: `preset-reply-${Date.now()}`,
        sender: 'assistant',
        content: isEmerg
          ? `⚠️ EMERGENCY SAFETY ALERT: Based on what you just described (${rec.risk_assessment.evidence.slice(0, 3).join(', ')}), this pattern matches an urgent emergency protocol. Seek emergency medical care immediately (call 911 / 999 / 112).`
          : `Thank you for sharing that. ${nq ? nq.question : 'Clinical risk assessed.'}`,
        timestamp: new Date().toISOString(),
        isEmergencyAlert: isEmerg,
      },
    ];
    setMessages(newMsgs);

    const auditEntry: AuditTrailEntry = {
      id: `AUDIT-PRESET-${Date.now()}`,
      timestamp: new Date().toISOString(),
      patient_id: updatedState.id,
      patient_state_version: updatedState.version,
      risk_level: rec.risk_assessment.risk_level,
      possible_conditions: rec.possible_conditions.map((c) => c.name),
      evidence: rec.risk_assessment.evidence,
      rules_triggered: rec.risk_assessment.rules_triggered,
      recommended_action: rec.recommendation,
      doctor_override: false,
      missing_information: rec.risk_assessment.missing_information,
    };
    setAuditTrail((prev) => [auditEntry, ...prev]);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isEmergencyActive={isEmergency}
        onReset={handleReset}
        onSelectPreset={handleSelectPreset}
      />

      <main className="flex-1">
        {activeTab === 'patient' && (
          <PatientInterview
            messages={messages}
            patientState={patientState}
            recommendation={recommendation}
            nextQuestion={nextQuestion}
            isEmergency={isEmergency}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
            onDismissEmergencyModal={() => {}}
            onUpdateGeneralInfo={handleUpdateGeneralInfo}
          />
        )}

        {activeTab === 'doctor' && (
          <DoctorDashboard
            patientState={patientState}
            recommendation={recommendation}
            onApplyOverride={handleApplyOverride}
          />
        )}

        {activeTab === 'audit' && (
          <AuditTrailView auditTrail={auditTrail} />
        )}

        {activeTab === 'knowledge' && (
          <KnowledgeBaseView />
        )}

        {activeTab === 'evaluation' && (
          <EvaluationSuiteView />
        )}

        {activeTab === 'train' && (
          <ModelTrainingView />
        )}
      </main>
    </div>
  );
}
