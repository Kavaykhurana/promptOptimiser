import Link from "next/link";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, ShieldCheck, Zap, Layers } from "lucide-react";
import { SecurityBanner } from "@/components/SecurityBanner";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Background Gradient Mesh */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 bg-background">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-violet-500/10 rounded-full blur-[100px]" />
      </div>

      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-24 md:py-32 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            <span>Structured Prompt Engineering Platform</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-4xl text-balance">
            Transform Weak Prompts into <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-500">
              Precision Intelligence
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl text-balance">
            Stop guessing what the model wants. Use our two-phase AI pipeline to analyze, score, and optimize your prompts. 
            Bring your own Gemini API key — your data stays in your browser.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/app">
              <Button size="lg" className="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-lg w-full sm:w-auto">
                Try it free — bring your own key
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            <span>Your API key never leaves your browser. Ever.</span>
          </div>
        </section>

        {/* How It Works / Before After */}
        <section className="container mx-auto px-4 py-20 border-t border-border/50 bg-muted/30">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Why Structure Matters</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">See the difference between a raw thought and an engineered prompt.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="bg-background rounded-2xl p-6 border shadow-sm flex flex-col">
              <div className="text-sm font-medium text-red-500 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Raw Query (Score: 24/100)
              </div>
              <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm leading-relaxed flex-1 text-muted-foreground">
                &quot;Write a blog post about react hooks. make it good.&quot;
              </div>
            </div>

            <div className="bg-background rounded-2xl p-6 border border-indigo-500/30 shadow-[0_0_30px_-5px_rgba(99,102,241,0.1)] flex flex-col relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
              <div className="text-sm font-medium text-indigo-500 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                Optimized Prompt (Score: 98/100)
              </div>
              <div className="bg-indigo-500/5 rounded-lg p-4 font-mono text-sm leading-relaxed flex-1">
                You are an expert Frontend Developer and Technical Writer.<br/><br/>
                Write a 1200-word comprehensive technical blog post explaining React Hooks (useState, useEffect, useContext).<br/><br/>
                Output format: Markdown with proper headers and code blocks.<br/><br/>
                Constraints: Do not use class components in examples. Maintain an informative and approachable tone.
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="container mx-auto px-4 py-24">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-2">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold">Client-Side Only</h3>
              <p className="text-muted-foreground">All Gemini AI calls happen directly from your browser. No middleman servers, no rate-limiting, full privacy.</p>
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-500 mb-2">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold">Two-Phase Engine</h3>
              <p className="text-muted-foreground">First we analyze your prompt for weaknesses. Then we reconstruct it using model-specific optimization techniques.</p>
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 mb-2">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold">Full Auditability</h3>
              <p className="text-muted-foreground">Understand exactly why your prompt was changed with our Improvement Strategy checklist and Clarity Scoring.</p>
            </div>
          </div>
        </section>

        {/* Security Architecture Section */}
        <SecurityBanner />
      </main>

      <footer className="border-t border-border/50 py-12 bg-muted/20">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} PromptForge. Built with Next.js & Gemini Free API.</p>
        </div>
      </footer>
    </div>
  );
}
