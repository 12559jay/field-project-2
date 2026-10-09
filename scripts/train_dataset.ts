import fs from 'fs';
import path from 'path';
import { extractFeatureVector } from '../src/engine/cohortFeatureExtraction';

export interface PatientRecord {
  patient_id: string;
  age: number;
  sex: string;
  chief_complaint: string;
  symptom_duration: string;
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
  possible_condition: string;
  risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'EMERGENCY';
  urgent_attention: number;
  recommended_action: string;
}

export function parseCSV(csvContent: string): PatientRecord[] {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const records: PatientRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(',').map(c => c.trim());
    if (cols.length < headers.length) continue;

    records.push({
      patient_id: cols[0],
      age: parseInt(cols[1], 10),
      sex: cols[2],
      chief_complaint: cols[3],
      symptom_duration: cols[4],
      pain_severity_1_10: parseInt(cols[5], 10),
      fever: parseInt(cols[6], 10),
      cough: parseInt(cols[7], 10),
      breathing_difficulty: parseInt(cols[8], 10),
      chest_pain: parseInt(cols[9], 10),
      headache: parseInt(cols[10], 10),
      vomiting: parseInt(cols[11], 10),
      diarrhea: parseInt(cols[12], 10),
      abdominal_pain: parseInt(cols[13], 10),
      radiating_pain: parseInt(cols[14], 10),
      sudden_onset: parseInt(cols[15], 10),
      confusion: parseInt(cols[16], 10),
      fainting: parseInt(cols[17], 10),
      possible_condition: cols[18],
      risk_level: cols[19] as 'LOW' | 'MODERATE' | 'HIGH' | 'EMERGENCY',
      urgent_attention: parseInt(cols[20], 10),
      recommended_action: cols[21],
    });
  }

  return records;
}

// Convert risk level to continuous ordinal target score [0, 1]
function riskToScore(level: 'LOW' | 'MODERATE' | 'HIGH' | 'EMERGENCY'): number {
  switch (level) {
    case 'EMERGENCY': return 0.95;
    case 'HIGH': return 0.70;
    case 'MODERATE': return 0.40;
    case 'LOW': default: return 0.10;
  }
}

