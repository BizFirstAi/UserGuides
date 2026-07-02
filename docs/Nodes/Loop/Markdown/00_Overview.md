# Loop Node Documentation: Overview

## What is the Loop Node?

The **Loop Node** is a specialized iteration component in Flow Studio that processes collections of items repeatedly through a workflow body. Unlike universal iteration patterns that process one item at a time across the entire flow, the Loop Node provides **scoped, isolated iteration** within a dedicated node context.

Think of it as a dedicated "for each" block in your workflow—every item in your collection flows through the same internal workflow steps, with variables isolated per iteration and automatic result aggregation.

### Key Differentiator: Scoped Iteration
- **LoopNode**: Items iterate through a contained body workflow (isolated scope)
- **Universal Iteration**: Items propagate through multiple downstream nodes (flow-wide scope)

See [06_vs_Universal_Iteration.md](06_vs_Universal_Iteration.md) for a detailed comparison.

## When to Use the Loop Node

### Use LoopNode When:
- You need to process **a defined collection** of items through **identical steps**
- Variables should be **isolated per iteration** (no cross-iteration leakage)
- You want **automatic aggregation** of results
- The processing is **self-contained** within a logical block
- You need **fine-grained control** over iteration parameters (rate limiting, batch processing, error handling)

### Use Universal Iteration When:
- Items flow through **different downstream nodes** based on conditions
- You need **flow-wide access** to iteration variables
- You want **lazy evaluation** across the entire workflow
- Different items take different paths through your flow

## Quick Start (3-Minute Overview)

### Basic Anatomy
```
Input (array of items)
    ↓
Loop Node [determines items to iterate]
    ↓
Loop Body [runs for each item]
    ├─ Access current item via @{mem:current_item}
    ├─ Process, transform, or call APIs
    └─ Produce output
    ↓
Results Aggregated (array of outputs)
    ↓
Done Port [send results downstream]
```

### Minimal Configuration
1. **Select Items Source**: Tell Loop which collection to iterate
   - Property Name: `orders`
   - Or Expression: `@{orders}`
   - Or JSONPath: `$.data.orders`

2. **Build Loop Body**: Add nodes inside the loop body port
   - Access current item: `@{mem:current_item}`
   - Access index: `@{mem:current_index}`
   - Call APIs, transform data, branch logic

3. **Connect Output**: Take aggregated results from `done` port
   - Use as input to next steps
   - Or output from entire workflow

### Real-World Example
Processing a list of customers to send personalized emails:

```json
{
  "customers": [
    { "id": 1, "name": "Alice", "email": "alice@example.com" },
    { "id": 2, "name": "Bob", "email": "bob@example.com" },
    { "id": 3, "name": "Charlie", "email": "charlie@example.com" }
  ]
}
```

**Loop Configuration:**
- Items Source: Property Name = `customers`
- Max Allowed Count: 100

**Loop Body:**
- Email Service node (sends email to `@{mem:current_item|email}`)
- Returns: sent timestamp + response

**Result:** Array of 3 email send confirmations

## Key Concepts Preview

### Collections: Three Ways to Specify Items
The Loop Node can source items from three types of collections:

| Method | Syntax | Use Case |
|--------|--------|----------|
| **Property Name** | Direct property lookup | Simple list in input (most common) |
| **Expression** | `@{expression}` formula | Computed collection (map/filter) |
| **JSONPath** | `$.path.to.array` | Nested array in complex objects |

See [01_Basics.md](01_Basics.md) and [02_Configuration.md](02_Configuration.md) for details.

### Built-In Variables
Every iteration automatically provides:
- `@{mem:current_item}` – The current item being processed
- `@{mem:current_index}` – Zero-indexed position (0, 1, 2...)

Access nested properties: `@{mem:current_item|fieldName|nestedField}`

See [03_Variables_And_Scope.md](03_Variables_And_Scope.md) for advanced scoping.

### Result Aggregation
By default, the Loop Node collects all body outputs into an array:

