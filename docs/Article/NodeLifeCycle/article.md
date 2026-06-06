# Understanding Node Lifecycle in BizFirst: Building Robust Workflow Executors

Every workflow is composed of nodes. Whether triggering API calls, orchestrating approvals, transforming data, or running AI prompts, each node follows the same rigorous execution lifecycle. In BizFirst, this lifecycle is defined by a single abstract class that enforces consistency across 60+ node types: **BaseNodeExecutor**.

Understanding this lifecycle is essential for building reliable nodes, debugging execution issues, and grasping how BizFirst's orchestration engine maintains control and safety across complex, multi-step workflows.

## The Problem Without Structure

When you're building a distributed workflow system, nodes need to:

- Safely initialize and validate their configuration
- Apply security checks before executing business logic  
- Handle the core operation reliably
- Transform and validate output
- Clean up resources in all scenarios (success or failure)
- Report progress in real time to the UI

Without enforced structure, different node types will handle these concerns inconsistently. Security gates might be forgotten. Resource cleanup might be skipped. Progress reporting might be incomplete. Validation might fail at the wrong time, burning external API quotas before you detect bad config.

BizFirst solves this by enforcing a **universal 8-stage lifecycle** that every node executor must follow, with strategic hooks that node developers can override only where they need custom logic.

## The Architecture: BaseNodeExecutor

All node executors in BizFirst extend `BaseNodeExecutor`, an abstract class that defines the execution contract. The entry point is simple:

```csharp
public abstract class BaseNodeExecutor
{
    public async Task<NodeExecutionResult> ExecuteAsync(
        NodeExecutionContext ctx, 
        CancellationToken cancellationToken)
    {
        // Orchestrates all 8 stages in order
        return await OnExecute(ctx, cancellationToken);
    }
}
```

When you call `ExecuteAsync`, the executor proceeds through 8 sequential stages. Each stage fires a progress event (visible in the Studio UI), and the configuration has already been resolved and validated by the Element layer before the executor's first line runs.

## The 8-Stage Lifecycle

### Stage 1: OnEntry â€” Initialize State
Initialize internal state, read config, set defaults. This runs before validation â€” use it to prepare structures you'll need later. Config values are already merged and resolved from the 3-layer config system.

### Stage 2: OnEntryValidate â€” Validate Configuration  
Load and validate the config bag. Check that all required fields exist. Fail fast with a clear error message if something is missing. By the time this stage completes, your executor is guaranteed to have clean, usable data for the rest of the pipeline.

### Stage 3: OnPreValidationGuardRails â€” Pre-Execution Safety Checks
Apply rate limits, security gates, permission checks. This stage can short-circuit execution entirely by returning a failure result. Use this to prevent nodes from running when they shouldn't (user lacks permission, rate limit exceeded, etc.).

### Stage 4: OnPreProcess â€” Input Preparation
Optional pre-processing: map inputs, transform data, acquire resources like database connections. Returns a result that can short-circuit if acquisition fails.

### Stage 5: OnProcess â€” Core Business Logic
The heart of the node. Make the API call, run the LLM prompt, query the database, transform the data. This is the only stage where your business logic lives. Returns the output data and an output port key (e.g., "success", "error", "waiting").

### Stage 6: OnPostProcess â€” Output Transformation
Transform the result, publish events, update internal state. The data is clean at this point â€” use this stage to reshape it for downstream nodes or trigger side effects (logging, metrics, notifications).

### Stage 7: OnPostValidationGuardRails â€” Output Validation
Validate the result. Apply output policies. Run compliance checks. Ensures the data leaving this node meets quality standards before downstream nodes consume it.

### Stage 8: OnExit â€” Cleanup
Release resources, log telemetry, close connections. This stage **always runs**, even if earlier stages failed. Use it to guarantee cleanup (try/finally semantics at the stage level).

After OnExit, the result's `IsSuccess` flag determines whether the execution state becomes `Completed` or `Error`.

## Progress Reporting in Real Time

After each stage completes, `ReportNodeProgressByStage` is called with an `eNodeStage` enum value. This fires a progress event that the SignalR event producer picks up and broadcasts to connected Studio clients in real time. This is why you see nodes animating through their stages in the workflow UI â€” each stage completion triggers a UI update.

The progress events fire in this order:

- **Initiated** â€” ExecuteAsync starts, before OnEntry
- **Entry** â€” OnEntry completes
- **EntryValidate** â€” OnEntryValidate completes
- **PreValidationGuardRails** â€” Pre-execution checks done
- **PreProcess** â€” Pre-processing done
- **Process** â€” Business logic done
- **PostProcess** â€” Output transformation done
- **PostValidationGuardRails** â€” Output validation done
- **Exit** â€” Cleanup done
- **Completed** or **Error** â€” Terminal state determined

## Writing Your Own Node Executor

At minimum, override `OnEntryValidate` (to load config) and `OnProcess` (to run logic). Everything else is optional.

