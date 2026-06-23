
# EdgeStream: Building Real-Time Applications with TypeScript Pub/Sub Messaging

Modern applications demand real-time communication. Whether you're streaming LLM tokens, pushing workflow execution updates, or handling human-in-the-loop approvals, polling and traditional request-response patterns fall short. EdgeStream is a TypeScript-first pub/sub message pipeline that brings structured, reliable real-time messaging to applications that demand it.

## The Problem: Real-Time Without Plumbing

Building real-time features typically requires juggling multiple protocols and transport layers. Your UI needs WebSocket fallback support. Your backend requires automatic reconnection. Message validation must happen at the transport boundary. Business logic hooks need to intercept messages at precise moments. And all of this needs to work reliably without degrading performance.

Most teams end up writing custom plumbing code â€” connection managers, protocol handlers, message normalizers, and subscription routers. The result? Fragile, difficult-to-test code scattered across the codebase. EdgeStream solves this by providing a complete, battle-tested message pipeline with transport abstraction, composable hooks, and observability built in.

## Why EdgeStream Exists

Real-time messaging is increasingly central to modern application architecture. Applications need to push updates to users instantly. Workflow engines publish execution events for UI observers. LLM agents stream token-by-token responses. Forms emit interaction events that trigger downstream actions. Backend services communicate synchronously via messages.

Instead of forcing every team to build their own message infrastructure, EdgeStream provides a proven foundation. It handles the hard problems â€” transport fallback, connection resilience, message normalization, hook ordering, subscription matching â€” leaving your team free to focus on business logic.

## Core Features That Matter

### 1. Multi-Transport Abstraction

EdgeStream supports four transports out of the box, with automatic fallback:

- **SignalR** (default): Browser-friendly, built-in reconnection, group routing support
- **WebSocket**: Raw performance for direct server-to-server or performance-critical paths
- **Server-Sent Events (SSE)**: Server-only push, perfect for firewall-restricted environments
- **HTTP Polling**: Ultimate fallback for environments with no WebSocket support

You pick one; EdgeStream handles the rest. Swapping transports requires only a configuration change â€” zero code changes.

```typescript
edgeStream.registerServer({
  id: 'bas',
  transportConfig: {
    type: 'signalr',  // swap to 'websocket' or 'sse' later
    url: 'https://api.example.com/stream-hub',
    accessToken: authToken
  }
});
```

### 2. The Envelope: Universal Message Container

Every message in EdgeStream travels inside an `IEnvelope` â€” a standardized container with CloudEvents-compatible metadata. This enables predictable, typesafe message handling regardless of transport or origin.

```typescript
// Envelope structure
{
  meta: {
    id: 'uuid-1234',
    serverId: 'bas',
    transport: 'signalr',
    protocol: 'json',
    receivedAt: Date,
    topic: 'workflow.execution.completed',
    correlationId: 'correlation-5678'
  },
  direction: 'incoming',
  body: { /* your typed message */ },
  attributes: { /* set by hooks during processing */ }
}
```

The envelope is immutable in the observable world but mutable within the pipeline â€” hooks can enrich metadata and transform the body, and those changes propagate to all downstream subscribers.

### 3. Composable Hook System

The hook system is EdgeStream's most powerful feature. Hooks are single-responsibility message processors that execute in priority order. They're where validation, enrichment, transformation, and business logic live.

Six hook types cover different pipeline stages:

- **NormalizationHook** (priority 110): Raw bytes â†’ typed envelope
- **Pre-Pipeline** (120â€“199): Early filtering, deduplication, routing
- **Processing** (200â€“299): Core transformation and business logic
- **Post-Pipeline** (300+): Audit logging, metrics, caching
- **HookActivityLogger** (priority 5): Timing capture for observability
- **Incoming/Outgoing**: Transport-level signing, encryption, auth headers