```
Loop runs 3 times:
  Iteration 1 output: { "sent": true, "id": 1 }
  Iteration 2 output: { "sent": true, "id": 2 }
  Iteration 3 output: { "sent": true, "id": 3 }

Aggregated result:
[
  { "sent": true, "id": 1 },
  { "sent": true, "id": 2 },
  { "sent": true, "id": 3 }
]
```

Configure aggregation via properties like `returnLastResultOnly` or `returnFirstError`.

### Error Handling Strategies
The Loop Node provides multiple approaches:
- **Break on First Error** – Stop immediately, return error
- **Retry Failed Items** – Automatically retry failed iterations
- **Continue on Error** – Skip failures, process remaining items
- **Return First Error** – Collect all results but highlight first error

See [04_Advanced_Scenarios.md](04_Advanced_Scenarios.md) for error handling patterns.

## Node Properties at a Glance

The Loop Node has **~25 configuration properties** organized into categories:

- **Iteration Source** (3 props) – Which collection to loop through
- **Core Controls** (4 props) – Basic loop behavior (limits, timeouts, errors)
- **Result Management** (2 props) – How to aggregate/return results
- **Performance** (3 props) – Batching, parallelism, ordering
- **Filtering & Sorting** (2 props) – Reduce or reorder items before iteration
- **Batch Timing** (2 props) – Delays between batches
- **Error Handling** (3 props) – Recovery strategies

Full property reference: [02_Configuration.md](02_Configuration.md)

## Documentation Roadmap

| Page | Purpose | Read Time |
|------|---------|-----------|
| **[00_Overview.md](00_Overview.md)** | What & why (you are here) | 5 min |
| **[01_Basics.md](01_Basics.md)** | How loops work mechanically | 10 min |
| **[02_Configuration.md](02_Configuration.md)** | Complete property reference | 20 min |
| **[03_Variables_And_Scope.md](03_Variables_And_Scope.md)** | Variable isolation & access | 8 min |
| **[04_Advanced_Scenarios.md](04_Advanced_Scenarios.md)** | Real-world use cases & patterns | 30 min |
| **[05_Best_Practices.md](05_Best_Practices.md)** | Performance & debugging tips | 10 min |
| **[06_vs_Universal_Iteration.md](06_vs_Universal_Iteration.md)** | LoopNode vs alternative patterns | 8 min |

## Pro Tips

> **💡 Start Simple**
> Begin with a single iteration source property and one body node. Add complexity (batching, retries, filtering) only when needed.

> **💡 Test in Isolation**
> Test the Loop Node with small sample data before scaling to large datasets. Use `maxAllowedCount` to limit iterations during development.

> **💡 Monitor Iteration Variables**
> The execution logs show every iteration's memory snapshot. Check logs if results seem unexpected.

## Common Questions

**Q: Can I access variables created outside the loop from inside the body?**  
A: Yes. Variables created before the loop are visible inside. However, **modifications inside the loop do not escape** (isolated scope). See [03_Variables_And_Scope.md](03_Variables_And_Scope.md).

**Q: What's the difference between `current_item` and the item itself?**  
A: `@{mem:current_item}` is the memory-scoped reference to the active item. Inside nested nodes (EmailService, API, etc.), use this variable to access item properties.

**Q: Can I break out of the loop early?**  
A: Yes, use the `breakOnFirstError` property or configure a conditional Break node inside the body. See [04_Advanced_Scenarios.md](04_Advanced_Scenarios.md#scenario-c-error-handling-and-early-exit).

**Q: Should I use batching for performance?**  
A: For large datasets (1000+ items), enable batching via `batchSize` property. See [05_Best_Practices.md](05_Best_Practices.md#batch-processing-for-large-datasets).

---

## Related Pages

- [01_Basics.md](01_Basics.md) – Learn how loops execute step-by-step
- [02_Configuration.md](02_Configuration.md) – Reference all Loop Node properties
- [04_Advanced_Scenarios.md](04_Advanced_Scenarios.md) – See real-world examples
- [06_vs_Universal_Iteration.md](06_vs_Universal_Iteration.md) – Compare iteration approaches

---

**Last Updated:** June 2026  
**For Questions:** Refer to the advanced scenarios or best practices sections, or consult execution logs for debugging.
