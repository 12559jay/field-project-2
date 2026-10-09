import {
  PatientState,
  RiskAssessment,
  RiskLevel,
  RecommendationAction,
  ConfidenceLevel,
} from '../types/clinical';
import { CLINICAL_KNOWLEDGE_BASE } from '../knowledge/clinicalKnowledgeBase';

export class RiskDetectionEngine {
  /**
   * Evaluates deterministic clinician-approved rules against structured patient state.
   * Does NOT rely on LLM guessing for life-threatening risk detection.
   */
  public detectRisk(patientState: PatientState): RiskAssessment {
    const evidence: string[] = [];
    const missingInfo: string[] = [...(patientState.missingInformation || [])];
    const rulesTriggered: string[] = [];
    const possibleConcerns: string[] = [];

    let highestRisk: RiskLevel = 'LOW';
    let primaryReason = 'No configured urgent warning signs were identified from the information provided.';
    let recommendedAction: RecommendationAction = 'self_care_routine';
    let confidence: ConfidenceLevel = 'low';
    let confidenceExplanation = 'Initial information reported; non-urgent profile at this stage.';
    let requiresDoctorReview = false;
    let emergencyOverride = false;

    // Compile active complaints to inspect
    const complaintsToInspect = new Set<string>();
    if (patientState.chiefComplaint && CLINICAL_KNOWLEDGE_BASE[patientState.chiefComplaint]) {
      complaintsToInspect.add(patientState.chiefComplaint);
    }

    // Auto-detect complaints from reported symptoms
    for (const symptom of (patientState.symptoms || [])) {
      const lower = symptom.toLowerCase();
      if (lower.includes('chest') || lower.includes('heart') || lower.includes('angina')) {
        complaintsToInspect.add('chest_pain');
      }
      if (lower.includes('headache') || lower.includes('head') || lower.includes('migraine')) {
        complaintsToInspect.add('headache');
      }
      if (lower.includes('stomach') || lower.includes('abdo') || lower.includes('belly')) {
        complaintsToInspect.add('abdominal_pain');
      }
      if (lower.includes('breath') || lower.includes('wheez') || lower.includes('dyspnea') || lower.includes('suffocat')) {
        complaintsToInspect.add('breathing_problem');
      }
      if (lower.includes('fever') || lower.includes('temp') || lower.includes('chills')) {
        complaintsToInspect.add('fever');
      }
      if (lower.includes('stroke') || lower.includes('weakness') || lower.includes('droop') || lower.includes('slur') || lower.includes('numb')) {
        complaintsToInspect.add('neurological_symptoms');
      }
    }

    if (complaintsToInspect.size === 0) {
      complaintsToInspect.add('chest_pain');
      complaintsToInspect.add('headache');
    }

    // Evaluate rules deterministically across complaints
    for (const compKey of complaintsToInspect) {
      const kb = CLINICAL_KNOWLEDGE_BASE[compKey];
      if (!kb) continue;

      for (const rule of kb.risk_rules) {
        let matched = false;

        // Check rule-specific triggers
        if (rule.id === 'RULE_CHEST_ACS_EMERGENCY') {
          const hasChest = patientState.chiefComplaint === 'chest_pain' ||
            (patientState.symptoms || []).some(s => s.toLowerCase().includes('chest'));
          const realRadiations = (patientState.radiation || []).filter(r => r !== 'none');
          const hasRad = realRadiations.length > 0;
          const hasAuto = Boolean(patientState.sweating || patientState.breathingDifficulty || patientState.nausea);
          if (hasChest && (hasRad || hasAuto) && (patientState.severityLevel === 'severe' || patientState.severityLevel === 'extreme' || (patientState.severity !== null && patientState.severity >= 6))) {
            matched = true;
          } else if (hasChest && hasRad && hasAuto) {
            matched = true;
          }
        } else if (rule.id === 'RULE_CHEST_AORTIC_EMERGENCY') {
          const realRadiations = (patientState.radiation || []).filter(r => r !== 'none');
          if (patientState.criticalSigns?.tearingPainToBack ||
              (realRadiations.includes('back') && (patientState.character === 'tearing' || patientState.character === 'ripping'))) {
            matched = true;
          }
        } else if (rule.id === 'RULE_HEADACHE_THUNDERCLAP_EMERGENCY') {
          const hasHead = patientState.chiefComplaint === 'headache' ||
            (patientState.symptoms || []).some(s => s.toLowerCase().includes('headache'));
          const isSudden = patientState.suddenOnset === true;
          const isSevere = patientState.severityLevel === 'extreme' || patientState.severityLevel === 'severe' || (patientState.severity !== null && patientState.severity >= 7);
          if (hasHead && isSudden && isSevere) {
            matched = true;
          }
        } else if (rule.id === 'RULE_HEADACHE_MENINGEAL_EMERGENCY') {
          if (patientState.stiffNeck === true && (patientState.fever === true || (patientState.symptoms || []).some(s => s.toLowerCase().includes('fever')))) {
            matched = true;
          }
        } else if (rule.id === 'RULE_NEURO_STROKE_FAST_EMERGENCY') {
          if (patientState.fastSigns?.facialDroop || patientState.fastSigns?.armWeakness || patientState.fastSigns?.speechDifficulty) {
            matched = true;
          }
        } else if (rule.id === 'RULE_RESP_CRITICAL_DISTRESS_EMERGENCY') {
          if (patientState.criticalSigns?.cyanosisOrStridor ||
              (patientState.symptoms || []).some(s => s.toLowerCase().includes('cannot speak') || s.toLowerCase().includes('cyanosis') || s.toLowerCase().includes('stridor'))) {
            matched = true;
          }
        } else if (rule.id === 'RULE_FEVER_SEPSIS_PURPURA_EMERGENCY') {
          if (patientState.criticalSigns?.petechialRash || patientState.criticalSigns?.unresponsiveOrConfusion) {
            matched = true;
          }
        } else if (rule.id === 'RULE_ABDOMEN_ACUTE_SURGICAL_EMERGENCY') {
          if (patientState.criticalSigns?.rigidAbdomen && (patientState.severityLevel === 'severe' || patientState.severityLevel === 'extreme' || (patientState.severity !== null && patientState.severity >= 8))) {
            matched = true;
          }
        } else if (rule.id === 'RULE_ABDOMEN_APPENDICITIS_HIGH') {
          const hasAbdo = patientState.chiefComplaint === 'abdominal_pain' || patientState.symptoms.some(s => s.toLowerCase().includes('abdominal') || s.toLowerCase().includes('belly'));
          const normLoc = (patientState.location || '').toLowerCase().replace(/_/g, ' ');
          const rLq = normLoc.includes('right lower') || normLoc.includes('rlq') || patientState.symptoms.some(s => s.toLowerCase().replace(/_/g, ' ').includes('lower right') || s.toLowerCase().replace(/_/g, ' ').includes('right lower'));
          if (hasAbdo && rLq) {
            matched = true;
          }
        } else if (rule.id === 'RULE_CHEST_PE_HIGH') {
          const hasChest = patientState.symptoms.some(s => s.toLowerCase().includes('chest'));
          if (hasChest && patientState.breathingDifficulty === true) {
            matched = true;
          }
        } else if (rule.id === 'RULE_HEADACHE_FOCAL_NEURO_HIGH') {
          if (patientState.neurologicalDeficit === true) {
            matched = true;
          }
        } else if (rule.id === 'RULE_CHEST_ISOLATED_MODERATE') {
          const hasChest = patientState.symptoms.some(s => s.toLowerCase().includes('chest'));
          if (hasChest) {
            matched = true;
          }
        } else if (rule.id === 'RULE_HEADACHE_MIGRAINE_MODERATE') {
          if (patientState.character === 'throbbing' || patientState.symptoms.some(s => s.toLowerCase().includes('throbbing') || s.toLowerCase().includes('migraine'))) {
            matched = true;
          }
        }

        if (matched) {
          rulesTriggered.push(rule.id);
          possibleConcerns.push(rule.possible_concern);

          // Update risk priority: EMERGENCY > HIGH > MODERATE > LOW
          const rank = { EMERGENCY: 4, HIGH: 3, MODERATE: 2, LOW: 1 };
          if (rank[rule.risk_level] > rank[highestRisk]) {
            highestRisk = rule.risk_level;
            primaryReason = rule.reason;
            recommendedAction = rule.recommended_action;
            requiresDoctorReview = rule.requires_doctor_review;
            confidence = rule.confidence;

            if (rule.risk_level === 'EMERGENCY') {
              emergencyOverride = true;
              confidenceExplanation = 'High-alert emergency symptom pattern matched clinician-validated safety rules. Immediate medical intervention required.';
            } else if (rule.risk_level === 'HIGH') {
              confidenceExplanation = 'Significant clinical indicators require prompt urgent evaluation.';
            } else if (rule.risk_level === 'MODERATE') {
              confidenceExplanation = 'Recognizable symptom cluster present; non-emergency clinical review advised.';
            }
          }
        }
      }
    }

    // =========================================================================
    // CLINICAL INTAKE BASELINE RULES (Comorbidities, Meds, Allergies, Pregnancy)
    // =========================================================================
    const history = patientState.knownHistory || [];
    const meds = patientState.currentMedications || [];
    const allergies = patientState.allergies || [];
    const lowerSymptoms = (patientState.symptoms || []).map(s => s.toLowerCase());
    const hasChest = patientState.chiefComplaint === 'chest_pain' || lowerSymptoms.some(s => s.includes('chest'));
    const hasHead = patientState.chiefComplaint === 'headache' || lowerSymptoms.some(s => s.includes('headache') || s.includes('head pain'));
    const hasAbdo = patientState.chiefComplaint === 'abdominal_pain' || lowerSymptoms.some(s => s.includes('abdo') || s.includes('stomach') || s.includes('belly'));
    const hasDyspnea = patientState.breathingDifficulty === true || lowerSymptoms.some(s => s.includes('breath') || s.includes('dyspnea'));

    // 1. Anticoagulant + Acute Neurological / Headache -> Immediate EMERGENCY (Intracranial Hemorrhage)
    const anticoagMeds = meds.filter(m => /warfarin|coumadin|eliquis|xarelto|blood thinner|plavix|clopidogrel|apixaban|aspirin/i.test(m));
    if (anticoagMeds.length > 0 && (hasHead || patientState.neurologicalDeficit || patientState.criticalSigns?.unresponsiveOrConfusion)) {
      highestRisk = 'EMERGENCY';
      primaryReason = `Patient is actively prescribed anticoagulant therapy (${anticoagMeds.join(', ')}) and presents with acute headache or neurological symptoms. Immediate emergency CT evaluation is required to rule out intracranial hemorrhage.`;
      recommendedAction = 'emergency';
      emergencyOverride = true;
      requiresDoctorReview = true;
      confidence = 'high';
      confidenceExplanation = 'Anticoagulant therapy combined with acute headache poses an immediate hemorrhage risk.';
      rulesTriggered.push('RULE_ANTICOAGULANT_ICH_EMERGENCY');
      possibleConcerns.push('Acute Intracranial Hemorrhage / Subdural Hematoma');
    }

    // 2. Pregnancy + Severe Headache / Abdominal Pain -> Preeclampsia or Ectopic EMERGENCY / HIGH
    if (patientState.lifestyle?.pregnant === true) {
      if (hasHead || (patientState.severity !== null && patientState.severity >= 7) || patientState.suddenOnset) {
        highestRisk = 'EMERGENCY';
        primaryReason = 'Patient is pregnant with acute severe headache or neurological symptoms. High suspicion for severe preeclampsia / eclampsia requiring immediate obstetric emergency intervention.';
        recommendedAction = 'emergency';
        emergencyOverride = true;
        requiresDoctorReview = true;
        rulesTriggered.push('RULE_PREGNANCY_PREECLAMPSIA_EMERGENCY');
        possibleConcerns.push('Severe Preeclampsia / Eclampsia');
      } else if (hasAbdo) {
        const rank = { EMERGENCY: 4, HIGH: 3, MODERATE: 2, LOW: 1 };
        if (rank['HIGH'] > rank[highestRisk]) {
          highestRisk = 'HIGH';
          primaryReason = 'Acute abdominal or pelvic pain in a pregnant patient requires prompt urgent obstetric evaluation to rule out ectopic pregnancy or placental complication.';
          recommendedAction = 'urgent_medical_evaluation';
          requiresDoctorReview = true;
          rulesTriggered.push('RULE_PREGNANCY_OBSTETRIC_HIGH');
          possibleConcerns.push('Ectopic pregnancy / Acute obstetric concern');
        }
      }
    }

    // 3. Comorbidity-Adjusted Cardiovascular Risk Escalation
    const cardioComorbidities = history.filter(h => /hyper|cad|coronary|heart|angina|infarct|diabet/i.test(h));
    const ageIsGeriatric = (patientState.age !== null && patientState.age >= 55);
    if ((hasChest || hasDyspnea) && (cardioComorbidities.length > 0 || ageIsGeriatric)) {
      const rank = { EMERGENCY: 4, HIGH: 3, MODERATE: 2, LOW: 1 };
      if (rank['HIGH'] > rank[highestRisk]) {
        highestRisk = 'HIGH';
        primaryReason = `Significant cardiovascular comorbidity background: Patient ${patientState.age ? `(age ${patientState.age})` : ''} with documented ${cardioComorbidities.join(', ') || 'geriatric vascular risk'} presenting with chest discomfort/dyspnea has an elevated pre-test probability of myocardial ischemia.`;
        recommendedAction = 'urgent_medical_evaluation';
        requiresDoctorReview = true;
        rulesTriggered.push('RULE_COMORBIDITY_CARDIO_HIGH');
        possibleConcerns.push('Acute Coronary Syndrome (Comorbidity-Elevated Risk)');
      }
    }

    // 4. Asthma / COPD Exacerbation Escalation
    const respHistory = history.filter(h => /asthma|copd|bronch/i.test(h));
    if (hasDyspnea && respHistory.length > 0) {
      const rank = { EMERGENCY: 4, HIGH: 3, MODERATE: 2, LOW: 1 };
      if (rank['HIGH'] > rank[highestRisk]) {
        highestRisk = 'HIGH';
        primaryReason = `Known ${respHistory.join(', ')} presenting with acute shortness of breath warrants prompt clinical evaluation for severe bronchospasm.`;
        recommendedAction = 'urgent_medical_evaluation';
        requiresDoctorReview = true;
        rulesTriggered.push('RULE_RESP_ASTHMA_COPD_HIGH');
        possibleConcerns.push('Acute Asthma / COPD Exacerbation');
      }
    }

    // 5. Drug Allergy Safety Verification Flag
    if (allergies.length > 0) {
      rulesTriggered.push('RULE_SAFETY_ALLERGY_CONTRAINDICATION');
    }

    // Collect concrete verifiable evidence from patient reported facts
    const currentSymptoms = patientState.symptoms || [];
    if (currentSymptoms.length > 0) {
      for (const s of currentSymptoms) {
        if (!evidence.includes(s)) evidence.push(s);
      }
    }
    if (patientState.character) {
      evidence.push(`Character: ${patientState.character}`);
    }
    if (patientState.onset) {
      evidence.push(`Onset: ${patientState.onset}`);
    }
    if (patientState.severity !== null) {
      evidence.push(`Severity score: ${patientState.severity}/10 (${patientState.severityLevel || 'reported'})`);
    }
    const realRad = (patientState.radiation || []).filter((r) => r !== 'none');
    if (realRad.length > 0) {
      evidence.push(`Radiation: to ${realRad.join(', ')}`);
    }
    if (patientState.breathingDifficulty === true) {
      evidence.push('Reported shortness of breath / breathing difficulty');
    }
    if (patientState.sweating === true) {
      evidence.push('Reported profuse sweating / diaphoresis');
    }
    if (patientState.stiffNeck === true) {
      evidence.push('Reported neck stiffness / nuchal rigidity');
    }
    if (patientState.fastSigns?.facialDroop) {
      evidence.push('Observed / reported facial asymmetry / droop');
    }
    if (patientState.fastSigns?.armWeakness) {
      evidence.push('Reported unilateral arm weakness / drift');
    }
    if (patientState.fastSigns?.speechDifficulty) {
      evidence.push('Reported slurred speech or difficulty speaking words');
    }
    if (patientState.criticalSigns?.rigidAbdomen) {
      evidence.push('Involuntary abdominal muscular rigidity / board-like abdomen');
    }
    if (patientState.criticalSigns?.cyanosisOrStridor) {
      evidence.push('Reported cyanosis (bluish tint) or high-pitched stridor');
    }

    // Baseline intake and patient safety evidence
    if (patientState.patientName) {
      evidence.push(`Patient: ${patientState.patientName}${patientState.age ? ` (${patientState.age} y/o, ${patientState.gender || 'unspecified'})` : ''}`);
    }
    if (patientState.bmi !== null && patientState.bmi !== undefined) {
      evidence.push(`BMI: ${patientState.bmi}${patientState.bmi >= 30 ? ' (Obesity clinical risk factor)' : ''}`);
    }
    if (patientState.bloodGroup) {
      evidence.push(`Blood Group: ${patientState.bloodGroup}`);
    }
    if (allergies.length > 0) {
      evidence.push(`⚠️ Drug Allergies: ${allergies.join(', ')} (Contraindicated)`);
    }
    if (meds.length > 0) {
      evidence.push(`Active Medications: ${meds.join(', ')}`);
    }
    if (history.length > 0) {
      evidence.push(`Pre-existing Medical History: ${history.join(', ')}`);
    }
    if (patientState.lifestyle?.pregnant === true) {
      evidence.push('Pregnancy Status: Currently pregnant (Obstetric safety considerations active)');
    }
    if (patientState.lifestyle?.smokingStatus && patientState.lifestyle.smokingStatus !== 'never') {
      evidence.push(`Tobacco Status: ${patientState.lifestyle.smokingStatus} smoker`);
    }

    // Determine missing information checklist
    if (patientState.onset === null) {
      if (!missingInfo.includes('Exact onset and time duration')) {
        missingInfo.push('Exact onset and time duration');
      }
    }
    if (patientState.severity === null) {
      if (!missingInfo.includes('Pain / symptom severity scale (1-10)')) {
        missingInfo.push('Pain / symptom severity scale (1-10)');
      }
    }
    if (patientState.age === null) {
      if (!missingInfo.includes('Patient age')) {
        missingInfo.push('Patient age');
      }
    }
    if (!patientState.knownHistory || patientState.knownHistory.length === 0) {
      if (!missingInfo.includes('Prior cardiovascular / neurological medical history')) {
        missingInfo.push('Prior cardiovascular / neurological medical history');
      }
    }

    return {
      risk_level: highestRisk,
      reason: primaryReason,
      possible_concerns: Array.from(new Set(possibleConcerns)),
      evidence,
      missing_information: Array.from(new Set(missingInfo)),
      recommended_action: recommendedAction,
      confidence,
      confidence_explanation: confidenceExplanation,
      requires_doctor_review: requiresDoctorReview,
      rules_triggered: rulesTriggered,
      emergency_override_triggered: emergencyOverride,
    };
  }
}
