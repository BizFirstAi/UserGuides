# Human-in-the-Loop Workflow Continuation: A Complete Guide to Building Approval Flows Across Multiple Channels

In modern business automation, workflows don't always proceed linearly. Critical decisions require human judgment, review, or approval before execution can continue. The challenge isn't just getting a human's responseâ€”it's pausing a workflow durably, collecting input through the channel the human already uses, and resuming execution seamlessly from where it left off.

This is where HIL (Human-in-the-Loop) continuation becomes essential. Unlike simple notification systems, HIL continuation is a sophisticated architectural pattern that allows workflows to suspend, wait indefinitely, and resume with complete state preservationâ€”without modifying the underlying execution engine.

## The Problem: Bridging Workflows and Human Decision-Making

Traditional workflow systems face a critical gap: they're optimized for automated, sequential execution. But real-world processes require human intervention at unpredictable points. When you need an approval before proceeding, you face several challenges:

**Execution Continuity**: Once your process pauses, how does it maintain state? Server restarts, deployments, or network failures shouldn't lose the execution context.

**Channel Flexibility**: Humans don't check a single system for notifications. Some prefer Slack messages, others check email, and mobile-first organizations rely on WhatsApp or SMS. Forcing approval through a single channel creates friction.

**State Synchronization**: When the human responds, how does the system reconnect that response to the paused execution? The correlation must be foolproof and traceable.

**Performance**: Long-running approval workflows shouldn't occupy server resources. The system should be able to pause thousands of workflows simultaneously without degradation.

Existing solutions typically require building separate approval UI, managing state manually, or creating custom integrations for each communication channel. HIL continuation eliminates this entire class of problems by baking approval flows directly into the workflow engine.

## Why This Solution Exists: The Architecture Behind the Scenes

HIL continuation works by separating concerns into three independent layers. This separation is the key insight that makes the pattern so powerful and extensible.

**Layer 1: What to Show** â€” Declared in the node's field manifest, this layer defines which fields the human should review, how they should be displayed (readable, masked, or concealed), and whether they can edit them. This declaration is channel-agnostic; the same manifest works whether you're sending to Slack, Teams, or email.

**Layer 2: How to Show It** â€” The channel node executor translates the declared fields into whatever format the channel requires. Slack gets Block Kit JSON, WhatsApp gets interactive message payloads, email gets HTML buttons. The conversion happens locally in the executor; the engine doesn't know or care.

**Layer 3: How to Resume** â€” The resume mechanism is always identical, regardless of channel. When a human responds, the webhook handler extracts the execution ID and response data, then calls a single method: `ContinueAsync(executionResId, responseData)`. The engine does the rest.

This three-layer separation means you can add new channels without modifying the engine, the workflow definition, or the field manifest. You only implement the middle layerâ€”the channel-specific formatting and delivery.

## Core Features and Capabilities

### 1. Durable Suspension and Full State Preservation

When a workflow returns the "waiting" port, the engine serializes the complete execution state to the database. This includes:

- All variables and their current values
- Node outputs up to that point
- The full scope and loop stack
- The exact thread version that was executing
- The original trigger data
- A timestamp for SLA tracking

This comprehensive snapshot means resumption is guaranteed to continue with complete context, even if the application is restarted, traffic is routed to a different server, or the database is restored from a backup.

### 2. Field-Level Control Over Display and Editability

Each field in the manifest can be configured independently with two policy layers:

**DisplayMode** controls visibility: ReadableContext shows the actual value, ReadableMasked renders as asterisks (useful for sensitive data like passwords or partial credit cards), and Concealed hides the field entirely from the human's view.

**InputMode** controls interaction: Locked fields are read-only display, EditableOptional fields can be changed, RequiredFromHuman fields must be provided before approval, and PrefilledEditable fields come pre-populated but can be edited.

These policies ensure that sensitive information never leaks to humans who shouldn't see it, while critical approval fields are never accidentally skipped.

### 3. Multi-Channel Delivery with Unified Resume Gates

The pattern supports 10+ messaging platforms (Slack, WhatsApp, Facebook Messenger, Instagram, Telegram, Microsoft Teams, Email, SMS/Twilio, Discord, and LINE) with a single underlying continuation mechanism.

