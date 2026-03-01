"use client";

import { useAppStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KeyRound, Sparkles } from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { ApiKeyModal } from "./ApiKeyModal";

export function Header() {
  const hasKey = useAppStore((state) => state.hasKey);
  const setHasKey = useAppStore((state) => state.setHasKey);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRemoveKey = () => {
    localStorage.removeItem("pf_gemini_key");
    setHasKey(false);
    setIsModalOpen(true);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">PromptForge</span>
          </div>
          
          <div className="flex items-center gap-4">
            {hasKey ? (
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900 gap-1.5 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Key Active
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(true)} className="text-xs">
                  Change Key
                </Button>
                <Button variant="ghost" size="sm" onClick={handleRemoveKey} className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                  Remove Key
                </Button>
              </div>
            ) : (
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-200 dark:border-yellow-900 gap-1.5 py-1 cursor-pointer" onClick={() => setIsModalOpen(true)}>
                <KeyRound className="w-3 h-3" />
                No Key Set
              </Badge>
            )}
            <div className="w-px h-6 bg-border mx-1" />
            <ThemeToggle />
          </div>
        </div>
      </header>
      
      <ApiKeyModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} isClosable={hasKey} />
    </>
  );
}
