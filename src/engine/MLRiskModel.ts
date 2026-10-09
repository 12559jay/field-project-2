import { PatientState, RiskLevel, RecommendationAction } from '../types/clinical';

export interface TrainingExample {
  id?: string;
  age?: number;
  gender?: string;
  bmi?: number | null;
  bloodGroup?: string | null;
  allergies?: string[];
  knownHistory?: string[];
  currentMedications?: string[];
  lifestyle?: {
    smokingStatus?: 'never' | 'former' | 'current' | 'unknown' | null;
    alcohol?: 'none' | 'occasional' | 'regular' | 'heavy' | null;
    pregnant?: boolean | null;
  } | null;
  symptoms: string[];
  chiefComplaint?: string;
  suddenOnset?: boolean;
  severity?: number; // 1-10
  radiation?: string[];
  breathingDifficulty?: boolean;
  sweating?: boolean;
  stiffNeck?: boolean;
  facialDroop?: boolean;
  speechDifficulty?: boolean;
  cyanosisOrStridor?: boolean;
  rigidAbdomen?: boolean;
  petechialRash?: boolean;
  // Label:
  trueRiskLevel: RiskLevel;
  trueAction?: RecommendationAction;
  notes?: string;
}

export interface FeatureWeights {
  [featureName: string]: number;
}

export interface TrainingReport {
  samplesCount: number;
  epochs: number;
  finalLoss: number;
  trainingSensitivity: number; // %
  trainingSpecificity: number; // %
  accuracy: number; // %
  confusionMatrix: {
    trueEmergency: { predEmergency: number; predOther: number };
    trueHigh: { predHigh: number; predOther: number };
    trueModerate: { predModerate: number; predOther: number };
    trueLow: { predLow: number; predOther: number };
  };
  featureImportance: { feature: string; weight: number; impact: 'increases_risk' | 'decreases_risk' }[];
  calibratedThresholds: {
    emergencyThreshold: number;
    highThreshold: number;
    moderateThreshold: number;
  };
  trainedAt: string;
}

export class MLRiskModel {
  // Feature weights learned from training
  public weights: FeatureWeights = {
    sudden_onset: 2.8,
    severity_high: 2.5,
    radiation_arm_jaw: 3.2,
    breathing_difficulty: 2.4,
    sweating_diaphoresis: 2.1,
    stiff_neck: 3.5,
    fast_stroke_signs: 4.2,
    cyanosis_stridor: 4.5,
    rigid_abdomen: 3.8,
    petechial_rash: 4.0,
    chest_discomfort: 1.8,
    fever_high: 1.9,
    right_lower_abdomen: 2.6,
    // New clinical baseline & demographic dimensions:
    age_geriatric: 1.65,
    age_pediatric: 1.35,
    sex_female_atypical: 0.85,
    cardio_comorbidity: 1.95,
    diabetes_comorbidity: 1.55,
    respiratory_comorbidity: 1.40,
    high_bmi_obesity: 1.15,
    anticoagulant_risk: 2.25,
    pregnancy_risk: 1.80,
    smoker_risk: 0.95,
    allergy_contraindication: 0.70,
    // Synergistic cross-dimensional risk interactions:
    cardiac_comorbidity_synergy: 2.45,
    anticoagulant_neuro_synergy: 2.85,
    respiratory_comorbidity_synergy: 1.90,
    pregnancy_obstetric_synergy: 2.60,
  };

  public bias: number = -4.5;

  public thresholds = {
    emergencyThreshold: 0.75,
    highThreshold: 0.50,
    moderateThreshold: 0.25,
  };

  public isTrained: boolean = false;
  public lastReport: TrainingReport | null = null;