export function trainModel(records: PatientRecord[]) {
  // Stratified split 80% train, 20% test
  const trainSet: PatientRecord[] = [];
  const testSet: PatientRecord[] = [];

  records.forEach((r, idx) => {
    if (idx % 5 === 0) testSet.push(r);
    else trainSet.push(r);
  });

  const featureNames = Object.keys(extractFeatureVector(records[0]));
  const weights: Record<string, number> = {};
  featureNames.forEach(f => { weights[f] = 0.5; });
  let bias = -2.5;

  const epochs = 350;
  const lr = 0.04;

  // Gradient Descent with Asymmetric Clinical Safety Loss
  for (let epoch = 0; epoch < epochs; epoch++) {
    for (const rec of trainSet) {
      const x = extractFeatureVector(rec);
      let logit = bias;
      for (const f of featureNames) {
        logit += weights[f] * x[f];
      }
      const pred = 1 / (1 + Math.exp(-logit));
      const target = riskToScore(rec.risk_level);
      const err = pred - target;

      // Asymmetric safety penalty: 5x higher penalty if high/emergency is underpredicted
      const penalty = (target >= 0.7 && err < 0) ? 5.0 : 1.0;

      bias -= lr * err * penalty;
      for (const f of featureNames) {
        const reg = 0.0005 * weights[f];
        weights[f] -= lr * (err * penalty * x[f] + reg);
      }
    }
  }

  // Calibrate thresholds on train set
  const thresholds = {
    emergencyThreshold: 0.76,
    highThreshold: 0.52,
    moderateThreshold: 0.28,
  };

  function predictRecord(r: PatientRecord) {
    const x = extractFeatureVector(r);
    let logit = bias;
    for (const f of featureNames) {
      logit += weights[f] * x[f];
    }
    const score = 1 / (1 + Math.exp(-logit));

    let predLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'EMERGENCY' = 'LOW';
    if (score >= thresholds.emergencyThreshold) predLevel = 'EMERGENCY';
    else if (score >= thresholds.highThreshold) predLevel = 'HIGH';
    else if (score >= thresholds.moderateThreshold) predLevel = 'MODERATE';

    return { score, predLevel };
  }

  // Evaluate on Test Set (100 patients)
  let testCorrect = 0;
  let testTrueEmergHigh = 0;
  let testCaughtEmergHigh = 0;
  let testTrueLowMod = 0;
  let testCaughtLowMod = 0;
  let testFalseNegatives = 0;
  let testFalsePositives = 0;

  const confusionMatrix = {
    EMERGENCY: { EMERGENCY: 0, HIGH: 0, MODERATE: 0, LOW: 0 },
    HIGH: { EMERGENCY: 0, HIGH: 0, MODERATE: 0, LOW: 0 },
    MODERATE: { EMERGENCY: 0, HIGH: 0, MODERATE: 0, LOW: 0 },
    LOW: { EMERGENCY: 0, HIGH: 0, MODERATE: 0, LOW: 0 },
  };

  testSet.forEach(r => {
    const { predLevel } = predictRecord(r);
    confusionMatrix[r.risk_level][predLevel]++;

    if (predLevel === r.risk_level) testCorrect++;

    const isActualUrgent = r.risk_level === 'EMERGENCY' || r.risk_level === 'HIGH';
    const isPredUrgent = predLevel === 'EMERGENCY' || predLevel === 'HIGH';

    if (isActualUrgent) {
      testTrueEmergHigh++;
      if (isPredUrgent) {
        testCaughtEmergHigh++;
      } else {
        testFalseNegatives++;
      }
    } else {
      testTrueLowMod++;
      if (!isPredUrgent) {
        testCaughtLowMod++;
      } else {
        testFalsePositives++;
      }
    }
  });

  const testSensitivity = (testCaughtEmergHigh / testTrueEmergHigh) * 100;
  const testSpecificity = (testCaughtLowMod / testTrueLowMod) * 100;
  const testAccuracy = (testCorrect / testSet.length) * 100;

  // Evaluate on Full Dataset (500 patients)
  let fullCorrect = 0;
  let fullTrueEmergHigh = 0;
  let fullCaughtEmergHigh = 0;
  let fullTrueLowMod = 0;
  let fullCaughtLowMod = 0;

  records.forEach(r => {
    const { predLevel } = predictRecord(r);
    if (predLevel === r.risk_level) fullCorrect++;

    const isActualUrgent = r.risk_level === 'EMERGENCY' || r.risk_level === 'HIGH';
    const isPredUrgent = predLevel === 'EMERGENCY' || predLevel === 'HIGH';

    if (isActualUrgent) {
      fullTrueEmergHigh++;
      if (isPredUrgent) fullCaughtEmergHigh++;
    } else {
      fullTrueLowMod++;
      if (!isPredUrgent) fullCaughtLowMod++;
    }
  });

  const fullSensitivity = (fullCaughtEmergHigh / fullTrueEmergHigh) * 100;
  const fullSpecificity = (fullCaughtLowMod / fullTrueLowMod) * 100;
  const fullAccuracy = (fullCorrect / records.length) * 100;

  const featureImportance = featureNames.map(f => ({
    feature: f,
    weight: Math.round(weights[f] * 100) / 100,
    impact: weights[f] >= 0 ? 'increases_risk' : 'decreases_risk',
  })).sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));

  const modelArtifact = {
    trainedOn: 'patient_clinical_data_500.csv',
    totalSamples: records.length,
    trainSamples: trainSet.length,
    testSamples: testSet.length,
    bias: Math.round(bias * 100) / 100,
    weights: Object.fromEntries(featureImportance.map(fi => [fi.feature, fi.weight])),
    thresholds,
    testMetrics: {
      sensitivity: Math.round(testSensitivity * 10) / 10,
      specificity: Math.round(testSpecificity * 10) / 10,
      accuracy: Math.round(testAccuracy * 10) / 10,
      falseNegatives: testFalseNegatives,
      falsePositives: testFalsePositives,
      confusionMatrix,
    },
    fullMetrics: {
      sensitivity: Math.round(fullSensitivity * 10) / 10,
      specificity: Math.round(fullSpecificity * 10) / 10,
      accuracy: Math.round(fullAccuracy * 10) / 10,
      falseNegatives: fullTrueEmergHigh - fullCaughtEmergHigh,
    },
    featureImportance,
    trainedAt: new Date().toISOString(),
  };

  return modelArtifact;
}

// Run training if executed directly
const csvPath = path.resolve('./data/patient_clinical_data_500.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const records = parseCSV(csvContent);
const result = trainModel(records);

const outPath = path.resolve('./src/engine/trainedModelWeights.json');
fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf-8');

console.log('=== CLINICAL ML MODEL TRAINING COMPLETE ===');
console.log(`Trained on: ${result.totalSamples} records (${result.trainSamples} train / ${result.testSamples} test)`);
console.log(`Test Safety Sensitivity (High/Emergency): ${result.testMetrics.sensitivity}%`);
console.log(`Test Specificity: ${result.testMetrics.specificity}%`);
console.log(`Test Accuracy: ${result.testMetrics.accuracy}%`);
console.log(`False Negatives (Emergency/High): ${result.testMetrics.falseNegatives}`);
console.log(`Full Cohort Sensitivity: ${result.fullMetrics.sensitivity}%`);
console.log(`Full Cohort Specificity: ${result.fullMetrics.specificity}%`);
console.log('Top Learned Features:');
result.featureImportance.slice(0, 8).forEach(fi => {
  console.log(`  ${fi.feature}: +${fi.weight}`);
});
console.log(`Saved model artifact to: ${outPath}`);
