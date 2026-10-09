import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  AlertTriangle,
  PhoneCall,
  CheckCircle2,
  User,
  Phone,
  Calendar,
  HeartPulse,
  Edit3,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Mail,
  MapPin,
  Activity,
  Pill,
  AlertCircle,
  Scale,
  Droplet,
  Plus,
  X,
  Sparkles,
} from 'lucide-react';
import {
  PatientState,
  ClinicalRecommendation,
  ChatMessage,
} from '../types/clinical';
import { NextQuestionResult } from '../engine/AdaptiveQuestionEngine';

interface PatientInterviewProps {
  messages: ChatMessage[];
  patientState: PatientState;
  recommendation: ClinicalRecommendation | null;
  nextQuestion: NextQuestionResult | null;
  isEmergency: boolean;
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  onDismissEmergencyModal: () => void;
  onUpdateGeneralInfo?: (info: Partial<PatientState>) => void;
}

export const PatientInterview: React.FC<PatientInterviewProps> = ({
  messages,
  patientState,
  recommendation,
  nextQuestion,
  isEmergency,
  isLoading,
  onSendMessage,
  onUpdateGeneralInfo,
}) => {
  const [inputText, setInputText] = useState('');
  const [isEditingInfo, setIsEditingInfo] = useState(
    !patientState.generalInfoCompleted && !patientState.patientName
  );
  const [activeFormTab, setActiveFormTab] = useState<'personal' | 'medical'>('personal');
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);

  // Form states - Personal & Contact
  const [formName, setFormName] = useState(patientState.patientName || '');
  const [formAge, setFormAge] = useState(patientState.age ? String(patientState.age) : '');
  const [formDob, setFormDob] = useState(patientState.dob || '');
  const [formGender, setFormGender] = useState(patientState.gender || 'Female');
  const [formContact, setFormContact] = useState(patientState.contactNumber || '');
  const [formEmail, setFormEmail] = useState(patientState.email || '');
  const [formAddress, setFormAddress] = useState(patientState.address || '');

  // Emergency contact
  const [formEmergName, setFormEmergName] = useState(patientState.emergencyContact?.name || '');
  const [formEmergRelation, setFormEmergRelation] = useState(patientState.emergencyContact?.relation || 'Spouse');
  const [formEmergPhone, setFormEmergPhone] = useState(patientState.emergencyContact?.phone || '');

  // Medical baseline & Clinical safety
  const [formBloodGroup, setFormBloodGroup] = useState(patientState.bloodGroup || 'O+');
  const [formHeight, setFormHeight] = useState(patientState.heightCm ? String(patientState.heightCm) : '');
  const [formWeight, setFormWeight] = useState(patientState.weightKg ? String(patientState.weightKg) : '');

  // Allergies & conditions lists
  const [allergiesList, setAllergiesList] = useState<string[]>(patientState.allergies || []);
  const [customAllergy, setCustomAllergy] = useState('');

  const [conditionsList, setConditionsList] = useState<string[]>(patientState.knownHistory || []);
  const [customCondition, setCustomCondition] = useState('');

  const [medsList, setMedsList] = useState<string[]>(patientState.currentMedications || []);
  const [customMed, setCustomMed] = useState('');

  // Lifestyle
  const [formSmoking, setFormSmoking] = useState<'never' | 'former' | 'current' | 'unknown'>(
    patientState.lifestyle?.smokingStatus || 'never'
  );
  const [formAlcohol, setFormAlcohol] = useState<'none' | 'occasional' | 'regular' | 'heavy'>(
    patientState.lifestyle?.alcohol || 'occasional'
  );

  const [formError, setFormError] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Keep form fields synced if patientState updates from chat extraction or presets
  useEffect(() => {
    if (patientState.patientName) setFormName(patientState.patientName);
    if (patientState.age) setFormAge(String(patientState.age));
    if (patientState.gender) setFormGender(patientState.gender);
    if (patientState.contactNumber) setFormContact(patientState.contactNumber);
    if (patientState.dob) setFormDob(patientState.dob);
    if (patientState.email) setFormEmail(patientState.email);
    if (patientState.address) setFormAddress(patientState.address);

    if (patientState.emergencyContact) {
      setFormEmergName(patientState.emergencyContact.name || '');
      setFormEmergRelation(patientState.emergencyContact.relation || 'Spouse');
      setFormEmergPhone(patientState.emergencyContact.phone || '');
    }

    if (patientState.bloodGroup) setFormBloodGroup(patientState.bloodGroup);
    if (patientState.heightCm) setFormHeight(String(patientState.heightCm));
    if (patientState.weightKg) setFormWeight(String(patientState.weightKg));

    if (patientState.allergies) setAllergiesList(patientState.allergies);
    if (patientState.knownHistory) setConditionsList(patientState.knownHistory);
    if (patientState.currentMedications) setMedsList(patientState.currentMedications);

    if (patientState.generalInfoCompleted) {
      setIsEditingInfo(false);
    }
  }, [patientState]);

  // Calculate live BMI
  const computedBmi = React.useMemo(() => {
    const h = parseFloat(formHeight);
    const w = parseFloat(formWeight);
    if (h > 50 && w > 20) {
      const hm = h / 100;
      return parseFloat((w / (hm * hm)).toFixed(1));
    }
    return null;
  }, [formHeight, formWeight]);

  const bmiCategory = React.useMemo(() => {
    if (!computedBmi) return null;
    if (computedBmi < 18.5) return { label: 'Underweight', color: 'text-amber-600 bg-amber-50' };
    if (computedBmi < 25) return { label: 'Normal weight', color: 'text-emerald-700 bg-emerald-50' };
    if (computedBmi < 30) return { label: 'Overweight', color: 'text-amber-700 bg-amber-50' };
    return { label: 'Obese range', color: 'text-rose-700 bg-rose-50' };
  }, [computedBmi]);

  // Tag helper toggles
  const toggleAllergy = (allergy: string) => {
    if (allergy === 'No known allergies (NKDA)') {
      setAllergiesList(['No known allergies (NKDA)']);
      return;
    }
    const filtered = allergiesList.filter((a) => a !== 'No known allergies (NKDA)');
    if (filtered.includes(allergy)) {
      setAllergiesList(filtered.filter((a) => a !== allergy));
    } else {
      setAllergiesList([...filtered, allergy]);
    }
  };

  const addCustomAllergy = () => {
    if (!customAllergy.trim()) return;
    const item = customAllergy.trim();
    const filtered = allergiesList.filter((a) => a !== 'No known allergies (NKDA)');
    if (!filtered.includes(item)) {
      setAllergiesList([...filtered, item]);
    }
    setCustomAllergy('');
  };

  const removeAllergy = (item: string) => {
    setAllergiesList(allergiesList.filter((a) => a !== item));
  };

  const toggleCondition = (cond: string) => {
    if (cond === 'None') {
      setConditionsList(['None']);
      return;
    }
    const filtered = conditionsList.filter((c) => c !== 'None');
    if (filtered.includes(cond)) {
      setConditionsList(filtered.filter((c) => c !== cond));
    } else {
      setConditionsList([...filtered, cond]);
    }
  };

  const addCustomCondition = () => {
    if (!customCondition.trim()) return;
    const item = customCondition.trim();
    const filtered = conditionsList.filter((c) => c !== 'None');
    if (!filtered.includes(item)) {
      setConditionsList([...filtered, item]);
    }
    setCustomCondition('');
  };

  const removeCondition = (item: string) => {
    setConditionsList(conditionsList.filter((c) => c !== item));
  };

  const toggleMed = (med: string) => {
    if (med === 'None') {
      setMedsList(['None']);
      return;
    }
    const filtered = medsList.filter((m) => m !== 'None');
    if (filtered.includes(med)) {
      setMedsList(filtered.filter((m) => m !== med));
    } else {
      setMedsList([...filtered, med]);
    }
  };

  const addCustomMed = () => {
    if (!customMed.trim()) return;
    const item = customMed.trim();
    const filtered = medsList.filter((m) => m !== 'None');
    if (!filtered.includes(item)) {
      setMedsList([...filtered, item]);
    }
    setCustomMed('');
  };

  const removeMed = (item: string) => {
    setMedsList(medsList.filter((m) => m !== item));
  };

  const handleSaveGeneralInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setActiveFormTab('personal');
      setFormError('Please enter your full name.');
      return;
    }
    const parsedAge = parseInt(formAge, 10);
    if (isNaN(parsedAge) || parsedAge <= 0 || parsedAge > 125) {
      setActiveFormTab('personal');
      setFormError('Please enter a valid age (1-125).');
      return;
    }
    if (!formContact.trim()) {
      setActiveFormTab('personal');
      setFormError('Please enter your contact phone number.');
      return;
    }

    setFormError('');
    setIsEditingInfo(false);

    const parsedHeight = formHeight ? parseInt(formHeight, 10) : null;
    const parsedWeight = formWeight ? parseInt(formWeight, 10) : null;

    if (onUpdateGeneralInfo) {
      onUpdateGeneralInfo({
        patientName: formName.trim(),
        age: parsedAge,
        gender: formGender,
        contactNumber: formContact.trim(),
        dob: formDob.trim() || undefined,
        email: formEmail.trim() || undefined,
        address: formAddress.trim() || undefined,
        emergencyContact: formEmergName.trim()
          ? {
              name: formEmergName.trim(),
              relation: formEmergRelation.trim(),
              phone: formEmergPhone.trim() || formContact.trim(),
            }
          : undefined,
        bloodGroup: formBloodGroup,
        heightCm: parsedHeight,
        weightKg: parsedWeight,
        bmi: computedBmi,
        allergies: allergiesList.length > 0 ? allergiesList : ['No known allergies (NKDA)'],
        knownHistory: conditionsList.length > 0 ? conditionsList : ['None'],
        currentMedications: medsList.length > 0 ? medsList : ['None'],
        lifestyle: {
          smokingStatus: formSmoking,
          alcohol: formAlcohol,
          pregnant: formGender === 'Female' ? false : null,
        },
      });
    }
  };

  // Sample Presets
  const handleFillSample = (type: 'cardiac' | 'asthma' | 'healthy') => {
    setFormError('');
    if (type === 'cardiac') {
      setFormName('Alex Morgan');
      setFormAge('54');
      setFormDob('1972-04-18');
      setFormGender('Female');
      setFormContact('+1 (555) 234-5678');
      setFormEmail('alex.morgan@healthmail.com');
      setFormAddress('450 Oak Avenue, Seattle, WA');
      setFormEmergName('Robert Morgan');
      setFormEmergRelation('Spouse');
      setFormEmergPhone('+1 (555) 234-5679');
      setFormBloodGroup('O+');
      setFormHeight('168');
      setFormWeight('74');
      setAllergiesList(['Penicillin (Severe rash)']);
      setConditionsList(['Hypertension', 'High Cholesterol']);
      setMedsList(['Lisinopril 10mg daily', 'Atorvastatin 20mg']);
      setFormSmoking('former');
      setFormAlcohol('occasional');
    } else if (type === 'asthma') {
      setFormName('David Chen');
      setFormAge('38');
      setFormDob('1988-09-12');
      setFormGender('Male');
      setFormContact('+1 (555) 482-1920');
      setFormEmail('dchen@example.com');
      setFormAddress('12 Pine Street, Boston, MA');
      setFormEmergName('Linda Chen');
      setFormEmergRelation('Sister');
      setFormEmergPhone('+1 (555) 482-1921');
      setFormBloodGroup('A+');
      setFormHeight('178');
      setFormWeight('73');
      setAllergiesList(['Sulfa drugs', 'Peanuts / Tree nuts']);
      setConditionsList(['Asthma']);
      setMedsList(['Albuterol Inhaler (PRN)']);
      setFormSmoking('never');
      setFormAlcohol('occasional');
    } else {
      setFormName('Elena Cruz');
      setFormAge('29');
      setFormDob('1997-02-24');
      setFormGender('Female');
      setFormContact('+1 (555) 912-3841');
      setFormEmail('elena.cruz@mail.com');
      setFormAddress('88 Elm Street, Austin, TX');
      setFormEmergName('Carlos Cruz');
      setFormEmergRelation('Father');
      setFormEmergPhone('+1 (555) 912-3842');
      setFormBloodGroup('B+');
      setFormHeight('165');
      setFormWeight('58');
      setAllergiesList(['No known allergies (NKDA)']);
      setConditionsList(['None']);
      setMedsList(['None']);
      setFormSmoking('never');
      setFormAlcohol('none');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText);
    setInputText('');
  };

  // Simplified contextual quick responses
  const getContextualQuickAnswers = (): string[] => {
    if (!patientState.generalInfoCompleted && !patientState.patientName) {
      return [
        'Alex Morgan, 54, Female, 555-0199',
        'David Chen, 38, Male, 555-4821',
        'Elena Cruz, 29, Female, 555-9123',
      ];
    }

    if (!nextQuestion) {
      return [
        'No other symptoms',
        'Feeling a little better',
        'Same as before',
      ];
    }

    switch (nextQuestion.field) {
      case 'breathing_difficulty':
        return [
          'No (breathing is fine)',
          'Yes, short of breath',
          'Mildly breathless',
        ];
      case 'radiation':
        return [
          'No spreading',
          'Spreads to left arm',
          'Spreads to neck or jaw',
          'Spreads to upper back',
        ];
      case 'sweating_and_nausea':
        return [
          'No sweating or nausea',
          'Yes, cold sweats',
          'Yes, feeling nauseous',
        ];
      case 'onset':
        return [
          'Started suddenly',
          'Started gradually over days',
          'Started today',
        ];
      case 'neck_stiffness':
        return [
          'No stiff neck',
          'Yes, neck is very stiff',
        ];
      case 'fever':
      case 'fever_and_vomiting':
        return [
          'No fever',
          'Yes, high fever',
          'Mild fever with chills',
        ];
      case 'neurological_deficit':
      case 'fast_symptoms':
        return [
          'No weakness or slurred speech',
          'Yes, arm weakness',
          'Yes, slurred speech',
        ];
      case 'character':
        return [
          'Heavy pressure or tightness',
          'Sharp or stabbing',
          'Burning feeling',
          'Dull ache',
        ];
      case 'severity':
      case 'severity_and_rigidity':
        return [
          'Mild (2 to 3 out of 10)',
          'Moderate (5 out of 10)',
          'Severe (8 out of 10)',
        ];
      default:
        return ['No', 'Yes', 'Mild', 'Severe'];
    }
  };

  const quickAnswers = getContextualQuickAnswers();

  return (
    <div className="max-w-7xl mx-auto py-5 px-4 sm:px-6 lg:px-8 space-y-5">
      {/* Patient Intake Form / Editor */}
      {!patientState.generalInfoCompleted || isEditingInfo ? (
        <div className="bg-white border border-blue-200 rounded-xl p-5 shadow-xs transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-1">
                <Sparkles className="w-3 h-3" />
                <span>Patient Intake &amp; Health Baseline</span>
              </div>
              <h2 className="text-base font-bold text-slate-900">
                Patient Registration &amp; Background
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Please complete your basic details and medical background before describing your symptoms. This ensures safe clinical evaluation.
              </p>
            </div>

            {/* Quick Fill Sample Profiles */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-medium">Quick Fill:</span>
              <button
                type="button"
                onClick={() => handleFillSample('cardiac')}
                className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-medium transition-colors cursor-pointer"
                title="Fill sample patient with hypertension & lisinopril"
              >
                Alex Morgan (Cardiac)
              </button>
              <button
                type="button"
                onClick={() => handleFillSample('asthma')}
                className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-medium transition-colors cursor-pointer"
                title="Fill sample patient with asthma & drug allergies"
              >
                David Chen (Asthma)
              </button>
              <button
                type="button"
                onClick={() => handleFillSample('healthy')}
                className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-medium transition-colors cursor-pointer"
                title="Fill young healthy patient with clean history"
              >
                Elena Cruz (Clear)
              </button>
            </div>
          </div>

          {/* Form Tabs for Clarity and Simplicity */}
          <div className="flex border-b border-slate-200 mt-3.5">
            <button
              type="button"
              onClick={() => setActiveFormTab('personal')}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeFormTab === 'personal'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>1. Personal &amp; Contact Details</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFormTab('medical')}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeFormTab === 'medical'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>2. Health Baseline &amp; Medical History</span>
            </button>
          </div>

          <form onSubmit={handleSaveGeneralInfo} className="mt-4 space-y-4">
            {formError && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{formError}</span>
              </div>
            )}

            {/* TAB 1: Personal & Contact */}
            {activeFormTab === 'personal' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {/* Full Name */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Alex Morgan"
                      required
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                    />
                  </div>

                  {/* Age */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Age <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="125"
                      value={formAge}
                      onChange={(e) => setFormAge(e.target.value)}
                      placeholder="e.g. 54"
                      required
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                    />
                  </div>

                  {/* Sex / Gender */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <HeartPulse className="w-3.5 h-3.5 text-slate-400" />
                      Biological Sex <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formGender}
                      onChange={(e) => setFormGender(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other / Non-binary</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>

                  {/* Contact Phone */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      Contact Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formContact}
                      onChange={(e) => setFormContact(e.target.value)}
                      placeholder="e.g. +1 (555) 234-5678"
                      required
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {/* Date of Birth */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={formDob}
                      onChange={(e) => setFormDob(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="e.g. alex@example.com"
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                    />
                  </div>

                  {/* Residential Address / City */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      Address / City
                    </label>
                    <input
                      type="text"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      placeholder="e.g. 450 Oak Ave, Seattle"
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Emergency Contact Sub-section */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2">
                    Emergency Contact (Optional but Recommended)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <input
                        type="text"
                        value={formEmergName}
                        onChange={(e) => setFormEmergName(e.target.value)}
                        placeholder="Contact name (e.g. Robert Morgan)"
                        className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={formEmergRelation}
                        onChange={(e) => setFormEmergRelation(e.target.value)}
                        placeholder="Relationship (e.g. Spouse / Parent / Sibling)"
                        className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                      />
                    </div>
                    <div>
                      <input
                        type="tel"
                        value={formEmergPhone}
                        onChange={(e) => setFormEmergPhone(e.target.value)}
                        placeholder="Emergency phone (e.g. +1 555-234-5679)"
                        className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Medical Baseline & Health History */}
            {activeFormTab === 'medical' && (
              <div className="space-y-4">
                {/* Blood Group, Height, Weight & Live BMI */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 items-end">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <Droplet className="w-3.5 h-3.5 text-rose-500" />
                      Blood Group
                    </label>
                    <select
                      value={formBloodGroup}
                      onChange={(e) => setFormBloodGroup(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                    >
                      <option value="O+">O Positive (O+)</option>
                      <option value="O-">O Negative (O-)</option>
                      <option value="A+">A Positive (A+)</option>
                      <option value="A-">A Negative (A-)</option>
                      <option value="B+">B Positive (B+)</option>
                      <option value="B-">B Negative (B-)</option>
                      <option value="AB+">AB Positive (AB+)</option>
                      <option value="AB-">AB Negative (AB-)</option>
                      <option value="Unknown">Unknown</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5 text-slate-400" />
                      Height (cm)
                    </label>
                    <input
                      type="number"
                      min="50"
                      max="250"
                      value={formHeight}
                      onChange={(e) => setFormHeight(e.target.value)}
                      placeholder="e.g. 170"
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5 text-slate-400" />
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      min="20"
                      max="300"
                      value={formWeight}
                      onChange={(e) => setFormWeight(e.target.value)}
                      placeholder="e.g. 70"
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                    />
                  </div>

                  {/* Calculated BMI */}
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Body Mass Index</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-bold text-slate-800">
                        {computedBmi ? `BMI ${computedBmi}` : '—'}
                      </span>
                      {bmiCategory && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${bmiCategory.color}`}>
                          {bmiCategory.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Known Allergies */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    Known Allergies (Medications / Food / Latex)
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {['No known allergies (NKDA)', 'Penicillin', 'Latex', 'Aspirin / NSAIDs', 'Sulfa drugs', 'Peanuts / Tree nuts'].map(
                      (item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleAllergy(item)}
                          className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
                            allergiesList.includes(item)
                              ? 'bg-amber-100 text-amber-900 border-amber-300 font-semibold'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {allergiesList.includes(item) ? '✓ ' : '+ '}
                          {item}
                        </button>
                      )
                    )}
                  </div>
                  {/* Selected allergies tag bar */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {allergiesList.map((a, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium"
                      >
                        {a}
                        <button
                          type="button"
                          onClick={() => removeAllergy(a)}
                          className="hover:text-red-700 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <div className="inline-flex items-center gap-1">
                      <input
                        type="text"
                        value={customAllergy}
                        onChange={(e) => setCustomAllergy(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addCustomAllergy();
                          }
                        }}
                        placeholder="Add other allergy..."
                        className="text-[11px] px-2 py-1 bg-slate-50 border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600"
                      />
                      <button
                        type="button"
                        onClick={addCustomAllergy}
                        className="p-1 rounded-md bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer"
                        title="Add allergy"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Pre-existing Conditions / Medical History */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <HeartPulse className="w-3.5 h-3.5 text-slate-400" />
                    Pre-existing Conditions / Past Medical History
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {['None', 'Hypertension', 'Type 2 Diabetes', 'Asthma / Respiratory', 'Coronary Artery Disease', 'High Cholesterol'].map(
                      (item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleCondition(item)}
                          className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
                            conditionsList.includes(item)
                              ? 'bg-blue-100 text-blue-900 border-blue-300 font-semibold'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {conditionsList.includes(item) ? '✓ ' : '+ '}
                          {item}
                        </button>
                      )
                    )}
                  </div>
                  {/* Selected conditions tag bar */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {conditionsList.map((c, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-medium"
                      >
                        {c}
                        <button
                          type="button"
                          onClick={() => removeCondition(c)}
                          className="hover:text-red-700 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <div className="inline-flex items-center gap-1">
                      <input
                        type="text"
                        value={customCondition}
                        onChange={(e) => setCustomCondition(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addCustomCondition();
                          }
                        }}
                        placeholder="Add other condition..."
                        className="text-[11px] px-2 py-1 bg-slate-50 border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600"
                      />
                      <button
                        type="button"
                        onClick={addCustomCondition}
                        className="p-1 rounded-md bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer"
                        title="Add condition"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Current Daily Medications */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Pill className="w-3.5 h-3.5 text-slate-400" />
                    Current Daily Medications
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {['None', 'Blood Pressure Meds', 'Blood Thinners / Aspirin', 'Inhaler', 'Metformin / Insulin'].map(
                      (item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleMed(item)}
                          className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
                            medsList.includes(item)
                              ? 'bg-purple-100 text-purple-900 border-purple-300 font-semibold'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {medsList.includes(item) ? '✓ ' : '+ '}
                          {item}
                        </button>
                      )
                    )}
                  </div>
                  {/* Selected medications tag bar */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {medsList.map((m, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 border border-purple-200 text-purple-800 text-[11px] font-medium"
                      >
                        {m}
                        <button
                          type="button"
                          onClick={() => removeMed(m)}
                          className="hover:text-red-700 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <div className="inline-flex items-center gap-1">
                      <input
                        type="text"
                        value={customMed}
                        onChange={(e) => setCustomMed(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addCustomMed();
                          }
                        }}
                        placeholder="Add other medication..."
                        className="text-[11px] px-2 py-1 bg-slate-50 border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600"
                      />
                      <button
                        type="button"
                        onClick={addCustomMed}
                        className="p-1 rounded-md bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer"
                        title="Add medication"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lifestyle Factors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-100">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">
                      Smoking Status
                    </label>
                    <select
                      value={formSmoking}
                      onChange={(e) => setFormSmoking(e.target.value as any)}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                    >
                      <option value="never">Non-smoker (Never smoked)</option>
                      <option value="former">Former smoker</option>
                      <option value="current">Current smoker</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">
                      Alcohol Use
                    </label>
                    <select
                      value={formAlcohol}
                      onChange={(e) => setFormAlcohol(e.target.value as any)}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                    >
                      <option value="none">None / Rare</option>
                      <option value="occasional">Occasional / Social</option>
                      <option value="regular">Regular</option>
                      <option value="heavy">Heavy</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="text-[11px] text-slate-400">
                {activeFormTab === 'personal' ? (
                  <button
                    type="button"
                    onClick={() => setActiveFormTab('medical')}
                    className="text-blue-600 hover:underline font-medium cursor-pointer"
                  >
                    Next: Add Health Baseline &rarr;
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveFormTab('personal')}
                    className="text-blue-600 hover:underline font-medium cursor-pointer"
                  >
                    &larr; Back to Personal Info
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {patientState.patientName && (
                  <button
                    type="button"
                    onClick={() => setIsEditingInfo(false)}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save &amp; Continue to Consultation</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        /* Compact Verified Patient Badge */
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{patientState.patientName || 'Registered Patient'}</span>
            </div>
            <span className="text-slate-300">•</span>
            <span className="text-slate-600">
              Age: <strong className="text-slate-800">{patientState.age || '—'}</strong>
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-600">
              Sex: <strong className="text-slate-800">{patientState.gender || '—'}</strong>
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-600 flex items-center gap-1">
              <Phone className="w-3 h-3 text-slate-400" />
              <strong className="text-slate-800">{patientState.contactNumber || '—'}</strong>
            </span>
            {patientState.bloodGroup && (
              <>
                <span className="text-slate-300">•</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 font-semibold text-[11px]">
                  <Droplet className="w-2.5 h-2.5" />
                  {patientState.bloodGroup}
                </span>
              </>
            )}
            {patientState.bmi && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-slate-600">
                  BMI: <strong className="text-slate-800">{patientState.bmi}</strong>
                </span>
              </>
            )}
            {patientState.allergies && patientState.allergies.length > 0 && !patientState.allergies.includes('None') && !patientState.allergies.includes('No known allergies (NKDA)') ? (
              <>
                <span className="text-slate-300">•</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold">
                  <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                  Allergies: {patientState.allergies.join(', ')}
                </span>
              </>
            ) : (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-[11px] text-emerald-700 font-medium">✓ NKDA</span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsEditingInfo(true)}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Edit3 className="w-3 h-3" />
            <span>Edit Profile</span>
          </button>
        </div>
      )}

      {/* Main Consultation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Chat Area (Left 8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col h-[650px] overflow-hidden">
          {/* Calm, Reassuring Chat Header */}
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                CA
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-tight">
                  Clinical Care Assistant
                </h3>
                <p className="text-[11px] text-slate-500">
                  Safety Triage &amp; Intake · Plain English
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-medium text-slate-700">Confidential</span>
            </div>
          </div>

          {/* Emergency Alert Banner if triggered */}
          {isEmergency && (
            <div className="bg-red-50 border-b border-red-200 p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-red-100 text-red-700 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-red-900">
                    Urgent Emergency Care Recommended
                  </h3>
                  <p className="text-xs text-red-700 mt-1 leading-relaxed">
                    Based on what you shared, please seek urgent medical attention right away.
                  </p>
                  <div className="mt-2.5 flex items-center gap-3">
                    <a
                      href="tel:911"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-colors"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      Call Emergency Services (911)
                    </a>
                    <span className="text-xs text-red-600 font-medium">
                      Do not drive yourself. Have someone stay with you.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Message Stream */}
          <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3.5 bg-slate-50/30">
            {messages.map((msg) => {
              const isPatient = msg.sender === 'patient';
              return (
                <div
                  key={msg.id}
                  className={`flex ${isPatient ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-xs ${
                      isPatient
                        ? 'bg-blue-600 text-white rounded-br-xs'
                        : msg.isEmergencyAlert
                        ? 'bg-red-50 text-red-950 border border-red-300 rounded-bl-xs'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-1 text-[11px] opacity-75">
                      <span className="font-semibold">
                        {isPatient ? 'You' : 'Care Assistant'}
                      </span>
                      <span className="tabular-nums">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-500 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce delay-100" />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce delay-200" />
                  <span>Assistant is thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Simple Everyday Quick Responses */}
          <div className="px-4 py-2 border-t border-slate-200 bg-white overflow-x-auto flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-400 shrink-0">
              Quick answers:
            </span>
            {quickAnswers.map((ans, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSendMessage(ans)}
                disabled={isLoading || isEmergency}
                className="text-xs bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-transparent text-slate-700 px-3 py-1 rounded-full whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {ans}
              </button>
            ))}
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={handleSubmit}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isLoading || isEmergency}
              placeholder={
                isEmergency
                  ? 'Urgent emergency alert active. Please seek care.'
                  : !patientState.generalInfoCompleted
                  ? 'Type your details or reply here...'
                  : 'Describe how you feel, answers, or questions...'
              }
              className="flex-1 px-4 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading || isEmergency}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </form>
        </div>

        {/* Clean, Reassuring Summary Sidebar (Right 4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card 1: Patient Profile & Emergency Contact */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                Patient Profile
              </h3>
              <button
                onClick={() => setIsEditingInfo(true)}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
              >
                Edit
              </button>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Name:</span>
                <span className="font-semibold text-slate-800">
                  {patientState.patientName || 'Not entered yet'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Age &amp; Sex:</span>
                <span className="font-semibold text-slate-800">
                  {patientState.age !== null ? `${patientState.age} yrs` : '—'} · {patientState.gender || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phone:</span>
                <span className="font-semibold text-slate-800">
                  {patientState.contactNumber || 'Not entered yet'}
                </span>
              </div>
              {patientState.email && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-medium text-slate-700 truncate max-w-[170px]">
                    {patientState.email}
                  </span>
                </div>
              )}
              {patientState.emergencyContact && patientState.emergencyContact.name && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400 font-medium block mb-0.5">Emergency Contact:</span>
                  <div className="font-medium text-slate-800">
                    {patientState.emergencyContact.name} ({patientState.emergencyContact.relation})
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {patientState.emergencyContact.phone}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Medical Baseline & Vitals */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2.5 border-b border-slate-100 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              Health Baseline
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 block">Blood Group</span>
                <span className="font-bold text-rose-600 text-sm">
                  {patientState.bloodGroup || 'Not specified'}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 block">BMI &amp; Build</span>
                <span className="font-bold text-slate-800 text-sm">
                  {patientState.bmi ? `${patientState.bmi}` : '—'}
                </span>
              </div>
            </div>

            {/* Allergies Highlight */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-medium block mb-1">Known Allergies:</span>
              {patientState.allergies && patientState.allergies.length > 0 && !patientState.allergies.includes('None') && !patientState.allergies.includes('No known allergies (NKDA)') ? (
                <div className="flex flex-wrap gap-1">
                  {patientState.allergies.map((a, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold"
                    >
                      ⚠️ {a}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-[11px] text-emerald-700 font-semibold">✓ No known drug allergies (NKDA)</span>
              )}
            </div>

            {/* Conditions & Current Meds */}
            <div className="mt-2.5 pt-2 border-t border-slate-100 text-xs space-y-1.5">
              {patientState.knownHistory && patientState.knownHistory.length > 0 && !patientState.knownHistory.includes('None') && (
                <div>
                  <span className="text-slate-500 text-[11px] block">History:</span>
                  <span className="font-medium text-slate-800">
                    {patientState.knownHistory.join(', ')}
                  </span>
                </div>
              )}
              {patientState.currentMedications && patientState.currentMedications.length > 0 && !patientState.currentMedications.includes('None') && (
                <div>
                  <span className="text-slate-500 text-[11px] block">Current Meds:</span>
                  <span className="font-medium text-slate-800">
                    {patientState.currentMedications.join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Symptoms You Reported */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2.5 border-b border-slate-100">
              Symptoms Reported
            </h3>
            <div className="mt-3 text-xs">
              {patientState.symptoms.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {patientState.symptoms.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs font-medium capitalize"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 italic">
                  No symptoms recorded yet. Describe what you feel in the chat.
                </p>
              )}
            </div>
          </div>

          {/* Card 4: Ruled Out / Denied Symptoms */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2.5 border-b border-slate-100">
              Ruled Out (Not Present)
            </h3>
            <div className="mt-3 text-xs">
              {patientState.pertinentNegatives && patientState.pertinentNegatives.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {patientState.pertinentNegatives.map((neg, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-medium"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {neg}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 italic">
                  None yet. We note when you answer "No" to questions.
                </p>
              )}
            </div>
          </div>

          {/* Card 5: Need Urgent Help Reminder */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-amber-950">
              <PhoneCall className="w-3.5 h-3.5 text-amber-700" />
              <span>Need Immediate Care?</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              If you experience severe chest crushing, trouble breathing, or sudden face/arm weakness, call <strong>911</strong> immediately.
            </p>
          </div>

          {/* Card 6: Optional Collapsible Clinical Details for Doctors/Reviewers */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600">
            <button
              type="button"
              onClick={() => setShowAdvancedDetails(!showAdvancedDetails)}
              className="w-full flex items-center justify-between font-medium text-slate-700 hover:text-slate-900 cursor-pointer"
            >
              <span>Advanced Clinical Review</span>
              {showAdvancedDetails ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {showAdvancedDetails && (
              <div className="mt-3 pt-3 border-t border-slate-200 space-y-2 text-[11px] font-mono text-slate-600">
                <div>Patient ID: {patientState.id}</div>
                <div>Triage Version: v{patientState.version}</div>
                <div>Chief Complaint: {patientState.chiefComplaint || 'none'}</div>
                <div>
                  Calculated Risk: {recommendation?.risk_assessment.risk_level || 'Evaluating'}
                </div>
                <div>Action: {recommendation?.recommendation || 'pending'}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
