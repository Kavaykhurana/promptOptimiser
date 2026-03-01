"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Copy, Download, Sparkles, CheckCircle2, AlertTriangle, Info, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { getGeminiKey, runPhase3Refinement, calculateHeuristicScore } from "@/lib/gemini";

function ClarityGauge({ score }: { score: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let colorClass = "text-red-500";
  if (score >= 40) colorClass = "text-yellow-500";
  if (score >= 80) colorClass = "text-green-500";

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={radius}
          className="stroke-muted fill-none"
          strokeWidth="8"
        />
        <motion.circle
          cx="50"
          cy="50"
          r={radius}
          className={`${colorClass} fill-none stroke-current`}
          strokeWidth="8"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{score}</span>
      </div>
    </div>
  );
}

export function ResultDashboard() {
  const history = useAppStore((state) => state.history);
  const addHistoryEntry = useAppStore((state) => state.addHistoryEntry);
  const entry = history.length > 0 ? history[0] : null;
  const [isRefining, setIsRefining] = useState(false);

  if (!entry) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-card rounded-2xl border shadow-sm">
        <Sparkles className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-xl font-bold mb-2">No Prompt Data</h3>
        <p className="text-muted-foreground max-w-sm">
          Enter a prompt and configure your targets on the left, then click analyze to see results here.
        </p>
      </div>
    );
  }

  const { analysis, optimizedPrompt } = entry;
  const isOptimizing = analysis !== null && optimizedPrompt === null;
  const isAnalyzing = analysis === null;

  const handleCopy = () => {
    if (optimizedPrompt) {
      navigator.clipboard.writeText(optimizedPrompt);
      toast.success("Copied to clipboard!");
    }
  };

  const handleDownload = () => {
    if (optimizedPrompt) {
      const blob = new Blob([optimizedPrompt], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `optimized-prompt-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleRefine = async () => {
    if (!optimizedPrompt || !entry) return;
    let apiKey = "";
    try {
      apiKey = getGeminiKey();
    } catch {
      toast.error("API Key not found.");
      return;
    }
    setIsRefining(true);
    try {
      const refined = await runPhase3Refinement(entry.rawPrompt, optimizedPrompt, entry.config, apiKey);
      if (refined && refined.trim().length > 0) {
        const optimizedScore = calculateHeuristicScore(refined);
        addHistoryEntry({
          ...entry,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          optimizedPrompt: refined,
          optimizedScore,
        });
        toast.success("Prompt refined successfully!");
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error("Refinement failed: " + (err.message || "Unknown error"));
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[500px] bg-card rounded-2xl border shadow-sm overflow-hidden">
      <div className="flex bg-muted/30 p-4 border-b">
        <div className="flex-1 font-semibold flex items-center gap-2">
          {isAnalyzing ? (
            <Skeleton className="h-6 w-32" />
          ) : (
            <>
              Analysis Results
              <Badge variant="outline" className="ml-2 font-mono text-xs font-normal">
                {analysis?.token_estimate ? `~${analysis.token_estimate} tokens` : "Unknown size"}
              </Badge>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-4 lg:p-6 flex flex-col gap-8">
        {/* Analysis Section */}
        {isAnalyzing ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Score Comparison box */}
            <div className="flex flex-col items-center justify-center p-4 bg-muted/20 border rounded-xl">
              <h4 className="text-sm font-semibold text-muted-foreground mb-1">Prompt Quality Score</h4>
              <p className="text-[10px] text-muted-foreground mb-3">Structure &amp; clarity analysis</p>
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Before</span>
                  <ClarityGauge score={entry.heuristicScore ?? 0} />
                </div>
                {entry.optimizedScore !== undefined && (
                  <>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-lg font-bold text-green-500">→</span>
                      <span className="text-xs font-semibold text-green-500">
                        +{Math.max(0, (entry.optimizedScore ?? 0) - (entry.heuristicScore ?? 0))}
                      </span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">After</span>
                      <ClarityGauge score={entry.optimizedScore} />
                    </div>
                  </>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 justify-center">
                <Badge variant="secondary" className="capitalize">{analysis?.complexity_level || "Unknown"}</Badge>
                {analysis?.tone_detected && (
                  <Badge variant="secondary" className="capitalize">{analysis.tone_detected}</Badge>
                )}
                {analysis?.clarity_score !== undefined && (
                  <Badge variant="outline" className="text-indigo-500 border-indigo-500/30">
                    AI Score: {analysis.clarity_score}
                  </Badge>
                )}
              </div>
            </div>

            {/* Model Fit Scores */}
            <div className="md:col-span-2 p-5 bg-muted/20 border rounded-xl flex flex-col gap-4">
              <h4 className="text-sm font-semibold text-muted-foreground">Model Fit Analysis</h4>
              <div className="space-y-3">
                {[
                  { name: "ChatGPT", score: analysis?.model_fit_score?.chatgpt },
                  { name: "Gemini", score: analysis?.model_fit_score?.gemini },
                  { name: "Claude (Derived)", score: analysis?.model_fit_score?.chatgpt }, // Just an estimate fallback
                  { name: "Code Models", score: analysis?.model_fit_score?.code_model },
                ].map((model, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm w-28 font-medium">{model.name}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-indigo-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${model.score ?? 50}%` }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">{model.score ?? 50}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Improvements Checklist */}
        {!isAnalyzing && analysis?.improvement_strategy && analysis.improvement_strategy.length > 0 && (
          <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-5">
            <h4 className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4" /> Recommended Improvements
            </h4>
            <ul className="space-y-2">
              {analysis.improvement_strategy.map((item, i) => (
                <li key={i} className="text-sm flex gap-2 items-start">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <span className="text-muted-foreground leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Weaknesses/Risks */}
        {!isAnalyzing && analysis?.risk_issues && analysis.risk_issues.length > 0 && (
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-5">
            <h4 className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Ambiguities & Risks
            </h4>
            <ul className="space-y-2">
              {analysis.risk_issues.map((item, i) => (
                <li key={i} className="text-sm flex gap-2 items-start text-orange-700/80 dark:text-orange-300/80">
                  <span className="select-none">•</span>
                  <span>{item}</span>
                </li>
              ))}
              {analysis.ambiguities?.map((item, i) => (
                <li key={`a-${i}`} className="text-sm flex gap-2 items-start text-orange-700/80 dark:text-orange-300/80">
                  <span className="select-none">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Optimized Prompt Output */}
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              Optimized Prompt
            </h3>
            {optimizedPrompt && (
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={handleRefine} disabled={isRefining}>
                  {isRefining ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Refining...</>
                  ) : (
                    <><RefreshCw className="w-4 h-4 mr-2" />Refine Further</>
                  )}
                </Button>
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  Save .txt
                </Button>
              </div>
            )}
          </div>
          
          <div className="relative min-h-[200px] border rounded-xl overflow-hidden bg-muted/10 p-4">
            {isOptimizing ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm z-10 gap-3">
                <Sparkles className="w-6 h-6 animate-spin text-indigo-500" />
                <p className="font-medium text-sm animate-pulse text-indigo-500">Generating Optimization...</p>
              </div>
            ) : null}
            
            {optimizedPrompt ? (
              <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                {optimizedPrompt}
              </pre>
            ) : isOptimizing ? (
              <Skeleton className="h-full w-full opacity-50" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm py-12">
                Optimization failed or was skipped.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
