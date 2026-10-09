import { PatientState } from '../types/clinical';

export function isNegativeResponse(text: string): boolean {
  const cleaned = text
    .toLowerCase()
    .replace(/[()[\]{}.,!?;:'"/\\]/g, ' ')
    .trim();

  // Direct standalone negative words or short phrases
  const directPatterns = [
    /^no$/i,
    /^nope$/i,
    /^nah$/i,
    /^none$/i,
    /^neither$/i,
    /^not really$/i,
    /^not at all$/i,
    /^no i do not$/i,
    /^no i dont$/i,
    /^no it does not$/i,
    /^no it doesnt$/i,
    /^negative$/i,
    /^i do not$/i,
    /^i dont$/i,
    /^nothing$/i,
    /^nothing like that$/i,
    /^no symptoms like that$/i,
    /^no none$/i,
    /^no pain spreading$/i,
    /^no shortness of breath$/i,
    /^no breathing problem$/i,
    /^no sweating$/i,
    /^no nausea$/i,
    /^no fever$/i,
    /^no stiff neck$/i,
    /^no weakness$/i,
    /^not feeling sick$/i,
  ];

  if (directPatterns.some((p) => p.test(cleaned))) {
    return true;
  }

  // Short reply starting with 'no ' or 'nope '
  if (/^no\b/i.test(cleaned) && cleaned.split(/\s+/).length <= 4) {
    return true;
  }

  return false;
}

export function isAffirmativeResponse(text: string): boolean {
  const cleaned = text
    .toLowerCase()
    .replace(/[()[\]{}.,!?;:'"/\\]/g, ' ')
    .trim();

  const directPatterns = [
    /^yes$/i,
    /^yeah$/i,
    /^yep$/i,
    /^yup$/i,
    /^i do$/i,
    /^it does$/i,
    /^definitely$/i,
    /^affirmative$/i,
    /^correct$/i,
    /^sure$/i,
    /^yes i do$/i,
    /^yes it does$/i,
    /^yes i have$/i,
    /^yes severe$/i,
    /^i am$/i,
  ];

  if (directPatterns.some((p) => p.test(cleaned))) {
    return true;
  }

  if (/^yes\b/i.test(cleaned) && cleaned.split(/\s+/).length <= 4) {
    return true;
  }

  return false;
}

function hasNegatedPhrase(text: string, phrase: string): boolean {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(phrase.toLowerCase());
  if (idx === -1) return false;

  // Inspect words within 25 characters preceding the phrase
  const prefix = lower.slice(Math.max(0, idx - 25), idx);
  const negPrefix = /\b(no|not|without|denies|denied|never|hardly|free of)\s*$/i;
  if (negPrefix.test(prefix.trim())) {
    return true;
  }

  // Inspect words right after phrase
  const suffix = lower.slice(idx + phrase.length, Math.min(lower.length, idx + phrase.length + 25));
  if (/\s*(is normal|is fine|absent|negative)/i.test(suffix)) {
    return true;
  }

  return false;
}

export class InformationExtractor {
  /**
   * Deterministic pattern extractor to reliably update PatientState from conversational text.
   * Handles affirmative symptoms, explicit negations, direct replies (such as 'no' or '(no)')
   * to targeted clinical questions, and avoids repetitive questionnaire stalls.
   */
  public extract(
    text: string,
    currentState: PatientState,
    targetField?: string | null
  ): Partial<PatientState> {
    const lower = text.toLowerCase();
    const update: Partial<PatientState> = {};
    let newSymptoms = [...currentState.symptoms];
    const pertinentNegatives = new Set<string>(currentState.pertinentNegatives || []);
    const assessedFields = new Set<string>(currentState.assessedFields || []);

    const activeField = targetField || currentState.lastAskedField || null;

    // 0. Extract basic patient demographics if provided in conversation
    const nameMatch = text.match(/(?:my name is|i am called|name is|i'm|name[:\s]+)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
    if (nameMatch && nameMatch[1]) {
      const candidate = nameMatch[1].trim();
      const forbidden = ['having', 'experiencing', 'feeling', 'in', 'not', 'sick', 'suffering', 'sorry', 'okay', 'fine', 'ready'];
      if (!forbidden.includes(candidate.toLowerCase()) && candidate.length > 1) {
        update.patientName = candidate;
      }
    }

    const ageMatch = text.match(/(?:age[:\s]+|i am\s+|i'm\s+)?\b(\d{1,3})\s*(?:years old|yrs old|yo|years of age|year old)\b/i) ||
                     text.match(/\bage[:\s]+(\d{1,3})\b/i);
    if (ageMatch) {
      const num = parseInt(ageMatch[1], 10);
      if (num > 0 && num <= 125) {
        update.age = num;
      }
    }

    if (/\b(?:female|woman|girl)\b/i.test(text)) {
      update.gender = 'Female';
    } else if (/\b(?:male|man|boy)\b/i.test(text)) {
      update.gender = 'Male';
    } else if (/\b(?:non-binary|other)\b/i.test(text)) {
      update.gender = 'Other';
    }

    const phoneMatch = text.match(/(?:phone|contact|cell|mobile|tel|number)?[:\s]*(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/i) ||
                       text.match(/(?:phone|contact|mobile|number)[:\s]+([\d\s+-]{7,15})/i);
    if (phoneMatch && phoneMatch[0]) {
      const cleaned = phoneMatch[0].trim();
      if (cleaned.replace(/\D/g, '').length >= 7) {
        update.contactNumber = cleaned;
      }
    }

    const effectiveName = update.patientName || currentState.patientName;
    const effectiveAge = update.age || currentState.age;
    const effectiveGender = update.gender || currentState.gender;
    const effectiveContact = update.contactNumber || currentState.contactNumber;
    if (effectiveName && effectiveAge && effectiveGender && effectiveContact) {
      update.generalInfoCompleted = true;
    }

    // Email extraction
    const emailMatch = text.match(/\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/);
    if (emailMatch && emailMatch[1]) {
      update.email = emailMatch[1];
    }

    // Blood group extraction (e.g., "O+", "A positive", "B-", "AB+", "O negative", "blood group O+")
    const bloodMatch = text.match(/(?:blood\s*(?:type|group)\s*[:\s]*)([ABO]{1,2}(?:\+|\-|positive|negative)?)/i) ||
                       text.match(/\b([ABO]{1,2}(?:\+|\-|positive|negative))/i);
    if (bloodMatch) {
      let bg = (bloodMatch[1] || '').toUpperCase().replace(/\s+/g, '');
      bg = bg.replace('POSITIVE', '+').replace('NEGATIVE', '-');
      if (['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(bg)) {
        update.bloodGroup = bg;
      }
    }

    // Height & Weight extraction
    const heightMatch = text.match(/(?:height[:\s]+)?\b(\d{2,3})\s*(?:cm|centimeters)\b/i);
    if (heightMatch) {
      const h = parseInt(heightMatch[1], 10);
      if (h >= 50 && h <= 250) update.heightCm = h;
    }
    const weightMatch = text.match(/(?:weight[:\s]+)?\b(\d{2,3})\s*(?:kg|kilos|kilograms)\b/i);
    if (weightMatch) {
      const w = parseInt(weightMatch[1], 10);
      if (w >= 20 && w <= 300) update.weightKg = w;
    }
    const effectiveH = update.heightCm || currentState.heightCm;
    const effectiveW = update.weightKg || currentState.weightKg;
    if (effectiveH && effectiveW) {
      const heightM = effectiveH / 100;
      update.bmi = parseFloat((effectiveW / (heightM * heightM)).toFixed(1));
    }

    // Known Allergies extraction
    if (/\b(?:no allergies|nkda|no known drug allergies|denies allergies)\b/i.test(text)) {
      update.allergies = ['No known allergies (NKDA)'];
    } else {
      const allergyMatch = text.match(/(?:allergic to|allergies[:\s]+)([a-zA-Z\s]+?)(?:,\s*(?:taking|meds|phone|blood|history)|;|\.|$)/i);
      if (allergyMatch && allergyMatch[1]) {
        const found = allergyMatch[1]
          .split(/[,&]/)
          .map((a) => a.trim())
          .filter((a) => a.length > 2 && !['no', 'none', 'taking', 'meds'].includes(a.toLowerCase()));
        if (found.length > 0) {
          const currentAllergies = currentState.allergies || [];
          update.allergies = Array.from(new Set([...currentAllergies, ...found]));
        }
      }
    }

    // Current Medications extraction
    if (/\b(?:no medications|not taking any meds|no current meds|no meds)\b/i.test(text)) {
      update.currentMedications = ['None'];
    } else {
      const medMatch = text.match(/(?:medications?|meds?|taking)[:\s]+([a-zA-Z0-9\s,]+)(?:\.|$|;)/i);
      if (medMatch && medMatch[1]) {
        const found = medMatch[1]
          .split(/[,&]/)
          .map((m) => m.trim())
          .filter((m) => m.length > 2 && !['no', 'none'].includes(m.toLowerCase()));
        if (found.length > 0) {
          const currentMeds = currentState.currentMedications || [];
          update.currentMedications = Array.from(new Set([...currentMeds, ...found]));
        }
      }
    }

    // Pre-existing conditions / Known history
    const existingHistory = new Set(currentState.knownHistory || []);
    if (/\b(?:hypertension|high blood pressure|htn)\b/i.test(text)) existingHistory.add('Hypertension');
    if (/\b(?:diabetes|type 2 diabetes|diabetic)\b/i.test(text)) existingHistory.add('Type 2 Diabetes');
    if (/\b(?:asthma|copd|emphysema)\b/i.test(text)) existingHistory.add('Asthma / Respiratory');
    if (/\b(?:heart disease|coronary|heart attack prior|stent)\b/i.test(text)) existingHistory.add('Coronary Artery Disease');
    if (/\b(?:high cholesterol|hyperlipidemia)\b/i.test(text)) existingHistory.add('Hyperlipidemia');
    if (existingHistory.size > (currentState.knownHistory || []).length) {
      update.knownHistory = Array.from(existingHistory);
    }

    // A. Handle direct "(no)", "no", "nope" negative replies to the active question
    if (isNegativeResponse(text) && activeField) {
      assessedFields.add(activeField);

      switch (activeField) {
        case 'breathing_difficulty':
          update.breathingDifficulty = false;
          newSymptoms = newSymptoms.filter((s) => !s.toLowerCase().includes('breath'));
          pertinentNegatives.add('Denied shortness of breath / breathing difficulty');
          break;

        case 'sweating_and_nausea':
          update.sweating = false;
          update.nausea = false;
          newSymptoms = newSymptoms.filter(
            (s) =>
              !s.toLowerCase().includes('sweat') &&
              !s.toLowerCase().includes('nausea') &&
              !s.toLowerCase().includes('vomit')
          );
          pertinentNegatives.add('Denied cold sweats / diaphoresis');
          pertinentNegatives.add('Denied nausea or vomiting');
          break;

        case 'radiation':
          update.radiation = ['none'];
          newSymptoms = newSymptoms.filter(
            (s) =>
              !s.toLowerCase().includes('radiat') &&
              !s.toLowerCase().includes('arm') &&
              !s.toLowerCase().includes('jaw')
          );
          pertinentNegatives.add('No radiation of discomfort (pain is localized)');
          break;

        case 'onset':
          update.suddenOnset = false;
          if (!currentState.onset) {
            update.onset = 'Gradual onset (not sudden)';
          }
          pertinentNegatives.add('Gradual onset (not sudden or instantaneous)');
          break;

        case 'neck_stiffness':
          update.stiffNeck = false;
          newSymptoms = newSymptoms.filter((s) => !s.toLowerCase().includes('stiff neck'));
          pertinentNegatives.add('Denied neck stiffness / rigidity');
          break;

        case 'fever':
        case 'fever_and_vomiting':
          update.fever = false;
          update.nausea = false;
          newSymptoms = newSymptoms.filter(
            (s) =>
              !s.toLowerCase().includes('fever') &&
              !s.toLowerCase().includes('vomit') &&
              !s.toLowerCase().includes('chill')
          );
          pertinentNegatives.add('Denied high fever, chills, or vomiting');
          break;

        case 'character':
          update.character = 'unspecified discomfort';
          pertinentNegatives.add('Denied crushing or tearing sensation');
          break;

        case 'severity':
        case 'severity_and_rigidity':
          if (currentState.severity === null) {
            update.severity = 3;
            update.severityLevel = 'mild';
          }
          update.criticalSigns = {
            ...currentState.criticalSigns,
            rigidAbdomen: false,
          };
          pertinentNegatives.add('Denied severe 10/10 intensity or rigid abdomen');
          break;

        case 'neurological_deficit':
        case 'fast_symptoms':
          update.neurologicalDeficit = false;
          update.fastSigns = {
            facialDroop: false,
            armWeakness: false,
            speechDifficulty: false,
          };
          newSymptoms = newSymptoms.filter(
            (s) =>
              !s.toLowerCase().includes('droop') &&
              !s.toLowerCase().includes('weakness') &&
              !s.toLowerCase().includes('slur')
          );
          pertinentNegatives.add('Denied facial droop, arm weakness, or speech trouble (FAST negative)');
          break;

        case 'location':
          update.location = 'diffuse / generalized';
          break;

        case 'speech_ability':
        case 'blueness_and_stridor':
          update.criticalSigns = {
            ...currentState.criticalSigns,
            cyanosisOrStridor: false,
          };
          pertinentNegatives.add('Normal speech, denied bluish lips or stridor');
          break;

        case 'rash_and_sensorium':
          update.criticalSigns = {
            ...currentState.criticalSigns,
            petechialRash: false,
            unresponsiveOrConfusion: false,
          };
          pertinentNegatives.add('Denied non-blanching purple rash');
          break;

        default:
          break;
      }

      update.symptoms = Array.from(new Set(newSymptoms));
      update.pertinentNegatives = Array.from(pertinentNegatives);
      update.assessedFields = Array.from(assessedFields);
      return update;
    }

    // B. Handle direct "(yes)", "yes", "yeah" affirmative replies to active question
    if (isAffirmativeResponse(text) && activeField) {
      assessedFields.add(activeField);

      switch (activeField) {
        case 'breathing_difficulty':
          update.breathingDifficulty = true;
          if (!newSymptoms.includes('shortness of breath')) newSymptoms.push('shortness of breath');
          break;

        case 'sweating_and_nausea':
          update.sweating = true;
          update.nausea = true;
          if (!newSymptoms.includes('sweating')) newSymptoms.push('sweating');
          if (!newSymptoms.includes('nausea / vomiting')) newSymptoms.push('nausea / vomiting');
          break;

        case 'radiation':
          update.radiation = ['left_arm'];
          if (!newSymptoms.includes('pain radiating to arm')) newSymptoms.push('pain radiating to arm');
          break;

        case 'onset':
          update.suddenOnset = true;
          update.onset = 'Sudden onset within minutes';
          break;

        case 'neck_stiffness':
          update.stiffNeck = true;
          if (!newSymptoms.includes('stiff neck')) newSymptoms.push('stiff neck');
          break;

        case 'fever':
        case 'fever_and_vomiting':
          update.fever = true;
          if (!newSymptoms.includes('fever')) newSymptoms.push('fever');
          break;

        case 'neurological_deficit':
        case 'fast_symptoms':
          update.neurologicalDeficit = true;
          update.fastSigns = {
            ...currentState.fastSigns,
            armWeakness: true,
          };
          if (!newSymptoms.includes('neurological deficit')) newSymptoms.push('neurological deficit');
          break;

        case 'blueness_and_stridor':
          update.criticalSigns = {
            ...currentState.criticalSigns,
            cyanosisOrStridor: true,
          };
          break;

        case 'rash_and_sensorium':
          update.criticalSigns = {
            ...currentState.criticalSigns,
            petechialRash: true,
          };
          break;

        default:
          break;
      }

      update.symptoms = Array.from(new Set(newSymptoms));
      update.pertinentNegatives = Array.from(pertinentNegatives);
      update.assessedFields = Array.from(assessedFields);
      return update;
    }

    // If an active question was asked and patient sent any reply, mark it as assessed
    if (activeField) {
      assessedFields.add(activeField);
    }

    // C. Natural language symptom extraction with negation safety

    // 1. Complaint & Symptoms Detection
    if (
      lower.includes('chest pain') ||
      lower.includes('chest pressure') ||
      lower.includes('chest discomfort') ||
      lower.includes('tightness in chest')
    ) {
      if (hasNegatedPhrase(lower, 'chest pain') || hasNegatedPhrase(lower, 'chest discomfort')) {
        newSymptoms = newSymptoms.filter((s) => !s.toLowerCase().includes('chest'));
        pertinentNegatives.add('Denied chest pain');
      } else {
        if (!newSymptoms.includes('chest discomfort')) newSymptoms.push('chest discomfort');
        if (!currentState.chiefComplaint) update.chiefComplaint = 'chest_pain';
      }
    }

    if (
      lower.includes('headache') ||
      lower.includes('head hurts') ||
      lower.includes('migraine')
    ) {
      if (hasNegatedPhrase(lower, 'headache') || hasNegatedPhrase(lower, 'head hurts')) {
        newSymptoms = newSymptoms.filter((s) => !s.toLowerCase().includes('headache'));
        pertinentNegatives.add('Denied headache');
      } else {
        if (!newSymptoms.includes('headache')) newSymptoms.push('headache');
        if (!currentState.chiefComplaint) update.chiefComplaint = 'headache';
      }
    }

    if (
      lower.includes('stomach pain') ||
      lower.includes('belly pain') ||
      lower.includes('abdominal pain')
    ) {
      if (hasNegatedPhrase(lower, 'stomach pain') || hasNegatedPhrase(lower, 'abdominal pain')) {
        newSymptoms = newSymptoms.filter((s) => !s.toLowerCase().includes('abdominal'));
        pertinentNegatives.add('Denied abdominal pain');
      } else {
        if (!newSymptoms.includes('abdominal pain')) newSymptoms.push('abdominal pain');
        if (!currentState.chiefComplaint) update.chiefComplaint = 'abdominal_pain';
      }
    }

    // Breathing difficulty & Dyspnea
    if (
      lower.includes('short of breath') ||
      lower.includes('shortness of breath') ||
      lower.includes('difficulty breathing') ||
      lower.includes('cannot breathe') ||
      lower.includes('hard to breathe') ||
      lower.includes('trouble breathing')
    ) {
      if (
        hasNegatedPhrase(lower, 'short of breath') ||
        hasNegatedPhrase(lower, 'shortness of breath') ||
        hasNegatedPhrase(lower, 'difficulty breathing') ||
        hasNegatedPhrase(lower, 'trouble breathing') ||
        lower.includes('no shortness of breath') ||
        lower.includes('no trouble breathing')
      ) {
        update.breathingDifficulty = false;
        newSymptoms = newSymptoms.filter((s) => !s.toLowerCase().includes('breath'));
        pertinentNegatives.add('Denied shortness of breath');
        assessedFields.add('breathing_difficulty');
      } else {
        if (!newSymptoms.includes('shortness of breath')) newSymptoms.push('shortness of breath');
        update.breathingDifficulty = true;
        assessedFields.add('breathing_difficulty');
      }
    }

    // Sweating / Diaphoresis
    if (
      lower.includes('sweat') ||
      lower.includes('sweating') ||
      lower.includes('cold sweat') ||
      lower.includes('diaphoretic') ||
      lower.includes('clammy')
    ) {
      if (
        hasNegatedPhrase(lower, 'sweat') ||
        hasNegatedPhrase(lower, 'sweating') ||
        hasNegatedPhrase(lower, 'cold sweat') ||
        lower.includes('no sweating') ||
        lower.includes('not sweating')
      ) {
        update.sweating = false;
        newSymptoms = newSymptoms.filter((s) => !s.toLowerCase().includes('sweat'));
        pertinentNegatives.add('Denied sweating / cold sweats');
        assessedFields.add('sweating_and_nausea');
      } else {
        if (!newSymptoms.includes('sweating')) newSymptoms.push('sweating');
        update.sweating = true;
        assessedFields.add('sweating_and_nausea');
      }
    }

    // Nausea & Vomiting
    if (
      lower.includes('nausea') ||
      lower.includes('feel sick') ||
      lower.includes('vomit') ||
      lower.includes('throwing up')
    ) {
      if (
        hasNegatedPhrase(lower, 'nausea') ||
        hasNegatedPhrase(lower, 'vomit') ||
        lower.includes('no nausea') ||
        lower.includes('not nauseous') ||
        lower.includes('no vomiting')
      ) {
        update.nausea = false;
        newSymptoms = newSymptoms.filter(
          (s) => !s.toLowerCase().includes('nausea') && !s.toLowerCase().includes('vomit')
        );
        pertinentNegatives.add('Denied nausea and vomiting');
      } else {
        if (!newSymptoms.includes('nausea / vomiting')) newSymptoms.push('nausea / vomiting');
        update.nausea = true;
      }
    }

    // Fever & Chills
    if (
      lower.includes('fever') ||
      lower.includes('chills') ||
      lower.includes('high temperature') ||
      lower.includes('feverish')
    ) {
      if (
        hasNegatedPhrase(lower, 'fever') ||
        hasNegatedPhrase(lower, 'chills') ||
        lower.includes('no fever') ||
        lower.includes('not feverish')
      ) {
        update.fever = false;
        newSymptoms = newSymptoms.filter((s) => !s.toLowerCase().includes('fever'));
        pertinentNegatives.add('Denied fever');
        assessedFields.add('fever');
      } else {
        if (!newSymptoms.includes('fever')) newSymptoms.push('fever');
        update.fever = true;
        assessedFields.add('fever');
      }
    }

    // Stiff Neck
    if (
      lower.includes('stiff neck') ||
      lower.includes('neck is stiff') ||
      lower.includes('cannot bend my neck')
    ) {
      if (
        hasNegatedPhrase(lower, 'stiff neck') ||
        lower.includes('no stiff neck') ||
        lower.includes('neck is not stiff')
      ) {
        update.stiffNeck = false;
        newSymptoms = newSymptoms.filter((s) => !s.toLowerCase().includes('stiff neck'));
        pertinentNegatives.add('Denied stiff neck');
        assessedFields.add('neck_stiffness');
      } else {
        if (!newSymptoms.includes('stiff neck')) newSymptoms.push('stiff neck');
        update.stiffNeck = true;
        assessedFields.add('neck_stiffness');
      }
    }

    // 2. Onset & Suddenness
    if (
      lower.includes('sudden') ||
      lower.includes('out of nowhere') ||
      lower.includes('thunderclap') ||
      lower.includes('all of a sudden') ||
      lower.includes('within minutes')
    ) {
      if (
        hasNegatedPhrase(lower, 'sudden') ||
        lower.includes('not sudden') ||
        lower.includes('wasnt sudden') ||
        lower.includes("wasn't sudden")
      ) {
        update.suddenOnset = false;
        update.onset = 'Gradual onset (not sudden)';
        pertinentNegatives.add('Denied sudden onset');
        assessedFields.add('onset');
      } else {
        update.suddenOnset = true;
        assessedFields.add('onset');
        if (lower.includes('20 minute') || lower.includes('20 min')) {
          update.onset = 'Suddenly, approx 20 minutes ago';
        } else if (lower.includes('an hour') || lower.includes('1 hour')) {
          update.onset = 'Suddenly, approx 1 hour ago';
        } else {
          update.onset = 'Sudden onset within minutes';
        }
      }
    } else if (
      lower.includes('gradual') ||
      lower.includes('few days') ||
      lower.includes('past week') ||
      lower.includes('couple of days') ||
      lower.includes('slowly')
    ) {
      update.suddenOnset = false;
      update.onset = 'Gradual onset over days';
      assessedFields.add('onset');
    }

    // 3. Severity & Scale
    const numMatch = lower.match(/\b([1-9]|10)\s*(\/|\s*out of\s*)?\s*10\b/);
    if (numMatch) {
      const score = parseInt(numMatch[1], 10);
      update.severity = score;
      assessedFields.add('severity');
      if (score >= 9) update.severityLevel = 'extreme';
      else if (score >= 7) update.severityLevel = 'severe';
      else if (score >= 4) update.severityLevel = 'moderate';
      else update.severityLevel = 'mild';
    } else if (
      lower.includes('worst headache') ||
      lower.includes('extreme') ||
      lower.includes('unbearable') ||
      lower.includes('excruciating')
    ) {
      update.severity = 10;
      update.severityLevel = 'extreme';
      assessedFields.add('severity');
    } else if (
      lower.includes('severe') ||
      lower.includes('very bad') ||
      lower.includes('intense')
    ) {
      update.severity = 8;
      update.severityLevel = 'severe';
      assessedFields.add('severity');
    } else if (lower.includes('moderate') || lower.includes('medium')) {
      update.severity = 5;
      update.severityLevel = 'moderate';
      assessedFields.add('severity');
    } else if (lower.includes('mild') || lower.includes('slight') || lower.includes('a little')) {
      update.severity = 2;
      update.severityLevel = 'mild';
      assessedFields.add('severity');
    }

    // 4. Character
    if (
      lower.includes('pressure') ||
      lower.includes('elephant on chest') ||
      lower.includes('heavy') ||
      lower.includes('squeez')
    ) {
      update.character = 'pressure / squeezing';
      assessedFields.add('character');
    } else if (lower.includes('sharp') || lower.includes('stabbing')) {
      update.character = 'sharp';
      assessedFields.add('character');
    } else if (lower.includes('tearing') || lower.includes('ripping')) {
      update.character = 'tearing';
      assessedFields.add('character');
    } else if (
      lower.includes('throbbing') ||
      lower.includes('pulsing') ||
      lower.includes('pulsating')
    ) {
      update.character = 'throbbing';
      assessedFields.add('character');
    } else if (lower.includes('burning') || lower.includes('heartburn')) {
      update.character = 'burning';
      assessedFields.add('character');
    }

    // 5. Radiation
    if (
      lower.includes('does not radiate') ||
      lower.includes("doesn't radiate") ||
      lower.includes('no radiation') ||
      lower.includes('nowhere else') ||
      lower.includes('does not spread') ||
      lower.includes("doesn't spread")
    ) {
      update.radiation = ['none'];
      pertinentNegatives.add('No radiation of discomfort (pain is localized)');
      assessedFields.add('radiation');
    } else {
      const radiationSet = new Set(
        currentState.radiation.filter((r) => r !== 'none')
      );
      if (
        (lower.includes('arm') || lower.includes('left arm') || lower.includes('shoulder')) &&
        !hasNegatedPhrase(lower, 'arm')
      ) {
        radiationSet.add('left_arm');
        assessedFields.add('radiation');
      }
      if (
        (lower.includes('jaw') || lower.includes('chin') || lower.includes('teeth')) &&
        !hasNegatedPhrase(lower, 'jaw')
      ) {
        radiationSet.add('jaw');
        assessedFields.add('radiation');
      }
      if (lower.includes('neck') && !hasNegatedPhrase(lower, 'neck')) {
        radiationSet.add('neck');
        assessedFields.add('radiation');
      }
      if (
        (lower.includes('back') || lower.includes('shoulder blade')) &&
        !hasNegatedPhrase(lower, 'back')
      ) {
        radiationSet.add('back');
        assessedFields.add('radiation');
      }
      if (radiationSet.size > 0) {
        update.radiation = Array.from(radiationSet);
      }
    }

    // 6. Location
    if (
      lower.includes('right lower') ||
      lower.includes('rlq') ||
      lower.includes('lower right')
    ) {
      update.location = 'right_lower_quadrant';
      assessedFields.add('location');
    } else if (
      lower.includes('right upper') ||
      lower.includes('ruq') ||
      lower.includes('upper right')
    ) {
      update.location = 'right_upper_quadrant';
      assessedFields.add('location');
    } else if (lower.includes('center of chest') || lower.includes('substernal')) {
      update.location = 'substernal';
      assessedFields.add('location');
    }

    // 7. Neurological & FAST signs
    const currentFast = { ...currentState.fastSigns };
    let fastChanged = false;
    if (
      lower.includes('face droop') ||
      lower.includes('facial droop') ||
      lower.includes('crooked smile') ||
      lower.includes('numb face')
    ) {
      if (hasNegatedPhrase(lower, 'facial droop') || lower.includes('no facial droop')) {
        currentFast.facialDroop = false;
        fastChanged = true;
        pertinentNegatives.add('Denied facial droop');
      } else {
        currentFast.facialDroop = true;
        fastChanged = true;
        update.neurologicalDeficit = true;
        if (!newSymptoms.includes('facial droop')) newSymptoms.push('facial droop');
      }
      assessedFields.add('fast_symptoms');
    }

    if (
      lower.includes('arm weakness') ||
      lower.includes('cannot lift arm') ||
      lower.includes('arm drift') ||
      lower.includes('weak on one side')
    ) {
      if (hasNegatedPhrase(lower, 'arm weakness') || lower.includes('no arm weakness')) {
        currentFast.armWeakness = false;
        fastChanged = true;
        pertinentNegatives.add('Denied arm weakness');
      } else {
        currentFast.armWeakness = true;
        fastChanged = true;
        update.neurologicalDeficit = true;
        if (!newSymptoms.includes('arm weakness')) newSymptoms.push('arm weakness');
      }
      assessedFields.add('fast_symptoms');
    }

    if (
      lower.includes('slurred speech') ||
      lower.includes('slurring') ||
      lower.includes('cannot talk right') ||
      lower.includes('trouble speaking')
    ) {
      if (hasNegatedPhrase(lower, 'slurred speech') || lower.includes('no slurred speech')) {
        currentFast.speechDifficulty = false;
        fastChanged = true;
        pertinentNegatives.add('Denied speech difficulty');
      } else {
        currentFast.speechDifficulty = true;
        fastChanged = true;
        update.neurologicalDeficit = true;
        if (!newSymptoms.includes('speech difficulty')) newSymptoms.push('speech difficulty');
      }
      assessedFields.add('fast_symptoms');
    }

    if (fastChanged) {
      update.fastSigns = currentFast;
    }

    // 8. Critical Signs
    const criticalSigns = { ...currentState.criticalSigns };
    let critChanged = false;
    if (
      lower.includes('rigid') ||
      lower.includes('hard as a board') ||
      lower.includes('board-like')
    ) {
      criticalSigns.rigidAbdomen = true;
      critChanged = true;
      assessedFields.add('severity_and_rigidity');
    }
    if (
      lower.includes('blue lips') ||
      lower.includes('cyanosis') ||
      lower.includes('stridor') ||
      lower.includes('gasping')
    ) {
      criticalSigns.cyanosisOrStridor = true;
      critChanged = true;
      assessedFields.add('blueness_and_stridor');
    }
    if (
      lower.includes('purple spot') ||
      lower.includes('petechia') ||
      lower.includes("rash that doesn't fade")
    ) {
      criticalSigns.petechialRash = true;
      critChanged = true;
      assessedFields.add('rash_and_sensorium');
    }
    if (lower.includes('tearing pain') && lower.includes('back')) {
      criticalSigns.tearingPainToBack = true;
      critChanged = true;
    }
    if (critChanged) {
      update.criticalSigns = criticalSigns;
    }

    update.symptoms = Array.from(new Set(newSymptoms));
    update.pertinentNegatives = Array.from(pertinentNegatives);
    update.assessedFields = Array.from(assessedFields);
    return update;
  }
}
