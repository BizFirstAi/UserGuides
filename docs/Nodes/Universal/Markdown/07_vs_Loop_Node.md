# Universal Item Iteration vs. Loop Node: Detailed Comparison

This guide explains the architectural differences and helps you choose the right approach for your workflow.

## Quick Comparison Table

| Feature | Universal Iteration | Loop Node |
|---------|-------------------|-----------|
| **Architecture** | Built into single node | Dedicated wrapper node |
| **Scope** | One node processes all items | Body nodes process per-item |
| **Downstream Routing** | Items flow independently | Aggregated results flow |
| **Conditional Branching** | No branching within iteration | Full branching support |
| **Nesting** | No nesting | Can nest complex workflows |
| **Variable Isolation** | Limited | Full per-iteration isolation |
| **Use Case** | Single-node bulk operations | Multi-node workflows per item |
| **Complexity** | Low | Medium-High |
| **Setup Time** | ~2 minutes | ~10 minutes |
| **Flexibility** | High (one powerful node) | Higher (full subgraph) |

---

## Architecture Comparison

### Universal Item Iteration: Single-Node Focus

```
Input (array of items)
    ↓
[Node with itemsIterationEnabled=true]
  ├─ Item 1: Configure node, execute
  ├─ Item 2: Configure node, execute
  └─ Item 3: Configure node, execute
    ↓
Outputs flow downstream (3 independent outputs)
```

**Characteristics:**
- One node processes multiple items
- Configuration is used per-item (variables resolved per iteration)
- Each item's output flows independently to next node
- Simple, direct execution path
- No branching or complex logic within the iteration

### Loop Node: Multi-Node Wrapper

```
Input (array of items)
    ↓
[Loop Node: determines items]
    ↓
[Loop Body: complex workflow]
  ├─ Item 1:
  │  ├─ API Call
  │  ├─ Conditional Logic
  │  ├─ Data Transform
  │  └─ Output
  ├─ Item 2:
  │  ├─ API Call
  │  ├─ Conditional Logic
  │  ├─ Data Transform
  │  └─ Output
  └─ Item 3: (same workflow)
    ↓
[Aggregated Results: array of outputs]
    ↓
Done Port (flows downstream)
```

**Characteristics:**
- Loop node orchestrates iteration
- Body contains full subgraph of nodes
- Variables are isolated per iteration
- Automatic result aggregation
- Complex branching and logic supported
- More nodes, more configuration

---

## When to Use Universal Item Iteration

### ✅ Use Universal Iteration When:

1. **Single-Node Operations**
   ```
   Need to send 100 emails?
   → Use SMTP node with itemsIterationEnabled=true
   ```

2. **Bulk Data Processing (Transformation)**
   ```
   Need to transform 1000 records?
   → Use DataMapping node with itemsIterationEnabled=true
   ```

3. **API Calls (All items same endpoint)**
   ```
   Need to GET /api/users/{id} for 100 user IDs?
   → Use HTTP Request node with itemsIterationEnabled=true
   ```

4. **Database Bulk Operations**
   ```
   Need to INSERT 1000 records?
   → Use Database node with itemsIterationEnabled=true
   ```

5. **All Items Follow Same Path**
   ```
   No conditional branching needed?
   → Universal Iteration (simpler)
   ```

6. **Performance Critical (I/O-Bound)**
   ```
   Need to parallelize API calls?
   → Universal Iteration (built-in batching & parallelization)
   ```

### Example: Bulk Email (Ideal for Universal Iteration)

```
100 customers → SMTP node [itemsIterationEnabled=true] → downstream processing
```

Configuration:
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "customers",
  "recipients": "@{input:item|email}",
  "subject": "Hello @{input:item|name}!"
}
```

Simple, fast, 100 emails sent in parallel. Done.

---

## When to Use Loop Node

### ✅ Use Loop Node When:

1. **Multiple Nodes Per Item**
   ```
   Each order → Call API → Check Status → Transform → Insert DB → Send Email
   → Use Loop Node with complex body
   ```

2. **Conditional Branching**
   ```
   If item.type == 'premium':
     → Send premium email
   Else:
     → Send standard email
   → Use Loop Node with IfCondition in body
   ```

3. **Complex Workflows Per Item**
   ```
   Nested logic: API call → Conditional → Database → Error handling → Logging
   → Use Loop Node for full subgraph control
   ```

4. **Result Aggregation Needed**
   ```
   Process 100 items, want array of 100 results
   → Loop Node automatically aggregates
   ```

5. **Variable Scope Isolation Required**
   ```
   Don't want modifications in one iteration to affect others
   → Loop Node has full variable isolation
   ```

6. **Nested Iteration**
   ```
   For each customer → For each order → For each item
   → Loop Node supports nesting (though Universal Iteration can be nested inside too)
   ```

### Example: Order Fulfillment (Ideal for Loop Node)

```
Orders → Loop Node
    └─ Loop Body:
        ├─ Check inventory
        ├─ If available:
        │  ├─ Confirm order
        │  └─ Send confirmation email
        ├─ Else:
        │  └─ Send backorder email
        └─ Update CRM
    ↓
