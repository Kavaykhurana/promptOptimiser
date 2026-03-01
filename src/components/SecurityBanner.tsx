"use client";

import { ShieldCheck, Lock, Eye, Server, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

const securityPoints = [
  {
    icon: Lock,
    title: "Client-Side Only Processing",
    description:
      "Your API key and prompts never leave your browser. All Gemini API calls are made directly from your device — zero server-side proxying.",
  },
  {
    icon: Eye,
    title: "Zero Tracking & Logging",
    description:
      "PromptForge has no analytics, no cookies, no telemetry, no tracking pixels. We literally cannot see what you type.",
  },
  {
    icon: Server,
    title: "No Backend, No Database",
    description:
      "There are no API routes, no server-side endpoints, no databases. The app is statically served. Your data physically cannot be intercepted by us.",
  },
  {
    icon: Trash2,
    title: "One-Click Data Purge",
    description:
      'Your API key is stored in localStorage under a single key. Click "Remove Key" in the header or clear site data in your browser to erase everything instantly.',
  },
  {
    icon: ShieldCheck,
    title: "Hardened Security Headers",
    description:
      "CSP restricts all network requests to only the Gemini API. X-Frame-Options DENY prevents clickjacking. HSTS enforces HTTPS. FLoC/Interest Cohort tracking is disabled.",
  },
];

export function SecurityBanner() {
  return (
    <section className="py-20 border-t border-border/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-sm font-medium mb-4">
            <ShieldCheck className="w-4 h-4" />
            <span>Security Architecture</span>
          </div>
          <h2 className="text-3xl font-bold mb-3">
            Your Data Never Leaves Your Browser
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            PromptForge is architected from the ground up for absolute privacy.
            Here&apos;s exactly how we protect your data.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {securityPoints.map((point, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              viewport={{ once: true }}
              className="p-5 bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-600 dark:text-green-400 mb-3">
                <point.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold mb-2">{point.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {point.description}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 max-w-3xl mx-auto bg-green-500/5 border border-green-500/20 rounded-xl p-6 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-green-600 dark:text-green-400">
              Network Proof:
            </strong>{" "}
            Open your browser&apos;s DevTools → Network tab while using
            PromptForge. The <em>only</em> external request you will see is to{" "}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
              generativelanguage.googleapis.com
            </code>
            . No other data leaves your machine.
          </p>
        </div>
      </div>
    </section>
  );
}
