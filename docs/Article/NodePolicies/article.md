# Mastering Node Policies: Building Self-Documenting Workflow Nodes in BizFirstAI

In modern workflow automation platforms, the biggest headache isn't running node logicâ€”it's handling all the cross-cutting concerns around it. How does data flow from upstream nodes? Which fields should humans see in their inbox? What data needs masking for security? How long should the system wait if a node pauses for human input?

Without a structured contract, each of these concerns becomes a custom implementation burden spread across the platform. Node Policies solve this by introducing a machine-readable manifest that every execution node publishes, letting the platform handle all these concerns automatically.

## The Problem Node Policies Solve

Before Node Policies, workflow platforms faced a classic architectural challenge: each node type was a black box. When a new node was added, engineers had to manually implement custom logic for:

- **Data routing**: Figuring out which fields receive upstream data and which emit to downstream nodes
- **Human interaction**: Deciding which fields humans should see in their review inbox and whether they can edit them
- **Expression evaluation**: Determining when template expressions should be resolvedâ€”at config load or just before execution
- **Security masking**: Identifying sensitive fields that need redaction in logs and output streams
- **Timeout management**: Registering suspension timers when a node pauses and waits for human approval

This pattern doesn't scale. With 60+ node types across a platform, maintaining 60+ ad-hoc implementations becomes expensive and error-prone. Different nodes would handle security differently. Data flow logic would be scattered. The platform gained no visibility into what each node actually needed.

## How Node Policies Work

Node Policies introduce a declarative, structured contractâ€”the `NodeExecutorManifest`. Each execution node publishes its manifest by overriding a single method:

```csharp
protected override NodeExecutorManifest? GetNodeExecutorManifest()
    => NodeExecutorManifest.From(
        ProcessElementTypeCode,
        fields: new[]
        {
            new NodeFieldDescriptor
            {
                FieldId = "to",
                Description = "Recipient email address",
                ExpressionPolicy = new ExpressionPolicy
                {
                    EvaluationStage = EvaluationStage.AtInputReady,
                    EvaluatorKind = EvaluatorKind.Template
                },
                DataFlowPolicy = new DataFlowPolicy
                {
                    AcceptsUpstreamInput = true,
                    ExcludeFromOutputMapping = true
                },
                HilPolicy = new HilPolicy
                {
                    SendToHil = true,
                    DisplayMode = HilDisplayMode.ReadableContext,
                    InputMode = HilInputMode.EditableOptional,
                    Label = "To"
                },
                SecurityPolicy = new SecurityPolicy()
            }
        }
    );
```

This single manifest tells the platform everything. The manifest declares field names, how they're evaluated, where data flows, what humans see, and what's protectedâ€”all in one composable structure.

## The Five Core Policies

Every field in a manifest is wrapped in five complementary policies:

### 1. Expression Policies
Controls *when* and *how* a field's value is computed:

- **AtConfigLoad**: Evaluated once when the workflow initializes. Use for static config like SMTP hosts or approval strategies
- **AtInputReady**: Evaluated just before execution with full access to upstream data. Use for dynamic values like email recipients
- **EvaluatorKind** determines the expression language: Template (handlebars), JavaScript, JSONPath, or Literal

```csharp
// Static infrastructure config
EvaluationStage = EvaluationStage.AtConfigLoad,
EvaluatorKind = EvaluatorKind.Literal

// Dynamic value from upstream
EvaluationStage = EvaluationStage.AtInputReady,
EvaluatorKind = EvaluatorKind.Template  // "{{workflow.customer.email}}"
```

### 2. DataFlow Policies
Controls how data moves through the node:

- **AcceptsUpstreamInput**: Can this field receive data from the previous node?
- **EmitsToDownstream**: Should this field's value propagate to the next node?
- **PersistsToMemory**: Should this value be stored in workflow memory for later retrieval?
- **ExcludeFromInputMapping / ExcludeFromOutputMapping**: Defensive flags to isolate credentials and internal fields

```csharp
// Dynamic input field
DataFlowPolicy = new DataFlowPolicy
{
    AcceptsUpstreamInput = true,
    ExcludeFromOutputMapping = true  // don't leak input to downstream
}

// Output field that flows downstream and persists
DataFlowPolicy = new DataFlowPolicy
{
    EmitsToDownstream = true,
    PersistsToMemory = true
}
```

### 3. HIL Policies (Human-In-Loop)
Controls what humans see in their inbox:

