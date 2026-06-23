# Building Enterprise Observability with BizFirstObserve: A Complete Guide

Modern workflow platforms generate enormous volumes of telemetry data. Without the right observability infrastructure, that data remains invisible â€” making it nearly impossible to diagnose performance issues, track system health, or understand what your applications are actually doing in production.

BizFirstObserve is an enterprise observability platform purpose-built for the BizFirst ecosystem. It captures logs, metrics, and distributed traces from every service, giving platform engineers and operators complete visibility into workflow executions, node performance, and system health. This guide walks you through the architecture, core capabilities, and practical implementation of this powerful observability system.

## The Problem: Fragmented Visibility

Before implementing comprehensive observability, teams typically face several challenges:

- **Siloed signals**: Logs live in one tool, metrics in another, traces in a third. Correlating them across tools consumes hours during incident response.
- **Incomplete context**: When a workflow fails, you see the error message, but not the sequence of events leading to it, the resource utilization during execution, or the distributed trace showing where time was actually spent.
- **Cost explosion**: Full-text indexing solutions like Elasticsearch can cost 10x more than necessary, especially at scale.
- **Instrumentation burden**: Teams must manually add observability code throughout their services, with no integration between services and storage backends.
- **Limited investigation tools**: Querying logs and metrics requires learning separate query languages and navigating different UIs.

## Why BizFirstObserve Exists

BizFirstObserve solves these problems through a purpose-designed architecture that separates concerns into four distinct layers. This design ensures that your services never need to know about storage backends, operators never need to understand instrumentation details, and the entire system remains loosely coupled and independently scalable.

The platform provides:
- **Automatic instrumentation** via embedded OpenTelemetry SDK in all BizFirst services
- **Unified visualization** where logs, metrics, and traces are queryable from a single Grafana instance
- **Cost-optimized storage** using specialized backends for each signal type (Loki for logs, Prometheus for metrics, Tempo for traces)
- **Seamless correlation** across all three signals using TraceId as the primary correlation key

## The Four-Layer Architecture

BizFirstObserve organizes observability into four clearly separated layers:

### Layer 1: Instrumentation
Every BizFirst service embeds the OpenTelemetry SDK, which automatically captures logs, metrics, and traces without requiring manual coding in most cases. Services emit telemetry via the OTLP protocol (gRPC on port 4317) to a central collection point. The SDK handles the details of building trace context, attaching metadata, and batching data for efficient transmission.

### Layer 2: Collection
The OpenTelemetry Collector acts as the central hub. It receives telemetry from all services, applies processors (sampling for high-volume traces, enrichment with additional context, redaction for sensitive data), and exports to the appropriate storage backends. This fan-out architecture means services only need to know about one endpoint; the Collector handles routing.

### Layer 3: Storage
Three purpose-built storage backends handle different signal types:

- **Loki** optimizes for log streams by indexing only labels (service, environment, tenant, severity level) and keeping log content unindexed and compressed. This reduces storage cost by 10x compared to full-text indexing.
- **Prometheus** uses a time-series database optimized for metrics: counter rates, gauge values, and histogram quantiles. It pulls data from service `/metrics` endpoints every 15 seconds using its pull model.
- **Tempo** stores distributed traces in object storage (S3-compatible), optimized for TraceId lookup and span attribute search without the overhead of a database index.

Each backend is irreplaceable â€” they serve fundamentally different query patterns and cardinality characteristics.

### Layer 4: Visualization
Grafana connects to all three storage backends as data sources, providing:
- **Dashboards** pre-built for BizFirst (10 included covering workflow execution, node performance, system health)
- **Explore** for ad-hoc queries against any signal type
- **Derived Fields** that render traceId in log lines as clickable links to Tempo
- **Alert management** with unified rules across all signals

Users interact exclusively with Grafana; they never directly query storage backends.

## Core Features and Capabilities

### 1. Cross-Signal Correlation

The three signal types are not isolated silos. The TraceId â€” a 128-bit identifier â€” connects them:

- Every structured log line emitted during a workflow execution includes the TraceId
- The TraceId is the root identifier for a distributed trace in Tempo
- Prometheus embeds TraceId in histogram exemplars, linking high-latency observations to their traces

During incident investigation, you can click a log line's traceId to jump directly to the full distributed trace, then inspect the latency histogram for the slow component.

### 2. Cost-Optimized Log Storage

Loki uses a label-based indexing strategy that dramatically reduces storage costs:

**Example stream labels for BizFirst:**
```
{
  "job": "processengine",
  "service": "flow-studio-api",
  "environment": "production",
  "level": "error"
}
```

High-cardinality values (execution_id, trace_id, user_id) are stored in the log line body and filtered post-selection, not indexed. This prevents Loki from creating millions of streams and overwhelming its index.

The trade-off: finding "all logs containing IP 1.2.3.4" requires a full stream scan, but finding "all errors in ProcessEngine production" is instant.

### 3. Metric Collection via Pull Model

Prometheus uses a pull model: it scrapes each service's `/metrics` endpoint every 15 seconds rather than services pushing metrics. Benefits:

- Prometheus controls scrape rate â€” no overload from misbehaving services
- Immediate detection of down services (failed scrape â†’ `up{job="..."} = 0`)
- Simple for services â€” just expose `/metrics`, no connection management

BizFirst services emit metrics through the OpenTelemetry Metrics API, which the SDK translates to Prometheus text format automatically.

### 4. Distributed Tracing with Native Correlation

Tempo receives distributed traces via OTLP from the OTel Collector. Each trace is identified by a TraceId and contains spans representing operations (API calls, database queries, workflow node executions). Spans include:

- Duration and status (success/error)
- Span attributes (execution_id, node_type, request_id, etc.)
- Parent-child relationships showing the call hierarchy

Grafana's trace view shows latency distribution per component, allowing you to quickly identify which service or operation is the bottleneck.

## Architecture in Practice: A Real Workflow Execution

Consider a customer executing a multi-step workflow:

1. **Instrumentation**: ProcessEngine emits structured JSON logs containing execution_id, node_key, duration, and status. It also emits a `bizfirst.node.execution.duration` histogram metric and span events to the OTel Collector.

2. **Collection**: The OTel Collector receives the trace (OTLP/gRPC port 4317), the metric scraped by Prometheus, and logs via the SDK's configured logger exporter.

3. **Storage**:
   - Logs go to Loki under stream `{job="processengine", environment="production", level="info"}`
   - Metrics are stored in Prometheus TSDB with labels `{node_type="DataFetchNode"}`
   - Trace spans are stored in Tempo with TraceId = abc123...

4. **Visualization**: In Grafana, a platform engineer investigating a slow execution:
   - Views the execution's log line containing traceId=abc123
   - Clicks the traceId link â†’ jumps to Tempo trace view
   - Sees the trace spans showing DataFetchNode took 5 seconds (90% of total time)
   - Clicks back to Prometheus histogram â†’ confirms p99 latency for DataFetchNode is elevated
   - Sets up an alert: "DataFetchNode p99 latency > 2 seconds"

This entire investigation flow would be impossible with siloed tools.

## Setup and Getting Started

BizFirstObserve can be deployed in multiple ways:

### Development Setup (Docker Compose)
```bash
docker compose up -d
```

Within 30 seconds, Grafana is available at `http://localhost:3000`. The stack includes:
- OTel Collector (ports 4317/4318)
- Grafana Loki (port 3100)
- Prometheus (port 9090)
- Grafana Tempo (port 4317 internal)
- Grafana (port 3000)

### BizFirst Service Configuration
Configure each service with three environment variables:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
OTEL_SERVICE_NAME=flow-studio-api
OTEL_RESOURCE_ATTRIBUTES=environment=production,tenant=t123
```

### Validation
Run one workflow execution and verify:
- Logs appear in Grafana â†’ Explore â†’ Loki
- Trace appears in Grafana â†’ Explore â†’ Tempo (search by trace ID)
- Scrape target appears in Prometheus (`http://localhost:9090/targets`)

The entire setup process takes approximately two hours from zero to production-ready validation.

## Real-World Scenario: High-Latency Detection

A monitoring alert fires: "ProcessEngine p95 latency exceeded 3 seconds."

**With BizFirstObserve:**

1. Open Grafana â†’ ProcessEngine dashboard
2. Click the alert panel showing the latency spike
3. See it corresponds to tenant=t123, node_type=ApprovalNode
4. Run LogQL query: `{job="processengine", tenant_id="t123"} |= "ApprovalNode" | json | level="error"`
5. Find error: "Approval service timeout after 2.5 seconds"
6. Click the traceId in the error log
7. View the distributed trace showing:
   - ProcessEngine â†’ ApprovalService: 2.5 seconds (timeout)
   - ApprovalService â†’ Database: 2.3 seconds (slow query)
8. Query Prometheus for database latency histogram â€” confirms elevated query times
9. Alert your database team with the specific slow query SQL extracted from the trace

**Without BizFirstObserve:**

1. Check Datadog dashboard (if you use it)
2. See that "something" is slow, but which service?
3. SSH into each service, check logs manually
4. Eventually find the timeout in one log file
5. No trace context, no way to see the database query
6. Hope the database team can help

The difference between incident resolution measured in hours versus minutes hinges on signal correlation.

## Best Practices When Using BizFirstObserve

### Label Design
- Keep label cardinality low. Every unique combination creates a new stream.
- Never use execution_id, trace_id, or user_id as labels.
- Use: job, service, environment, tenant_id, node_type, level.

### LogQL Queries
- Always start with a stream selector using `{}` with known labels.
- Use pipeline operators (`|=`, `|`, `| json`) after stream selection.
- For metrics output, use `rate()` or `histogram_quantile()`.

### Prometheus Scrape Configuration
- Ensure all BizFirst services expose `/metrics` on port 9090 or custom port.
- Set scrape interval based on freshness needs (default 15s is typical).
- Use appropriate relabeling to drop internal metrics or add environment labels.

### Trace Sampling
- In development, set sampling to 100% (capture all traces).
- In production with high volume, sample 10-25% to reduce storage costs.
- Use tail-sampling processors in the OTel Collector to always capture error traces.

### Alerting Strategy
- Set up at least one contact point (Slack, email, PagerDuty) before production.
- Create alerts for the three signal types: log error rate, metric thresholds, trace error rate.
- Use Grafana's unified alerting to centralize rule management.

## Conclusion

Enterprise observability is not optional â€” it's the foundation of reliable, maintainable systems. BizFirstObserve provides the architecture, tools, and practices necessary to achieve comprehensive visibility across your BizFirst platform.

The four-layer design ensures that each component has a single responsibility, can be scaled independently, and can be replaced with alternatives if needed. The correlation model built on TraceId enables incident investigation that would be impossible with siloed tools.

Start with the default stack (Loki, Prometheus, Tempo, Grafana) in Docker Compose, configure your services with three environment variables, and within two hours you'll have complete end-to-end observability.

**Ready to implement observability in your BizFirst platform?** Explore the complete documentation at https://docs.bizfirstai.com/WebSites/BizFirstObserve/ â€” including detailed setup guides, platform architecture details, enterprise deployment options, and advanced features like PaaS integration and sensitive data redaction.