[Aggregated confirmations] → Dashboard
```

Loop Node provides full control over multi-step workflows per item.

---

## Performance Comparison

### Scenario 1: Send 1,000 Emails

**Universal Iteration (SMTP node):**
```json
{
  "batchSize": 50,
  "parallelExecution": true,
  "batchWaitTimeMs": 100
}
```

- Setup time: 2 minutes
- Execution time: ~20 seconds (50 concurrent emails × 20 batches)
- Complexity: Low

**Loop Node (with SMTP in body):**
```
Loop Node → Body contains SMTP → Aggregation
```

- Setup time: 10 minutes
- Execution time: ~20 seconds (same logic, same performance)
- Complexity: Higher (more nodes, more configuration)

**Winner:** Universal Iteration (faster to build, same performance)

### Scenario 2: Process 500 Orders (Multi-Step)

Each order:
1. Check inventory (API call)
2. Update status (Database)
3. Send email (SMTP)
4. Log transaction

**Universal Iteration:**
Can't do this—would need separate SMTP for step 3. Would require multiple nodes with iteration enabled (complex, not recommended).

**Loop Node:**
```
Loop Node
  └─ API Call
  └─ Database Update
  └─ SMTP Send
  └─ Logging
```

- Setup time: 15 minutes
- Execution time: Sequential (5-10 seconds per order)
- Complexity: Higher (but necessary for multi-step)

**Winner:** Loop Node (necessary for multi-step workflow)

---

## Feature-by-Feature Comparison

### Iteration Sources

| Feature | Universal | Loop |
|---------|-----------|------|
| Property name | ✅ Yes | ✅ Yes |
| Expression formula | ✅ Yes | ✅ Yes |
| JSONPath query | ✅ Yes | ✅ Yes |
| Multiple sources | ❌ No | ✅ Yes (via subworkflows) |

### Batching & Parallelization

| Feature | Universal | Loop |
|---------|-----------|------|
| Sequential batching | ✅ Yes | ✅ Yes |
| Parallel batching | ✅ Yes | ✅ Yes |
| Rate limiting | ✅ Yes (batchWaitTimeMs) | ✅ Yes |
| Performance tuning | ✅ Advanced | ✅ Basic |

### Error Handling

| Feature | Universal | Loop |
|---------|-----------|------|
| Break on error | ✅ Yes | ✅ Yes |
| Retry failed items | ✅ Yes | ✅ Yes (manual, via Try/Catch) |
| Continue on error | ✅ Yes | ✅ Yes (manual) |
| Timeout per iteration | ✅ Yes | ❌ No |

### Filtering & Sorting

| Feature | Universal | Loop |
|---------|-----------|------|
| Filter expression | ✅ Yes | ❌ No (use IfCondition in body) |
| Sort expression | ✅ Yes | ❌ No (manual sorting) |

### Variable Access

| Feature | Universal | Loop |
|---------|-----------|------|
| Current item | ✅ @{input:item} | ✅ @{mem:current_item} |
| Current index | ✅ @{input:current_iteration_index} | ✅ @{mem:current_index} |
| Variable isolation | ⚠️ Limited | ✅ Full |
| Scope management | ⚠️ Per-node | ✅ Per-iteration |

---

## Code/Configuration Complexity

### Universal Iteration: Simple Email

```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "recipients",
  "recipients": "@{input:item|email}",
  "subject": "Hello @{input:item|name}!"
}
```

**Lines of config:** 5  
**Setup time:** ~1 minute  
**Cognitive load:** Low

### Loop Node: Email with Conditional

```
Loop Node:
  Items: recipients
  Max Count: 100
  
Body:
  IfCondition:
    Condition: @{mem:current_item|is_premium} == true
    
    True Port:
      SMTP: Send premium email
    
    False Port:
      SMTP: Send standard email
      
Done Port:
  Aggregation: Results
