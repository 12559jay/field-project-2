import { PatientState, PossibleCondition, ConfidenceLevel } from '../types/clinical';
import { CLINICAL_KNOWLEDGE_BASE } from '../knowledge/clinicalKnowledgeBase';

export class PossibleConditionEngine {
  /**
   * Identifies possible conditions or clinical categories consistent with reported symptoms.
   * STRICT CONSTRAINT: Never presents results as definitive diagnoses.
   * Decision support only.
   */
  public findPossibleConditions(patientState: PatientState): PossibleCondition[] {
    const conditions: PossibleCondition[] = [];
    const lowerSymptoms = patientState.symptoms.map(s => s.toLowerCase());

    // 1. Cardiac / Thoracic evaluation
    const hasChest = patientState.chiefComplaint === 'chest_pain' ||
      lowerSymptoms.some(s => s.includes('chest') || s.includes('heart') || s.includes('angina'));
    if (hasChest) {
      const reasons: string[] = [];
      if (lowerSymptoms.some(s => s.includes('chest'))) reasons.push('Reported chest discomfort or pressure');
      if (patientState.radiation.length > 0) reasons.push(`Discomfort spreading to ${patientState.radiation.join(', ')}`);
      if (patientState.breathingDifficulty) reasons.push('Difficulty breathing reported');
      if (patientState.sweating) reasons.push('Cold sweat or diaphoresis');
      if (patientState.nausea) reasons.push('Nausea or gastric distress');

      let conf: ConfidenceLevel = 'moderate';
      if (patientState.radiation.length > 0 && (patientState.sweating || patientState.breathingDifficulty)) {
        conf = 'high';
      } else if (reasons.length <= 1) {
        conf = 'low';
      }

      conditions.push({
        name: 'Acute cardiac-related condition',
        clinical_category: 'Cardiovascular',
        confidence: conf,
        reason: reasons.length > 0 ? reasons : ['Reported chest discomfort requiring clinical exclusion of ischemic etiology'],
        caveat: 'These symptoms can occur with serious heart-related conditions and require urgent medical evaluation. This is decision support, not a medical diagnosis.',
      });

      if (patientState.breathingDifficulty) {
        conditions.push({
          name: 'Pleuro-pulmonary / Thromboembolic condition',
          clinical_category: 'Respiratory / Vascular',
          confidence: 'moderate',
          reason: ['Chest pain accompanied by shortness of breath'],
          caveat: 'Requires clinical evaluation, chest auscultation, and imaging if clinically indicated.',
        });
      }

      if (patientState.character?.includes('burn') || lowerSymptoms.some(s => s.includes('heartburn') || s.includes('acid'))) {
        conditions.push({
          name: 'Gastroesophageal reflux / Esophageal irritation',
          clinical_category: 'Gastrointestinal',
          confidence: 'moderate',
          reason: ['Burning substernal sensation', 'Relation to oral intake'],
          caveat: 'Cardiac etiologies must always be clinically excluded first before attributing chest symptoms to gastrointestinal causes.',
        });
      }
    }

    // 2. Headache / Neurological evaluation
    const hasHeadache = patientState.chiefComplaint === 'headache' ||
      lowerSymptoms.some(s => s.includes('headache') || s.includes('head pain') || s.includes('migraine'));
    if (hasHeadache) {
      if (patientState.suddenOnset && (patientState.severityLevel === 'severe' || patientState.severityLevel === 'extreme' || (patientState.severity !== null && patientState.severity >= 8))) {
        conditions.push({
          name: 'Acute intracranial vascular concern',
          clinical_category: 'Neurological Emergency',
          confidence: 'high',
          reason: [
            'Explosive, sudden onset reaching peak intensity in minutes',
            'Severe intensity rating ("worst headache")',
          ],
          caveat: 'Urgent emergency evaluation and imaging (e.g. non-contrast CT) indicated to evaluate for intracranial hemorrhage.',
        });
      }

      if (patientState.character?.includes('throb') || lowerSymptoms.some(s => s.includes('throb') || s.includes('light') || s.includes('nausea'))) {
        conditions.push({
          name: 'Migraine',
          clinical_category: 'Primary Headache Disorder',
          confidence: 'moderate',
          reason: [
            'Throbbing or pulsating character',
            'Sensory sensitivity or associated nausea',
          ],
          caveat: 'Symptoms may be consistent with several conditions. A clinician needs to evaluate you to determine the cause.',
        });
      }

      if (patientState.character?.includes('tight') || patientState.character?.includes('pressure') || (!patientState.suddenOnset && patientState.severityLevel !== 'extreme')) {
        conditions.push({
          name: 'Tension-type headache',
          clinical_category: 'Primary Headache Disorder',
          confidence: 'moderate',
          reason: [
            'Dull, band-like or pressure quality',
            'Absence of acute neurological red flags',
          ],
          caveat: 'Routine clinical consultation recommended if symptoms persist or do not respond to baseline measures.',
        });
      }

      // Check anticoagulant therapy in headache
      const meds = patientState.currentMedications || [];
      const anticoagMeds = meds.filter(m => /warfarin|coumadin|eliquis|xarelto|blood thinner|plavix|aspirin/i.test(m));
      if (anticoagMeds.length > 0) {
        conditions.unshift({
          name: 'Intracranial hemorrhage / Subdural hematoma',
          clinical_category: 'Neurological Emergency',
          confidence: 'high',
          reason: [
            `Patient actively taking anticoagulant therapy (${anticoagMeds.join(', ')})`,
            'Acute headache poses high risk of intracranial bleeding',
          ],
          caveat: 'Immediate non-contrast emergency head CT scan is mandatory for anticoagulated patients with acute headache.',
        });
      }

      // Check pregnancy in headache
      if (patientState.lifestyle?.pregnant === true) {
        conditions.unshift({
          name: 'Severe Preeclampsia with neurological features',
          clinical_category: 'Obstetric Emergency',
          confidence: 'high',
          reason: [
            'Acute severe headache in pregnant patient',
            'Possible elevated blood pressure / cerebral vasoconstriction',
          ],
          caveat: 'Immediate blood pressure evaluation, protein urinalysis, and obstetric emergency care required.',
        });
      }
    }

    // 3. Neurological focal signs
    if (patientState.fastSigns?.facialDroop || patientState.fastSigns?.armWeakness || patientState.fastSigns?.speechDifficulty || patientState.neurologicalDeficit) {
      const fastReasons: string[] = [];
      if (patientState.fastSigns?.facialDroop) fastReasons.push('Facial asymmetry or droop');
      if (patientState.fastSigns?.armWeakness) fastReasons.push('Unilateral limb weakness or drift');
      if (patientState.fastSigns?.speechDifficulty) fastReasons.push('Speech slurring or difficulty articulating');
      if (patientState.neurologicalDeficit) fastReasons.push('Focal neurological deficit reported');

      conditions.push({
        name: 'Acute cerebrovascular event (Stroke / TIA)',
        clinical_category: 'Neurological Emergency',
        confidence: 'high',
        reason: fastReasons,
        caveat: 'Time-critical emergency condition. Immediate emergency hospital transfer required for neurovascular evaluation.',
      });
    }

    // 4. Abdominal evaluation
    const hasAbdominal = patientState.chiefComplaint === 'abdominal_pain' ||
      lowerSymptoms.some(s => s.includes('abdo') || s.includes('stomach') || s.includes('belly'));
    if (hasAbdominal) {
      if (patientState.location?.includes('right lower') || lowerSymptoms.some(s => s.includes('right lower') || s.includes('rlq'))) {
        conditions.push({
          name: 'Acute appendicitis',
          clinical_category: 'Surgical / Gastrointestinal',
          confidence: 'high',
          reason: [
            'Right lower quadrant localized pain',
            'Possible inflammatory signs',
          ],
          caveat: 'Clinical examination, laboratory inflammatory markers, and ultrasound/CT are required.',
        });
      }

      if (patientState.location?.includes('right upper') || lowerSymptoms.some(s => s.includes('right upper') || s.includes('ruq'))) {
        conditions.push({
          name: 'Acute cholecystitis / Biliary colic',
          clinical_category: 'Hepatobiliary',
          confidence: 'moderate',
          reason: [
            'Right upper quadrant pain',
            'Possible post-prandial trigger',
          ],
          caveat: 'Ultrasound and clinician examination needed to assess gallbladder and biliary tree.',
        });
      }

      conditions.push({
        name: 'Acute gastroenteritis / Functional gastrointestinal distress',
        clinical_category: 'Gastrointestinal',
        confidence: 'moderate',
        reason: ['Abdominal discomfort or cramping reported'],
        caveat: 'Clinician assessment is needed if pain worsens, becomes focal, or red flags appear.',
      });
    }

    // 5. Breathing evaluation
    const hasBreathing = patientState.chiefComplaint === 'breathing_problem' ||
      lowerSymptoms.some(s => s.includes('breath') || s.includes('wheez') || s.includes('dyspnea'));
    if (hasBreathing) {
      if (patientState.criticalSigns.cyanosisOrStridor || lowerSymptoms.some(s => s.includes('cannot speak') || s.includes('stridor'))) {
        conditions.push({
          name: 'Acute severe respiratory compromise',
          clinical_category: 'Pulmonary Emergency',
          confidence: 'high',
          reason: ['Marked limitation in speech or upper airway sounds', 'High acute respiratory distress'],
          caveat: 'Immediate emergency medical care required.',
        });
      } else {
        conditions.push({
          name: 'Broncho-obstructive condition (Asthma / COPD exacerbation)',
          clinical_category: 'Pulmonary',
          confidence: 'moderate',
          reason: ['Shortness of breath and wheezing or chest tightness'],
          caveat: 'Requires medical review to assess air entry, peak flow, and oxygen saturation.',
        });
      }
    }

    // Fallback if none matched
    if (conditions.length === 0) {
      conditions.push({
        name: 'Undifferentiated symptom presentation',
        clinical_category: 'General Clinical Evaluation',
        confidence: 'low',
        reason: patientState.symptoms.length > 0 ? patientState.symptoms : ['Non-specific symptoms reported'],
        caveat: 'Your symptoms may be consistent with several conditions. A clinician needs to evaluate you to determine the cause.',
      });
    }

    return conditions;
  }
}
