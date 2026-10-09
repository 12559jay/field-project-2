import React from 'react';
import {
  ShieldAlert,
  Activity,
  Stethoscope,
  FileText,
  BookOpen,
  FlaskConical,
  RotateCcw,
  BrainCircuit,
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'patient' | 'doctor' | 'audit' | 'knowledge' | 'evaluation' | 'train';
  setActiveTab: (tab: 'patient' | 'doctor' | 'audit' | 'knowledge' | 'evaluation' | 'train') => void;
  isEmergencyActive: boolean;
  onReset: () => void;
  onSelectPreset: (presetKey: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isEmergencyActive,
  onReset,
  onSelectPreset,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                Aegis Clinical
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium text-slate-500">
                Decision Support &amp; Risk Engine
              </span>
            </div>
          </div>

          {/* Zone 2: Clean 5 navigation links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setActiveTab('patient')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'patient'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Patient Interview
              {isEmergencyActive && (
                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('doctor')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'doctor'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              Doctor Dashboard
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'audit'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Audit Trail
            </button>

            <button
              onClick={() => setActiveTab('knowledge')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'knowledge'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Clinical Rules (KB)
            </button>

            <button
              onClick={() => setActiveTab('evaluation')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'evaluation'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              Evaluation Benchmark
            </button>

            <button
              onClick={() => setActiveTab('train')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'train'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <BrainCircuit className="w-3.5 h-3.5" />
              Model Training (ML)
            </button>
          </nav>

          {/* Zone 3: Primary Actions & Presets */}
          <div className="flex items-center gap-2">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  onSelectPreset(e.target.value);
                  e.target.value = '';
                }
              }}
              defaultValue=""
              aria-label="Load clinical benchmark case preset"
              className="text-xs bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-700 font-medium hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="" disabled>
                Load Clinical Case Preset...
              </option>
              <option value="thunderclap">Thunderclap Headache (Emergency SAH)</option>
              <option value="acs_chest">Acute Chest Pain + Arm Radiation (Emergency ACS)</option>
              <option value="stroke_fast">Sudden Slurred Speech &amp; Face Droop (Emergency Stroke)</option>
              <option value="appendicitis">Right Lower Abdominal Pain (High Risk)</option>
              <option value="tension_headache">Tension-Type Headache (Low Risk)</option>
              <option value="mild_cold">Mild Viral Cold &amp; Low Fever (Low Risk)</option>
            </select>

            <button
              onClick={onReset}
              title="Reset current patient session"
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Emergency Active Global Strip */}
      {isEmergencyActive && (
        <div className="bg-red-600 text-white px-4 py-1.5 text-xs font-semibold flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>
              EMERGENCY PROTOCOL ACTIVATED: Configured high-risk red flag pattern matched. Seek immediate emergency evaluation (call 911 / 999 / 112).
            </span>
          </div>
        </div>
      )}
    </header>
  );
};
