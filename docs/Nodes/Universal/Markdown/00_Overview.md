# Universal Item Iteration Documentation: Overview

## What is Universal Item Iteration?

**Universal Item Iteration** (also called **SupportsItemIteration** pattern) is a configuration feature that enables any compatible Flow Studio node to automatically process arrays of items without requiring a separate Loop node wrapper. Instead of nesting a node inside a Loop block, you enable iteration directly on the node itself via the `itemsIterationEnabled` property.

Think of it as embedding a "for each" loop into the node's DNA—the node processes each item independently while maintaining its normal output ports and configuration flexibility.

### Key Differentiator: Flow-Wide Iteration

- **LoopNode**: Items iterate through a contained body workflow (isolated scope, dedicated node architecture)
- **Universal Iteration**: Items are processed within a single node; multiple iterations flow through downstream nodes independently (flow-wide access)

**See [Comparison with Loop Node](#comparison-with-loop-node) below for detailed differences.**

## Which Nodes Support Universal Item Iteration?

The following core Flow Studio nodes support the SupportsItemIteration pattern:

| Node | Purpose | Common Use |
|------|---------|-----------|
| **SMTP/EmailSmtp** | Send emails | Loop through recipients, send personalized emails |
| **HTTP Request** | Make HTTP calls | Call APIs in parallel for multiple items |
| **Data Mapping** | Transform data | Transform each item in a collection |
| **Database** | Execute queries | Insert/update multiple records in batches |
| **Custom** | User-defined nodes | Custom logic with built-in iteration |

Additional nodes may support this pattern—check node documentation for `itemsIterationEnabled` property.

## When to Use Universal Item Iteration vs Loop Node

### Use Universal Iteration When:

✅ You need to process items **on a single node** (SMTP, HTTP, Database, DataMapping, Custom)  
✅ Items should **flow through downstream nodes** independently after processing  
✅ You want **simpler workflows** (one node instead of wrapper + body)  
✅ You need **no conditional routing** within the iteration (all items take same path)  
✅ You want **built-in batching & parallelization** on that single node  

### Use Loop Node When:

✅ Items need to flow through **multiple nodes** in a complex workflow body  
✅ You need **different downstream paths** for different items (conditional routing)  
✅ You require **isolated scope** (variables don't leak between iterations)  
✅ You need **complex branching logic** inside the loop body  
✅ You want **automatic result aggregation** from multiple processing steps  

## Quick Start (5-Minute Overview)

### Basic Workflow

```
Input Data (includes "customers" array)
    ↓
[SMTP Node with itemsIterationEnabled=true]
  ├─ items source: @{input:customers}
  ├─ recipient per iteration: @{input:customer|email}
  └─ send email to each
    ↓
[Each email send flows to next node]
    ↓
Done
```

### Three-Step Setup

1. **Enable Iteration on Node**
   - Open node configuration
   - Set `itemsIterationEnabled: true`

2. **Specify Items Source**
   - `itemsIterationPropertyName`: Direct property (e.g., `customers`)
   - OR `itemsIterationPropertyFormula`: Expression (e.g., `@{input:data|orders}`)
   - OR `itemsIterationSubQuery`: JSONPath query (e.g., `$.items[*]`)

3. **Access Current Item in Node Configuration**
   - Use `@{input:item}` or `@{input:current_item}` to reference the current item
   - Access nested fields: `@{input:item|email}` or `@{input:item|address|zip}`

### Real-World Example: Send Personalized Emails

**Input Data:**
```json
{
  "customers": [
    { "id": 1, "name": "Alice", "email": "alice@example.com" },
    { "id": 2, "name": "Bob", "email": "bob@example.com" },
    { "id": 3, "name": "Charlie", "email": "charlie@example.com" }
  ]
}
```

**SMTP Node Configuration:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "customers",
  "recipients": "@{input:item|email}",
  "subject": "Hello @{input:item|name}!",
  "body": "Custom message for @{input:item|name}"
}
```

**Behavior:**
- Iteration 1: Send to alice@example.com, subject "Hello Alice!"
- Iteration 2: Send to bob@example.com, subject "Hello Bob!"
- Iteration 3: Send to charlie@example.com, subject "Hello Charlie!"
- All 3 emails sent, 3 separate outputs flow downstream

## Key Concepts Preview

### Three Ways to Specify Items

| Method | Syntax | Use Case |
|--------|--------|----------|
| **Property Name** | `itemsIterationPropertyName: "customers"` | Simple list in input (most common) |
| **Expression Formula** | `itemsIterationPropertyFormula: "@{input:orders}"` | Computed collection (transformations) |
| **JSONPath Query** | `itemsIterationSubQuery: "$.data.items[*]"` | Nested array in complex objects |

See [02_Configuration.md](02_Configuration.md) for details.

### Built-In Variables

Every iteration automatically provides:
- `@{input:item}` or `@{input:current_item}` – The current item being processed
- `@{input:current_iteration_index}` – Zero-indexed position (0, 1, 2...)

Access nested properties: `@{input:item|fieldName|nestedField}`

See [04_Variable_Access.md](04_Variable_Access.md) for advanced variable access.

### Result Flow

Unlike Loop Node which aggregates results into an array, Universal Iteration passes each item's result independently to the next node:

```
Iteration 1 output: { "sent": true, "id": 1 }
    ↓ [flows to next node as single result]
Iteration 2 output: { "sent": true, "id": 2 }
    ↓ [flows to next node as single result]
Iteration 3 output: { "sent": true, "id": 3 }
    ↓ [flows to next node as single result]
```

Configure aggregation via `aggregateResults` and `returnLastResultOnly` properties.

### Batching & Parallelization

Universal Iteration supports powerful performance tuning:

- **Sequential Processing**: Process items one at a time (default)
- **Sequential Batching**: Group items into batches, process each batch serially
- **Parallel Batching**: Process multiple items/batches concurrently (e.g., 8 parallel HTTP requests)
- **Rate Limiting**: Add delay between batches to respect rate limits

Example: Parallel HTTP Requests
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "userIds",
  "batchSize": 10,
  "parallelExecution": true,
  "batchWaitTimeMs": 1000
}
```

See [03_Batching_And_Parallelization.md](03_Batching_And_Parallelization.md) for details.

## Comparison with Loop Node

| Feature | Universal Iteration | Loop Node |
|---------|-------------------|-----------|
| **Node Architecture** | Built-in to a single node | Dedicated wrapper node |
| **Items Source** | Any input data | Any input data |
| **Nesting** | No nesting; single-node iteration | Can nest nodes in body |
| **Downstream Routing** | Each item flows to next node | Aggregated array flows to next node |
| **Conditional Routing** | No; all items follow same path | Yes; branches inside body |
| **Scope Isolation** | Limited (variables within node) | Full isolation per iteration |
| **Batching** | ✅ Yes (advanced) | ✅ Yes |
| **Parallelization** | ✅ Yes (advanced) | ✅ Yes |
| **Use Case** | Single-node bulk operations | Multi-node workflows per item |
| **Complexity** | Lower | Higher |

See [07_vs_Loop_Node.md](07_vs_Loop_Node.md) for detailed comparison.

## Node Properties at a Glance

Universal Iteration exposes **21 configuration properties** organized into categories:

| Category | Properties | Count |
|----------|-----------|-------|
| **Iteration Sources** | itemsIterationEnabled, itemsIterationPropertyName, itemsIterationPropertyFormula, itemsIterationSubQuery | 4 |
| **Core Behavior** | maxAllowedCount, breakOnFirstError, skipOnEmpty, timeoutPerIteration | 4 |
| **Limits & Exits** | minAllowedCount, forceExitAfterCount | 2 |
| **Error Handling** | retryFailedItems, returnFirstError, breakOnFirstError* | 3 |
| **Result Management** | aggregateResults, returnLastResultOnly | 2 |
| **Performance & Batching** | batchSize, parallelExecution, reverseOrder | 3 |
| **Batch Timing** | batchWaitTimeMs, batchStartDelayMs | 2 |
| **Filtering & Sorting** | filterExpression, sortByExpression | 2 |

*breakOnFirstError listed in both Core Behavior and Error Handling

Full property reference: [02_Configuration.md](02_Configuration.md)

## Documentation Roadmap

| Page | Purpose | Read Time |
|------|---------|-----------|
| **[00_Overview.md](00_Overview.md)** | What & why (you are here) | 5 min |
| **[01_Getting_Started.md](01_Getting_Started.md)** | Step-by-step first iteration | 10 min |
| **[02_Configuration.md](02_Configuration.md)** | Complete property reference | 25 min |
| **[03_Batching_And_Parallelization.md](03_Batching_And_Parallelization.md)** | Performance tuning & strategies | 15 min |
| **[04_Variable_Access.md](04_Variable_Access.md)** | Accessing items & iteration data | 8 min |
| **[05_Error_Handling.md](05_Error_Handling.md)** | Error strategies & recovery | 12 min |
| **[06_Best_Practices.md](06_Best_Practices.md)** | Performance & design tips | 10 min |
| **[07_vs_Loop_Node.md](07_vs_Loop_Node.md)** | Detailed comparison | 8 min |

## Pro Tips

> **💡 Start Simple**  
> Begin with a single iteration source property (itemsIterationPropertyName) on one node. Add complexity (batching, parallelization, filtering) only when needed for performance.

> **💡 Test with Small Data**  
> Test iteration with 3-5 sample items before scaling to 1000+ items. Use `maxAllowedCount` to limit iterations during development.

> **💡 Use Parallel for I/O, Sequential for Heavy Processing**  
> HTTP requests, API calls, and I/O operations benefit from parallelization. CPU-intensive tasks (data transformation, encryption) should stay sequential to avoid resource contention.

> **💡 Monitor Iteration Logs**  
> Enable execution logging on iterated nodes. The logs show each iteration's input, configuration, and output, making debugging easy.

## Common Questions

**Q: How many items can I iterate over?**  
A: No hard limit, but consider memory and timeout. Use `maxAllowedCount` to set an upper bound. For 10,000+ items, use batching and parallelization. See [03_Batching_And_Parallelization.md](03_Batching_And_Parallelization.md).

**Q: Can I filter items before iteration starts?**  
A: Yes, use `filterExpression` property. Example: `@{input:item|age} > 18` to iterate only over items matching a condition.

**Q: What happens if an item fails during iteration?**  
A: Depends on `breakOnFirstError`. If true, stop immediately. If false, skip that item and continue. Configure retry via `retryFailedItems`. See [05_Error_Handling.md](05_Error_Handling.md).

**Q: Can I sort items before iteration?**  
A: Yes, use `sortByExpression` property. Example: `@{input:item|created_date}` to sort by date.

**Q: How does parallelization work?**  
A: Set `batchSize: 10` and `parallelExecution: true`. This processes 10 items concurrently. When 10 finish, the next 10 start. See [03_Batching_And_Parallelization.md](03_Batching_And_Parallelization.md).

**Q: Can I use Universal Iteration and Loop Node together?**  
A: Yes. A Loop Node can contain a node with Universal Iteration enabled, creating nested iteration patterns. This is advanced—see [03_Batching_And_Parallelization.md](03_Batching_And_Parallelization.md#nested-iteration-advanced).

---

## Related Documentation

- [01_Getting_Started.md](01_Getting_Started.md) – Build your first iteration in 5 minutes
- [02_Configuration.md](02_Configuration.md) – Reference all 21 properties
- [03_Batching_And_Parallelization.md](03_Batching_And_Parallelization.md) – Performance tuning strategies
- [06_Best_Practices.md](06_Best_Practices.md) – Real-world design patterns

---

**Last Updated:** June 2026  
**For Questions:** Check execution logs for per-iteration debugging, or consult the best practices section.
