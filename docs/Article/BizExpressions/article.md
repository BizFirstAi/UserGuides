# Building Dynamic Workflows with BizFirst Expression Evaluation Engine

Most workflow automation tools hit the same wall: hard-coded field values kill flexibility. What if your invoice email needs to reference the customer's name? What if tax rates change by region? What if you need to call an external API mid-workflow? Traditional approaches force you into ad-hoc JavaScript evaluators scattered across the codebase with inconsistent error handling and no reusability.

**BizExpressions solves this problem with a first-class directive-based expression engine** that turns any field value into a dynamic expression. No more custom parsers. No more ad-hoc Jint sandboxing. One unified, pluggable system that handles context resolution, scripting, templating, and external API calls with observable, cacheable, secure execution.

## What Problem Does BizExpressions Solve?

Workflow systems must resolve field values at runtime. A node's configuration might define: `"Send email to {customer_email}"`. That string is static. To make it dynamic, the system needs to:

1. **Detect** that the field contains a reference (variable, context data, API call, script)
2. **Parse** the reference syntax into directive, path, and options
3. **Resolve** the directive using the correct data source
4. **Transform** the resolved value (uppercase, format, validate, cache)
5. **Substitute** the result back into the template

Traditional approaches solve this with one-off solutions: regex parsing, embedded Jint contexts, string interpolation. Each approach carries risks: injection vulnerabilities, inconsistent error handling, no visibility, hard to test, impossible to extend.

**BizExpressions provides a unified framework** with:
- 13+ built-in directives for every data source (context, variables, node I/O, scripts, APIs)
- Pluggable architecture for custom directives
- Observable execution with timing, caching, error codes
- Three isolation levels (Safe, Sandboxed, Trusted) for security
- Support for template strings, nested resolution, cycle detection
- Database-backed reusable expressions ("canned" expressions)

## Why This Solution Exists

Building workflow engines at scale revealed hard requirements:

**Reusability**: Sales team uses tax rate `15%` in 50 workflows. When tax changes to `16%`, don't touch those workflowsâ€”store the rate once as a canned expression `@company.taxRate`, and every workflow reflects the change automatically.

**Observability**: When an expression fails, the node executor crashes silently. BizExpressions returns structured error codes: `DirectiveNotFound`, `PathNotFound`, `IsolationViolation`, `CycleDetected`. Each failure is logged with timing, cache hit status, and the exact expression.

