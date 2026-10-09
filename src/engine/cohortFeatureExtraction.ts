export interface PatientFeatureInput {
  patient_id?: string;
  age?: number;
  sex?: string;
  pain_severity_1_10: number;
  fever: number;
  cough: number;
  breathing_difficulty: number;
  chest_pain: number;
  headache: number;
  vomiting: number;
  diarrhea: number;
  abdominal_pain: number;
  radiating_pain: number;
  sudden_onset: number;
  confusion: number;
  fainting: number;
  // New baseline clinical intake dimensions
  bmi?: number | null;
  bloodGroup?: string | null;
  knownHistory?: string[];
  allergies?: string[];
  currentMedications?: string[];
  lifestyle?: {
    smokingStatus?: 'never' | 'former' | 'current' | 'unknown' | null;
    alcohol?: 'none' | 'occasional' | 'regular' | 'heavy' | null;
    pregnant?: boolean | null;
    smoking?: string;
    pregnancy?: string;
  } | null;
}

export function extractFeatureVector(rec: PatientFeatureInput): Record<string, number> {
  const severityNorm = (rec.pain_severity_1_10 || 0) / 10;
  const age = rec.age ?? 45;
  const isGeriatric = age >= 60 ? 1 : 0;
  const isPediatric = age <= 12 ? 1 : 0;
  const isFemale = (rec.sex === 'F' || rec.sex === 'Female') ? 1 : 0;

  // Comorbidities analysis
  const history = rec.knownHistory || [];
  const meds = rec.currentMedications || [];
  const allergies = rec.allergies || [];

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

  const isObese = (rec.bmi && rec.bmi >= 30) ? 1 : 0;
  const isSmoker = (rec.lifestyle?.smokingStatus === 'current' || rec.lifestyle?.smoking === 'current' || rec.lifestyle?.smoking === 'heavy') ? 1 : 0;
  const isPregnant = (rec.lifestyle?.pregnant === true || rec.lifestyle?.pregnancy === 'pregnant') ? 1 : 0;
  const hasAllergies = allergies.length > 0 ? 1 : 0;

  return {
    pain_severity: severityNorm,
    fever: rec.fever ? 1 : 0,
    cough: rec.cough ? 1 : 0,
    breathing_difficulty: rec.breathing_difficulty ? 1 : 0,
    chest_pain: rec.chest_pain ? 1 : 0,
    headache: rec.headache ? 1 : 0,
    vomiting: rec.vomiting ? 1 : 0,
    diarrhea: rec.diarrhea ? 1 : 0,
    abdominal_pain: rec.abdominal_pain ? 1 : 0,
    radiating_pain: rec.radiating_pain ? 1 : 0,
    sudden_onset: rec.sudden_onset ? 1 : 0,
    confusion: rec.confusion ? 1 : 0,
    fainting: rec.fainting ? 1 : 0,

    // Clinical combination interactions
    cardiac_red_flag: (rec.chest_pain && (rec.radiating_pain || rec.confusion || rec.fainting)) ? 1 : 0,
    neuro_red_flag: (rec.headache && rec.sudden_onset && (rec.confusion || rec.fainting || rec.pain_severity_1_10 >= 8)) ? 1 : 0,
    respiratory_red_flag: (rec.breathing_difficulty && (rec.chest_pain || rec.pain_severity_1_10 >= 8)) ? 1 : 0,
    surgical_abdomen_red_flag: (rec.abdominal_pain && rec.pain_severity_1_10 >= 8) ? 1 : 0,
    altered_mental_state: (rec.confusion || rec.fainting) ? 1 : 0,

    // New demographic & intake baseline clinical dimensions
    age_geriatric: isGeriatric,
    age_pediatric: isPediatric,
    sex_female_modifier: isFemale,
    cardio_comorbidity: hasCardioHistory,
    diabetes_comorbidity: hasDiabetes,
    respiratory_comorbidity: hasAsthmaCopd,
    high_bmi_obesity: isObese,
    anticoagulant_risk: hasAnticoagulants,
    pregnancy_risk: isPregnant,
    smoker_risk: isSmoker,
    allergy_alert: hasAllergies,

    // Synergistic cross-dimensional risk interactions
    cardiac_comorbidity_synergy: (rec.chest_pain && (isGeriatric || hasCardioHistory || hasDiabetes || isSmoker)) ? 1 : 0,
    anticoagulant_neuro_synergy: ((rec.headache || rec.confusion || rec.fainting) && hasAnticoagulants) ? 1 : 0,
    respiratory_comorbidity_synergy: (rec.breathing_difficulty && hasAsthmaCopd) ? 1 : 0,
    pregnancy_obstetric_synergy: ((rec.abdominal_pain || rec.headache) && isPregnant) ? 1 : 0,
  };
}