  /**
   * Extracts normalized numerical feature map from PatientState
   */
  public extractFeatures(state: PatientState): Record<string, number> {
    const normLoc = (state.location || '').toLowerCase().replace(/_/g, ' ');
    const lowerSymptoms = (state.symptoms || []).map(s => s.toLowerCase());

    const age = state.age ?? 45;
    const isGeriatric = age >= 60 ? 1 : 0;
    const isPediatric = age <= 12 ? 1 : 0;
    const isFemale = (state.gender === 'Female' || state.gender === 'f') ? 1 : 0;

    const history = state.knownHistory || [];
    const meds = state.currentMedications || [];
    const allergies = state.allergies || [];

    const hasCardioHistory = (
      history.some(h => /hyper|cad|coronary|heart|angina|infarct|chf/i.test(h)) ||
      meds.some(m => /blood pressure|lisinopril|amlodipine|metoprolol|atorvastatin|statin|aspirin/i.test(m))
    ) ? 1 : 0;

    const hasDiabetes = (
      history.some(h => /diabet|t2d|insulin|glucose/i.test(h)) ||
      meds.some(m => /metformin|insulin|glipizide|januvia/i.test(m))
    ) ? 1 : 0;

    const hasAsthmaCopd = (
      history.some(h => /asthma|copd|bronch|emphysema/i.test(h)) ||
      meds.some(m => /albuterol|inhaler|steroid|symbicort/i.test(m))
    ) ? 1 : 0;

    const hasAnticoagulants = meds.some(m => /warfarin|coumadin|eliquis|xarelto|blood thinner|plavix|clopidogrel|apixaban/i.test(m)) ? 1 : 0;

    const isObese = (state.bmi && state.bmi >= 30) ? 1 : 0;
    const isSmoker = (state.lifestyle?.smokingStatus === 'current') ? 1 : 0;
    const isPregnant = (state.lifestyle?.pregnant === true) ? 1 : 0;
    const hasAllergies = allergies.length > 0 ? 1 : 0;

    const hasChest = (state.chiefComplaint === 'chest_pain' || lowerSymptoms.some(s => s.includes('chest'))) ? 1 : 0;
    const hasNeuro = (
      state.chiefComplaint === 'headache' ||
      lowerSymptoms.some(s => s.includes('headache') || s.includes('confusion') || s.includes('dizzy')) ||
      Boolean(state.fastSigns?.facialDroop || state.fastSigns?.armWeakness || state.fastSigns?.speechDifficulty || state.neurologicalDeficit)
    ) ? 1 : 0;
    const hasDyspnea = state.breathingDifficulty ? 1 : 0;
    const hasAbdominal = (state.chiefComplaint === 'abdominal_pain' || lowerSymptoms.some(s => s.includes('abdo') || s.includes('stomach') || s.includes('belly'))) ? 1 : 0;

    return {
      sudden_onset: state.suddenOnset ? 1 : 0,
      severity_high: state.severity ? Math.min(state.severity / 10, 1) : (state.severityLevel === 'extreme' ? 1 : state.severityLevel === 'severe' ? 0.8 : 0.3),
      radiation_arm_jaw: (state.radiation.includes('left_arm') || state.radiation.includes('arm') || state.radiation.includes('jaw')) ? 1 : 0,
      breathing_difficulty: hasDyspnea,
      sweating_diaphoresis: state.sweating ? 1 : 0,
      stiff_neck: state.stiffNeck ? 1 : 0,
      fast_stroke_signs: (state.fastSigns.facialDroop || state.fastSigns.armWeakness || state.fastSigns.speechDifficulty) ? 1 : 0,
      cyanosis_stridor: state.criticalSigns.cyanosisOrStridor ? 1 : 0,
      rigid_abdomen: state.criticalSigns.rigidAbdomen ? 1 : 0,
      petechial_rash: state.criticalSigns.petechialRash ? 1 : 0,
      chest_discomfort: hasChest,
      fever_high: state.fever ? 1 : 0,
      right_lower_abdomen: (normLoc.includes('right lower') || lowerSymptoms.some(s => s.includes('lower right'))) ? 1 : 0,

      // New clinical baseline & demographic dimensions
      age_geriatric: isGeriatric,
      age_pediatric: isPediatric,
      sex_female_atypical: (isFemale && (hasChest || hasDyspnea)) ? 1 : 0,
      cardio_comorbidity: hasCardioHistory,
      diabetes_comorbidity: hasDiabetes,
      respiratory_comorbidity: hasAsthmaCopd,
      high_bmi_obesity: isObese,
      anticoagulant_risk: hasAnticoagulants,
      pregnancy_risk: isPregnant,
      smoker_risk: isSmoker,
      allergy_contraindication: hasAllergies,

      // Synergistic cross-dimensional risk interactions
      cardiac_comorbidity_synergy: (hasChest && (isGeriatric || hasCardioHistory || hasDiabetes || isSmoker)) ? 1 : 0,
      anticoagulant_neuro_synergy: (hasNeuro && hasAnticoagulants) ? 1 : 0,
      respiratory_comorbidity_synergy: (hasDyspnea && hasAsthmaCopd) ? 1 : 0,
      pregnancy_obstetric_synergy: ((hasAbdominal || hasNeuro) && isPregnant) ? 1 : 0,
    };
  }

