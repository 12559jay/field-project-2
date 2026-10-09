import { PatientState } from '../types/clinical';
import { CLINICAL_KNOWLEDGE_BASE } from '../knowledge/clinicalKnowledgeBase';

export interface NextQuestionResult {
  question: string;
  field: string;
  priority: number;
  safetyRelevance: string;
  isSafetyUrgent: boolean;
}

export class AdaptiveQuestionEngine {
  /**
   * Evaluates structured patient state and chooses the next highest-priority safety question
   * from the active clinical rule set.
   */
  public determineNextQuestion(patientState: PatientState): NextQuestionResult | null {
    // If emergency override is active, do not stall with routine questionnaires
    // (Section #47: Emergency workflow take-over)

    // Identify active complaints
    let complaintKey = patientState.chiefComplaint;
    if (!complaintKey || !CLINICAL_KNOWLEDGE_BASE[complaintKey]) {
      const lowerSymptoms = patientState.symptoms.map(s => s.toLowerCase());
      if (lowerSymptoms.some(s => s.includes('chest') || s.includes('heart'))) {
        complaintKey = 'chest_pain';
      } else if (lowerSymptoms.some(s => s.includes('headache') || s.includes('head'))) {
        complaintKey = 'headache';
      } else if (lowerSymptoms.some(s => s.includes('abdo') || s.includes('stomach') || s.includes('belly'))) {
        complaintKey = 'abdominal_pain';
      } else if (lowerSymptoms.some(s => s.includes('breath') || s.includes('wheez'))) {
        complaintKey = 'breathing_problem';
      } else if (lowerSymptoms.some(s => s.includes('fever') || s.includes('temp'))) {
        complaintKey = 'fever';
      } else if (lowerSymptoms.some(s => s.includes('stroke') || s.includes('weakness') || s.includes('numb') || s.includes('speech'))) {
        complaintKey = 'neurological_symptoms';
      } else {
        complaintKey = 'chest_pain';
      }
    }

    const kb = CLINICAL_KNOWLEDGE_BASE[complaintKey];
    if (!kb) return null;

    // Filter questions whose corresponding fields are not yet known in patientState
    const candidateQuestions = kb.recommended_questions.filter(q => {
      // If already asked or assessed in this session, do not repeat!
      if (patientState.assessedFields && patientState.assessedFields.includes(q.field)) {
        return false;
      }

      switch (q.field) {
        case 'onset':
          return patientState.onset === null && patientState.suddenOnset === null;
        case 'breathing_difficulty':
          return patientState.breathingDifficulty === null;
        case 'radiation':
          if (patientState.radiation.includes('none')) return false;
          return patientState.radiation.length === 0;
        case 'sweating_and_nausea':
          return patientState.sweating === null && patientState.nausea === null;
        case 'character':
          return patientState.character === null;
        case 'severity':
        case 'severity_and_rigidity':
          return patientState.severity === null;
        case 'neck_stiffness':
          return patientState.stiffNeck === null;
        case 'fever':
        case 'fever_and_vomiting':
          return patientState.fever === null;
        case 'neurological_deficit':
        case 'fast_symptoms':
          return patientState.neurologicalDeficit === null &&
            !patientState.fastSigns.facialDroop &&
            !patientState.fastSigns.armWeakness &&
            !patientState.fastSigns.speechDifficulty;
        case 'location':
          return patientState.location === null;
        case 'speech_ability':
        case 'blueness_and_stridor':
          return !patientState.criticalSigns.cyanosisOrStridor;
        case 'rash_and_sensorium':
          return !patientState.criticalSigns.petechialRash;
        default:
          return true;
      }
    });

    // Sort by priority ascending (1 = highest priority)
    candidateQuestions.sort((a, b) => a.priority - b.priority);

    if (candidateQuestions.length > 0) {
      const top = candidateQuestions[0];
      return {
        question: top.question,
        field: top.field,
        priority: top.priority,
        safetyRelevance: top.safety_relevance,
        isSafetyUrgent: top.priority <= 2,
      };
    }

    return null;
  }
}