```typescript
// Custom hook example
export class TenantValidationHook extends BaseHook {
  readonly name = 'TenantValidationHook';
  readonly priority = 130; // runs after normalization

  async execute(context: IPipelineContext): Promise<HookResult> {
    const tenantId = context.body?.tenantId;
    if (!tenantId) {
      context.abort('Missing tenantId');
      return { continue: false };
    }
    context.metadata.validatedTenantId = tenantId;
    return { continue: true };
  }
}
```

Hooks can abort the pipeline (dropping messages), pause for user input, or pass control to the next hook. This composition model makes building complex message workflows elegant and testable.

### 4. Topic-Based Subscription Routing

Messages flow to subscribers based on dot-delimited topic patterns. Subscribers use wildcard matching to filter incoming messages:

```typescript
// Subscribe to all workflow execution events
edgeStream.subscribe('bas', 'workflow.execution.*', (envelope) => {
  console.log(`Node ${envelope.body.nodeId} is ${envelope.body.status}`);
});

// Subscribe to specific notifications
edgeStream.subscribe('bas', `notifications.user.${userId}.*`, (envelope) => {
  notificationStore.push(envelope.body);
});
```

The `.*` wildcard matches exactly one segment level â€” `workflow.*` matches `workflow.started` and `workflow.completed` but not `workflow.execution.started`. This precision prevents accidental over-subscription.

### 5. Built-in Observability

EdgeStream doesn't hide what's happening. Three observability features ship out of the box:

- **HooksMonitor**: Real-time visualization of hook execution, timing, errors, and flow control
- **SubscribersMonitor**: Track subscription patterns, event rates, and delivery latency
- **getMetrics()**: Programmatic access to message counts, hook timings, and subscriber health

## Architecture Overview

EdgeStream organizes into five layers, each with a single responsibility:

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Facade (EdgeStream orchestrator)   â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  Server (single connection context) â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  Pipelines (ordered hook execution) â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  Hooks (composable processors)      â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  Transport (network I/O layer)      â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

The **Facade** (`EdgeStream` class) owns all servers and orchestrates lifecycle.

Each **Server** is an isolated message domain â€” one transport, one incoming pipeline, one outgoing pipeline, one subscription manager.

**Pipelines** execute hooks in priority order, creating a `PipelineContext` per message. Hooks read/modify the context; the pipeline aborts if any hook returns `continue: false`.

**Hooks** are the extension point â€” your code lives here.

The **Transport** handles raw bytes â€” connect, disconnect, send, receive. All transports implement the same `ITransport` interface.

## Step-by-Step: Building a Real-Time Feature

Let's build a workflow execution monitor that pushes node state to the UI in real time.

**Step 1: Register the server**

```typescript
import { createEdgeStream } from 'edge-stream-js';

const edgeStream = createEdgeStream();

edgeStream.registerServer({
  id: 'bas',
  type: 'bas',
  url: 'https://api.example.com/edge-stream-hub',
  transportConfig: {
    type: 'signalr',
    accessToken: authToken,
    reconnect: {
      maxAttempts: 0,  // infinite retry
      initialDelayMs: 1000,
      backoffMultiplier: 2
    }
  }
});

await edgeStream.start();
```

**Step 2: Subscribe to workflow events**

```typescript
const subscription = edgeStream.subscribe(
  'bas',
  'workflow.execution.*',
  (envelope: IEnvelope<WorkflowNodeEvent>) => {
    const { nodeId, status, output, startedAt } = envelope.body;
    
    // Update observer store
    observerStore.updateNodeStatus(nodeId, status);
    if (output) observerStore.setNodeOutput(nodeId, output);
    
    // Track timing
    console.log(`${nodeId} ${status} in ${Date.now() - startedAt}ms`);
  }
);
```

**Step 3: Add custom hooks for enrichment**

```typescript
// Add a hook to enrich with tenant context
server.incomingPipeline.addHook(
  new class TenantEnrichmentHook extends BaseHook {
    readonly name = 'TenantEnrichmentHook';
    readonly priority = 150;

    async execute(context: IPipelineContext): Promise<HookResult> {
      const tenantId = await getTenantFromToken(context.envelope.meta.correlationId);
      context.metadata.tenantId = tenantId;
      return { continue: true };
    }
  }()
);
```

