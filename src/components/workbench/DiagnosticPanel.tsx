import React, { useState } from 'react';
import {
  AlertTriangle,
  XCircle,
  Info,
  Wrench,
  Check,
  X,
} from 'lucide-react';
import { ParserDiagnostic } from '../../engine/types';

interface DiagnosticPanelProps {
  diagnostics: ParserDiagnostic[];
  onApplyGrammarCorrection?: (correctedGrammar: string) => void;
  onApplyInputCorrection?: (correctedInput: string) => void;
}

const CATEGORY_LABELS: Record<ParserDiagnostic['category'], string> = {
  'invalid-grammar': 'Invalid Grammar',
  'unsupported-algorithm': 'Unsupported by Selected Algorithm',
  'parsing-conflict': 'Parsing Table Conflict',
  'runtime-error': 'Input / Runtime Syntax Error',
};

export const DiagnosticPanel: React.FC<DiagnosticPanelProps> = ({
  diagnostics,
  onApplyGrammarCorrection,
  onApplyInputCorrection,
}) => {
  const [previewId, setPreviewId] = useState<string | null>(null);

  if (diagnostics.length === 0) return null;

  return (
    <div className="space-y-3" aria-label="Grammar and parsing diagnostics">
      {diagnostics.map((diag) => {
        const isError = diag.severity === 'error';
        const isWarning = diag.severity === 'warning';
        const isPreviewing = previewId === diag.id;

        const borderClass = isError
          ? 'border-[#EBA8B8] bg-[#FDECEF]'
          : isWarning
          ? 'border-[#E6C594] bg-[#FDF4E6]'
          : 'border-[#E8B4C9] bg-[#FCEAF1]';

        const titleColor = isError
          ? 'text-[#9F1936]'
          : isWarning
          ? 'text-[#874B0D]'
          : 'text-[#8F1F4C]';

        return (
          <div
            key={diag.id}
            className={`rounded-xl border p-4 space-y-2.5 ${borderClass}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                {isError ? (
                  <XCircle className="w-4 h-4 text-[#B51D3D] shrink-0 mt-0.5" />
                ) : isWarning ? (
                  <AlertTriangle className="w-4 h-4 text-[#9C5B12] shrink-0 mt-0.5" />
                ) : (
                  <Info className="w-4 h-4 text-[#C93B72] shrink-0 mt-0.5" />
                )}
                <div>
                  <h3 className={`font-display font-semibold text-sm ${titleColor}`}>
                    {diag.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#785D68] mt-0.5">
                    <span>{CATEGORY_LABELS[diag.category]}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-[#4C3640]">{diag.location}</span>
                  </div>
                </div>
              </div>

              {(diag.correctedGrammar || diag.correctedInput) &&
                (onApplyGrammarCorrection || onApplyInputCorrection) && (
                  <button
                    type="button"
                    onClick={() => setPreviewId(isPreviewing ? null : diag.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FFFDF9] border border-[#D99BB3] text-[#9D2454] hover:bg-[#FCEAF1] transition-colors cursor-pointer whitespace-nowrap shadow-xs"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    {isPreviewing ? 'Close Preview' : 'Preview Suggested Fix'}
                  </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed pt-1">
              <div className="space-y-1">
                <div className="text-[#785D68] font-medium">Why it occurred</div>
                <p className="text-[#2B1B22]">{diag.explanation}</p>
                <p className="text-[#6E535E]">
                  <span className="text-[#4C3640] font-semibold">Violated Rule: </span>
                  {diag.violatedRule}
                </p>
              </div>
              <div className="space-y-1">
                <div className="text-[#785D68] font-medium">Suggested Correction</div>
                <p className="text-[#2B1B22]">{diag.suggestion}</p>
                {diag.noteUniqueness && (
                  <p className="text-[#785D68] italic">{diag.noteUniqueness}</p>
                )}
              </div>
            </div>

            {/* Preview & Explicit Confirmation Drawer */}
            {isPreviewing && (diag.correctedGrammar || diag.correctedInput) && (
              <div className="rounded-lg bg-[#FFFDF9] border border-[#E0A4BE] p-3.5 space-y-3 mt-2 shadow-xs">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-[#8F1F4C]">
                    Correction Preview — Confirm before applying
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewId(null)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-[#F4E9DD] text-[#4C3640] hover:bg-[#EAD8C6] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (diag.correctedGrammar && onApplyGrammarCorrection) {
                          onApplyGrammarCorrection(diag.correctedGrammar);
                        } else if (diag.correctedInput && onApplyInputCorrection) {
                          onApplyInputCorrection(diag.correctedInput);
                        }
                        setPreviewId(null);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#C93B72] text-white hover:bg-[#AD2B5D] cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Confirm &amp; Apply Fix
                    </button>
                  </div>
                </div>
                <pre className="font-mono text-xs text-[#166A4A] bg-[#F5FBF8] rounded-md p-3 overflow-x-auto border border-[#BCE2D0]">
                  {diag.correctedGrammar ?? diag.correctedInput}
                </pre>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
