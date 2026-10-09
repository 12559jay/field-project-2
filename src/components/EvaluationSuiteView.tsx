import React, { useState } from 'react';
import {
  FlaskConical,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  RotateCcw,
} from 'lucide-react';
import {
  runClinicalEvaluationSuite,
  CLINICAL_EVALUATION_DATASET,
} from '../evaluation/evaluationDataset';
import { EvaluationResult } from '../types/clinical';

export const EvaluationSuiteView: React.FC = () => {
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(() =>
    runClinicalEvaluationSuite()
  );
  const [isRunning, setIsRunning] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const handleRunEvaluation = () => {
    setIsRunning(true);
    setTimeout(() => {
      const res = runClinicalEvaluationSuite();
      setEvaluationResult(res);
      setIsRunning(false);
    }, 400);
  };

  const selectedCase = CLINICAL_EVALUATION_DATASET.find((c) => c.id === selectedCaseId);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-slate-700" />
            Clinical Evaluation &amp; Benchmarking Suite (Section 53)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gold-standard anonymized test dataset evaluating safety sensitivity, specificity, and false negatives.
          </p>
        </div>

        <button
          onClick={handleRunEvaluation}
          disabled={isRunning}
          className="px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
        >
          {isRunning ? (
            <>
              <RotateCcw className="w-3.5 h-3.5 animate-spin" />
              <span>Evaluating Dataset...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              <span>Run Benchmark Suite</span>
            </>
          )}
        </button>
      </div>

      {/* Metrics Summary Cards */}
      {evaluationResult && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Safety Sensitivity
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-600 tabular-nums">
                {evaluationResult.safetySensitivity}%
              </span>
              <span className="text-xs text-slate-500">of critical cases caught</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Goal: &ge; 98% (zero critical misses)
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Clinical Specificity
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-indigo-600 tabular-nums">
                {evaluationResult.specificity}%
              </span>
              <span className="text-xs text-slate-500">non-urgent cases</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Avoids excessive false emergency alerts
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              False Negatives (Critical)
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={`text-3xl font-extrabold tabular-nums ${
                  evaluationResult.falseNegatives.length === 0
                    ? 'text-emerald-600'
                    : 'text-red-600'
                }`}
              >
                {evaluationResult.falseNegatives.length}
              </span>
              <span className="text-xs text-slate-500">dangerous cases missed</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Zero tolerance threshold for high risk
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              False Positives
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-800 tabular-nums">
                {evaluationResult.falsePositives.length}
              </span>
              <span className="text-xs text-slate-500">over-flagged cases</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Monitored for alert fatigue
            </p>
          </div>
        </div>
      )}

      {/* Benchmark Case Execution Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Gold-Standard Case Evaluation Results
            </h2>
            <span className="text-xs text-slate-500 tabular-nums">
              {evaluationResult?.details.length} test cases verified
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Case ID &amp; Title</th>
                  <th className="px-4 py-3">Expected Risk</th>
                  <th className="px-4 py-3">Detected Risk</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3 text-right">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {evaluationResult?.details.map((row) => (
                  <tr
                    key={row.caseId}
                    onClick={() => setSelectedCaseId(row.caseId)}
                    className={`cursor-pointer hover:bg-slate-50 transition-colors ${
                      selectedCaseId === row.caseId ? 'bg-slate-100/70' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{row.caseTitle}</div>
                      <div className="text-[11px] font-mono text-slate-400">{row.caseId}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      {row.expectedRisk}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                          row.actualRisk === 'EMERGENCY'
                            ? 'bg-red-100 text-red-800'
                            : row.actualRisk === 'HIGH'
                            ? 'bg-amber-100 text-amber-900'
                            : row.actualRisk === 'MODERATE'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {row.actualRisk}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 capitalize">
                      {row.actualAction?.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.pass ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          PASS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded text-[11px]">
                          <XCircle className="w-3.5 h-3.5" />
                          FAIL
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Benchmark Case Inspector */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
            Benchmark Case Specification
          </h3>

          {selectedCase ? (
            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-slate-500 font-semibold block">Case Title:</span>
                <span className="font-bold text-slate-900">{selectedCase.title}</span>
              </div>

              <div>
                <span className="text-slate-500 font-semibold block">Clinical Category:</span>
                <span className="text-slate-800">{selectedCase.correct_clinical_category}</span>
              </div>

              <div>
                <span className="text-slate-500 font-semibold block">Clinical Narrative:</span>
                <p className="text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-100 mt-1 leading-relaxed">
                  "{selectedCase.narrative}"
                </p>
              </div>

              <div>
                <span className="text-slate-500 font-semibold block mb-1">
                  Relevant Red Flags:
                </span>
                {selectedCase.relevant_red_flags.length > 0 ? (
                  <ul className="space-y-1">
                    {selectedCase.relevant_red_flags.map((rf, idx) => (
                      <li
                        key={idx}
                        className="text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-100 font-medium"
                      >
                        ⚠️ {rf}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-slate-400 italic">None (Low-risk control case)</span>
                )}
              </div>

              <div>
                <span className="text-slate-500 font-semibold block mb-1">
                  Clinician Gold-Standard Assessment:
                </span>
                <p className="text-slate-800 font-medium bg-slate-50 p-2.5 rounded border border-slate-100 leading-relaxed">
                  {selectedCase.clinician_assessment}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic py-8 text-center">
              Click any benchmark case row to inspect clinical notes, red flags, and expected targets.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
