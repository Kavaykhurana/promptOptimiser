"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getGeminiKey, runPhase1Analysis, runPhase2Optimization, runPhase3Refinement, calculateHeuristicScore } from "@/lib/gemini";

export function InputPanel() {
  const { config, setConfig, addHistoryEntry, setHasKey } = useAppStore();
  const [rawPrompt, setRawPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingPhase, setProcessingPhase] = useState<"IDLE" | "ANALYZING" | "OPTIMIZING" | "REFINING">("IDLE");

  const MAX_CHARS = Number(process.env.NEXT_PUBLIC_MAX_INPUT_CHARS || "15000");

  const handleProcess = async () => {
    if (!rawPrompt.trim()) {
      toast.error("Please enter a prompt first.");
      return;
    }
    if (rawPrompt.length > MAX_CHARS) {
      toast.error(`Prompt exceeds ${MAX_CHARS} characters.`);
      return;
    }
    
    let apiKey = "";
    try {
      apiKey = getGeminiKey();
    } catch {
      setHasKey(false);
      toast.error("API Key not found. Please connect your key.");
      return;
    }

    setIsProcessing(true);
    let analysisResult = null;
    let heuristicScore = 0;
    
    // PHASE 1
    setProcessingPhase("ANALYZING");
    try {
      const { analysis, heuristicScore: hs } = await runPhase1Analysis(rawPrompt, config, apiKey);
      analysisResult = analysis;
      heuristicScore = hs;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error(err);
      toast.error("Analysis failed: " + (err.message || "Unknown error"));
      setIsProcessing(false);
      setProcessingPhase("IDLE");
      return;
    }

    // PHASE 2 (short pause to avoid rate limiting on free Gemini tier)
    await new Promise((r) => setTimeout(r, 2000));
    setProcessingPhase("OPTIMIZING");
    let optimizedPrompt = null;
    try {
      optimizedPrompt = await runPhase2Optimization(rawPrompt, analysisResult, config, apiKey);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error(err);
      toast.error("Optimization failed: " + (err.message || "Unknown error"));
    }

    // PHASE 3 - Self-refinement critique pass (short pause to avoid rate limiting)
    if (optimizedPrompt) {
      await new Promise((r) => setTimeout(r, 2000));
      setProcessingPhase("REFINING");
      try {
        const refined = await runPhase3Refinement(rawPrompt, optimizedPrompt, config, apiKey);
        if (refined && refined.trim().length > 0) {
          optimizedPrompt = refined;
        }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.warn("Phase 3 refinement failed, using Phase 2 output:", err);
        // Non-fatal: we still have the Phase 2 output
      }
    }

    // Compute post-optimization score
    const optimizedScore = optimizedPrompt ? calculateHeuristicScore(optimizedPrompt) : undefined;

    // Save to History Event
    const entry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      rawPrompt,
      config: { ...config },
      analysis: analysisResult,
      optimizedPrompt,
      heuristicScore,
      optimizedScore,
    };
    
    addHistoryEntry(entry);
    
    setIsProcessing(false);
    setProcessingPhase("IDLE");
    toast.success("Prompt optimization complete!");
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border shadow-sm p-6 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">Raw Prompt</h2>
        <p className="text-sm text-muted-foreground">Type or paste the prompt you want to optimize.</p>
      </div>

      <div className="relative mb-6">
        <Textarea
          value={rawPrompt}
          onChange={(e) => setRawPrompt(e.target.value)}
          placeholder="e.g. Write a blog about react hooks."
          className="min-h-[200px] resize-y bg-background text-base"
          disabled={isProcessing}
        />
        <div className="absolute bottom-3 right-3 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
          <span className={rawPrompt.length > MAX_CHARS ? "text-red-500" : ""}>
            {rawPrompt.length}
          </span>{" "}
          / {MAX_CHARS}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="space-y-2">
          <Label>Target Model</Label>
          <Select
            value={config.targetModel}
            onValueChange={(v: string) => setConfig({ targetModel: v })}
            disabled={isProcessing}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ChatGPT">ChatGPT</SelectItem>
              <SelectItem value="Gemini">Gemini</SelectItem>
              <SelectItem value="Claude">Claude</SelectItem>
              <SelectItem value="Image Model (Midjourney/DALL-E)">Image Model</SelectItem>
              <SelectItem value="Code Generator (Copilot/Cursor)">Code Generator</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Goal Type</Label>
          <Select
            value={config.goalType}
            onValueChange={(v: string) => setConfig({ goalType: v })}
            disabled={isProcessing}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Blog">Blog post</SelectItem>
              <SelectItem value="Technical">Technical Writing</SelectItem>
              <SelectItem value="Code">Coding/Development</SelectItem>
              <SelectItem value="Marketing">Marketing/Copywriting</SelectItem>
              <SelectItem value="Research">Research/Analysis</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Output Format</Label>
          <Select
            value={config.outputFormat}
            onValueChange={(v: string) => setConfig({ outputFormat: v })}
            disabled={isProcessing}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Markdown">Markdown</SelectItem>
              <SelectItem value="JSON">JSON</SelectItem>
              <SelectItem value="Plain Text">Plain Text</SelectItem>
              <SelectItem value="Code Block">Code Block Format</SelectItem>
              <SelectItem value="HTML">HTML</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Depth Mode</Label>
          <Select
            value={config.depthMode}
            onValueChange={(v: string) => setConfig({ depthMode: v })}
            disabled={isProcessing}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Basic">Basic outline</SelectItem>
              <SelectItem value="Structured">Structured content</SelectItem>
              <SelectItem value="Expert">Expert-level detail</SelectItem>
              <SelectItem value="Hard Constraint">Hard constraints (Strict)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t">
        <Button
          size="lg"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-2 h-14 text-lg rounded-xl transition-all active:scale-[0.98]"
          onClick={handleProcess}
          disabled={!rawPrompt.trim() || isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {processingPhase === "ANALYZING" ? "Analyzing Prompt..." : processingPhase === "OPTIMIZING" ? "Optimizing..." : "Refining..."}
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Analyze & Optimize
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