```csharp
public class InvoiceDispatchExecutor : BaseNodeExecutor
{
    private InvoiceSettings _settings;

    // Stage 2: Load and validate config
    protected override async Task OnEntryValidate(
        NodeExecutionContext ctx, CancellationToken ct)
    {
        _settings = await LoadAndValidateConfigAsync<InvoiceSettings>(ctx, ct);
        
        if (string.IsNullOrEmpty(_settings.ApiUrl))
            throw new ConfigurationException("ApiUrl is required");
    }

    // Stage 5: Core business logic
    protected override async Task<NodeExecutionResult> OnProcess(
        NodeExecutionContext ctx, CancellationToken ct)
    {
        // ctx.ElementExecutionContext.InputData contains upstream outputs
        var invoiceId = ctx.InputData.GetString("invoiceId");
        
        var response = await _invoiceService.DispatchAsync(
            invoiceId, _settings.ApiUrl, ct);

        return NodeExecutionResult.Success(
            outputPortKey: "success",
            outputData: new Dictionary<string, object> 
            { 
                ["dispatchedAt"] = DateTime.UtcNow,
                ["response"] = response 
            });
    }
}
```

The context you receive carries everything you need:

- **ElementExecutionContext** â€” resolved config, input data from upstream nodes, output bags
- **RuntimeInfo** â€” result accumulator used internally by the base class
- **Processor** â€” reference to the orchestration processor (used by control-flow nodes)
- **CurrentContext** â€” full execution hierarchy for event broadcasting

## A Practical Example: Invoice Processing

Imagine a workflow that processes invoices. One node checks if an invoice has already been dispatched (to prevent duplicates), acquires a processing lock, dispatches it, and records the completion.

The workflow runs this node with input `{ invoiceId: "INV-2024-00892" }`. Here's what happens:

1. **OnEntry** â€” Initialize any caches or connections
2. **OnEntryValidate** â€” Load settings from config bag
3. **OnPreValidationGuardRails** â€” Check permissions (user can dispatch)
4. **OnPreProcess** â€” Acquire a database lock to prevent concurrent duplicate runs
5. **OnProcess** â€” Call the billing API to dispatch the invoice
6. **OnPostProcess** â€” Log the dispatch timestamp, publish an event
7. **OnPostValidationGuardRails** â€” Verify the API response is valid
8. **OnExit** â€” Release the lock, close any open resources

If the API fails in stage 5, stages 6 and 7 are skipped, but stage 8 (OnExit) still runs to clean up. The result is marked as error, and output routing applies recovery logic (retry, skip, fail-fast to parent).

## Advanced Pattern: Suspension and Resume

Some nodes pause execution to wait for external events. Approval nodes wait for human decision. Delay nodes wait for a timer. Form nodes wait for user submission. Event nodes wait for a correlated external message.

When a node needs to suspend, it returns a `NodeExecutionResult` with a `"waiting"` or `"pending"` output port key. The thread orchestrator detects this and:

1. Serializes the entire execution memory (all variables, loop state, scope stack)
2. Stores it durably in the database
3. Sets a pause signal
4. Transitions the thread to `Paused` state

The workflow is now suspended. The server is free. When the external event arrives (approval submitted, timer fires, form posted), `ContinueAsync` is called, the execution memory is restored, and the thread resumes from the downstream connections of the suspended node.

This means you can write approval nodes that survive server restarts, multi-day delays, and resource failures â€” all without losing execution context.

## Best Practices When Building Nodes

**1. Keep OnProcess focused.** Move setup logic to OnEntry or OnEntryValidate. Move cleanup to OnExit. This makes the business logic readable and testable.

**2. Validate aggressively in OnEntryValidate.** A failed validation here is cheap. A failed validation discovered in OnProcess after calling an external API is expensive.

**3. Use pre/post guard rails.** Don't apply rate limits inside OnProcess. Don't validate output data structures in OnProcess. Use the guard rail stages so failures are caught early and logged properly.

**4. Always return success or a failure result, not throw.** Exceptions in OnProcess will be caught by the executor framework and translated to failure results. But if you can return a graceful failure (skip this item, route to error output), do so.

**5. Document your output ports.** A node's output ports are how downstream nodes route their execution. If your node returns `"success"` or `"waiting"` or `"error"`, document which port key each corresponds to and what data is in the output bag.

## State Management Across Execution Layers

BizFirst tracks execution state at three levels:

- **Process** â€” The top-level workflow. Coordinates multiple threads. States: Running, Completed, Failed, Cancelled, Paused.
- **Thread** â€” A sequence of nodes. States: Running, Completed, Failed, Cancelled, Paused.
- **Element (Node)** â€” Individual node execution via the 8-stage pipeline. Reports progress through 11 stage events.

A thread can pause while the process is still running (waiting for approval). The process can fail if any thread fails (fail-fast prevents cascading errors). Cancellation can occur at any layer.

For durable state management within nodes, BizFirst provides the **DataStateMachine** â€” a pattern for recording item-level state (processed, pending, failed) with idempotency guarantees and lock-based concurrency control. This is critical for nodes that process individual items (invoices, orders, records) and need to guarantee that duplicate runs don't result in duplicate side effects.

## Conclusion

The 8-stage lifecycle enforced by BaseNodeExecutor is not a limitation â€” it's a guarantee. It ensures that every node, whether built by BizFirst or by you, follows the same rigorous path from initialization through completion. Configuration is validated early. Security gates fire before expensive operations. Progress is reported in real time. Cleanup always happens.

By understanding this lifecycle, you can build robust nodes that integrate safely into complex workflows. You can debug execution issues by understanding which stage a failure occurred in. You can leverage the framework's guarantees instead of reimplementing them.

Ready to build your first custom node? Start with `BaseNodeExecutor.OnEntryValidate` and `OnProcess`. Add pre/post guard rails when you need them. The rest of the framework will handle progress reporting, error handling, and state management.

For complete details and advanced patterns, visit the full [Node Lifecycle documentation](https://docs.bizfirstai.com/WebSites/NodeLifeCycle/).
