# Building Human-in-the-Loop Workflows with EdgeInteract

Modern enterprise workflows increasingly require human judgment at critical decision points. But orchestrating these human touchpoints across distributed teams â€” approvals, confirmations, form submissions, and authorized actions â€” introduces complexity. How do you pause a workflow, collect user input, route it to the right person, and resume execution reliably? This is where EdgeInteract comes in.

## The Problem: Synchronous Workflows Meeting Asynchronous Users

When workflows scale beyond simple automation, they inevitably hit a bottleneck: **they need humans**. A purchase order requires approval. A deployment needs confirmation. An agent action must be authorized. Yet traditional solutions struggle with the asynchronous nature of human response.

Enterprise systems face several challenges:

1. **Coordination complexity** â€” Workflows must suspend cleanly without blocking threads indefinitely
2. **Multi-channel delivery** â€” The same approval may reach a user across web, mobile, or desktop, but only the first response should count
3. **Timeout handling** â€” What happens if someone never responds? Workflows can't wait forever
4. **Response routing** â€” How does the server reconnect a response to the awaiting workflow?
5. **Audit trails** â€” Compliance requires knowing exactly who approved, when, and what they said

These challenges grow exponentially with team size and geographic distribution.

## Enter EdgeInteract: Bidirectional Real-Time Interactions

EdgeInteract is a structured interaction framework built on top of EdgeStream, BizFirst's event delivery system. While EdgeStream handles one-way server-to-client events, EdgeInteract adds a **request/response model** â€” the server sends an InteractionRequest to a user, waits for a response, and resumes execution with the user's decision.

Think of it as a pause-resume contract:

```
Server Code
   â†“
Creates InteractionRequest
   â†“
Publishes to EdgeStream (interactions.{userId})
   â†“
Workflow suspends â†’ User receives prompt
   â†“
User responds (approve/reject/submit/select)
   â†“
Server receives InteractionResponse on callback topic
   â†“
Workflow resumes with response data
```

This model eliminates callback hell, timeout guessing, and state machine fragmentation. The interaction lifecycle is deterministic and observable at every stage.

## Five Built-In Interaction Types

EdgeInteract ships with five interaction patterns covering 95% of human-in-the-loop scenarios:

### 1. Approval Interactions
Use when you need binary or ternary authorization with context. Approvers can accept, reject, or abstain. Includes optional contextual fields (vendor name, amount, justification).

**Best for:** Purchase approvals, contract sign-offs, access requests, policy exceptions.

### 2. Confirmation Interactions
Simple yes/no/cancel dialogs for destructive or significant operations. Extremely lightweight.

**Best for:** Delete confirmations, large bulk actions, critical feature toggles, agent authorization gates.

### 3. Form Interactions
Embed a full Atlas Form schema into the interaction. Users fill in the form; response contains all submitted field values.

**Best for:** Mid-workflow data collection, shipping details, customer feedback, configuration updates.

### 4. Picker Interactions
Display a dynamic list and ask users to select one or many options. Supports single and multi-select modes.

**Best for:** Template selection, environment targeting, team assignment, priority ranking.

### 5. Notification Interactions
Read-only messages with explicit acknowledgement. Users click "I understand" to confirm receipt.

**Best for:** Compliance notifications, policy updates, system alerts, audit trails requiring proof of delivery.

## The Interaction Lifecycle: Five Stages

Every EdgeInteract interaction follows the same deterministic five-stage pipeline:

### Stage 1: Request Creation & Publish
Your server code constructs an `InteractionRequest` with:
- A unique `interactionId` (UUID, auto-generated)
- Interaction `type` (approval, confirmation, form, picker, notification)
- Target `userId` (or role for fan-out to teams)
- Title and description
- Type-specific `payload`
- `timeoutMs` â€” how long to wait before timing out

Pre-send hooks execute at this stage, allowing you to validate or enrich the request.

### Stage 2: EdgeStream Delivery
EdgeInteract publishes the serialized request to the `interactions.{userId}` topic via EdgeStream. The message fans out to all active WebSocket sessions for that user (across web, mobile, desktop â€” all devices simultaneously).

The timeout clock starts ticking.

### Stage 3: UI Display
Each client's `InteractionContainer` receives the message, identifies the `interactionType`, and renders the appropriate UI component (approval buttons, form fields, option picker, etc.). The user sees the interaction in their inbox.

### Stage 4: User Response
The user takes action. The component calls `respond(outcome, data)`, which publishes an `InteractionResponse` to `interactions.callback.{interactionId}` â€” a unique callback topic just for this interaction.

Post-receive hooks execute on the server, allowing response validation or enrichment.

### Stage 5: Acknowledgement & Continuation
The server receives the response on the callback topic, processes it, and sends an `InteractionAck` back to the user. The UI dismisses the interaction component. The awaiting workflow node unblocks and continues with the response data.

## Practical Example: Workflow Approval Gate

Here's how it works in practice. Imagine a purchase workflow that requires manager approval:

