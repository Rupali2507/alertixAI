from fastapi import FastAPI
from backend.routers import score, stepup_auth

app = FastAPI(title="AlertixAI Orchestrator")

app.include_router(score.router, tags=["scoring"])
app.include_router(stepup_auth.router, tags=["step-up-auth"])

@app.get("/health")
def health():
    return {"status": "ok"}