Each channel has its own constraints and capabilitiesâ€”Slack can embed data in action IDs, WhatsApp has a 256-character payload limit, email relies on signed URLs, and SMS correlates by sender phone number. The pattern accommodates all these variations through different correlation strategies, but the resume gate is always the same.

### 4. Flexible Correlation Key Strategies

Different channels require different approaches to embedding the execution ID in outgoing messages. The five primary strategies are:

**Direct Embed**: The execution ID is placed directly in the interaction field (ideal for Slack, Telegram, Discord).

**Metadata Embed**: The ID lives in a dedicated metadata field separate from visible interactions (useful for Slack modals, Teams Adaptive Cards).

**Correlation Table**: A short token is stored in a mapping table and sent with the message (essential for WhatsApp and SMS with tight payload limits).

**Signed URLs**: The ID is embedded in a cryptographically signed URL that the human clicks (primary approach for email).

**Session Context**: The active HIL execution for a given user ID is tracked, and inbound responses are correlated by sender identity (used for SMS reply-based workflows).

### 5. Complete Webhook and Resumption Flow

The webhook handler is straightforward but critical:

1. Validate the inbound request (every channel provides signature verification)
2. Extract the execution ID using your chosen correlation strategy
3. Map the human's response into a dictionary keyed by field name
4. Call `ContinueAsync(executionResId, responseData)`
5. Acknowledge to the channel (most require HTTP 200 within 3 seconds)

The engine handles everything elseâ€”loading the suspended state, merging the response, and continuing execution.

## Architecture Overview: The Three Layers in Action

Here's how a typical Slack approval flow works:

**At suspension**: The workflow calls a Slack HIL node. The node:
- Reads which fields should be shown (via `IHilLabelResolver.ResolveAllAsync`)
- Formats them as Slack Block Kit blocks
- Embeds the execution ID in a button's `action_id`
- Sends the message to Slack
- Returns the "waiting" port
- The engine saves all execution state to SQL

**In the interim**: The workflow is fully paused. Days, weeks, or months can pass. The human sees the Slack message in their workspace whenever they check it.

**On human response**: The human clicks a button or submits a form in Slack. Slack fires a webhook to your endpoint. Your handler:
- Validates the Slack signature
- Extracts the execution ID from the `action_id`
- Maps Slack field values to the response dictionary
- Calls `ContinueAsync`

**At resumption**: The engine loads the saved state from SQL, merges the response data, and continues execution from the node's downstream connections.

## Step-by-Step Walkthrough: Implementing an Approval Node

Here's what building a HIL channel node actually looks like:

**Step 1 â€” Resolve Fields**

```csharp
var hilFields = await _hilLabelResolver.ResolveAllAsync(
    nodeExecutionContext,
    cancellationToken);
```

This gives you a list of fields that have `SendToHil == true`, with labels, descriptions, display modes, and input modes already resolved. Dynamic labels (expressions) are evaluated at this point.

**Step 2 â€” Apply Display Rules**

```csharp
foreach (var field in hilFields)
{
    switch (field.DisplayMode)
    {
        case HilDisplayMode.Concealed:
            continue; // Skip entirely
        case HilDisplayMode.ReadableMasked:
            value = "â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"; // Never expose actual value
            break;
    }
    
    bool isEditable = field.InputMode is EditableOptional 
        or RequiredFromHuman or PrefilledEditable;
}
```

**Step 3 â€” Embed Execution ID**

```csharp
string resId = nodeExecutionContext
    .ElementExecutionContext
    .ExecutionContext
    .ExecutionResId;

// Embed in your channel-specific format
payload.button.action_id = resId; // Slack example
```

**Step 4 â€” Send and Suspend**

```csharp
await _slackClient.SendMessageAsync(channelId, payload, ct);
return NodeExecutionResult.Suspend("waiting");
```

**Step 5 â€” Webhook Handler**

