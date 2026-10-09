import {
  PatientState,
  ClinicalRecommendation,
  PossibleCondition,
  RiskAssessment,
  RecommendationAction,
} from '../types/clinical';
import { RiskDetectionEngine } from './RiskDetectionEngine';
import { PossibleConditionEngine } from './PossibleConditionEngine';

export class RecommendationEngine {
  private riskDetectionEngine: RiskDetectionEngine;
  private possibleConditionEngine: PossibleConditionEngine;

  constructor() {
    this.riskDetectionEngine = new RiskDetectionEngine();
    this.possibleConditionEngine = new PossibleConditionEngine();
  }

  /**
   * Orchestrates condition identification, deterministic risk detection,
   * and clinical action determination.
   */
  public analyze(patientState: PatientState): ClinicalRecommendation {
    const possibleConditions: PossibleCondition[] =
      this.possibleConditionEngine.findPossibleConditions(patientState);

    const riskAssessment: RiskAssessment =
      this.riskDetectionEngine.detectRisk(patientState);

    const action: RecommendationAction =
      this.determineAction(riskAssessment);

    const recommendationText: string =
      this.getActionGuidanceText(action, riskAssessment, patientState);

    return {
      possible_conditions: possibleConditions,
      risk_assessment: riskAssessment,
      recommendation: action,
      recommendation_text: recommendationText,
    };
  }

  public detectRisk(patientState: PatientState): RiskAssessment {
    return this.riskDetectionEngine.detectRisk(patientState);
  }

  public findPossibleConditions(patientState: PatientState): PossibleCondition[] {
    return this.possibleConditionEngine.findPossibleConditions(patientState);
  }

  public determineAction(riskAssessment: RiskAssessment): RecommendationAction {
    return riskAssessment.recommended_action;
  }

  private getActionGuidanceText(action: RecommendationAction, _risk: RiskAssessment, patientState?: PatientState): string {
    let base = '';
    switch (action) {
      case 'emergency':
        base = 'The reported symptoms may indicate a medical emergency. Seek emergency medical care immediately according to your local emergency-care instructions (call 911/999/112). Do not wait or drive yourself.';
        break;
      case 'urgent_medical_evaluation':
        base = 'Some reported symptoms may require prompt medical evaluation. We recommend visiting an urgent care center or contacting your on-call clinician within a few hours.';
        break;
      case 'medical_review':
        base = 'The symptoms should be reviewed by a healthcare professional. Schedule a consultation with your primary doctor for thorough physical evaluation and baseline testing.';
        break;
      case 'self_care_routine':
      default:
        base = 'No configured urgent warning signs were identified from the information provided. Routine medical follow-up may be appropriate if symptoms persist or change.';
        break;
    }

    if (patientState) {
      if (patientState.allergies && patientState.allergies.length > 0) {
        base += `\n\n⚠️ ALLERGY SAFETY WARNING: Patient has documented allergies to ${patientState.allergies.join(', ')}. Attending medical providers must verify all medications prior to administration.`;
      }
      const meds = patientState.currentMedications || [];
      const anticoag = meds.filter(m => /warfarin|coumadin|eliquis|xarelto|blood thinner|plavix|clopidogrel|apixaban/i.test(m));
      if (anticoag.length > 0) {
        base += `\n\n⚠️ MEDICATION ALERT: Patient is actively receiving anticoagulant therapy (${anticoag.join(', ')}). Notify emergency staff upon arrival.`;
      }
    }

    return base;
  }
}
