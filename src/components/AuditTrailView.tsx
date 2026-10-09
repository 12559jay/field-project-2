import React, { useState } from 'react';
import {
  FileText,
  UserCheck,
  Download,
  Filter,
  CheckCircle2,
  Code2,
  Copy,
  Check,
  FileDown,
  Layers,
} from 'lucide-react';
import { AuditTrailEntry } from '../types/clinical';

interface AuditTrailViewProps {
  auditTrail: AuditTrailEntry[];
}

/**
 * Generates an executive, formatted plain-text medical summary
 * suitable for inclusion in EHR/EMR systems, clinical audit documentation,
 * or printed medical records.
 */
function generateAuditTextSummary(
  entries: AuditTrailEntry[],
  scope: 'all' | 'filtered' = 'all',
  totalCount: number = entries.length
): string {
  const timestamp = new Date().toLocaleString();
  const emergencies = entries.filter((e) => e.risk_level === 'EMERGENCY').length;
  const highs = entries.filter((e) => e.risk_level === 'HIGH').length;
  const moderates = entries.filter((e) => e.risk_level === 'MODERATE').length;
  const lows = entries.filter((e) => e.risk_level === 'LOW').length;
  const overrides = entries.filter((e) => e.doctor_override).length;

  let text = '';
  text += '================================================================================\n';
  text += '           CLINICAL DECISION AUDIT TRAIL & MEDICAL RECORD SUMMARY               \n';
  text += '================================================================================\n';
  text += `Document Generated : ${timestamp}\n`;
  text += `Audit Scope        : ${scope === 'filtered' ? `Filtered Selection (${entries.length} of ${totalCount} records)` : `Complete Audit Ledger (${entries.length} records)`}\n`;
  text += `System Application : Clinical Recommendation & Decision Support System\n`;
  text += `Regulatory Class   : Clinical Governance & Decision Support (Non-Diagnostic)\n`;
  text += '--------------------------------------------------------------------------------\n';
  text += 'AGGREGATE SUMMARY METRICS:\n';
  text += `  * Total Records Included : ${entries.length}\n`;
  text += `  * Life-Threatening/Emerg : ${emergencies}\n`;
  text += `  * High Risk Cases        : ${highs}\n`;
  text += `  * Moderate Risk Cases    : ${moderates}\n`;
  text += `  * Low Risk / Routine     : ${lows}\n`;
  text += `  * Physician Overrides    : ${overrides}\n`;
  text += '================================================================================\n\n';

  if (entries.length === 0) {
    text += 'No audit trail entries found matching current criteria.\n\n';
  } else {
    entries.forEach((entry, idx) => {
      text += `--------------------------------------------------------------------------------\n`;
      text += `ENTRY #${idx + 1} | AUDIT ID: ${entry.id}\n`;
      text += `--------------------------------------------------------------------------------\n`;
      text += `Patient ID       : ${entry.patient_id}\n`;
      text += `State Version    : v${entry.patient_state_version}\n`;
      text += `Timestamp        : ${new Date(entry.timestamp).toLocaleString()} (UTC: ${entry.timestamp})\n`;
      text += `Assessed Risk    : ${entry.risk_level}\n`;
      text += `Recommended Action: ${entry.recommended_action?.replace(/_/g, ' ').toUpperCase()}\n`;
      text += `Governance State : ${entry.doctor_override ? 'PHYSICIAN OVERRIDE APPLIED' : 'Algorithmic Determination Accepted'}\n`;

      if (entry.doctor_override && entry.doctor_override_details) {
        const d = entry.doctor_override_details;
        text += `\n[PHYSICIAN OVERRIDE GOVERNANCE NOTE]\n`;
        text += `  Attending Clinician: ${d.doctor_name} (ID: ${d.doctor_id})\n`;
        text += `  Override Timestamp : ${new Date(d.timestamp).toLocaleString()}\n`;
        text += `  Risk Transition    : ${d.original_risk_level} -> ${d.overridden_risk_level}\n`;
        text += `  Action Transition  : ${d.original_action?.replace(/_/g, ' ')} -> ${d.overridden_action?.replace(/_/g, ' ')}\n`;
        text += `  Clinical Rationale : ${d.rationale}\n`;
      }

      if (entry.possible_conditions && entry.possible_conditions.length > 0) {
        text += `\n[EVALUATED CLINICAL CONDITIONS & CATEGORIES]\n`;
        entry.possible_conditions.forEach((cond) => {
          text += `  - ${cond}\n`;
        });
      }

      if (entry.evidence && entry.evidence.length > 0) {
        text += `\n[PATIENT INTAKE & VERIFIABLE CLINICAL EVIDENCE]\n`;
        entry.evidence.forEach((ev) => {
          text += `  * ${ev}\n`;
        });
      }

      if (entry.rules_triggered && entry.rules_triggered.length > 0) {
        text += `\n[CLINICAL RULES TRIGGERED]\n`;
        entry.rules_triggered.forEach((rule) => {
          text += `  * [RULE] ${rule}\n`;
        });
      }

      if (entry.missing_information && entry.missing_information.length > 0) {
        text += `\n[MISSING CLINICAL INFORMATION AT TIME OF TRIAGE]\n`;
        entry.missing_information.forEach((m) => {
          text += `  ? ${m}\n`;
        });
      }

      text += `\n`;
    });
  }

  text += '================================================================================\n';
  text += 'CONFIDENTIALITY & LEGAL NOTICE:\n';
  text += 'This document contains confidential patient triage & medical governance records.\n';
  text += 'Unauthorized dissemination or copying is strictly prohibited.\n';
  text += 'For inclusion in patient health charts, medical audits, or quality reviews.\n';
  text += '================================================================================\n';

  return text;
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ auditTrail }) => {
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterOverrideOnly, setFilterOverrideOnly] = useState<boolean>(false);
  const [selectedEntry, setSelectedEntry] = useState<AuditTrailEntry | null>(null);
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);

  const filteredLogs = auditTrail.filter((item) => {
    if (filterLevel !== 'all' && item.risk_level !== filterLevel) return false;
    if (filterOverrideOnly && !item.doctor_override) return false;
    return true;
  });

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = url;
    downloadAnchor.download = filename;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
  };

  // Download entire or filtered audit log as JSON
  const handleDownloadJSON = (useFiltered: boolean = false) => {
    const target = useFiltered ? filteredLogs : auditTrail;
    const jsonStr = JSON.stringify(target, null, 2);
    const scopeName = useFiltered ? 'filtered' : 'complete';
    const filename = `clinical_audit_${scopeName}_${Date.now()}.json`;
    downloadFile(jsonStr, filename, 'application/json');
  };

  // Download entire or filtered audit log as formatted Text Summary (.txt)
  const handleDownloadTextSummary = (useFiltered: boolean = false) => {
    const target = useFiltered ? filteredLogs : auditTrail;
    const summary = generateAuditTextSummary(target, useFiltered ? 'filtered' : 'all', auditTrail.length);
    const scopeName = useFiltered ? 'filtered' : 'complete';
    const filename = `medical_record_audit_${scopeName}_${Date.now()}.txt`;
    downloadFile(summary, filename, 'text/plain;charset=utf-8');
  };

  // Copy text summary to clipboard for instant EHR pasting
  const handleCopySummary = (useFiltered: boolean = false) => {
    const target = useFiltered ? filteredLogs : auditTrail;
    const summary = generateAuditTextSummary(target, useFiltered ? 'filtered' : 'all', auditTrail.length);
    navigator.clipboard.writeText(summary).then(() => {
      setCopiedStatus('summary');
      setTimeout(() => setCopiedStatus(null), 2500);
    });
  };

  // Download single record
  const handleDownloadSingleEntry = (entry: AuditTrailEntry, format: 'txt' | 'json') => {
    if (format === 'json') {
      const jsonStr = JSON.stringify(entry, null, 2);
      downloadFile(jsonStr, `audit_record_${entry.id}.json`, 'application/json');
    } else {
      const summary = generateAuditTextSummary([entry], 'filtered', 1);
      downloadFile(summary, `audit_record_${entry.id}.txt`, 'text/plain;charset=utf-8');
    }
  };

  // Copy single record note
  const handleCopySingleEntry = (entry: AuditTrailEntry) => {
    const summary = generateAuditTextSummary([entry], 'filtered', 1);
    navigator.clipboard.writeText(summary).then(() => {
      setCopiedStatus(`entry-${entry.id}`);
      setTimeout(() => setCopiedStatus(null), 2500);
    });
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Header & Export Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-slate-700" />
            Clinical Recommendation Audit Trail
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable regulatory and clinical governance ledger tracking patient state versions, evidence, decision rules, and physician overrides.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Download Text Summary */}
          <button
            onClick={() => handleDownloadTextSummary(filterLevel !== 'all' || filterOverrideOnly)}
            disabled={auditTrail.length === 0}
            className="px-3.5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            title="Download formatted text clinical summary for medical charts"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>
              Download Text Summary (.txt)
              {filterLevel !== 'all' || filterOverrideOnly ? ' (Filtered)' : ''}
            </span>
          </button>

          {/* Download JSON File */}
          <button
            onClick={() => handleDownloadJSON(filterLevel !== 'all' || filterOverrideOnly)}
            disabled={auditTrail.length === 0}
            className="px-3.5 py-2 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            title="Download structured JSON file for medical database archives"
          >
            <Code2 className="w-3.5 h-3.5 text-slate-600" />
            <span>
              Download JSON Log (.json)
              {filterLevel !== 'all' || filterOverrideOnly ? ' (Filtered)' : ''}
            </span>
          </button>

          {/* Copy Summary to Clipboard */}
          <button
            onClick={() => handleCopySummary(filterLevel !== 'all' || filterOverrideOnly)}
            disabled={auditTrail.length === 0}
            className="px-3 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
            title="Copy formatted summary to clipboard for EHR pasting"
          >
            {copiedStatus === 'summary' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Summary</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Risk:</span>
          </div>
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1 text-slate-700 font-medium focus:outline-none"
          >
            <option value="all">All Risk Levels</option>
            <option value="LOW">LOW</option>
            <option value="MODERATE">MODERATE</option>
            <option value="HIGH">HIGH</option>
            <option value="EMERGENCY">EMERGENCY</option>
          </select>

          <label className="flex items-center gap-2 cursor-pointer ml-2">
            <input
              type="checkbox"
              checked={filterOverrideOnly}
              onChange={(e) => setFilterOverrideOnly(e.target.checked)}
              className="rounded text-slate-900 focus:ring-slate-900"
            />
            <span className="text-slate-700 font-medium">Doctor Overrides Only</span>
          </label>
        </div>

        <div className="flex items-center gap-3 text-slate-500 text-xs">
          <span className="tabular-nums">
            Showing <strong className="text-slate-800">{filteredLogs.length}</strong> of{' '}
            <strong className="text-slate-800">{auditTrail.length}</strong> records
          </span>
          {(filterLevel !== 'all' || filterOverrideOnly) && (
            <button
              onClick={() => {
                setFilterLevel('all');
                setFilterOverrideOnly(false);
              }}
              className="text-indigo-600 hover:text-indigo-800 underline font-medium"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Audit Log Table and Detail Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Timestamp / Version</th>
                  <th className="px-4 py-3">Risk Level</th>
                  <th className="px-4 py-3">Recommended Action</th>
                  <th className="px-4 py-3">Rules Triggered</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((entry) => (
                    <tr
                      key={entry.id}
                      onClick={() => setSelectedEntry(entry)}
                      className={`cursor-pointer hover:bg-slate-50 transition-colors ${
                        selectedEntry?.id === entry.id ? 'bg-indigo-50/70 border-l-4 border-indigo-600' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 tabular-nums">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          State v{entry.patient_state_version} · {entry.patient_id}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                            entry.risk_level === 'EMERGENCY'
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : entry.risk_level === 'HIGH'
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : entry.risk_level === 'MODERATE'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {entry.risk_level}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 capitalize font-medium">
                        {entry.recommended_action?.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {entry.rules_triggered.length > 0 ? (
                          <span className="font-mono text-[11px] text-slate-600">
                            {entry.rules_triggered[0]}
                            {entry.rules_triggered.length > 1 && ` (+${entry.rules_triggered.length - 1})`}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {entry.doctor_override ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                            <UserCheck className="w-3 h-3" />
                            Overridden
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Algorithmic</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">
                      No audit logs match current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Record Detail Pane */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Audit Entry Inspection
            </h3>
            {selectedEntry && (
              <span className="text-[11px] font-mono text-slate-400">
                {selectedEntry.id}
              </span>
            )}
          </div>

          {selectedEntry ? (
            <div className="space-y-4 text-xs">
              {/* Single Entry Actions */}
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <button
                  onClick={() => handleDownloadSingleEntry(selectedEntry, 'txt')}
                  className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded flex items-center gap-1 transition-colors"
                  title="Download formatted summary of this specific entry"
                >
                  <FileText className="w-3 h-3 text-slate-600" />
                  <span>Export TXT</span>
                </button>
                <button
                  onClick={() => handleDownloadSingleEntry(selectedEntry, 'json')}
                  className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded flex items-center gap-1 transition-colors"
                  title="Download JSON of this specific entry"
                >
                  <Code2 className="w-3 h-3 text-slate-600" />
                  <span>Export JSON</span>
                </button>
                <button
                  onClick={() => handleCopySingleEntry(selectedEntry)}
                  className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded flex items-center gap-1 transition-colors ml-auto"
                  title="Copy this record to clipboard"
                >
                  {copiedStatus === `entry-${selectedEntry.id}` ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Note</span>
                    </>
                  )}
                </button>
              </div>

              <div>
                <span className="text-slate-500 font-semibold block">Timestamp:</span>
                <span className="text-slate-800 font-mono text-[11px]">{selectedEntry.timestamp}</span>
              </div>

              <div>
                <span className="text-slate-500 font-semibold block">Assessed Risk &amp; Action:</span>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                      selectedEntry.risk_level === 'EMERGENCY'
                        ? 'bg-red-100 text-red-800'
                        : selectedEntry.risk_level === 'HIGH'
                        ? 'bg-amber-100 text-amber-900'
                        : selectedEntry.risk_level === 'MODERATE'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {selectedEntry.risk_level}
                  </span>
                  <span className="text-slate-400">→</span>
                  <span className="capitalize font-semibold text-slate-800">
                    {selectedEntry.recommended_action?.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {selectedEntry.doctor_override_details && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 space-y-1.5">
                  <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wide block flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" />
                    Doctor Override Governance Details
                  </span>
                  <p className="text-[11px] text-amber-950 font-semibold">
                    Clinician: {selectedEntry.doctor_override_details.doctor_name} (ID: {selectedEntry.doctor_override_details.doctor_id})
                  </p>
                  <p className="text-[11px] text-amber-800">
                    Rationale: {selectedEntry.doctor_override_details.rationale}
                  </p>
                  <div className="text-[10px] text-amber-700 font-mono">
                    Original: {selectedEntry.doctor_override_details.original_risk_level} ({selectedEntry.doctor_override_details.original_action}) → Overridden: {selectedEntry.doctor_override_details.overridden_risk_level} ({selectedEntry.doctor_override_details.overridden_action})
                  </div>
                </div>
              )}

              {selectedEntry.possible_conditions && selectedEntry.possible_conditions.length > 0 && (
                <div>
                  <span className="text-slate-500 font-semibold block mb-1">Evaluated Conditions:</span>
                  <div className="space-y-1">
                    {selectedEntry.possible_conditions.map((cond, i) => (
                      <div key={i} className="text-[11px] text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 font-medium">
                        • {cond}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <span className="text-slate-500 font-semibold block mb-1">Verifiable Intake Evidence:</span>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {selectedEntry.evidence.map((ev, i) => (
                    <div key={i} className="text-[11px] text-slate-700 bg-slate-50 px-2.5 py-1 rounded border border-slate-100">
                      ✓ {ev}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-semibold block mb-1">Rules Triggered:</span>
                <div className="space-y-1 font-mono text-[11px]">
                  {selectedEntry.rules_triggered.map((r, i) => (
                    <div key={i} className="text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {r}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 font-semibold block mb-1">Raw JSON Audit Record:</span>
                <pre className="p-2.5 bg-slate-900 text-slate-100 rounded text-[10px] overflow-x-auto font-mono max-h-40">
                  {JSON.stringify(selectedEntry, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center space-y-2">
              <FileText className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500 font-medium">No Record Selected</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Click any row in the audit table to view detailed clinical governance metadata or export single entries.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