- **SendToHil**: Should this field appear in the reviewer's inbox?
- **DisplayMode**: How should it be rendered (ReadableContext, Editable, Concealed)?
- **InputMode**: Can the human edit it (Locked, EditableOptional, RequiredFromHuman)?
- **Label / Description**: User-facing text

```csharp
HilPolicy = new HilPolicy
{
    SendToHil = true,
    DisplayMode = HilDisplayMode.ReadableContext,
    InputMode = HilInputMode.RequiredFromHuman,
    Label = "Email Body",
    Description = "You must confirm this email before it sends."
}
```

### 4. Security Policies
Protects sensitive data:

- **MaskInLogs**: Replace field value with [REDACTED] in audit logs
- **MaskInOutput**: Prevent the value from leaving this node
- **RequiresElevatedAccess**: Gate access behind admin permissions

```csharp
// Full lockdown for credentials
SecurityPolicy = new SecurityPolicy
{
    MaskInLogs = true,
    MaskInOutput = true,
    RequiresElevatedAccess = true
}
```

### 5. Suspension Policies
Handles timeouts and reminders:

```csharp
suspensionPolicy: new SuspensionPolicy
{
    TimeoutSeconds = 172800,          // 48 hours
    TimeoutPortKey = "expired",       // exit port
    TimeoutBehavior = TimeoutBehavior.AbsoluteDeadline,
    ReminderIntervalSeconds = new[] { 86400, 43200, 3600 },  // reminders at 24h, 12h, 1h
    SlaThresholdSeconds = 86400,
    EmitSlaBreachEvent = true,
    AllowAdminForceComplete = true
}
```

## Two-Layer Architecture: Code + Database

Node Policies support a two-layer design for maximum flexibility:

**Layer 1 â€” Code Manifest (Compile-Time)**
The base manifest is defined in a `.Config.cs` partial file. It represents the node's core contract.

**Layer 2 â€” Extension JSON (Runtime Override)**
Administrators store extension JSON in the database (`ProcessNodePolicies` table). At runtime, `NodeFieldManifestResolver` merges the code manifest with any database extensions, enabling customization without redeployment:

```json
{
  "nodeTypeName": "email-smtp",
  "fields": [
    {
      "id": "body",
      "hilPolicy": {
        "sendToHil": true,
        "inputMode": "RequiredFromHuman",
        "label": "Email Body",
        "description": "Compliance requires you to confirm every email."
      }
    }
  ]
}
```

Only the properties present in JSON override the code values; everything else stays as defined in the manifest.

## Runtime Execution Flow

Here's how the platform uses Node Policies during workflow execution:

1. **Registration**: At startup, each node executor's `GetNodeExecutorManifest()` is called once. The result is stored in `NodeFieldManifestRegistry`
2. **Merge**: When the node is about to execute, `NodeFieldManifestResolver` merges code manifest + DB extension JSON
3. **Expression Evaluation**: Fields with `EvaluationStage.AtConfigLoad` are resolved using their evaluator kind
4. **Input Mapping**: Upstream data populates fields where `AcceptsUpstreamInput = true`
5. **Node Execution**: The executor runs and populates output fields
6. **Output Mapping**: Fields with `EmitsToDownstream = true` flow to the next node; fields with `PersistsToMemory = true` are stored
7. **Security Masking**: Fields with `MaskInLogs` or `MaskInOutput` are redacted before logs/output leave the node
8. **Suspension**: If the node pauses, `SuspensionPolicyOrchestrator` registers timeout/reminder timers
9. **HIL Rendering**: Fields with `SendToHil = true` are formatted and sent to the human reviewer's inbox

## Practical Example: Email Node with Approval

Here's a real-world SMTP node manifest that requires human confirmation before sending:

