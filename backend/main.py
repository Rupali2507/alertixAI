from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import score, stepup_auth, feed, simulator, audit, graph

app = FastAPI(title="AlertixAI Orchestrator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For demo purposes
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(score.router, tags=["scoring"])
app.include_router(stepup_auth.router, tags=["step-up-auth"])
app.include_router(feed.router, tags=["live-feed"])
app.include_router(simulator.router, tags=["simulator"])
app.include_router(audit.router, tags=["audit"])
app.include_router(graph.router, tags=["identity-graph"])

@app.get("/health")
def health():
    return {"status": "ok"}