```

**Setup time:** ~10 minutes  
**Nodes involved:** 4 (Loop, IfCondition, 2× SMTP)  
**Cognitive load:** Higher (nested logic, multiple nodes)

**Conclusion:** Universal Iteration is simpler for linear workflows.

---

## Real-World Decision Tree

Use this flowchart to decide:

```
Does workflow need multiple nodes per item?
├─ NO → Does single node support itemsIterationEnabled?
│  ├─ YES → Use Universal Iteration ✅
│  └─ NO → Use Loop Node (with single node in body)
└─ YES → Does workflow need conditional branching per item?
   ├─ YES → Use Loop Node ✅
   └─ NO → Could use either, prefer Universal Iteration for performance
```

### Decision Examples

**Example 1: Send 1000 emails**
- Multiple nodes? NO
- Node supports iteration? YES (SMTP)
- **Decision:** Universal Iteration ✅

**Example 2: Process orders (check inventory → update status → send email)**
- Multiple nodes? YES
- **Decision:** Loop Node ✅

**Example 3: Call API 500 times, same endpoint**
- Multiple nodes? NO
- Node supports iteration? YES (HTTP)
- **Decision:** Universal Iteration ✅

**Example 4: Transform data, route to different downstream paths based on content**
- Multiple nodes? NO (just data mapping)
- Node supports iteration? YES
- Conditional needed? (not in iteration itself—in downstream routing)
- **Decision:** Universal Iteration ✅ (route downstream based on output)

---

## Migration Path

### Migrating from Loop Node to Universal Iteration

If you have a Loop Node with a single node in the body, consider switching to Universal Iteration:

**Before (Loop Node):**
```
Loop Node:
  Items: customers
  
  Body:
    SMTP Node: Send email
    
Done Port: Downstream
```

**After (Universal Iteration):**
```
SMTP Node:
  itemsIterationEnabled: true
  itemsIterationPropertyName: customers
  recipients: @{input:item|email}
```

**Benefits:**
- ✅ Simpler configuration (1 node instead of 2)
- ✅ Faster setup
- ✅ Built-in batching & parallelization
- ✅ Better performance

**Considerations:**
- ❌ Lose per-iteration variable isolation
- ❌ Can't add complex logic in between

### Migrating from Universal Iteration to Loop Node

If your workflow outgrows Universal Iteration (needs multi-step per item):

**Before (Universal Iteration):**
```
HTTP Node:
  itemsIterationEnabled: true
  
[Outputs flow downstream]
```

**After (Loop Node):**
```
Loop Node:
  Items: user_ids
  
  Body:
    HTTP Node: Call API
    DataMapping: Transform response
    Database Node: Insert result
```

**Benefits:**
- ✅ Multi-step workflows per item
- ✅ Conditional branching
- ✅ Better variable isolation

**Considerations:**
- ❌ More complex setup
- ❌ Requires explicit aggregation configuration

---

## FAQ: Choosing Between Them

**Q: I'm unsure, which should I pick?**  
A: Start with Universal Iteration if your node type supports it. It's simpler and faster to set up. Migrate to Loop Node if you hit limitations.

**Q: Can I use both together?**  
A: Yes! A Loop Node can contain a node with Universal Iteration enabled. Each loop iteration processes one item through the node, which internally iterates its own items. Beware of multiplication: 10 outer × 100 inner = 1000 total iterations.

**Q: Which is faster?**  
A: For single-node operations, Universal Iteration wins (less overhead). For multi-node, performance is similar.

**Q: Which should I use for critical operations?**  
A: Loop Node gives more control and visibility. Universal Iteration is simpler but offers less granularity for error handling.

**Q: What if my node doesn't support Universal Iteration?**  
A: Use Loop Node. Only nodes with SupportsItemIteration support this feature.

---

## Pro Tips

> **💡 Universal Iteration for SMTP, HTTP, DataMapping, Database**  
> These nodes have great iteration support and built-in batching.

> **💡 Loop Node for Complex Workflows**  
> When you need multiple nodes per item, conditionals, or fine-grained control.

> **💡 Prefer Simplicity**  
> Always choose the simpler solution first. Add complexity only if needed.

> **💡 Performance Tuning**  
> Universal Iteration has more advanced performance tuning (batchSize, parallelExecution, batchWaitTimeMs). Use it for high-volume operations.

> **💡 Readability Matters**  
> A simple Universal Iteration is easier for teammates to understand and maintain than a complex Loop Node with many nodes.

---

**Conclusion:** Use Universal Iteration for single-node bulk operations. Use Loop Node for multi-node workflows per item. Choose based on your specific needs, not on what's theoretically more powerful.