**Security**: Not all nodes can call external APIs. Expressions run at three isolation levels: `Safe` (read-only data access), `Sandboxed` (includes JavaScript), `Trusted` (includes C# and external APIs). Attempting to use a forbidden directive returns `IsolationViolation` error, not a silent failure.

**Performance**: Expressions are evaluated on every node execution. Caching is built inâ€”`@cache` (node scope), `@cache-thread` (workflow thread scope), `@cache-process` (top-level workflow scope). Cache-aware timing means you see `0ms` for cache hits.

**Extensibility**: Your domain needs a custom directive? Build one directive class, register it in DI, and it works everywhere. The framework handles parsing, routing, option application, and error handling.

## Core Features and Architecture

### The Three-Layer Pipeline

Every expression flows through this pipeline:

```
[Raw Field] â†’ [Parser] â†’ [Directive Evaluator] â†’ [Options] â†’ [Formatted Value]
```

**Layer 1: Parsing** â€” The `IWildcardParser` detects if a string contains expressions. Three parsers handle different syntaxes:
- `{@ $directive.path @option }` (default, system syntax)
- `{{ $directive.path @option }}` (n8n/Handlebars compatible)
- `@alias.path` (canned expression shorthand)

**Layer 2: Directive Routing** â€” The orchestrator looks up the directive name in the DI registry and calls its `EvaluateAsync` method. Thirteen directives come built-in:

| Directive | Purpose | Example |
|-----------|---------|---------|
| `$ctx` | Environment, tenant, user, time | `{@ $ctx.user.email }` |
| `$var` | Workflow memory variables | `{@ $var.invoiceTotal }` |
| `$input` | Current node input data | `{@ $input.current.id }` |
| `$output` | Previous node outputs | `{@ $output.ParseNode.amount }` |
| `$exec` | Execution metadata | `{@ $exec.executionId }` |
| `$flow` | Workflow metadata | `{@ $flow.current.name }` |
| `$js` | Inline JavaScript (Jint) | `{@ $js\`return x * 1.1\` }` |
| `$cs` | Inline C# (Roslyn, trusted only) | `{@ $cs\`return x * taxRate\` }` |
| `$tpl` | Liquid template rendering | `{@ $tpl.InvoiceEmail }` |
| `$api` | External HTTP API calls | `{@ $api.CurrencyService/rates/USD }` |
| `$math` | Math functions | `{@ $math.round(2).of($var.total) }` |
| `$items` | Global item collection | `{@ $items.sum.amount }` |
| `@` | Canned (named, reusable) | `@company.taxRate` |

**Layer 3: Options** â€” Post-resolution transforms applied in order:
- `@uppercase`, `@lowercase` â€” string transforms
- `@json` â€” serialize to JSON
- `@date:yyyy-MM-dd` â€” format dates
- `@default:value` â€” null coalescing
- `@required`, `@notEmpty` â€” validation
- `@cache`, `@cache-thread`, `@cache-process` â€” caching scopes

### The Two Key Objects

**EvaluationContext** (created once per node execution):
- Contains tenant, execution, user, isolation level
- Reused for all field resolutions in that node
- Carries cache, memory, node execution data

**EvaluationRequest** (created per expression):
- Immutable; chaining creates new request via `request.Chain()`
- Tracks parsed directives, path, options, depth, visited keys
- Prevents infinite loops via `VisitedKeys` set

### Template String Mode

When a field contains multiple expressions:

```
"Dear {@ $ctx.user.name }, your order {@ $var.orderId } is ready."
```

The engine:
1. Finds all expression regions in parallel
2. Evaluates each region independently (async/await)
3. Substitutes resolved values into the original string
4. Re-scans for nested expressions (max depth 10)
5. Returns assembled template

## Step-by-Step Walkthrough: Invoice Email Use Case

Let's build a workflow that generates personalized invoice emails.

**Configuration**:
```json
{
  "field": "recipient",
  "value": "{@ $ctx.user.email }"
},
{
  "field": "subject",
  "value": "Invoice #{@ $var.invoiceNumber }} for {@ $ctx.tenant.name @uppercase }}"
},
{
  "field": "body",
  "value": "Dear {@ $ctx.user.name }},\n\nYour invoice total is {@ $var.invoiceTotal @json }}\nTax (@ company.taxRate): {@ $math.round(2).of($var.invoiceTotal * @company.taxRate) }}\n\nThank you!"
}
```

**Execution Flow**:

1. Node executor creates `EvaluationContext` once
2. For field `recipient`:
   - Parse detects `{@ $ctx.user.email }`
   - Route to `$ctx` directive â†’ fetch from context
   - Apply options (none here)
   - Return formatted value: `john.doe@company.com`

3. For field `subject`:
   - Parse detects two expressions
   - Parallel evaluation:
     - `{@ $var.invoiceNumber }}` â†’ 2024-001
     - `{@ $ctx.tenant.name @uppercase }}` â†’ ACME CORP
   - Substitute â†’ `Invoice #2024-001 for ACME CORP`

4. For field `body` (template with multiple expressions):
   - First pass evaluates `$ctx.user.name`, `$var.invoiceTotal`, `$math.round(...)`
   - Canned expression `@company.taxRate` resolves to stored expression â†’ evaluates as `0.15`
   - Substitutes all values
   - Re-scans for nested expressions (none found)
   - Returns assembled email body

**Result**: A dynamic, multi-source email template generated in one pass.

## Real-World Scenario: Multi-Tenant SaaS Workflow

A SaaS platform processes expense reports across 50 tenants. Each tenant has different approval hierarchies, currencies, tax rules.

**Without BizExpressions**: Build 50 workflow variants, one per tenant. Update any rule? Manually edit 50 workflows.

**With BizExpressions**: Build one workflow that uses canned expressions:
- `@company.approvalThreshold` â€” tenant-specific approval amount
- `@company.currency` â€” tenant currency for reports
- `@company.taxRate` â€” tenant tax rate
- `@hr.maxReimbursement` â€” app-specific override for HR workflows

Update threshold for one tenant? Change one canned expression. All workflows referencing `@company.approvalThreshold` immediately reflect the changeâ€”no deployment, no downtime.

The expression engine handles multi-tenant scoping automatically. Each canned expression resolution checks `EvaluationContext.TenantId` and `AppId`, applying tenant-wide or app-specific overrides as needed.

## Benefits Summary

**Developer Benefits**:
- Single entry point: `await orchestrator.EvaluateAsync(fieldValue, context, ct)`
- Built-in directives handle 90% of real-world cases
- Extensible: build custom directives for domain-specific logic
- Observable: structured error codes, timing, cache hit status
- Testable: `EvaluationContext` and `EvaluationRequest` are fully mockable

**Operator Benefits**:
- Update canned expressions in the databaseâ€”workflows reflect changes instantly
- Audit trails for expression evaluations (optional trace mode)
- Visibility into which directives executed, how long, cache hits
- No code deployment needed to change business logic

**Security Benefits**:
- Three isolation levels control which directives are allowed per node
- Sensitive path masking (configurable regex patterns for passwords, tokens, secrets)
- Sandboxed scripting (Jint for JavaScript, Roslyn for C#)
- Allowlisting for external API domains
- Hard errors on isolation violations (not silent failures)

**Performance Benefits**:
- Lazy evaluation: expressions only trigger if wildcard detected
- In-memory caching with configurable scopes
- Parallel template evaluation (multiple expressions in one field)
- Cycle detection prevents infinite loops
- Stopwatch tracking for every directive

## Best Practices When Using BizExpressions

**1. Use the Right Directive for the Job**
- `$ctx` for environment/tenant/user/time â€” never in business logic
- `$var` for workflow state â€” highly mutable
- `$input`/`$output` for inter-node communication
- `$js` for complex calculations, string manipulation
- `$cs` only when JavaScript can't do it (trusted nodes only)
- `$tpl` for rich formatting (emails, documents)
- `@` (canned) for constants across workflows

**2. Leverage Canned Expressions for Configuration**
Don't repeat expressions:
```
Bad:  {@ $var.price * 0.15 }} (repeated in 20 workflows)
Good: {@ $var.price * @company.taxRate }} (canned expression)
```

**3. Understand Isolation Levels**
Set `IsolationLevel` appropriately in `EvaluationContext`:
- `Safe` (default): read-only data access
- `Sandboxed`: add JavaScript scripting
- `Trusted`: add C# scripting and external API calls

Never set all nodes to `Trusted` without auditing script expressions.

**4. Use @cache for Expensive Operations**
```
{@ $api.CurrencyRates/USD @cache-thread }}  // Cache for the entire workflow
```

Cache scope matters: node scope expires after node execution, thread scope after workflow thread completes, process scope after top-level workflow completes.

**5. Structure Canned Expression Names Hierarchically**
```
@company.taxRate           // tenant-wide config
@company.invoiceTemplate   // tenant-wide template
@hr.maxLeaveBalance        // hr-app override
@sales.commissionRate      // sales-app override
```

This enables both tenant-wide defaults and app-specific overrides.

**6. Test Expression Chains**
Complex expressions using `$js` or `$cs` benefit from unit tests. The framework is testable:

```csharp
var context = new EvaluationContext { ... };
var response = await orchestrator.EvaluateAsync(
    "{@ $js`return input.price * 1.1` }",
    context,
    CancellationToken.None
);
Assert.True(response.IsSuccess);
Assert.AreEqual(110, response.Value);
```

## Conclusion

BizExpressions transforms workflow automation from a static, script-heavy model into a dynamic, composable system. Instead of coding field resolution into dozens of places, you define expressions once, reuse them everywhere, and update them without redeployment.

Whether you're building single-tenant workflows or multi-tenant SaaS platforms, whether you need simple variable substitution or complex multi-pass template evaluation with scripting, BizExpressions provides the architecture to do it safely, observably, and extensibly.

**Next Steps:**
- Start with the [Integration Guide](https://docs.bizfirstai.com/WebSites/BizExpressions/02-how-to-call.html) to register directives in DI
- Review [Expression Samples](https://docs.bizfirstai.com/WebSites/BizExpressions/03-directive-samples.html) for real working examples
- Build your first custom directive using the [Plugin Guide](https://docs.bizfirstai.com/WebSites/BizExpressions/10-plugin-guide.html)
- Explore [Complex Use Cases](https://docs.bizfirstai.com/WebSites/BizExpressions/06-complex-cases.html) for advanced patterns

The full documentation, including directive reference, edge cases, and vocabulary, is available at [docs.bizfirstai.com/WebSites/BizExpressions](https://docs.bizfirstai.com/WebSites/BizExpressions/).
