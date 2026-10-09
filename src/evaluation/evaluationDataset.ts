import { EvaluationCase, EvaluationResult, RiskLevel } from '../types/clinical';
import { RecommendationEngine } from '../engine/RecommendationEngine';

export const CLINICAL_EVALUATION_DATASET: EvaluationCase[] = [
  {
    id: 'CASE_001_ACS_CLASSIC',
    title: 'Acute Coronary Syndrome (Classic Angina with Radiation)',
    category: 'Cardiovascular',
    patient_symptoms: ['chest discomfort', 'shortness of breath', 'sweating', 'pain radiating to left arm'],
    narrative: '62-year-old patient reports substernal crushing chest pressure radiating to left arm and jaw, onset 45 minutes ago with profuse diaphoresis and breathlessness.',
    patient_state: {
      chiefComplaint: 'chest_pain',
      symptoms: ['chest pressure', 'shortness of breath', 'sweating', 'left arm pain'],
      onset: '45 minutes ago',
      suddenOnset: true,
      severity: 8,
      severityLevel: 'severe',
      character: 'pressure / squeezing',
      radiation: ['left_arm', 'jaw'],
      breathingDifficulty: true,
      sweating: true,
      nausea: true,
    },
    correct_clinical_category: 'Cardiovascular / Acute Coronary Syndrome',
    relevant_red_flags: ['Chest pressure with arm/jaw radiation', 'Autonomic diaphoresis', 'Acute dyspnea'],
    expected_urgency: 'emergency',
    expected_risk_level: 'EMERGENCY',
    required_questions: ['Exact onset time', 'History of CAD/stents', 'Aspirin consumption'],
    clinician_assessment: 'Immediate 12-lead ECG and emergency department transfer for suspected STEMI/NSTEMI.',
  },
  {
    id: 'CASE_002_THUNDERCLAP_SAH',
    title: 'Thunderclap Headache (Suspected Subarachnoid Hemorrhage)',
    category: 'Neurological Emergency',
    patient_symptoms: ['sudden severe headache', 'rapid onset 20 mins ago', 'neck stiffness'],
    narrative: '48-year-old reporting sudden catastrophic headache reaching 10/10 severity in under 2 minutes while lifting boxes ("worst headache of my life"), with mild nuchal stiffness.',
    patient_state: {
      chiefComplaint: 'headache',
      symptoms: ['sudden severe headache', 'neck stiffness'],
      onset: 'Suddenly, 20 minutes ago',
      suddenOnset: true,
      severity: 10,
      severityLevel: 'extreme',
      stiffNeck: true,
      neurologicalDeficit: false,
    },
    correct_clinical_category: 'Intracranial Vascular Emergency (SAH)',
    relevant_red_flags: ['Thunderclap onset (<2 min to peak)', 'Maximal severity 10/10', 'Nuchal rigidity'],
    expected_urgency: 'emergency',
    expected_risk_level: 'EMERGENCY',
    required_questions: ['Suddenness of onset', 'Neck stiffness', 'Loss of consciousness'],
    clinician_assessment: 'Emergency CT brain non-contrast and CT angiography to exclude ruptured intracranial aneurysm.',
  },
  {
    id: 'CASE_003_FAST_STROKE',
    title: 'Acute Ischemic Stroke (FAST Positive: Face & Speech)',
    category: 'Neurological Emergency',
    patient_symptoms: ['facial droop', 'slurred speech', 'arm drift'],
    narrative: '70-year-old noticed sudden right-sided facial asymmetry and difficulty pronouncing words starting 30 minutes ago.',
    patient_state: {
      chiefComplaint: 'neurological_symptoms',
      symptoms: ['facial droop', 'speech difficulty', 'arm weakness'],
      onset: '30 minutes ago',
      suddenOnset: true,
      fastSigns: {
        facialDroop: true,
        armWeakness: true,
        speechDifficulty: true,
      },
      neurologicalDeficit: true,
    },
    correct_clinical_category: 'Acute Cerebrovascular Accident',
    relevant_red_flags: ['Acute facial palsy', 'Hemiparesis', 'Dysarthria / Aphasia'],
    expected_urgency: 'emergency',
    expected_risk_level: 'EMERGENCY',
    required_questions: ['Time last known normal', 'Anticoagulant use', 'Blood glucose level'],
    clinician_assessment: 'Emergency code stroke activation for acute revascularization within therapeutic window.',
  },
  {
    id: 'CASE_004_ACUTE_APPENDICITIS',
    title: 'Acute Appendicitis (Migratory RLQ Tenderness)',
    category: 'Surgical Abdomen',
    patient_symptoms: ['right lower quadrant abdominal pain', 'fever', 'nausea', 'vomiting'],
    narrative: '24-year-old presenting with 14 hours of persistent abdominal discomfort starting around the navel and now localized to the right lower quadrant, with low-grade fever.',
    patient_state: {
      chiefComplaint: 'abdominal_pain',
      symptoms: ['abdominal pain', 'nausea / vomiting', 'fever'],
      location: 'right_lower_quadrant',
      onset: '14 hours ago',
      severity: 7,
      severityLevel: 'severe',
      fever: true,
      nausea: true,
    },
    correct_clinical_category: 'Acute Appendicitis',
    relevant_red_flags: ['Focal RLQ peritoneal signs', 'Fever with inflammatory anorexia/nausea'],
    expected_urgency: 'urgent_medical_evaluation',
    expected_risk_level: 'HIGH',
    required_questions: ['Migration of pain', 'Rebound tenderness', 'Urinary symptoms / LMP'],
    clinician_assessment: 'Same-day surgical evaluation, abdominal ultrasound or CT, and intravenous hydration.',
  },
  {
    id: 'CASE_005_TENSION_HEADACHE',
    title: 'Episodic Tension-Type Headache (Benign Non-Urgent)',
    category: 'Primary Headache',
    patient_symptoms: ['band-like headache', 'neck muscle tightness'],
    narrative: '35-year-old software developer with gradual dull, bilateral band-like forehead pressure for 2 days after long screen hours. No nausea, no fever, no photophobia.',
    patient_state: {
      chiefComplaint: 'headache',
      symptoms: ['mild headache', 'neck tension'],
      onset: 'Gradual onset over 2 days',
      suddenOnset: false,
      severity: 3,
      severityLevel: 'mild',
      character: 'pressing_tightening',
      stiffNeck: false,
      fever: false,
      neurologicalDeficit: false,
    },
    correct_clinical_category: 'Tension-Type Headache',
    relevant_red_flags: [],
    expected_urgency: 'self_care_routine',
    expected_risk_level: 'LOW',
    required_questions: ['Changes in vision', 'Sleep hygiene', 'Caffeine/ergonomic factors'],
    clinician_assessment: 'Reassurance, ergonomic adjustments, hydration, and over-the-counter analgesics.',
  },
  {
    id: 'CASE_006_VIRAL_URTI_FEVER',
    title: 'Uncomplicated Viral Upper Respiratory Infection',
    category: 'Infectious Disease',
    patient_symptoms: ['low-grade fever', 'runny nose', 'mild sore throat'],
    narrative: '28-year-old with 36 hours of low-grade fever (37.8°C), clear rhinorrhea, and mild sore throat. Alert, hydrating well, no shortness of breath, no rash.',
    patient_state: {
      chiefComplaint: 'fever',
      symptoms: ['low fever', 'nasal congestion', 'sore throat'],
      onset: '36 hours ago',
      suddenOnset: false,
      severity: 2,
      severityLevel: 'mild',
      temperature: 37.8,
      fever: true,
      stiffNeck: false,
      breathingDifficulty: false,
      criticalSigns: {
        rigidAbdomen: false,
        cyanosisOrStridor: false,
        petechialRash: false,
        unresponsiveOrConfusion: false,
        tearingPainToBack: false,
      },
    },
    correct_clinical_category: 'Viral Respiratory Infection',
    relevant_red_flags: [],
    expected_urgency: 'self_care_routine',
    expected_risk_level: 'LOW',
    required_questions: ['Fluid intake tolerance', 'Signs of shortness of breath'],
    clinician_assessment: 'Supportive care, hydration, rest, antipyretics as needed.',
  },
  {
    id: 'CASE_007_SEVERE_RESP_FAILURE',
    title: 'Severe Acute Asthma Exacerbation / Respiratory Distress',
    category: 'Pulmonary Emergency',
    patient_symptoms: ['severe shortness of breath', 'unable to speak sentences', 'audible wheezing'],
    narrative: '19-year-old with known asthma experiencing acute exacerbation, tachypneic, unable to complete words without gasping, cyanotic nail beds.',
    patient_state: {
      chiefComplaint: 'breathing_problem',
      symptoms: ['shortness of breath', 'cannot speak sentences', 'cyanosis'],
      onset: '1 hour ago',
      suddenOnset: true,
      severity: 9,
      severityLevel: 'extreme',
      breathingDifficulty: true,
      criticalSigns: {
        rigidAbdomen: false,
        cyanosisOrStridor: true,
        petechialRash: false,
        unresponsiveOrConfusion: false,
        tearingPainToBack: false,
      },
    },
    correct_clinical_category: 'Acute Respiratory Failure / Status Asthmaticus',
    relevant_red_flags: ['Speech fragmented to monosyllables', 'Cyanosis', 'Exhaustion'],
    expected_urgency: 'emergency',
    expected_risk_level: 'EMERGENCY',
    required_questions: ['Response to albuterol', 'Prior intubations'],
    clinician_assessment: 'Emergency 911 activation for continuous nebulization, oxygen, and systemic corticosteroids.',
  },
  {
    id: 'CASE_008_FEBRILE_SEPSIS_PURPURA',
    title: 'Suspected Meningococcemia / Septic Shock',
    category: 'Infectious Emergency',
    patient_symptoms: ['high fever', 'petechial rash', 'confusion and lethargy'],
    narrative: '17-year-old student with rapid-onset high fever (39.8°C), non-blanching dark purplish petechiae on lower extremities, and acute confusion.',
    patient_state: {
      chiefComplaint: 'fever',
      symptoms: ['high fever', 'purple rash', 'confusion'],
      onset: '6 hours ago',
      suddenOnset: true,
      severity: 9,
      severityLevel: 'extreme',
      fever: true,
      temperature: 39.8,
      stiffNeck: true,
      criticalSigns: {
        rigidAbdomen: false,
        cyanosisOrStridor: false,
        petechialRash: true,
        unresponsiveOrConfusion: true,
        tearingPainToBack: false,
      },
    },
    correct_clinical_category: 'Fulminant Sepsis / Meningococcal Disease',
    relevant_red_flags: ['Non-blanching purpura', 'Altered sensorium', 'Septic toxicity'],
    expected_urgency: 'emergency',
    expected_risk_level: 'EMERGENCY',
    required_questions: ['Rapidity of rash spread', 'Contact history'],
    clinician_assessment: 'Immediate emergency transport, blood cultures, empirical IV ceftriaxone, and fluid resuscitation.',
  },
];