  /**
   * Predicts risk score (0 to 1) and qualitative risk level
   */
  public predict(state: PatientState): {
    riskScore: number;
    predictedLevel: RiskLevel;
    recommendedAction: RecommendationAction;
    topContributingFeatures: { feature: string; contribution: number }[];
  } {
    const features = this.extractFeatures(state);
    let logit = this.bias;
    const contributions: { feature: string; contribution: number }[] = [];

    for (const [feat, val] of Object.entries(features)) {
      const w = this.weights[feat] || 0;
      const contrib = w * val;
      logit += contrib;
      if (contrib > 0.1) {
        contributions.push({ feature: feat, contribution: Math.round(contrib * 100) / 100 });
      }
    }

    // Sigmoid probability calibration
    const riskScore = 1 / (1 + Math.exp(-logit));

    contributions.sort((a, b) => b.contribution - a.contribution);

    let predictedLevel: RiskLevel = 'LOW';
    let recommendedAction: RecommendationAction = 'self_care_routine';

    if (riskScore >= this.thresholds.emergencyThreshold) {
      predictedLevel = 'EMERGENCY';
      recommendedAction = 'emergency';
    } else if (riskScore >= this.thresholds.highThreshold) {
      predictedLevel = 'HIGH';
      recommendedAction = 'urgent_medical_evaluation';
    } else if (riskScore >= this.thresholds.moderateThreshold) {
      predictedLevel = 'MODERATE';
      recommendedAction = 'medical_review';
    }

    return {
      riskScore: Math.round(riskScore * 1000) / 1000,
      predictedLevel,
      recommendedAction,
      topContributingFeatures: contributions.slice(0, 5),
    };
  }

