"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { validateGeminiKey } from "@/lib/gemini";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";

interface ApiKeyModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isClosable?: boolean;
}

export function ApiKeyModal({ isOpen, onOpenChange, isClosable = false }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const setHasKey = useAppStore((state) => state.setHasKey);

  // Focus trick (Next.js Hydration issues with autoFocus)
  useEffect(() => {
    if (isOpen) {
      setApiKey("");
    }
  }, [isOpen]);

  const validateAndSaveKey = async () => {
    if (!apiKey.trim()) {
      toast.error("API key cannot be empty.");
      return;
    }

    setIsValidating(true);
    try {
      await validateGeminiKey(apiKey);

      // Key is valid — save it
      localStorage.setItem("pf_gemini_key", apiKey.trim());
      setHasKey(true);
      toast.success("API Key saved securely in your browser!");
      onOpenChange(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err.message === "INVALID_KEY") {
        toast.error("Invalid API key. Double-check it at Google AI Studio.");
      } else {
        toast.error("Network error. Check your connection and try again.");
      }
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (isClosable || open) onOpenChange(open);
      }}
    >
      <DialogContent
        className="sm:max-w-md backdrop-blur-3xl bg-background/80"
        onInteractOutside={(e) => {
          if (!isClosable) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (!isClosable) e.preventDefault();
        }}
        hideCloseButton={!isClosable}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
            <KeyRound className="w-6 h-6 text-indigo-500" />
            Connect Your Gemini API Key
          </DialogTitle>
          <DialogDescription className="text-muted-foreground pt-2 text-base">
            Your key is stored only in your browser. We never see it.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="relative">
            <Input
              id="apiKey"
              type={showKey ? "text" : "password"}
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="pr-10"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            Get your free key at{" "}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-500 hover:underline hover:text-indigo-600 transition-colors"
            >
              Google AI Studio &rarr;
            </a>
          </p>
        </div>
        <Button
          onClick={validateAndSaveKey}
          disabled={isValidating}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
        >
          {isValidating ? "Validating..." : "Save & Continue"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
