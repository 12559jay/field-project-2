/**
 * Clinical Recommendation & Risk Detection System - Core Data Types
 * Follows rigorous safety-first clinical decision support principles.
 */

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'EMERGENCY';

export type RecommendationAction =
  | 'self_care_routine'
  | 'medical_review'
  | 'urgent_medical_evaluation'
  | 'emergency';

export type ConfidenceLevel = 'low' | 'moderate' | 'high';

export interface PatientState {
  id: string;
  patientName: string;
  age: number | null;
  gender: string | null;
  contactNumber?: string | null;
  dob?: string | null;
  email?: string | null;
  address?: string | null;
  emergencyContact?: {
    name: string;
    relation: string;
    phone: string;
  } | null;
  bloodGroup?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  bmi?: number | null;
  allergies?: string[];
  currentMedications?: string[];
  lifestyle?: {
    smokingStatus?: 'never' | 'former' | 'current' | 'unknown' | null;
    alcohol?: 'none' | 'occasional' | 'regular' | 'heavy' | null;
    pregnant?: boolean | null;
  } | null;
  generalInfoCompleted?: boolean;
  chiefComplaint: string;
  symptoms: string[];
  onset: string | null;
  suddenOnset: boolean | null;
  severity: number | null; // 1-10 scale
  severityLevel: 'mild' | 'moderate' | 'severe' | 'extreme' | null;
  character: string | null; // e.g. "pressure", "sharp", "tearing", "throbbing"
  location: string | null;
  radiation: string[]; // e.g. ["left_arm", "jaw", "back"]
  breathingDifficulty: boolean | null;
  sweating: boolean | null;
  nausea: boolean | null;
  fever: boolean | null;
  temperature: number | null;
  stiffNeck: boolean | null;
  neurologicalDeficit: boolean | null;
  fastSigns: {
    facialDroop: boolean;
    armWeakness: boolean;
    speechDifficulty: boolean;
  };
  criticalSigns: {
    rigidAbdomen: boolean;
    cyanosisOrStridor: boolean;
    petechialRash: boolean;
    unresponsiveOrConfusion: boolean;
    tearingPainToBack: boolean;
  };
  knownHistory: string[];
  missingInformation: string[];
  pertinentNegatives?: string[];
  assessedFields?: string[];
  lastAskedField?: string | null;
  lastAskedQuestion?: string | null;
  version: number;
  updatedAt: string;
}

export interface RiskRuleCondition {
  has_chest_pain?: boolean;
  has_headache?: boolean;
  has_abdominal_pain?: boolean;
  has_breathing_problem?: boolean;
  has_fever?: boolean;
  has_neuro_symptoms?: boolean;
  sudden_onset?: boolean;
  high_severity?: boolean;
  any_radiation?: string[];
  any_associated?: string[];
  breathing_difficulty?: boolean;
  neck_stiffness?: boolean;
  fever?: boolean;
  neurological_deficit?: boolean;
  rigid_abdomen_or_fainting?: boolean;
  location?: string;
  fever_or_nausea?: boolean;
  any_critical_flag?: string[];
  any_sepsis_flag?: string[];
  any_fast_symptom?: string[];
  [key: string]: unknown;
}

export interface ClinicalRule {
  id: string;
  name: string;
  risk_level: RiskLevel;
  requires_doctor_review: boolean;
  recommended_action: RecommendationAction;
  reason: string;
  conditions_required: RiskRuleCondition;
  possible_concern: string;
  confidence: ConfidenceLevel;
}

export interface KnowledgeBaseComplaint {
  complaint: string;
  title: string;
  description: string;
  important_information: string[];
  risk_rules: ClinicalRule[];
  possible_conditions: {
    name: string;
    clinical_category: string;
    reason_template: string;
    caveat: string;
  }[];
  recommended_questions: {
    field: string;
    priority: number;
    safety_relevance: string;
    question: string;
  }[];
}

export interface RiskAssessment {
  risk_level: RiskLevel;
  reason: string;
  possible_concerns: string[];
  evidence: string[];
  missing_information: string[];
  recommended_action: RecommendationAction;
  confidence: ConfidenceLevel;
  confidence_explanation: string;
  requires_doctor_review: boolean;
  rules_triggered: string[];
  emergency_override_triggered: boolean;
}

export interface PossibleCondition {
  name: string;
  clinical_category: string;
  confidence: ConfidenceLevel;
  reason: string[];
  caveat: string;
}

export interface DoctorOverrideRecord {
  doctor_id: string;
  doctor_name: string;
  timestamp: string;
  original_risk_level: RiskLevel;
  overridden_risk_level: RiskLevel;
  original_action: RecommendationAction;
  overridden_action: RecommendationAction;
  rationale: string;
}

export interface ClinicalRecommendation {
  possible_conditions: PossibleCondition[];
  risk_assessment: RiskAssessment;
  recommendation: RecommendationAction;
  recommendation_text: string;
  doctor_override?: DoctorOverrideRecord;
}

export interface AuditTrailEntry {
  id: string;
  timestamp: string;
  patient_id: string;
  patient_state_version: number;
  risk_level: RiskLevel;
  possible_conditions: string[];
  evidence: string[];
  rules_triggered: string[];
  recommended_action: RecommendationAction;
  doctor_override: boolean;
  doctor_override_details?: DoctorOverrideRecord;
  missing_information: string[];
}

export interface EvaluationCase {
  id: string;
  title: string;
  category: string;
  patient_symptoms: string[];
  narrative: string;
  patient_state: Partial<PatientState>;
  correct_clinical_category: string;
  relevant_red_flags: string[];
  expected_urgency: RecommendationAction;
  expected_risk_level: RiskLevel;
  required_questions: string[];
  clinician_assessment: string;
}

export interface EvaluationResult {
  totalCases: number;
  safetySensitivity: number; // Percentage
  specificity: number; // Percentage
  falseNegatives: {
    caseId: string;
    caseTitle: string;
    expected: RiskLevel;
    detected: RiskLevel;
    missedRedFlags: string[];
  }[];
  falsePositives: {
    caseId: string;
    caseTitle: string;
    expected: RiskLevel;
    detected: RiskLevel;
  }[];
  details: {
    caseId: string;
    caseTitle: string;
    expectedRisk: RiskLevel;
    actualRisk: RiskLevel;
    expectedAction: RecommendationAction;
    actualAction: RecommendationAction;
    matchedRules: string[];
    pass: boolean;
    isSafetyCritical: boolean;
  }[];
}

export interface ChatMessage {
  id: string;
  sender: 'patient' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  isEmergencyAlert?: boolean;
  stateUpdated?: boolean;
}