```csharp
protected override NodeExecutorManifest? GetNodeExecutorManifest()
    => NodeExecutorManifest.From(
        ProcessElementTypeCode,
        fields: new[]
        {
            // Credential field - maximum security
            new NodeFieldDescriptor
            {
                FieldId = "credentialId",
                ExpressionPolicy = new ExpressionPolicy
                {
                    EvaluationStage = EvaluationStage.AtConfigLoad,
                    EvaluatorKind = EvaluatorKind.Template
                },
                DataFlowPolicy = new DataFlowPolicy
                {
                    ExcludeFromInputMapping = true,
                    ExcludeFromOutputMapping = true
                },
                HilPolicy = new HilPolicy { SendToHil = false, DisplayMode = HilDisplayMode.Concealed },
                SecurityPolicy = new SecurityPolicy
                {
                    MaskInLogs = true,
                    MaskInOutput = true,
                    RequiresElevatedAccess = true
                }
            },
            // Email recipient - from upstream
            new NodeFieldDescriptor
            {
                FieldId = "to",
                ExpressionPolicy = new ExpressionPolicy
                {
                    EvaluationStage = EvaluationStage.AtInputReady,
                    EvaluatorKind = EvaluatorKind.Template
                },
                DataFlowPolicy = new DataFlowPolicy
                {
                    AcceptsUpstreamInput = true,
                    ExcludeFromOutputMapping = true
                },
                HilPolicy = new HilPolicy
                {
                    SendToHil = true,
                    DisplayMode = HilDisplayMode.ReadableContext,
                    Label = "To"
                }
            },
            // Email body - human must confirm
            new NodeFieldDescriptor
            {
                FieldId = "body",
                ExpressionPolicy = new ExpressionPolicy
                {
                    EvaluationStage = EvaluationStage.AtInputReady,
                    EvaluatorKind = EvaluatorKind.Template
                },
                DataFlowPolicy = new DataFlowPolicy
                {
                    AcceptsUpstreamInput = true,
                    ExcludeFromOutputMapping = true
                },
                HilPolicy = new HilPolicy
                {
                    SendToHil = true,
                    DisplayMode = HilDisplayMode.ReadableContext,
                    InputMode = HilInputMode.RequiredFromHuman,
                    Label = "Email Body",
                    Description = "Review and confirm before sending."
                }
            },
            // Message ID output - flows downstream and persists
            new NodeFieldDescriptor
            {
                FieldId = "messageId",
                ExpressionPolicy = new ExpressionPolicy
                {
                    EvaluationStage = EvaluationStage.AtInputReady,
                    EvaluatorKind = EvaluatorKind.None
                },
                DataFlowPolicy = new DataFlowPolicy
                {
                    EmitsToDownstream = true,
                    PersistsToMemory = true
                }
            }
        },
        suspensionPolicy: new SuspensionPolicy
        {
            TimeoutSeconds = 86400,  // 24 hours
            TimeoutPortKey = "expired",
            TimeoutBehavior = TimeoutBehavior.AbsoluteDeadline
        }
    );
```

The platform now handles everything: asking for human confirmation, masking the credential from logs, routing the message ID to the next node, and timing out after 24 hours.

## Key Architecture Benefits

**Eliminates Boilerplate**: The platform reads the manifest once and applies all cross-cutting concerns automatically. Nodes focus on their core logic.

**Runtime Customization**: Database extensions allow tenant-specific policy overrides without redeployment.

**Consistency**: All nodes follow the same contract. Security masking, data flow rules, and HIL rendering work identically across 60+ node types.

**Auditability**: The manifest serves as executable documentationâ€”what the code declares is exactly what the platform enforces.

**Scaling**: Adding a new node is straightforward: override `GetNodeExecutorManifest()`, declare fields, and let the platform handle the rest.

## Best Practices

**Start Minimal**: Use `NodeExecutorManifest.Empty(ProcessElementTypeCode)` as a placeholder for new nodes, then expand as needed.

**Security First**: Always set `MaskInLogs = true` for credentials, API keys, and tokens. Use full lockdown patterns for sensitive fields.

**Field Naming**: Use camelCase for `FieldId` and match the property names on your settings class exactly.

**Data Flow Patterns**: Use the three core archetypesâ€”Static Config (no flow), Dynamic Input (accepts upstream), Output (emits downstream).

**Test Manifests**: Create unit tests that verify your manifest fields match your executor's input/output types.

**Document Field Purpose**: Write clear descriptions in the manifest. They appear in admin UIs and help future maintainers understand intent.

## Conclusion

Node Policies transform workflow automation from a collection of ad-hoc implementations into a declarative system. By publishing a structured contract, nodes delegate cross-cutting concerns to the platform while remaining focused on their core responsibility: executing business logic.

Whether you're building a new node or enhancing an existing one, Node Policies give you a proven pattern for managing expression evaluation, data routing, human interaction, security, and suspensionâ€”all from a single manifest definition.

Start exploring Node Policies today. Your workflow platformâ€”and your future self maintaining this codeâ€”will thank you.

---

**Learn more**: Visit the [complete Node Policies documentation](https://docs.bizfirstai.com/WebSites/NodePolicies/) to explore all policy types, field archetypes, and developer use cases.
