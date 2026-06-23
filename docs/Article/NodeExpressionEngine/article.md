# Building Dynamic Workflows with BizFirst's Node Expression Engine

## Introduction

Every workflow you design in BizFirst starts with a fundamental challenge: your node configuration is defined at design time in the workflow editor, but the actual values those fields need are often only known when the workflow runs. What's the employee ID being onboarded? What approval threshold was calculated earlier in the workflow? Where's the API key stored in your vault? The Node Expression Engine solves this problem elegantly by allowing configuration fields to contain expression directives that resolve to real values at runtime.

## The Problem: Bridging Design-Time and Runtime

When you create a workflow, you define nodes and configure them with specific values. But static configuration quickly becomes rigid. Imagine building an employee onboarding workflowâ€”you can't hardcode every employee's ID, email, or department. You need configuration fields that can pull values from wherever they currently exist: from the original trigger data, from outputs of upstream nodes, from workflow variables, or from environment secrets.

Without a dynamic expression system, you'd be forced to:
- Hardcode values for every scenario (impossible at scale)
- Write custom code in every node executor (duplicated logic across the platform)
- Rebuild workflows for different environments or data sources

The Expression Engine eliminates this friction by treating configuration fields as templates. Fields can contain directives like `@{input:employeeId}` or `@{secret:ApiKey}` that the engine resolves automatically before the node executor runs.

## Why This Solution Exists: The Business Value

The Expression Engine directly addresses workflow flexibility and developer productivity. It enables:

**Reusability**: Write a workflow once, parameterize it with expressions, and reuse it across different data sources and environments without modification.

**Data Flow Simplicity**: Wire outputs from upstream nodes directly into downstream node configuration without intermediate transformation nodes. If Node A produces `user.email`, Node B can reference it immediately via `@{output:nodeA.email}`.

**Vault Integration**: Secrets and environment variables resolve automatically at Tier 1, before the node executor runs. No manual secret retrieval code in your executors.

**Scoped Variables**: The workflow-level variable system acts as writable memory. Store intermediate results and reference them downstream, with proper scope isolation for loops and sub-workflows.

**Consistency**: One unified syntax across all configuration fields means developers learn one pattern and apply it everywhere.

## Core Features and Capabilities

### 1. Six Expression Directives

The engine provides six directive types, each resolving from a different data source:

- **`@{input:key}`** â€“ The element-level InputData bag, populated from upstream node outputs
- **`@{output:nodeKey.field}`** â€“ Any previously executed node's output, with dot-path navigation
- **`@{var:key}`** â€“ Workflow variables in the current scope (global, loop, or function scope)
- **`@{env:KEY}`** â€“ Process environment variables
- **`@{secret:Key}`** â€“ Vault secrets via the secure secrets store
- **`@{context:field}`** â€“ Execution context (tenantId, processId, threadId)

Each directive is available at specific evaluation stages, and the engine ensures resolution happens exactly when the data is available.

### 2. Two Expression Formats

The syntax supports both **template mode** (`@{directive:key}`) for string interpolation and **strict mode** (`{{directive:key}}`) for type preservation. Template mode allows multiple directives in a single field and converts resolved values to strings. Strict mode requires exactly one expression and preserves the original typeâ€”a number remains a number, an array remains an array.

```
// Template mode: interpolation
"Hello, @{input:firstName} @{input:lastName}"

// Strict mode: type preservation
{{input:maxRetries}}  â†’ integer 3, not "3"
{{output:items}}      â†’ array, not stringified
```

### 3. Three Evaluator Kinds

Beyond simple directive substitution, fields can declare custom evaluators:

- **Template** (default) â€“ Substitute directives and return the string as-is
- **JavaScript (Jint)** â€“ Evaluate the field value as JavaScript with injected variables
- **JSONPath** â€“ Apply a JSONPath query against a specified source object

For complex logic, the JavaScript evaluator gives you full programmatic access:

```javascript
// JavaScript evaluator example
input.amount * 1.2 > vars.threshold ? "escalate" : "approve"

// Array operations
output.fetchItems.items.filter(x => x.active).map(x => x.id).join(",")
```

### 4. Data Bags Architecture

The engine organizes data into named containers at two scopes:

**Thread-Scope Bags** (ExecutionMemory â€“ available across all nodes):
- InputData: The original trigger payload (immutable)
- Variables: Writable scoped memory for the workflow
- NodeOutputs: Results from every completed node
- Cache: Transient scratch space (cleared on pause)

**Element-Scope Bags** (ProcessElementExecutionContext â€“ per-node):
- ResolvedConfig: The merged, resolved configuration ready for the executor
- InputData (element-level): Upstream outputs mapped into this node's input
- OutputData: This node's result
- LocalMemory: Private scratch space for the node only
- HIL Bags: Data for human-in-the-loop interactions

This two-level organization ensures data isolation while enabling efficient data flow.

## Architecture Overview: The Evaluation Pipeline

The Expression Engine operates in two distinct tiers, each running at a different point during node execution:

**Tier 1 (AtConfigLoad)**: Runs immediately after the 3-layer config merge, before the input bag is populated. Resolves fields that depend only on static configuration data:
- `@{env:}` â€“ Process environment variables
- `@{secret:}` â€“ Vault secrets
- `@{context:}` â€“ Execution context

**Tier 2 (AtInputReady)**: Runs after the orchestrator populates the element's InputData from upstream nodes. Resolves fields that depend on runtime data:
- `@{input:}` â€“ Element-level InputData
- `@{output:}` â€“ Previous nodes' outputs
- `@{var:}` â€“ Workflow variables
- `@{env:}`, `@{secret:}`, `@{context:}` â€“ Also available (usually declared at Tier 1)