```csharp
[HttpPost("/webhooks/slack")]
public async Task<IActionResult> OnSlackEvent(
    [FromBody] SlackEvent slackEvent)
{
    if (!_validator.ValidateSignature(slackEvent))
        return Unauthorized();

    string resId = slackEvent.actions[0].action_id;
    
    var responseData = new Dictionary<string, object>
    {
        ["approved"] = slackEvent.actions[0].value == "yes",
        ["notes"] = slackEvent.actions[0].text ?? ""
    };

    _ = Task.Run(() => _continuationOrchestrator.ContinueAsync(
        resId, responseData, CancellationToken.None));

    return Ok();
}
```

## Real-World Scenario: Multi-Stage Approval with Audit Trail

Consider a financial approval workflow:

1. A payment request arrives (JSON payload with amount, vendor, account).
2. The workflow validates basic rules automatically.
3. If the amount exceeds $10,000, it suspends and sends a Slack message to the finance manager.
4. The message shows the amount (readable), vendor (readable), internal notes (masked), and requires a decision (approve/reject).
5. The manager reviews on mobile, clicks "approve" in Slack.
6. The workflow resumes, logs the approval, and initiates the payment.
7. If the manager doesn't respond within 48 hours, a second message is sent via email.

The same workflow definition handles all of this. The HIL nodes don't know about the "escalate to email" logicâ€”that's standard workflow branching. The Slack HIL node and the email HIL node are independent implementations of the same pattern, sharing the same `ExecutionResId` correlation key.

## Benefits of HIL Continuation

**Decoupled Architecture**: Approval logic lives in the workflow, not scattered across custom approval services. New channels are pure additions; they don't require changes to existing channels or the engine.

**Resilience**: Suspended workflows survive server restarts, deployments, and database failovers. The correlation key ensures no approval can be lost.

**Scalability**: Because workflows are fully suspended, you can pause thousands of them without resource consumption. They don't poll, don't timeout, and don't require keeping server connections open.

**Auditability**: The execution ID ties every approval back to the exact workflow state at the moment of suspension. Every response is traceable.

**User Convenience**: Humans approve through their preferred channelâ€”Slack for tech teams, email for executives, WhatsApp for mobile-first markets. No context switching.

## Best Practices When Using Hil-Continue

**Always Validate Webhook Signatures**: Every channel provides signature verification. Use it. Never process an unauthenticated webhook.

**Embed Execution ID Early**: Don't let the execution ID be derived or guessed. Embed it directly in every outgoing message where you control the format.

**Acknowledge Webhooks Quickly**: Most channels have 3-second timeouts. If ContinueAsync is slow, acknowledge immediately and continue resumption in a background task.

**Respect Field Policies**: If a field is Concealed, don't render it. If it's ReadableMasked, never expose the actual value. These policies are security boundaries.

**Handle Expiry Gracefully**: If a human responds after the execution has been resumed elsewhere or timed out, ContinueAsync will fail. Log these events and alert your operations team.

**Use Correlation Tables for Constrained Channels**: If you're building for WhatsApp or SMS, don't try to force the full execution ID into the payload. Use a correlation table with a short token instead.

**Test Resumption Paths**: Approval workflows are resumption paths. Unit tests alone aren't sufficient. Write integration tests that actually suspend and resume workflows.

## Conclusion

Human-in-the-Loop continuation transforms approval workflows from a source of integration complexity into a first-class workflow primitive. By separating the concern of "what to show" from "how to show it" and "how to resume," the pattern becomes simultaneously powerful and simple to extend.

Whether you're building approval flows for business processes, compliance checkpoints, or quality gates, HIL continuation provides a battle-tested architecture that handles the hard problems: durable suspension, state preservation, multi-channel delivery, and guaranteed resumption.

Start with the documentation's introduction and "How It Works" section to understand the execution model. Then review "Building a Channel" for the universal implementation pattern. Once you're comfortable with the abstraction, the channel-specific pages (Slack, WhatsApp, Teams, etc.) guide you through the details of your target platform.

The workflow engine has done the heavy lifting. Your job is simply to format fields for your channel and implement the webhook handler. Everything elseâ€”suspension, state preservation, resumptionâ€”is guaranteed by the platform.

**Ready to build?** Explore the full [Hil-Continue documentation](https://docs.bizfirstai.com/WebSites/Hil-Continue/) to get started with your channel of choice.
