import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldAlert,
  Save,
  RotateCcw,
  Check,
  UserCheck,
  Cpu,
  Layers,
  Droplet,
  AlertTriangle,
  Pill,
  Activity,
} from 'lucide-react';
import {
  PatientState,
  ClinicalRecommendation,
  RiskLevel,
  RecommendationAction,
} from '../types/clinical';

interface DoctorDashboardProps {
  patientState: PatientState;
  recommendation: ClinicalRecommendation | null;
  onApplyOverride: (data: {
    overriddenRiskLevel: RiskLevel;
    overriddenAction: RecommendationAction;
    rationale: string;
    doctorName: string;
  }) => Promise<void>;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({
  patientState,
  recommendation,
  onApplyOverride,
}) => {
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [overriddenRisk, setOverriddenRisk] = useState<RiskLevel>(
    recommendation?.risk_assessment.risk_level || 'HIGH'
  );
  const [overriddenAction, setOverriddenAction] = useState<RecommendationAction>(
    recommendation?.recommendation || 'urgent_medical_evaluation'
  );
  const [doctorRationale, setDoctorRationale] = useState('');
  const [doctorName, setDoctorName] = useState('Dr. Marcus Vance, MD');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorRationale.trim()) return;
    setIsSaving(true);
    try {
      await onApplyOverride({
        overriddenRiskLevel: overriddenRisk,
        overriddenAction: overriddenAction,
        rationale: doctorRationale,
        doctorName,
      });
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setShowOverrideForm(false);
      }, 1500);
    } finally {
      setIsSaving(false);
    }
  };

  const risk = recommendation?.risk_assessment;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Clinician Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Clinical Decision Support Dashboard
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              Doctor View
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Deterministic rule-based risk stratification &amp; verifiable evidence audit for Patient #{patientState.id}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowOverrideForm(!showOverrideForm)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 ${
              showOverrideForm
                ? 'bg-slate-200 border-slate-300 text-slate-900'
                : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4 text-slate-600" />
            <span>{showOverrideForm ? 'Close Override Form' : 'Doctor Override'}</span>
          </button>
        </div>
      </div>

      {/* Doctor Override Panel (Section 49) */}
      {showOverrideForm && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Clinician Recommendation Override
              </h2>
              <p className="text-xs text-amber-800 mt-1">
                The doctor always makes the final clinical decision. Any adjustment will be permanently stored in the audit log.
              </p>
            </div>
            <span className="text-[11px] font-mono text-amber-700">
              System Risk: {risk?.risk_level || 'UNKNOWN'}
            </span>
          </div>

          <form onSubmit={handleOverrideSubmit} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Doctor / Attending Name
                </label>
                <input
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  required
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adjusted Risk Level
                </label>
                <select
                  value={overriddenRisk}
                  onChange={(e) => setOverriddenRisk(e.target.value as RiskLevel)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="LOW">LOW</option>
                  <option value="MODERATE">MODERATE</option>
                  <option value="HIGH">HIGH</option>
                  <option value="EMERGENCY">EMERGENCY</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adjusted Action Category
                </label>
                <select
                  value={overriddenAction}
                  onChange={(e) => setOverriddenAction(e.target.value as RecommendationAction)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="self_care_routine">Self-care / routine follow-up</option>
                  <option value="medical_review">Medical review</option>
                  <option value="urgent_medical_evaluation">Urgent medical evaluation</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Clinical Rationale / Medical Reasoning (Required)
              </label>
              <textarea
                value={doctorRationale}
                onChange={(e) => setDoctorRationale(e.target.value)}
                required
                rows={2}
                placeholder="State clinical basis for overriding system triage (e.g. Known musculoskeletal etiology, prior normal cardiac workup, or clinical exam findings)..."
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowOverrideForm(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!doctorRationale.trim() || isSaving}
                className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Saved to Audit Trail</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Recording...' : 'Commit Doctor Override'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Patient Demographics & Identification Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-blue-700 text-sm">
              {patientState.patientName ? patientState.patientName[0].toUpperCase() : 'P'}
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>{patientState.patientName || 'Unnamed Patient'}</span>
                <span className="text-xs font-mono font-normal text-slate-400">({patientState.id})</span>
              </div>
              <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                <span>Age: <strong className="text-slate-800">{patientState.age !== null ? `${patientState.age} yrs` : 'Not recorded'}</strong></span>
                <span className="text-slate-300">•</span>
                <span>Sex: <strong className="text-slate-800">{patientState.gender || 'Not recorded'}</strong></span>
                <span className="text-slate-300">•</span>
                <span>Contact: <strong className="text-slate-800">{patientState.contactNumber || 'Not recorded'}</strong></span>
                {patientState.emergencyContact && patientState.emergencyContact.name && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span>ICE: <strong className="text-slate-800">{patientState.emergencyContact.name} ({patientState.emergencyContact.relation} · {patientState.emergencyContact.phone})</strong></span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Demographics Status:</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${patientState.generalInfoCompleted ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
              {patientState.generalInfoCompleted ? 'Verified & On File' : 'Pending Info'}
            </span>
          </div>
        </div>

        {/* Clinical Baseline strip: Blood group, BMI, Allergies, History & Meds */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          {/* Blood group */}
          <div className="flex items-center gap-1.5">
            <Droplet className="w-3.5 h-3.5 text-rose-500" />
            <span className="text-slate-500">Blood Group:</span>
            <span className="font-bold text-slate-800">{patientState.bloodGroup || 'Not specified'}</span>
          </div>

          {/* BMI */}
          {patientState.bmi && (
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-slate-500">BMI:</span>
              <span className="font-bold text-slate-800">{patientState.bmi}</span>
            </div>
          )}

          {/* Allergies */}
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-slate-500">Allergies:</span>
            {patientState.allergies && patientState.allergies.length > 0 && !patientState.allergies.includes('None') && !patientState.allergies.includes('No known allergies (NKDA)') ? (
              <span className="font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-[11px]">
                ⚠️ {patientState.allergies.join(', ')}
              </span>
            ) : (
              <span className="text-emerald-700 font-medium">No Known Drug Allergies (NKDA)</span>
            )}
          </div>

          {/* Known chronic conditions */}
          {patientState.knownHistory && patientState.knownHistory.length > 0 && !patientState.knownHistory.includes('None') && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">History:</span>
              <span className="font-medium text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                {patientState.knownHistory.join(', ')}
              </span>
            </div>
          )}

          {/* Current medications */}
          {patientState.currentMedications && patientState.currentMedications.length > 0 && !patientState.currentMedications.includes('None') && (
            <div className="flex items-center gap-1.5">
              <Pill className="w-3.5 h-3.5 text-purple-500" />
              <span className="text-slate-500">Meds:</span>
              <span className="font-medium text-slate-800 bg-purple-50 text-purple-900 border border-purple-200 px-2 py-0.5 rounded-md text-[11px]">
                {patientState.currentMedications.join(', ')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Explainability Breakdown (Section 48) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Official Risk Assessment Card */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                Primary Triage Result
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                Risk Assessment &amp; Evidence Audit
              </h2>
            </div>

            {/* Risk Badge */}
            <div className="text-right">
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold ${
                  risk?.risk_level === 'EMERGENCY'
                    ? 'bg-red-600 text-white'
                    : risk?.risk_level === 'HIGH'
                    ? 'bg-amber-600 text-white'
                    : risk?.risk_level === 'MODERATE'
                    ? 'bg-blue-600 text-white'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{risk?.risk_level || 'UNKNOWN'} RISK</span>
              </div>
            </div>
          </div>

          {/* Section: Possible Clinical Concerns (Section 40 & 48) */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Possible Clinical Concerns (Decision Support - Not Diagnoses)
            </h3>
            <div className="mt-2 space-y-2">
              {risk?.possible_concerns && risk.possible_concerns.length > 0 ? (
                risk.possible_concerns.map((concern, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2.5"
                  >
                    <Layers className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{concern}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        These symptoms can occur with serious conditions and require medical evaluation.
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic">
                  No specific critical syndrome flag matched.
                </p>
              )}
            </div>
          </div>

          {/* Section: Why / Verifiable Evidence (Section 48) */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Why: Verifiable Patient Evidence</span>
              <span className="text-[11px] font-normal text-slate-400">
                {risk?.evidence.length || 0} facts extracted
              </span>
            </h3>
            <div className="mt-2.5 space-y-2">
              {risk?.evidence && risk.evidence.length > 0 ? (
                risk.evidence.map((ev, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 text-xs font-medium text-slate-800 bg-emerald-50/50 border border-emerald-100 px-3 py-2 rounded-md"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{ev}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">No symptoms entered yet.</p>
              )}
            </div>

            {/* Pertinent Negatives in Doctor Dashboard */}
            {patientState.pertinentNegatives && patientState.pertinentNegatives.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Pertinent Negatives (Ruled Out During Intake)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {patientState.pertinentNegatives.map((neg, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 text-xs bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-md"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{neg}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section: Missing Information (Section 39 & 48) */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Information Still Missing (Safety Critical)
            </h3>
            <div className="mt-2.5 space-y-2">
              {risk?.missing_information && risk.missing_information.length > 0 ? (
                risk.missing_information.map((m, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 text-xs text-slate-700 bg-amber-50/50 border border-amber-100 px-3 py-2 rounded-md"
                  >
                    <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{m}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic">
                  All standard triage fields collected.
                </p>
              )}
            </div>
          </div>

          {/* Section: Recommended Action & Governance Meta (Section 48) */}
          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Recommended Action
              </span>
              <span className="text-xs font-bold text-slate-900 mt-1 block uppercase">
                {risk?.recommended_action?.replace(/_/g, ' ') || 'None'}
              </span>
              <p className="text-[11px] text-slate-600 mt-1">
                {recommendation?.recommendation_text}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Model &amp; System Architecture
                </span>
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                  <Cpu className="w-3.5 h-3.5 text-slate-600" />
                  General chatbot + Deterministic Rules Engine
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Final Clinical Decision
                </span>
                <span className="text-xs font-bold text-indigo-700 flex items-center gap-1.5 mt-0.5">
                  <UserCheck className="w-3.5 h-3.5" />
                  Attending Physician (Doctor)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Possible Conditions Engine Cards & Confidence Guide */}
        <div className="lg:col-span-5 space-y-6">
          {/* Possible Conditions Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Possible Condition Identification
              </h3>
              <span className="text-[11px] text-slate-500">
                Possibilities, not diagnoses
              </span>
            </div>

            <div className="space-y-3">
              {recommendation?.possible_conditions &&
              recommendation.possible_conditions.length > 0 ? (
                recommendation.possible_conditions.map((cond, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/50 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{cond.name}</span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-200/70 text-slate-700 capitalize">
                        {cond.confidence} confidence
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500">
                      Category: {cond.clinical_category}
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-slate-600 block">
                        Reasoning Basis:
                      </span>
                      <ul className="list-disc list-inside text-[11px] text-slate-700 space-y-0.5 mt-0.5">
                        {cond.reason.map((r, ri) => (
                          <li key={ri}>{r}</li>
                        ))}
                      </ul>
                    </div>

                    <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-100">
                      "{cond.caveat}"
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">
                  No symptom patterns matched yet.
                </p>
              )}
            </div>
          </div>

          {/* Qualitative Confidence Scale Guide (Section 41) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs text-xs space-y-3">
            <h4 className="font-bold text-slate-800 pb-2 border-b border-slate-100">
              Clinical Confidence Definitions (Section 41)
            </h4>
            <div className="space-y-2 text-[11px] text-slate-600">
              <div>
                <span className="font-bold text-slate-900">Low confidence:</span> Initial non-specific symptoms reported; clinical picture incomplete; requires further probing.
              </div>
              <div>
                <span className="font-bold text-slate-900">Moderate confidence:</span> Multiple hallmark features or symptom cluster present; non-emergency clinical review advised.
              </div>
              <div>
                <span className="font-bold text-slate-900">High confidence:</span> Clinician-validated emergency red flag cluster identified; immediate life-safety action mandated.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