The two-tier design avoids both premature resolution (returning empty results) and deferred processing (unnecessary overhead). Each field resolves exactly when its source data becomes available.

## Step-by-Step Walkthrough: A Practical Example

Let's trace through an employee onboarding workflow to see the engine in action:

**Design Time**: You create a workflow with three nodes:
1. A "Fetch Employee" node (key: `fetchEmployee`) that queries employee data
2. An "Approve Provisioning" node that checks an approval threshold
3. A "Create Account" node that provisions the employee

**Tier 1 Resolution** (AtConfigLoad):
The Create Account node's configuration includes:
```
ServiceURL: @{env:ACCOUNT_SERVICE_URL}
ApiKey: @{secret:ProvisioningKey}
TenantId: @{context:tenantId}
```

These resolve before the input bag is populated. ServiceURL becomes `https://accounts.internal.com` (from env), ApiKey becomes the actual vault secret, and TenantId becomes the current tenant ID.

**Input Mapping**:
The orchestrator maps the Fetch Employee node's output into the Create Account node's InputData:
```json
{
  "employeeId": "EMP-12345",
  "firstName": "Alice",
  "email": "alice@company.com"
}
```

**Tier 2 Resolution** (AtInputReady):
Now the Create Account node's remaining fields resolve:
```
EmployeeEmail: @{input:email}
CreateAdmin: @{output:approveNode.isApproved}
LogDetails: @{var:auditLevel}
```

- `@{input:email}` resolves to `alice@company.com` (from InputData)
- `@{output:approveNode.isApproved}` resolves to `true` (from Approve node's output)
- `@{var:auditLevel}` resolves to `FULL` (from workflow variables)

**Execution**:
The Create Account node executor receives fully resolved configuration and executes with real, runtime-aware values.

## Real-World Scenario: Multi-Tenant Integration Platform

Consider a SaaS integration platform building connectors to multiple external systems. A single workflow template needs to:
- Use environment-specific API endpoints
- Reference tenant-specific secrets from a vault
- Chain outputs between nodes without intermediate transformation
- Maintain audit logs with context-aware information

Without the Expression Engine, you'd need:
- Hard-coded endpoints per environment
- Custom code to fetch secrets before every API call
- Manual output mapping between nodes
- Duplicated context lookups throughout executors

With the Expression Engine:
- Define endpoints once: `@{env:STRIPE_API_BASE}`
- Fetch secrets declaratively: `@{secret:StripeApiKey}`
- Chain node outputs naturally: `@{output:fetchTransaction.id}`
- Reference context automatically: `@{context:tenantId}`

The entire workflow remains environment-agnostic and reusable. Deploy the same workflow to development, staging, and production by changing only environment variables and secrets.

## Benefits Summary

**Performance**: The two-tier pipeline resolves fields only when necessary. If no fields require Tier 2 evaluation, it's skipped entirely with zero overhead.

**Safety**: Expression evaluation errors are caught at the field level. Required fields that fail validation prevent executor dispatch. Optional fields that fail resolve to null, allowing graceful degradation.

**Flexibility**: Three evaluator kinds (Template, JavaScript, JSONPath) cover simple substitution through complex transformations without leaving the configuration layer.

**Type Safety**: Strict mode preserves types, preventing accidental type coercion. A boolean stays boolean, an array stays an array.

**Security**: Secrets and environment variables resolve at Tier 1, before user input is available, preventing secret leakage into logs or outputs.

**Scope Isolation**: Variables in loops and sub-workflows don't pollute parent scopes. Modifications propagate correctly based on explicit write semantics (`SetVariable` vs `SetLocalVariable`).

## Best Practices When Using NodeExpressionEngine

**1. Plan Your Evaluation Stages Early**
Decide which fields need Tier 1 vs Tier 2 evaluation. Static config (endpoints, credentials) belongs at Tier 1. Runtime data (input values, upstream outputs) belongs at Tier 2. Declare this explicitly in your NodeFieldDescriptor.

**2. Use Strict Mode for Non-String Fields**
When a field expects a number, boolean, or object, use strict mode `{{directive:key}}` to preserve the type. This prevents subtle bugs from string conversion.

**3. Leverage Dot-Path Navigation**
Instead of extra transformation nodes, use `@{output:nodeKey.nested.field}` to navigate directly into complex outputs. The path resolver handles null gracefully.

**4. Scope Variables Properly**
Global variables persist across the entire workflow; use them for cross-node state. Local loop variables disappear when the loop exits; use them for iteration-specific data. Be explicit about scope.

**5. Document Your Data Flow**
Use NodeFieldDescriptor comments to explain which directives each field uses and why. This helps other developers understand data dependencies.

**6. Handle Missing Data Gracefully**
A directive resolving to null is not an error unless the field is marked required. Design executors to handle null values for optional fields.

**7. Test Expression Logic**
JavaScript evaluator fields are mini-programs. Test them independently if possible. Use simple, readable expressions; complex logic belongs in OnProcess.

**8. Remember Expressions are Config-Time**
Expressions resolve once, when the field is evaluated. They are not a scripting language for business logic. Business logic belongs in the executor's OnProcess method.

## Conclusion

The Node Expression Engine is the connective tissue that transforms static workflow designs into dynamic, data-aware systems. By providing a unified syntax for accessing data from six different sources, two evaluation tiers that run at exactly the right time, and multiple evaluator kinds for different complexity levels, the engine eliminates the need for brittle workarounds and custom integration code.

Whether you're building a multi-tenant SaaS connector, an internal automation platform, or a complex business process, the Expression Engine gives you the tools to wire data through your workflows with clarity and confidence.

Ready to build more flexible workflows? Start by exploring the [official documentation](https://docs.bizfirstai.com/WebSites/NodeExpressionEngine/) to dive deeper into data bags, evaluation stages, and field policies.