```csharp
// In your Flow Studio HIL node:
var approvalRequest = new InteractionRequest
{
    Type = "approval",
    TargetUserId = purchaseOrder.ManagerId,
    Title = "Purchase Order Approval Required",
    Description = $"PO #{purchaseOrder.Id} for ${purchaseOrder.Total}",
    Payload = new
    {
        Context = $"Vendor: {vendor.Name}, Total: ${purchaseOrder.Total}",
        Fields = new[]
        {
            new { Key = "vendor", Label = "Vendor", Value = vendor.Name },
            new { Key = "amount", Label = "Amount", Value = $"${purchaseOrder.Total:F2}" },
            new { Key = "requester", Label = "Requested By", Value = requester.Name }
        }
    },
    TimeoutMs = 86400000, // 24 hours
    CorrelationId = purchaseOrder.Id
};

await interactionPublisher.PublishAsync(approvalRequest);

// Workflow suspends here. Server is NOT blocked; this is async.
```

The manager receives a notification on all their active sessions. They click "Approve" in their WorkDesk inbox. Instantly, the callback topic receives:

```json
{
    "interactionId": "uuid-123",
    "respondedBy": "mgr-user-id",
    "outcome": "approved",
    "timestamp": "2026-06-07T14:32:10Z",
    "sessionId": "session-456"
}
```

The server receives this response, the workflow unblocks, and execution continues:

```csharp
var response = await callbackSubscriber.WaitForResponseAsync(interactionId);

if (response.Outcome == "approved") {
    // Process the PO
    await po.ProcessAsync();
} else if (response.Outcome == "rejected") {
    // Escalate or cancel
    await po.CancelAsync();
}
```

## Architecture: Transport, Pub/Sub, and Interactions

EdgeInteract uses a clean layering approach:

| Layer | Technology | Responsibility |
|-------|-----------|-----------------|
| Transport | SignalR / WebSocket | Raw message delivery |
| Pub/Sub | EdgeStream | Topic subscription, message routing, fan-out |
| Interactions | EdgeInteract | Structured request/response, lifecycle management |

This separation of concerns means EdgeInteract automatically inherits EdgeStream's reliability, fan-out semantics, and multi-session support. You don't manage transport; you work with interactions.

## Real-World Scenario: Multi-Party Approvals

Consider a finance workflow requiring approval from any member of a three-person approval committee. Instead of creating three separate approval requests (and handling "first-to-respond wins"), EdgeInteract handles this automatically:

Set `targetUserId` to `"role:finance-approvers"` instead of a specific user ID. EdgeInteract fans out the interaction to all three committee members across all their sessions. Whichever member approves first wins; the other two immediately receive a dismissal signal and the interaction clears from their inbox.

No custom logic. No duplicate responses. Built-in.

## Key Principles and Best Practices

### Always Handle Timeout
Every interaction has a `timeoutMs`. Never assume a response will arrive. If the timeout fires without a response, EdgeInteract publishes an `InteractionTimeout` message to the callback topic with `outcome: "timeout"`. Your code must handle this explicitly:

```csharp
var response = await WaitForResponse(interactionId);

if (response.Outcome == "timeout") {
    // Escalate, retry, or fail the workflow branch
    await HandleApprovalTimeout(interactionId);
}
```

### Use Hooks for Validation
Pre-send hooks allow you to validate requests before they reach users. Post-receive hooks allow you to validate responses before the workflow continues:

```csharp
public class ApprovalValidationHook : IInteractionHook
{
    public async Task OnBeforePublishAsync(InteractionRequest request)
    {
        // Validate PO amount is within approval limits
        if (request.Payload.Amount > ApprovalLimit)
            throw new InteractionValidationException("Amount exceeds approval limit");
    }
    
    public async Task OnAfterRespondAsync(InteractionResponse response)
    {
        // Log who approved, when, and audit trail
        await auditLog.LogApprovalAsync(response);
    }
}
```

### Targeting: Users or Roles
For single-user interactions, set `targetUserId` to the user's ID. For multi-party interactions, set it to a role key (e.g., `"role:managers"` or `"role:finance-approvers"`). EdgeInteract automatically fans out to all users with that role.

### Don't Use EdgeInteract for One-Way Notifications
If you only need to notify users without requiring a response, use EdgeStream directly. EdgeInteract adds overhead for the request/response lifecycle. Save it for decisions.

## Benefits Summary

**Cleaner Workflow Code**: Pause and resume semantics eliminate callback fragmentation.

**Reliable Delivery**: Built on EdgeStream's WebSocket transport; messages don't get lost.

**Multi-Session Support**: One approval reaches all the user's devices; first response wins.

**Audit Trail Built-In**: Every interaction is timestamped, tracked, and logged.

**Type-Safe Payloads**: Use TypeScript or C# types for request and response data.

**Timeout Safety**: Workflows never hang; every interaction has an explicit timeout.

**Hooks for Extensibility**: Pre-send and post-receive hooks let you validate, enrich, and audit.

**Role-Based Fan-Out**: Approvals to teams are native, not an afterthought.

## Conclusion

EdgeInteract transforms human-in-the-loop workflows from a coordination nightmare into a clean, observable, reliable pattern. Whether you're building approval gates for finance, confirmations for dangerous operations, or multi-step form collection, EdgeInteract provides the deterministic request/response semantics you need.

Start with a simple approval interaction in Flow Studio. Extend it with hooks. Move to multi-party approvals. Build custom interaction types. EdgeInteract is designed to scale from simple decisions to complex, audited, multi-team authorization workflows.

Ready to add human decisions to your workflows? Explore the full EdgeInteract documentation, review the interaction types, and start building.

**[Explore EdgeInteract Documentation](https://docs.bizfirstai.com/WebSites/EdgeInteract/)**
