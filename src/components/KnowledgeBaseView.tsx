import React, { useState } from 'react';
import { BookOpen, ShieldAlert, HelpCircle, Activity, FileJson } from 'lucide-react';
import { CLINICAL_KNOWLEDGE_BASE } from '../knowledge/clinicalKnowledgeBase';

export const KnowledgeBaseView: React.FC = () => {
  const [selectedComplaint, setSelectedComplaint] = useState<string>('chest_pain');

  const complaints = Object.keys(CLINICAL_KNOWLEDGE_BASE);
  const activeKb = CLINICAL_KNOWLEDGE_BASE[selectedComplaint];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-slate-700" />
            Configurable Clinical Knowledge Base
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Clinician-approved deterministic rules, required safety fields, and question priority hierarchy.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {complaints.map((comp) => (
            <button
              key={comp}
              onClick={() => setSelectedComplaint(comp)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                selectedComplaint === comp
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {comp.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {activeKb && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Complaint Overview & Important Information & Safety Questions */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900">{activeKb.title}</h2>
                <span className="text-xs font-mono text-slate-400">
                  /clinical_rules/{activeKb.complaint}.json
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {activeKb.description}
              </p>

              <div className="pt-3 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700 block mb-2">
                  Important Information Fields:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeKb.important_information.map((f, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-mono"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommended Safety Questions in Priority Order */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between pb-3 border-b border-slate-100">
                <span>Adaptive Safety Questions</span>
                <span className="text-[11px] font-normal text-slate-400">
                  Priority-ordered
                </span>
              </h3>

              <div className="space-y-3">
                {activeKb.recommended_questions.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">
                        Priority #{q.priority} · {q.field}
                      </span>
                      {q.priority <= 2 && (
                        <span className="text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                          Safety First
                        </span>
                      )}
                    </div>
                    <p className="text-slate-800 italic">"{q.question}"</p>
                    <p className="text-[11px] text-slate-500">{q.safety_relevance}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Deterministic Risk Rules & Possible Conditions */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-slate-700" />
                  Deterministic Risk Rules ({activeKb.risk_rules.length})
                </h3>
                <span className="text-xs text-slate-400">
                  Authoritative Clinical Logic
                </span>
              </div>

              <div className="space-y-3">
                {activeKb.risk_rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{rule.name}</span>
                      <span
                        className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                          rule.risk_level === 'EMERGENCY'
                            ? 'bg-red-100 text-red-800'
                            : rule.risk_level === 'HIGH'
                            ? 'bg-amber-100 text-amber-900'
                            : rule.risk_level === 'MODERATE'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {rule.risk_level}
                      </span>
                    </div>

                    <p className="text-slate-700 leading-relaxed">{rule.reason}</p>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>ID: {rule.id}</span>
                      <span>Action: {rule.recommended_action}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Possible Conditions Definitions */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
                Possible Condition Templates (Section 40: Possibilities, Not Diagnoses)
              </h3>

              <div className="space-y-3 text-xs">
                {activeKb.possible_conditions.map((pc, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1"
                  >
                    <div className="font-bold text-slate-900">{pc.name}</div>
                    <div className="text-[11px] text-slate-600">
                      Basis: {pc.reason_template}
                    </div>
                    <div className="text-[11px] text-slate-500 italic">
                      "{pc.caveat}"
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
