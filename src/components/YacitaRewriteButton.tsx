import React, { useState } from 'react';
import { Sparkles, Check, X, RefreshCw } from 'lucide-react';
import { rewriteTextWithYacita, RewriteContext } from '../utils/yacitaAI';

interface YacitaRewriteButtonProps {
  currentText: string;
  field: 'antecedent' | 'behavior' | 'commitments' | 'general';
  onApply: (improvedText: string) => void;
  context?: RewriteContext;
  className?: string;
}

export const YacitaRewriteButton: React.FC<YacitaRewriteButtonProps> = ({
  currentText,
  field,
  onApply,
  context,
  className = '',
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const handleImprove = async () => {
    if (!currentText.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const rewritten = await rewriteTextWithYacita(currentText, field, context);
      setSuggestion(rewritten);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = () => {
    if (suggestion) {
      onApply(suggestion);
      setSuggestion(null);
    }
  };

  const handleDiscard = () => {
    setSuggestion(null);
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Action Button */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleImprove}
          disabled={!currentText.trim() || isLoading}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-gradient-to-r from-amber-500/15 via-blue-500/15 to-indigo-500/15 text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 disabled:opacity-50 transition-all cursor-pointer"
          title="Yacita reescribirá este texto con lenguaje pedagógico, formal y restaurativo"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
              <span>Yacita redactando...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>✨ Mejorar redacción con Yacita</span>
            </>
          )}
        </button>
      </div>

      {/* Suggestion Preview Modal / Card */}
      {suggestion && (
        <div className="p-3 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/90 dark:bg-amber-950/30 text-xs shadow-md animate-in fade-in duration-200 space-y-2">
          <div className="flex items-center justify-between text-amber-900 dark:text-amber-300 font-bold">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              Sugerencia pedagógica de Yacita:
            </span>
          </div>

          <p className="text-slate-800 dark:text-slate-200 leading-relaxed italic bg-white/70 dark:bg-[#0d162d]/70 p-2.5 rounded-lg border border-amber-200/60 dark:border-amber-900/40">
            "{suggestion}"
          </p>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleDiscard}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <X className="w-3 h-3" />
              <span>Descartar</span>
            </button>

            <button
              type="button"
              onClick={handleAccept}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <Check className="w-3 h-3" />
              <span>Aceptar sugerencia</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
