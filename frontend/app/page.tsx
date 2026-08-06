import Link from "next/link";
import {
  ArrowRight, Network, Shield, Lock, Cpu, Database, Eye, Zap,
  ArrowUpRight, CheckCircle2,
} from "lucide-react";
import TrustGauge from "./components/TrustGauge";

export default function Home() {
  return (
    <div className="min-h-screen bg-void flex flex-col relative overflow-x-hidden selection:bg-brand/30">
      {/* Ambient signature glow — one deliberate moment, not repeated everywhere */}
      <div className="absolute inset-0 z-0 pointer-events-none noise-bg opacity-40" />
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-brand/[0.14] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[35%] right-[-15%] w-[500px] h-[500px] bg-danger/[0.06] rounded-full blur-[130px] pointer-events-none" />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-x-0 border-t-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-brand-dim border border-brand/30 flex items-center justify-center">
              <Shield className="text-brand" size={16} />
            </div>
            <span className="font-medium text-[15px] tracking-tight text-ink">
              Alertix<span className="text-brand">AI</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-mist">
            <Link href="#architecture" className="hover:text-ink transition-colors">Architecture</Link>
            <Link href="#platform" className="hover:text-ink transition-colors">Platform</Link>
            <Link href="/privacy-audit" className="hover:text-ink transition-colors">Trust center</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm font-bold bg-ink text-void px-5 py-2 rounded-lg hover:bg-brand hover:text-black transition-all">
              Launch console
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center relative z-10 px-6 pt-40 pb-24">

        {/* Hero */}
        <h1 className="max-w-4xl text-center text-5xl md:text-6xl font-medium tracking-tight text-ink mb-6 leading-[1.08]">
          The identity immune
          <br />
          system for <span className="text-gradient-brand">zero-trust banking</span>
        </h1>

        <p className="max-w-xl text-center text-base text-mist mb-12 leading-relaxed">
          Four independent models — behavioral, device graph, KYC, and insider misuse —
          fused into one continuous trust score. Friction only where risk actually lives.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-24">
          <Link
            href="/dashboard"
            className="group flex items-center justify-center gap-3 rounded-xl bg-ink text-void px-8 py-4 text-base font-bold transition-all hover:bg-brand hover:text-black hover:shadow-[0_0_30px_rgba(202,255,51,0.2)]"
          >
            Enter console
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/graph"
            className="group flex items-center justify-center gap-2 rounded-xl glass-card px-7 py-3.5 text-sm font-medium text-mist hover:text-ink transition-all"
          >
            <Network size={16} />
            Explore the identity graph
          </Link>
        </div>

        {/* Hero visual — signature gauge as centerpiece, not a stock screenshot */}
        <div className="w-full max-w-3xl glass-card-strong signature-glow rounded-3xl p-10 mb-28" style={{ animation: "float-slow 7s ease-in-out infinite" }}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="tracking-label text-[10px] text-mist mb-1">composite trust</p>
              <p className="text-sm text-ink font-medium">Real-time fused decision</p>
            </div>
            <span className="text-[11px] rounded-full bg-success/10 border border-success/25 text-success px-3 py-1">
              allow
            </span>
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-10 items-center">
            <TrustGauge score={0.09} size={168} strokeWidth={12} label="trust score" />
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "behavioral", value: "0.06" },
                { label: "device trust", value: "0.11" },
                { label: "kyc / identity", value: "0.02" },
                { label: "insider signal", value: "0.00" },
              ].map((s) => (
                <div key={s.label} className="glass-card rounded-xl px-4 py-3">
                  <p className="text-[11px] text-faint mb-1">{s.label}</p>
                  <p className="text-lg font-medium text-ink tabular-nums">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Metrics strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-16 border-y border-border py-8 w-full max-w-4xl mb-32">
          {[
            { value: "12ms", label: "avg scoring latency" },
            { value: "4", label: "independent detectors" },
            { value: "0", label: "raw PII in feature store" },
            { value: "3", label: "decision states" },
          ].map((m) => (
            <div key={m.label} className="flex flex-col items-center text-center">
              <div className="text-2xl font-medium text-ink tabular-nums mb-1">{m.value}</div>
              <div className="text-[11px] text-faint tracking-label">{m.label}</div>
            </div>
          ))}
        </div>

        {/* Architecture bento */}
        <div id="architecture" className="w-full max-w-6xl mb-8">
          <div className="text-center mb-14">
            <p className="tracking-label text-[11px] text-brand mb-3">architecture</p>
            <h2 className="text-3xl font-medium text-ink mb-3">Four models, one decision</h2>
            <p className="text-mist max-w-lg mx-auto">
              Each detector reasons about a different failure mode. Fusion combines them
              with confidence weighting, not a simple average.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card rounded-3xl p-8 relative overflow-hidden group hover:border-brand/30 transition-colors">
              <Network className="text-brand mb-5" size={26} strokeWidth={1.5} />
              <h3 className="text-xl font-medium text-ink mb-2.5">Device trust graph</h3>
              <p className="text-mist text-sm leading-relaxed max-w-md">
                A heterogeneous user–device–IP graph, scored with self-supervised
                GraphSAGE + GAT link prediction — structural fraud rings surface before
                they show up in any single event.
              </p>
              <div className="mt-6 flex gap-3">
                <span className="glass-card rounded-lg px-3 py-1.5 text-[11px] text-faint">GraphSAGE</span>
                <span className="glass-card rounded-lg px-3 py-1.5 text-[11px] text-faint">GAT attention</span>
              </div>
            </div>

            <div className="glass-card rounded-3xl p-8 group hover:border-brand/30 transition-colors">
              <Cpu className="text-brand mb-5" size={24} strokeWidth={1.5} />
              <h3 className="text-lg font-medium text-ink mb-2.5">Behavioral ensemble</h3>
              <p className="text-mist text-sm leading-relaxed">
                Isolation forest and autoencoder in parallel — one catches outliers,
                the other catches feature interactions neither sees alone.
              </p>
            </div>

            <div className="glass-card rounded-3xl p-8 group hover:border-brand/30 transition-colors">
              <Shield className="text-brand mb-5" size={24} strokeWidth={1.5} />
              <h3 className="text-lg font-medium text-ink mb-2.5">Privacy by construction</h3>
              <p className="text-mist text-sm leading-relaxed">
                Salted HMAC pseudonymization before anything touches the feature store.
                Differential-privacy noise on training aggregates.
              </p>
              <Link href="/privacy-audit" className="mt-5 inline-flex items-center gap-1 text-sm text-brand hover:gap-2 transition-all">
                View trust center <ArrowUpRight size={13} />
              </Link>
            </div>

            <div className="glass-card rounded-3xl p-8 flex flex-col justify-center relative overflow-hidden">
              <Lock className="text-brand mb-5" size={26} strokeWidth={1.5} />
              <h3 className="text-xl font-medium text-ink mb-2.5">Frictionless step-up</h3>
              <p className="text-mist text-sm leading-relaxed max-w-lg mb-5">
                Continuous scoring, not a gate. Only the 0.35–0.70 risk band sees an
                OTP or biometric challenge — everything else passes invisibly.
              </p>
              <div className="flex gap-2">
                {[
                  { l: "allow", c: "success" },
                  { l: "step-up", c: "warning" },
                  { l: "block", c: "danger" },
                ].map((d) => (
                  <span key={d.l} className={`text-[11px] rounded-full px-3 py-1 bg-${d.c}/10 border border-${d.c}/25 text-${d.c}`}>
                    {d.l}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Compliance strip */}
        <div id="platform" className="w-full max-w-4xl py-16 border-t border-border text-center">
          <p className="tracking-label text-[11px] text-mist mb-8">Built against</p>
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-4">
            {["RBI cybersecurity framework", "DPDP act 2023", "GDPR art. 22", "SOC 2 type II"].map((c) => (
              <div key={c} className="flex items-center gap-2 text-sm text-mist">
                <CheckCircle2 size={14} className="text-brand" />
                {c}
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="py-8 text-center relative z-10 border-t border-border glass-card">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-ink font-medium">
            Alertix<span className="text-brand">AI</span> © {new Date().getFullYear()}
          </p>
          <div className="flex gap-6 text-sm text-mist">
            <Link href="/privacy-audit" className="hover:text-ink transition-colors">Privacy policy</Link>
            <Link href="/dashboard" className="hover:text-ink transition-colors">Console</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}