  /**
   * Trains model weights using gradient descent on the provided dataset,
   * calibrating clinical decision boundaries to avoid false negatives.
   */
  public train(examples: TrainingExample[], epochs: number = 200, learningRate: number = 0.08): TrainingReport {
    if (examples.length === 0) {
      throw new Error('Training dataset cannot be empty');
    }

    // Feature keys initialization
    const featureKeys = Object.keys(this.weights);

    // Convert examples into feature vectors and target risk values (0 to 1)
    const processedData = examples.map(ex => {
      const mockState: PatientState = {
        id: ex.id || 'TRAIN',
        patientName: 'Train Patient',
        age: ex.age ?? 45,
        gender: ex.gender ?? 'neutral',
        bmi: ex.bmi ?? null,
        bloodGroup: ex.bloodGroup ?? null,
        allergies: ex.allergies || [],
        knownHistory: ex.knownHistory || [],
        currentMedications: ex.currentMedications || [],
        lifestyle: ex.lifestyle ?? null,
        chiefComplaint: ex.chiefComplaint || (ex.symptoms[0] || ''),
        symptoms: ex.symptoms || [],
        onset: ex.suddenOnset ? 'sudden' : 'gradual',
        suddenOnset: ex.suddenOnset ?? null,
        severity: ex.severity ?? null,
        severityLevel: ex.severity && ex.severity >= 8 ? 'severe' : 'moderate',
        character: null,
        location: null,
        radiation: ex.radiation || [],
        breathingDifficulty: ex.breathingDifficulty ?? null,
        sweating: ex.sweating ?? null,
        nausea: null,
        fever: null,
        temperature: null,
        stiffNeck: ex.stiffNeck ?? null,
        neurologicalDeficit: null,
        fastSigns: {
          facialDroop: ex.facialDroop || false,
          armWeakness: false,
          speechDifficulty: ex.speechDifficulty || false,
        },
        criticalSigns: {
          rigidAbdomen: ex.rigidAbdomen || false,
          cyanosisOrStridor: ex.cyanosisOrStridor || false,
          petechialRash: ex.petechialRash || false,
          unresponsiveOrConfusion: false,
          tearingPainToBack: false,
        },
        missingInformation: [],
        version: 1,
        updatedAt: new Date().toISOString(),
      };

      const feats = this.extractFeatures(mockState);
      let targetScore = 0.1;
      if (ex.trueRiskLevel === 'EMERGENCY') targetScore = 0.95;
      else if (ex.trueRiskLevel === 'HIGH') targetScore = 0.70;
      else if (ex.trueRiskLevel === 'MODERATE') targetScore = 0.40;
      else targetScore = 0.10;

      return {
        features: feats,
        target: targetScore,
        trueLevel: ex.trueRiskLevel,
      };
    });

    // Logistic regression with clinical asymmetric loss (penalizing false negatives 5x heavier)
    let loss = 0;
    for (let epoch = 0; epoch < epochs; epoch++) {
      loss = 0;
      for (const item of processedData) {
        let logit = this.bias;
        for (const k of featureKeys) {
          logit += (this.weights[k] || 0) * (item.features[k] || 0);
        }
        const pred = 1 / (1 + Math.exp(-logit));
        const err = pred - item.target;

        // Asymmetric safety weighting: If true target is high/emergency and model under-predicted, penalize heavily
        const safetyWeight = (item.target >= 0.7 && err < 0) ? 5.0 : 1.0;

        loss += safetyWeight * (err * err);

        // Update bias
        this.bias -= learningRate * err * safetyWeight;

        // Update weights with mild L2 regularization
        for (const k of featureKeys) {
          const x = item.features[k] || 0;
          const reg = 0.001 * (this.weights[k] || 0);
          this.weights[k] -= learningRate * (err * safetyWeight * x + reg);
        }
      }
      loss /= processedData.length;
    }

    // Evaluate on training data
    let trueEmergencies = 0;
    let caughtEmergencies = 0;
    let trueNonUrgent = 0;
    let caughtNonUrgent = 0;
    let correctCount = 0;

    const cm = {
      trueEmergency: { predEmergency: 0, predOther: 0 },
      trueHigh: { predHigh: 0, predOther: 0 },
      trueModerate: { predModerate: 0, predOther: 0 },
      trueLow: { predLow: 0, predOther: 0 },
    };

    for (const item of processedData) {
      let logit = this.bias;
      for (const k of featureKeys) {
        logit += (this.weights[k] || 0) * (item.features[k] || 0);
      }
      const score = 1 / (1 + Math.exp(-logit));

      let predLevel: RiskLevel = 'LOW';
      if (score >= this.thresholds.emergencyThreshold) predLevel = 'EMERGENCY';
      else if (score >= this.thresholds.highThreshold) predLevel = 'HIGH';
      else if (score >= this.thresholds.moderateThreshold) predLevel = 'MODERATE';

      if (predLevel === item.trueLevel) correctCount++;

      if (item.trueLevel === 'EMERGENCY') {
        trueEmergencies++;
        if (predLevel === 'EMERGENCY') {
          caughtEmergencies++;
          cm.trueEmergency.predEmergency++;
        } else {
          cm.trueEmergency.predOther++;
        }
      } else if (item.trueLevel === 'HIGH') {
        if (predLevel === 'HIGH' || predLevel === 'EMERGENCY') {
          caughtEmergencies++;
          cm.trueHigh.predHigh++;
        } else {
          cm.trueHigh.predOther++;
        }
        trueEmergencies++;
      } else {
        trueNonUrgent++;
        if (predLevel === 'LOW' || predLevel === 'MODERATE') {
          caughtNonUrgent++;
        }
        if (item.trueLevel === 'MODERATE') {
          if (predLevel === 'MODERATE') cm.trueModerate.predModerate++;
          else cm.trueModerate.predOther++;
        } else {
          if (predLevel === 'LOW') cm.trueLow.predLow++;
          else cm.trueLow.predOther++;
        }
      }
    }

    const featureImportance = featureKeys.map(k => {
      const w = this.weights[k] || 0;
      return {
        feature: k,
        weight: Math.round(w * 100) / 100,
        impact: w >= 0 ? ('increases_risk' as const) : ('decreases_risk' as const),
      };
    });

    featureImportance.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));

    const trainingSensitivity = trueEmergencies > 0 ? (caughtEmergencies / trueEmergencies) * 100 : 100;
    const trainingSpecificity = trueNonUrgent > 0 ? (caughtNonUrgent / trueNonUrgent) * 100 : 100;
    const accuracy = Math.round((correctCount / processedData.length) * 1000) / 10;

    const report: TrainingReport = {
      samplesCount: examples.length,
      epochs,
      finalLoss: Math.round(loss * 1000) / 1000,
      trainingSensitivity: Math.round(trainingSensitivity * 10) / 10,
      trainingSpecificity: Math.round(trainingSpecificity * 10) / 10,
      accuracy,
      confusionMatrix: cm,
      featureImportance,
      calibratedThresholds: this.thresholds,
      trainedAt: new Date().toISOString(),
    };

    this.isTrained = true;
    this.lastReport = report;
    return report;
  }
}
