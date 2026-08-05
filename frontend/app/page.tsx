import Link from "next/link";
import { ArrowRight, Network, Fingerprint, Activity, Shield, Zap, Globe, Lock } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-void flex flex-col relative overflow-x-hidden selection:bg-brand/30">
      {/* Dynamic Grid & Glow Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-brand/10 rounded-full blur-[120px] mix-blend-screen opacity-50 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[100px] mix-blend-screen opacity-50"></div>
        <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-danger/5 rounded-full blur-[120px] mix-blend-screen opacity-50"></div>
      </div>

      <main className="flex-1 flex flex-col items-center relative z-10 px-6 pt-32 pb-24 text-center">
        {/* Status Badge */}
        <div className="mb-10 flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-5 py-2 text-sm font-semibold text-brand shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:scale-105 transition-transform cursor-default">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-brand"></span>
          </span>
          Neural Engine Online & Learning
        </div>

        {/* Hero Title */}
        <h1 className="max-w-5xl text-6xl md:text-8xl font-black tracking-tighter text-ink mb-8 drop-shadow-2xl leading-[1.1]">
          Identity Trust. <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand via-cyan-300 to-purple-500">
            Reimagined in 3D.
          </span>
        </h1>
        
        <p className="max-w-3xl text-lg md:text-2xl text-mist mb-14 font-medium leading-relaxed">
          AlertixAI is a continuous, risk-based decision engine that uses PyTorch Geometric and Behavioral Biometrics to stop fraud rings dead in their tracks.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto">
          <Link
            href="/dashboard"
            className="group flex items-center justify-center gap-3 rounded-xl bg-ink text-void px-10 py-5 text-lg font-bold transition-all hover:scale-105 hover:bg-white hover:shadow-[0_0_40px_rgba(255,255,255,0.4)]"
          >
            Launch SOC Dashboard
            <ArrowRight size={20} className="transition-transform group-hover:translate-x-2" />
          </Link>
          
          <Link
            href="/graph"
            className="group flex items-center justify-center gap-3 rounded-xl border-2 border-brand/40 bg-brand/10 px-10 py-5 text-lg font-bold text-brand transition-all hover:bg-brand/20 hover:border-brand hover:shadow-[0_0_40px_rgba(6,182,212,0.3)]"
          >
            <Network size={20} className="group-hover:animate-pulse" />
            Enter 3D Threat Graph
          </Link>
        </div>

        {/* 3D Mockup / Feature Highlight Image (CSS Mock) */}
        <div className="mt-28 w-full max-w-6xl rounded-2xl border border-border bg-panel-2/50 p-2 shadow-2xl backdrop-blur-sm relative">
           <div className="absolute inset-0 bg-gradient-to-b from-transparent to-void z-10 rounded-2xl"></div>
           <div className="h-[400px] w-full rounded-xl bg-void border border-border/50 relative overflow-hidden flex items-center justify-center">
              <div className="text-mist/50 flex flex-col items-center gap-4 z-0">
                  <Shield size={64} className="text-brand/20" />
                  <p className="font-mono text-sm">SECURE_TUNNEL_ACTIVE</p>
              </div>
           </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mt-32 max-w-7xl w-full text-left">
          <div className="p-8 rounded-3xl bg-panel border border-border hover:border-brand/50 hover:bg-panel-2 transition-all duration-300 group">
            <div className="h-14 w-14 rounded-2xl bg-brand/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Network className="text-brand" size={28} />
            </div>
            <h3 className="text-xl font-bold text-ink mb-3">Graph Neural Networks</h3>
            <p className="text-mist text-base leading-relaxed">
              Detect complex fraud rings by mapping relationships between users, devices, and IPs in real-time.
            </p>
          </div>
          
          <div className="p-8 rounded-3xl bg-panel border border-border hover:border-danger/50 hover:bg-panel-2 transition-all duration-300 group">
            <div className="h-14 w-14 rounded-2xl bg-danger/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Activity className="text-danger" size={28} />
            </div>
            <h3 className="text-xl font-bold text-ink mb-3">Behavioral Biometrics</h3>
            <p className="text-mist text-base leading-relaxed">
              CatBoost models analyze every click, swipe, and login attempt to detect anomalous session behavior.
            </p>
          </div>
          
          <div className="p-8 rounded-3xl bg-panel border border-border hover:border-warning/50 hover:bg-panel-2 transition-all duration-300 group">
            <div className="h-14 w-14 rounded-2xl bg-warning/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Lock className="text-warning" size={28} />
            </div>
            <h3 className="text-xl font-bold text-ink mb-3">Zero-Trust Architecture</h3>
            <p className="text-mist text-base leading-relaxed">
              Step-up authentication is dynamically triggered based on calculated risk, reducing user friction.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-panel border border-border hover:border-success/50 hover:bg-panel-2 transition-all duration-300 group">
            <div className="h-14 w-14 rounded-2xl bg-success/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Globe className="text-success" size={28} />
            </div>
            <h3 className="text-xl font-bold text-ink mb-3">Real-Time Scoring</h3>
            <p className="text-mist text-base leading-relaxed">
              A high-throughput FastAPI engine processes and scores thousands of events per second with millisecond latency.
            </p>
          </div>
        </div>
      </main>

      <footer className="py-12 text-center text-mist relative z-10 border-t border-border mt-20 bg-panel/30">
        <p className="font-semibold text-ink mb-2">Designed for a Zero-Trust World.</p>
        <p className="text-sm">AlertixAI © {new Date().getFullYear()} — Built for scale, security, and speed.</p>
      </footer>
    </div>
  );
}