/**
 * Runs the clinical evaluation test suite and computes:
 * - Safety Sensitivity
 * - Specificity
 * - False Negatives (critical)
 * - False Positives
 */
export function runClinicalEvaluationSuite(): EvaluationResult {
  const engine = new RecommendationEngine();
  const cases = CLINICAL_EVALUATION_DATASET;

  let truePositives = 0; // Correctly identified HIGH or EMERGENCY
  let totalUrgentOrEmergency = 0; // Actual HIGH or EMERGENCY
  let trueNegatives = 0; // Correctly identified LOW or MODERATE
  let totalNonUrgent = 0; // Actual LOW or MODERATE

  const falseNegatives: EvaluationResult['falseNegatives'] = [];
  const falsePositives: EvaluationResult['falsePositives'] = [];
  const details: EvaluationResult['details'] = [];

  for (const c of cases) {
    // Construct full PatientState
    const state = {
      id: c.id,
      patientName: 'Evaluation Benchmark Subject',
      age: 45,
      gender: 'neutral',
      chiefComplaint: c.patient_state.chiefComplaint || 'chest_pain',
      symptoms: c.patient_state.symptoms || c.patient_symptoms,
      onset: c.patient_state.onset || null,
      suddenOnset: c.patient_state.suddenOnset ?? null,
      severity: c.patient_state.severity ?? null,
      severityLevel: c.patient_state.severityLevel ?? null,
      character: c.patient_state.character ?? null,
      location: c.patient_state.location ?? null,
      radiation: c.patient_state.radiation || [],
      breathingDifficulty: c.patient_state.breathingDifficulty ?? null,
      sweating: c.patient_state.sweating ?? null,
      nausea: c.patient_state.nausea ?? null,
      fever: c.patient_state.fever ?? null,
      temperature: c.patient_state.temperature ?? null,
      stiffNeck: c.patient_state.stiffNeck ?? null,
      neurologicalDeficit: c.patient_state.neurologicalDeficit ?? null,
      fastSigns: c.patient_state.fastSigns || {
        facialDroop: false,
        armWeakness: false,
        speechDifficulty: false,
      },
      criticalSigns: c.patient_state.criticalSigns || {
        rigidAbdomen: false,
        cyanosisOrStridor: false,
        petechialRash: false,
        unresponsiveOrConfusion: false,
        tearingPainToBack: false,
      },
      knownHistory: [],
      missingInformation: [],
      version: 1,
      updatedAt: new Date().toISOString(),
    };

    const rec = engine.analyze(state);
    const actualRisk = rec.risk_assessment.risk_level;
    const expectedRisk = c.expected_risk_level;

    const isActualUrgent = actualRisk === 'HIGH' || actualRisk === 'EMERGENCY';
    const isExpectedUrgent = expectedRisk === 'HIGH' || expectedRisk === 'EMERGENCY';

    if (isExpectedUrgent) {
      totalUrgentOrEmergency++;
      if (isActualUrgent) {
        truePositives++;
      } else {
        falseNegatives.push({
          caseId: c.id,
          caseTitle: c.title,
          expected: expectedRisk,
          detected: actualRisk,
          missedRedFlags: c.relevant_red_flags,
        });
      }
    } else {
      totalNonUrgent++;
      if (!isActualUrgent) {
        trueNegatives++;
      } else {
        falsePositives.push({
          caseId: c.id,
          caseTitle: c.title,
          expected: expectedRisk,
          detected: actualRisk,
        });
      }
    }

    const rank = { EMERGENCY: 4, HIGH: 3, MODERATE: 2, LOW: 1 };
    const pass = (isExpectedUrgent && isActualUrgent) || (!isExpectedUrgent && !isActualUrgent);

    details.push({
      caseId: c.id,
      caseTitle: c.title,
      expectedRisk,
      actualRisk,
      expectedAction: c.expected_urgency,
      actualAction: rec.recommendation,
      matchedRules: rec.risk_assessment.rules_triggered,
      pass,
      isSafetyCritical: isExpectedUrgent,
    });
  }

  const safetySensitivity = totalUrgentOrEmergency > 0
    ? (truePositives / totalUrgentOrEmergency) * 100
    : 100;

  const specificity = totalNonUrgent > 0
    ? (trueNegatives / totalNonUrgent) * 100
    : 100;

  return {
    totalCases: cases.length,
    safetySensitivity: Math.round(safetySensitivity * 10) / 10,
    specificity: Math.round(specificity * 10) / 10,
    falseNegatives,
    falsePositives,
    details,
  };
}