**Step 4: Listen for lifecycle events**

```typescript
edgeStream.on('server:connected', (event) => {
  console.log('Connected to', event.serverId);
  observerStore.setStatus('connected');
});

edgeStream.on('server:error', (event) => {
  console.error('Connection error:', event.data?.error);
  observerStore.setStatus('error');
});

edgeStream.on('message:received', (event) => {
  observerMetrics.recordMessage(event);
});
```

## Real-World Scenario: Multi-Tenant Workflow Hub

A SaaS platform runs workflows for multiple tenants. Each workflow execution publishes events that must:

1. Be routed only to the executing tenant's users
2. Be validated for that tenant's permissions
3. Be enriched with that tenant's configuration
4. Be logged for that tenant's audit trail
5. Reach the UI with latency under 100ms

EdgeStream handles this elegantly:

```typescript
// Incoming pipeline for multi-tenant isolation
server.incomingPipeline.addHook(new HookActivityLogger());          // priority 5
server.incomingPipeline.addHook(new NormalizationHook());          // priority 110
server.incomingPipeline.addHook(new TenantValidationHook());       // priority 130
server.incomingPipeline.addHook(new TenantPermissionHook());       // priority 140
server.incomingPipeline.addHook(new TenantEnrichmentHook());       // priority 150
server.incomingPipeline.addHook(new AuditLogHook());               // priority 300

// Subscribers use tenant-scoped topic namespacing
edgeStream.subscribe(
  'bas',
  `tenant.${tenantId}.workflow.execution.*`,
  (envelope) => publishToUI(envelope)
);
```

If tenant validation fails at priority 130, the pipeline aborts â€” the message never reaches subscribers or the audit log. If it passes, the enrichment hook at priority 150 adds tenant config data. By priority 300, the audit hook logs with full context.

## Benefits in Practice

- **Reduced latency**: Push model eliminates polling overhead. Messages reach subscribers in tens of milliseconds.
- **Simplified code**: Hook composition replaces scattered middleware. Pipelines are testable in isolation.
- **Transport flexibility**: Swap WebSocket for SSE or SignalR without touching business logic.
- **Built-in resilience**: Automatic reconnection, backoff, and fallback chains.
- **Observable**: HooksMonitor and SubscribersMonitor provide real-time visibility into message flow.
- **Type safety**: Envelope<T> enables end-to-end typing from transport to subscriber.

## Best Practices

1. **Always register NormalizationHook** on incoming pipelines that receive JSON â€” it converts raw bytes to typed envelopes.

2. **Use hook priority deliberately**. Security hooks (decrypt, verify) run first (90â€“95), normalization at 110, business logic at 200+, audit at 300+.

3. **Keep hooks focused**. A hook doing five things is a hook that's hard to debug. Single responsibility wins.

4. **Subscribe early, unsubscribe when done**. Store subscription handles and call `unsubscribe()` on cleanup to prevent memory leaks.

5. **Use topic namespacing for isolation**. `tenant.{id}.workflow.*` is safer than shared `workflow.*` topics.

6. **Monitor hook performance**. HookActivityLogger captures timing. Watch for hooks running slow â€” they block the entire pipeline.

7. **Test hooks in isolation**. Mock `IPipelineContext` and test hook logic without spinning up full servers.

## Conclusion

EdgeStream brings structure and reliability to real-time messaging in TypeScript applications. Whether you're building workflow observers, LLM token streamers, approval workflows, or multi-tenant notification systems, EdgeStream handles the hard infrastructure problems â€” transport abstraction, message normalization, hook composition, and observability.

The result: cleaner code, faster delivery, and systems that just work. Start with a single server and SignalR transport. As needs grow, compose hooks, add transport fallbacks, and observe the entire flow in real time. EdgeStream scales with your application.

Ready to build real-time? Check out the [complete documentation](https://docs.bizfirstai.com/WebSites/EdgeStream/) and explore the guides on Message Pipelines, Hooks, Servers, Transports, and React Bindings. Your next real-time feature is just a few hooks away.

