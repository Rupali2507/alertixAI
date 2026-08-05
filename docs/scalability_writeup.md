# AlertixAI — Scalability & Infrastructure Architecture

**Owner:** Ratnesh  
**Date:** 2026-08-05

This document outlines how the AlertixAI Identity Trust Framework is designed to scale horizontally to handle tier-1 banking transaction volumes (e.g., 5,000+ events per second during peak hours) while maintaining sub-150ms scoring latency.

---

## 1. Stateless Scoring API (FastAPI)

The core scoring router (`backend/routers/score.py`) is completely stateless across requests. 
- **Model Loading:** The ML model artifacts (Isolation Forest, CatBoost, GraphSAGE) are loaded exactly once into memory when the Uvicorn worker starts.
- **Inference:** The `score_event()` method on all detectors runs entirely in CPU/RAM and does not require external database lookups during the critical path (feature vectors are either passed in the payload or retrieved from a fast Redis cache in production).
- **Horizontal Scaling:** Because the API is stateless, it scales linearly. You can run 50 Uvicorn replicas across an EKS/AKS cluster behind a standard round-robin or least-connections load balancer. If traffic spikes, auto-scaling groups can spin up new pods in seconds.

## 2. Event Ingestion (Kafka / Redis Streams)

To decouple the synchronous scoring API from downstream analytics and audit logging, we use a distributed message broker (Kafka or Redis Streams).
- **Partitioning:** Kafka topics are partitioned by `user_id`. This guarantees that all events for a specific user are processed sequentially by the same consumer group, preventing race conditions when updating behavioral profiles or device graphs.
- **Throughput:** Kafka easily handles 100k+ messages per second, ensuring the `Event Ingestion` layer never drops data even during massive login spikes.

## 3. Feature Store (Parquet & Object Storage)

The feature store is designed for high-throughput batch writes and analytical reads (model retraining).
- **Format:** We use Apache Parquet, a columnar storage format that compresses highly efficiently and allows fast projection (reading only specific columns).
- **Partitioning Strategy:** Data is partitioned on disk by `event_type` and `date` (e.g., `feature_store/data/event_type=login/date=2026-08-05/`). 
- **Storage Tiering:** Recent partitions (last 30 days) are kept on fast SSDs. Older partitions are seamlessly offloaded to cheaper object storage (S3 / Azure Blob) for long-term compliance archiving.

## 4. Model Training & Cold Starts

- **Continuous Learning:** The `scripts/seed_and_train.py` script supports a `--train-only` flag. In a production environment, an Airflow or Prefect DAG triggers this nightly, reading the latest 30-day window from the Parquet feature store and generating fresh model artifacts.
- **Zero-Downtime Updates:** When new model artifacts are published, the FastAPI workers can hot-reload the weights from the filesystem/S3 without dropping active connections.
- **GNN Cold Start Mitigation:** The Device Trust GraphSAGE detector encounters a "cold start" when it sees a brand-new user or device that isn't in its graph. Rather than failing or blocking the user, it explicitly returns a moderate risk baseline (0.55), allowing the other detectors (Behavioral, KYC) to carry the decision weight until the graph updates.

## 5. Audit Log High Availability

The audit log (`backend/privacy/audit_log.py`) is a critical compliance component (RBI §5.3). 
- It uses append-only JSONL files structured with hashed PII.
- In production, these local appends are asynchronously shipped (e.g., via Fluentd or Filebeat) to an immutable, WORM-compliant (Write Once, Read Many) SIEM storage layer, ensuring tampering is impossible even if a scoring node is compromised.
