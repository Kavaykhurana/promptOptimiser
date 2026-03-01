import { Header } from "@/components/Header";
import { InputPanel } from "@/components/InputPanel";
import { ResultDashboard } from "@/components/ResultDashboard";

export default function AppInterface() {
  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <Header />
      
      {/* Background Gradient Mesh */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10 bg-background">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 -left-40 w-96 h-96 bg-violet-500/5 rounded-full blur-[100px]" />
      </div>

      <main className="flex-1 flex flex-col lg:flex-row gap-6 p-4 lg:p-6 container mx-auto">
        <section className="w-full lg:w-[400px] xl:w-[450px] shrink-0 lg:sticky lg:top-[100px] lg:h-[calc(100vh-140px)] z-10">
          <InputPanel />
        </section>
        
        <section className="flex-1 min-w-0 pb-10">
          <ResultDashboard />
        </section>
      </main>
    </div>
  );
}
