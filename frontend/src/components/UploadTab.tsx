import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Download, 
  Settings2,
  Sparkles
} from 'lucide-react';
import { ColumnMapping, ShiftConfig, AttendanceRecord, EmployeeSummary } from '../types/attendance';
import { readExcelFile, downloadSampleExcelTemplate, transformRowsToAttendance } from '../utils/excelParser';
import { generateEmployeeSummaries } from '../utils/calculator';
import { uploadAttendanceFile } from '../services/api';
import { Button, Badge } from './common';

interface UploadTabProps {
  config: ShiftConfig;
  onDataProcessed: (records: AttendanceRecord[], summaries: EmployeeSummary[]) => void;
  onNavigateToLogs: () => void;
}

export const UploadTab: React.FC<UploadTabProps> = ({
  config,
  onDataProcessed,
  onNavigateToLogs,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvancedMapping, setShowAdvancedMapping] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setStatusMessage({ type: 'error', text: 'Please select a valid Excel (.xlsx, .xls) or CSV file.' });
      return;
    }

    setSelectedFile(file);
    setStatusMessage(null);
    setIsLoading(true);

    try {
      const parsed = await readExcelFile(file);
      setHeaders(parsed.headers);
      setMapping(parsed.detectedMapping);
      setPreviewRows(parsed.rawRows.slice(0, 5));
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: 'Failed to read file. Please verify it is a valid spreadsheet.' });
    } finally {
      setIsLoading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleProcess = async () => {
    if (!selectedFile || !mapping) return;
    setIsLoading(true);
    setStatusMessage(null);

    try {
      const res = await uploadAttendanceFile(selectedFile, config, mapping);
      onDataProcessed(res.records, res.summaries);
      setStatusMessage({ 
        type: 'success', 
        text: `Calculated successfully! Saved ${res.records.length} records to Database for ${res.summaries.length} employees.` 
      });
    } catch (err: any) {
      console.warn('Backend upload notice, attempting client processing fallback:', err);
      try {
        const parsed = await readExcelFile(selectedFile);
        const records = transformRowsToAttendance(parsed.rawRows, mapping, config);
        const summaries = generateEmployeeSummaries(records, config);
        onDataProcessed(records, summaries);
        setStatusMessage({ 
          type: 'success', 
          text: `Processed ${records.length} records successfully!` 
        });
      } catch (fallbackErr: any) {
        console.error(fallbackErr);
        setStatusMessage({ 
          type: 'error', 
          text: err?.message || fallbackErr?.message || 'Processing failed. Check column mappings and file format.' 
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Upload Attendance Spreadsheet</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload raw Excel (.xlsx, .csv) logs from any biometric machine. Auto-detects In/Out punches.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={<Download className="w-4 h-4 text-slate-600" />}
          onClick={downloadSampleExcelTemplate}
        >
          Download Sample Template
        </Button>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
            : selectedFile
            ? 'border-emerald-400 bg-emerald-50/20'
            : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
            }
          }}
        />

        <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 shadow-xs">
          <UploadCloud className="w-7 h-7" />
        </div>

        {selectedFile ? (
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{selectedFile.name}</span>
            </div>
            <p className="text-xs text-slate-500">
              {(selectedFile.size / 1024).toFixed(1)} KB • Click or drag another file to replace
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-slate-700">
              Click to select or drag & drop your Excel file here
            </p>
            <p className="text-xs text-slate-400">
              Supports .xlsx, .xls, and .csv formats from any biometric device
            </p>
          </div>
        )}
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-medium ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>

          {statusMessage.type === 'success' && (
            <button
              onClick={onNavigateToLogs}
              className="inline-flex items-center space-x-1 font-bold text-emerald-700 hover:text-emerald-900 underline ml-4 cursor-pointer"
            >
              <span>View Logs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Column Mapping Section */}
      {mapping && headers.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Settings2 className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-slate-800 text-sm">Smart Column Auto-Mapper</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Verify or adjust mapped columns</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Employee ID <span className="text-rose-500">*</span>
              </label>
              <select
                value={mapping.empId}
                onChange={(e) => setMapping({ ...mapping, empId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800"
              >
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Employee Name <span className="text-rose-500">*</span>
              </label>
              <select
                value={mapping.empName}
                onChange={(e) => setMapping({ ...mapping, empName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800"
              >
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Date Column <span className="text-rose-500">*</span>
              </label>
              <select
                value={mapping.date}
                onChange={(e) => setMapping({ ...mapping, date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800"
              >
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                In Time (Punch In) <span className="text-rose-500">*</span>
              </label>
              <select
                value={mapping.inTime}
                onChange={(e) => setMapping({ ...mapping, inTime: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800"
              >
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Out Time (Punch Out) <span className="text-rose-500">*</span>
              </label>
              <select
                value={mapping.outTime}
                onChange={(e) => setMapping({ ...mapping, outTime: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800"
              >
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Department / Category (Optional)
              </label>
              <select
                value={mapping.department || ''}
                onChange={(e) => setMapping({ ...mapping, department: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800"
              >
                <option value="">-- None / Default --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Auto-computation notification & Advanced collapsible */}
          <div className="p-3.5 bg-indigo-50/70 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-2 text-indigo-950 font-medium">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                <strong>100% Auto-Calculated:</strong> Muster (<strong className="text-emerald-700">PP</strong>, <strong className="text-amber-700">PA</strong> 0.5d, <strong className="text-rose-700">AA</strong>), Worktime, Overtime (2-Hour min. rule), and Late/Early flags are generated automatically by the engine!
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowAdvancedMapping(!showAdvancedMapping)}
              className="text-indigo-600 hover:text-indigo-800 font-bold text-[11px] underline shrink-0 cursor-pointer self-start sm:self-auto"
            >
              {showAdvancedMapping ? 'Hide Machine Overrides ▲' : 'Advanced Machine Overrides (Optional) ▼'}
            </button>
          </div>

          {/* Optional Machine Overrides (Collapsed by default) */}
          {showAdvancedMapping && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-[11px] text-slate-400 font-medium mb-3">
                Optional: Only map these if your machine sheet already has pre-computed values you wish to preserve.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Shift (Optional)
                  </label>
                  <select
                    value={mapping.shift || ''}
                    onChange={(e) => setMapping({ ...mapping, shift: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800"
                  >
                    <option value="">-- Auto-detect (KG Default) --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Pre-computed Muster (Optional)
                  </label>
                  <select
                    value={mapping.muster || ''}
                    onChange={(e) => setMapping({ ...mapping, muster: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800"
                  >
                    <option value="">-- Calculate Automatically --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Pre-computed Worktime (Optional)
                  </label>
                  <select
                    value={mapping.worktime || ''}
                    onChange={(e) => setMapping({ ...mapping, worktime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800"
                  >
                    <option value="">-- Calculate from In/Out --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Pre-computed Extra / OT (Optional)
                  </label>
                  <select
                    value={mapping.extra || ''}
                    onChange={(e) => setMapping({ ...mapping, extra: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800"
                  >
                    <option value="">-- Auto-calculate OT --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Late Come Column (Optional)
                  </label>
                  <select
                    value={mapping.lateCome || ''}
                    onChange={(e) => setMapping({ ...mapping, lateCome: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800"
                  >
                    <option value="">-- Auto-detect from Start Time --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Early Go Column (Optional)
                  </label>
                  <select
                    value={mapping.earlyGo || ''}
                    onChange={(e) => setMapping({ ...mapping, earlyGo: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800"
                  >
                    <option value="">-- Auto-detect from End Time --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Late Go Column (Optional)
                  </label>
                  <select
                    value={mapping.lateGo || ''}
                    onChange={(e) => setMapping({ ...mapping, lateGo: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800"
                  >
                    <option value="">-- Auto-detect from End Time --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="pt-3 flex justify-end">
            <Button
              variant="primary"
              size="md"
              isLoading={isLoading}
              icon={<Sparkles className="w-4 h-4" />}
              onClick={handleProcess}
            >
              Process & Calculate Attendance
            </Button>
          </div>
        </div>
      )}

      {/* Raw Sample Preview Table */}
      {previewRows.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Raw File Preview (First {previewRows.length} rows)
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                <tr>
                  {headers.map((h) => (
                    <th key={h} className="py-2 px-3 border-b border-slate-200">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    {headers.map((h) => (
                      <td key={h} className="py-2 px-3 text-slate-600">{String(row[h] || '-')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
