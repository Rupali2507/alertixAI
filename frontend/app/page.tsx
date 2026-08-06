import Link from "next/link";
import { ArrowRight, Network, Activity, Shield, Globe, Lock, Cpu, Database, Eye, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-void flex flex-col relative overflow-x-hidden selection:bg-brand/30">
      {/* Dynamic Grid & Glow Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-brand/10 rounded-full blur-[150px] mix-blend-screen opacity-60 animate-pulse"></div>
        <div className="absolute top-1/3 left-[-20%] w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[150px] mix-blend-screen opacity-40"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-brand/10 rounded-full blur-[150px] mix-blend-screen opacity-40"></div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-void/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="text-brand" size={24} />
            <span className="font-bold text-xl tracking-tight text-ink">Alertix<span className="text-brand">AI</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-mist">
            <Link href="#architecture" className="hover:text-ink transition-colors">Architecture</Link>
            <Link href="#features" className="hover:text-ink transition-colors">Platform</Link>
            <Link href="/privacy-audit" className="hover:text-ink transition-colors">Trust Center</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-medium text-ink hover:text-brand transition-colors">
              Sign In
            </Link>
            <Link href="/dashboard" className="text-sm font-bold bg-ink text-void px-5 py-2 rounded-lg hover:bg-brand hover:text-white transition-all">
              Launch Console
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center relative z-10 px-6 pt-40 pb-24 text-center">
        {/* Status Badge */}
        <div className="mb-10 flex items-center gap-2 rounded-full border border-brand/30 bg-brand/5 px-5 py-2 text-xs font-semibold text-brand shadow-[0_0_30px_rgba(6,182,212,0.15)] hover:bg-brand/10 transition-colors cursor-default backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
          </span>
          V2.4.1 NEURAL ORCHESTRATOR ONLINE
        </div>

        {/* Hero Title */}
        <h1 className="max-w-5xl text-5xl md:text-7xl font-black tracking-tight text-ink mb-6 drop-shadow-2xl leading-[1.1] font-sans">
          The Identity Immune System <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand via-cyan-400 to-purple-400">
            For Zero-Trust Banking.
          </span>
        </h1>
        
        <p className="max-w-2xl text-lg text-mist mb-12 font-medium leading-relaxed">
          AlertixAI doesn't just detect fraud. It protects identities in real-time using Graph Neural Networks and Behavioral Biometrics, dynamically adjusting friction without interrupting trusted users.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link
            href="/dashboard"
            className="group flex items-center justify-center gap-3 rounded-xl bg-ink text-void px-8 py-4 text-base font-bold transition-all hover:bg-white hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
          >
            Enter SOC Dashboard
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </Link>
          
          <Link
            href="/graph"
            className="group flex items-center justify-center gap-3 rounded-xl border border-brand/40 bg-brand/5 px-8 py-4 text-base font-bold text-brand transition-all hover:bg-brand/10 hover:border-brand/60"
          >
            <Network size={18} className="group-hover:text-brand" />
            Explore 3D Threat Graph
          </Link>
        </div>

        {/* Live Metrics Bar */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-16 border-y border-border/50 py-8 w-full max-w-5xl">
          <div className="flex flex-col items-center justify-center">
             <div className="text-3xl font-black text-ink font-mono mb-1">12<span className="text-brand">ms</span></div>
             <div className="text-xs text-mist uppercase tracking-widest font-semibold">Avg Latency</div>
          </div>
          <div className="flex flex-col items-center justify-center">
             <div className="text-3xl font-black text-ink font-mono mb-1">99.9<span className="text-brand">%</span></div>
             <div className="text-xs text-mist uppercase tracking-widest font-semibold">Precision Rate</div>
          </div>
          <div className="flex flex-col items-center justify-center">
             <div className="text-3xl font-black text-ink font-mono mb-1">4.2<span className="text-brand">B</span></div>
             <div className="text-xs text-mist uppercase tracking-widest font-semibold">Events / Day</div>
          </div>
          <div className="flex flex-col items-center justify-center">
             <div className="text-3xl font-black text-ink font-mono mb-1">Zero</div>
             <div className="text-xs text-mist uppercase tracking-widest font-semibold">PII Exposed</div>
          </div>
        </div>

        {/* Dashboard Preview / Bento Grid */}
        <div id="features" className="mt-32 w-full max-w-6xl text-left space-y-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">Enterprise-Grade Architecture</h2>
            <p className="text-mist text-lg max-w-2xl mx-auto">A modular, privacy-first platform built on Kafka, FastAPI, and PyTorch Geometric.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Large Bento Box 1 */}
            <div className="md:col-span-2 bg-panel border border-border rounded-3xl p-8 relative overflow-hidden group hover:border-brand/50 transition-colors">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-[80px] group-hover:bg-brand/10 transition-colors"></div>
              <Network className="text-brand mb-6" size={32} />
              <h3 className="text-2xl font-bold text-ink mb-3">Graph Neural Networks (GNN)</h3>
              <p className="text-mist leading-relaxed max-w-md">
                We construct a continuously evolving graph of identities, devices, IPs, and transactions. By analyzing the structural topology with GraphSAGE, we expose hidden fraud rings that traditional rules miss.
              </p>
              <div className="mt-8 flex gap-4">
                <div className="bg-panel-2 rounded-lg px-4 py-2 border border-border text-xs font-mono text-faint">Nodes: 145M+</div>
                <div className="bg-panel-2 rounded-lg px-4 py-2 border border-border text-xs font-mono text-faint">Edges: 2.1B+</div>
              </div>
            </div>

            {/* Small Bento Box 1 */}
            <div className="bg-panel border border-border rounded-3xl p-8 relative overflow-hidden group hover:border-purple-500/50 transition-colors">
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[40px] group-hover:bg-purple-500/20 transition-colors"></div>
              <Activity className="text-purple-400 mb-6" size={32} />
              <h3 className="text-xl font-bold text-ink mb-3">Behavioral Autoencoders</h3>
              <p className="text-mist leading-relaxed text-sm">
                Deep autoencoders map typing cadences and mouse trajectories into a latent space. Any deviation from the user's established behavioral biometric baseline is instantly flagged.
              </p>
            </div>

            {/* Small Bento Box 2 */}
            <div className="bg-panel border border-border rounded-3xl p-8 relative overflow-hidden group hover:border-success/50 transition-colors">
               <Shield className="text-success mb-6" size={32} />
               <h3 className="text-xl font-bold text-ink mb-3">Privacy by Design</h3>
               <p className="text-mist leading-relaxed text-sm">
                 Full GDPR and CCPA compliance. All PII is cryptographically hashed (HMAC-SHA256) before entering the ML pipeline.
               </p>
               <Link href="/privacy-audit" className="mt-6 text-sm text-success font-medium flex items-center gap-1 hover:underline">
                 View Trust Center <ArrowRight size={14} />
               </Link>
            </div>

            {/* Large Bento Box 2 */}
            <div className="md:col-span-2 bg-panel border border-border rounded-3xl p-8 relative overflow-hidden group hover:border-warning/50 transition-colors flex flex-col justify-center">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-32 bg-warning/5 -rotate-12 blur-[60px] pointer-events-none"></div>
              <Lock className="text-warning mb-6" size={32} />
              <h3 className="text-2xl font-bold text-ink mb-3">Frictionless Step-Up</h3>
              <p className="text-mist leading-relaxed max-w-lg">
                Stop blocking legitimate users. AlertixAI orchestrates continuous risk assessment. Only when the fused risk score crosses the threshold do we seamlessly trigger FIDO2 or OTP step-up authentication.
              </p>
            </div>
          </div>
        </div>

        {/* Integration / Tech Stack */}
        <div id="architecture" className="mt-32 w-full max-w-5xl py-12 border-t border-border/50 text-center">
          <p className="text-sm font-semibold tracking-widest text-mist uppercase mb-10">Powered by Modern Infrastructure</p>
          <div className="flex flex-wrap justify-center gap-6 md:gap-12 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
             <div className="flex items-center gap-2 text-xl font-bold text-ink"><Cpu /> PyTorch</div>
             <div className="flex items-center gap-2 text-xl font-bold text-ink"><Database /> Apache Kafka</div>
             <div className="flex items-center gap-2 text-xl font-bold text-ink"><Zap /> FastAPI</div>
             <div className="flex items-center gap-2 text-xl font-bold text-ink"><Eye /> Next.js</div>
             <div className="flex items-center gap-2 text-xl font-bold text-ink"><Network /> NetworkX</div>
          </div>
        </div>

      </main>

      <footer className="py-8 text-center text-mist relative z-10 border-t border-border bg-panel-2/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-semibold text-ink text-sm">Alertix<span className="text-brand">AI</span> © {new Date().getFullYear()}</p>
          <div className="flex gap-6 text-sm">
            <Link href="#" className="hover:text-ink transition-colors">Documentation</Link>
            <Link href="/privacy-audit" className="hover:text-ink transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-ink transition-colors">API Reference</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
