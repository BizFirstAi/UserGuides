# Loop Node Documentation: LoopNode vs Universal Iteration

## The Two Iteration Patterns in Flow Studio

Flow Studio supports **two fundamentally different iteration models**. Understanding the difference is critical for choosing the right approach.

### Pattern 1: LoopNodeExecutor (Scoped Loop)
A dedicated node that contains a body workflow. Items iterate through the body; variables are scoped and aggregated.

### Pattern 2: Universal Iteration (Flow-Wide Propagation)
An implicit iteration pattern where any node with `itemsIterationEnabled: true` can accept an array and propagate items downstream node-by-node.

---

## Feature Comparison Table

| Feature | LoopNode | Universal Iteration |
|---------|----------|-------------------|
| **Iteration Container** | Explicit (Loop Node) | Implicit (any node) |
| **Scope** | Isolated (per iteration) | Flow-wide (visible to all nodes) |
| **Result Aggregation** | Automatic | Requires downstream aggregation |
| **Variables** | `mem:current_item`, `mem:current_index` | Variables persist across flow |
| **Nesting** | Full support with scope isolation | Possible but complex |
| **Error Handling** | Fine-grained (retry, break, etc.) | Node-level only |
| **Filtering** | Built-in (`filterExpression`) | Requires If-Else in body |
| **Batching** | Built-in (`batchSize`, `parallelExecution`) | Manual (Split, Join nodes) |
| **Learning Curve** | Medium (must understand scope) | Lower (more intuitive) |
| **Performance** | Optimized for batch ops | Optimized for flow-wide access |
| **Use Case** | Contained processing (batch jobs) | Multi-node workflows (varying paths) |

---

## When to Use LoopNode

**Choose LoopNode when:**

1. **Processing is self-contained** within a logical block
   - Example: Import a batch of customers (validation → save → confirm)
   - All items follow the same path

2. **You need isolated scope**
   - Example: Each iteration should not affect others
   - Variables modified in one iteration should not leak to the next

3. **You want automatic result aggregation**
   - Example: Collect all results into an array for post-processing

4. **You need fine-grained control over iteration**
   - Example: Retry failed items, batch processing, rate limiting
   - These are built-in properties, not manual constructs

5. **You need nested loops**
   - Example: Process customers → orders → line items
   - Scope isolation makes this safe and readable

### LoopNode Use Cases

- **Batch imports:** Load 1000 customer records, validate each, save all
- **Rate-limited API calls:** Process 10,000 emails in batches with rate limiting
- **Data transformations:** Normalize/enrich a collection of items
- **Multi-step validation:** Validate → enrich → transform → save (all items follow same path)
- **Reporting:** Process all sales records through identical steps, aggregate results

---

## When to Use Universal Iteration

**Choose Universal Iteration when:**

1. **Items take different paths through the flow**
   - Example: High-priority orders → expedited shipping; low-priority → standard
   - Different items need different downstream nodes

2. **You need flow-wide variable access**
   - Example: Access outer workflow variables inside iteration without re-passing
   - Variables created in one node visible to all downstream nodes

3. **The workflow is short and simple**
   - Example: 2–3 nodes in the iteration path
   - Explicit loop container adds unnecessary overhead

4. **You're doing real-time, event-driven processing**
   - Example: Each order triggers a separate invoice service call
   - More like "per-item dispatch" than "batch processing"

5. **You're combining multiple sources**
   - Example: Join customer list with order list, iterate merged results

### Universal Iteration Use Cases

- **Order routing:** Route orders to different fulfillment systems based on priority
- **Event processing:** Process incoming events with different handlers
- **Data enrichment:** Fetch additional data from multiple APIs per item
- **Multi-stage pipelines:** Items progress through different nodes based on conditions
- **Real-time transformations:** Stream items through pipeline, each with unique path

---

## Detailed Comparison Examples

### Example 1: Batch Email Processing

#### Using LoopNode
```
Input: 1000 email records

Loop Node:
├─ Iteration 1: alice@example.com
│  └─ Format Email → Validate → Send → Log
│     Output: { email, status, timestamp }
│
├─ Iteration 2: bob@example.com
│  └─ Format Email → Validate → Send → Log
│     Output: { email, status, timestamp }
│
...
(1000 iterations)

Aggregated Output:
[
  { email: "alice@...", status: "sent", timestamp: "..." },
  { email: "bob@...", status: "sent", timestamp: "..." },
  ...
]

Done → Dashboard Update
```

**Advantages:**
- Built-in batching & rate limiting
- Automatic result collection
- Clear, contained workflow

**Configuration:**
```json
{
  "batchSize": 50,
  "batchWaitTimeMs": 1000,
  "aggregateResults": true
}
```

#### Using Universal Iteration
```
Input: 1000 email records

Node 1: Format Email
├─ Iteration 1: { email, formatted: "..." }
├─ Iteration 2: { email, formatted: "..." }
└─ ... (propagates array downstream)

Node 2: Validate (itemsIterationEnabled: true)
├─ Iteration 1: { email, valid: true }
├─ Iteration 2: { email, valid: true }
└─ ... (propagates array downstream)

Node 3: Send (itemsIterationEnabled: true)
├─ Iteration 1: { email, sent: true }
├─ Iteration 2: { email, sent: true }
└─ ... (propagates array downstream)

Node 4: Logger (itemsIterationEnabled: true)
└─ Logs each result individually

Node 5: Collect Results (manual aggregation)
└─ Groups all results from Node 4
```

**Advantages:**
- Natural flow (read top to bottom)
- Each node sees its inputs
- Easier for beginners

**Disadvantages:**
- No built-in batching (must split/join manually)
- Result aggregation is manual
- Array propagation through each node (less efficient)

---

### Example 2: Order Routing (Different Paths)

#### Using LoopNode (Not Ideal)
```
Loop Node:
├─ Iteration 1: Order { priority: "high", amount: 500 }
│  └─ If-Else (inside loop):
│     ├─ If high priority: Express shipping
│     └─ Else: Standard shipping
│
├─ Iteration 2: Order { priority: "low", amount: 100 }
│  └─ If-Else:
│     ├─ Standard shipping
│     └─ ...
│
Output: [{ order_id, shipping_type }, ...]
```

**Problem:** Orders going through different paths are merged back into a single output. Downstream aggregation is needed to separate them.

#### Using Universal Iteration (Ideal)
```
Input: 10 orders (mixed priority)

Node 1: Split by Priority
├─ If high priority: Route A
└─ Else: Route B

Route A (Expedited):
├─ Node 2a: Premium packaging
├─ Node 3a: Fast courier
└─ Node 4a: Notify customer (express shipping)

Route B (Standard):
├─ Node 2b: Standard packaging
├─ Node 3b: Standard courier
└─ Node 4b: Notify customer (standard shipping)

Merge Routes → Output
```

**Advantage:** Items naturally flow to different downstream nodes. No manual merging needed.

**Why LoopNode is wrong here:** Items would be forced through the same aggregated output, losing their routing information.

---

## Hybrid Approaches

### Pattern 1: LoopNode → Universal Iteration

Process a batch with LoopNode, then route results with universal iteration.

```
1. LoopNode: Validate & Enrich
   Input: 100 orders
   Output: [{ order, status, priority }, ...]
   
2. Universal Iteration: Route by Status
   For each output item:
   ├─ If status = "valid": Send to fulfillment
   └─ Else: Send to error handling
```

**Use Case:** Batch processing with per-item post-processing logic.

**Configuration:**
```json
LoopNode:
{
  "aggregateResults": true
}

Downstream node (with routing):
{
  "itemsIterationEnabled": true
}
```

### Pattern 2: Universal Iteration → LoopNode

Stream items through initial processing, then batch process with LoopNode.

```
1. Universal Iteration: Fetch & Transform
   For each input item:
   ├─ Fetch from API
   ├─ Transform
   └─ Add to batch accumulator

2. LoopNode: Batch Save
   Input: Accumulated batch (100 items)
   Output: [{ item, saved: true }, ...]
   
3. Logger: Report results
```

**Use Case:** Lazy processing with batch optimization.

---

## Migration Guide: Switching from One Pattern to Another

### From Universal Iteration → LoopNode

**Scenario:** You have a universal iteration workflow that's getting complex.

**Steps:**

1. **Identify the item-processing nodes**
   - These are the nodes that run per item (with `itemsIterationEnabled: true`)

2. **Extract them into a LoopNode body**
   - Cut those nodes from the main flow
   - Paste them into the LoopNode body

3. **Configure the LoopNode**
   ```json
   {
     "itemsIterationPropertyName": "items_array",
     "aggregateResults": true
   }
   ```

4. **Connect the LoopNode "done" output**
   - This sends the aggregated results downstream

5. **Test**
   - Verify that results match the original flow

**Example Transformation:**

**Before (Universal Iteration):**
```
Input → Node A (iterate) → Node B (iterate) → Node C (iterate) → Output
```

**After (LoopNode):**
```
Input → Extract items
           ↓
        LoopNode
        ├─ Body: Node A → Node B → Node C
        │
        → Output
```

### From LoopNode → Universal Iteration

**Scenario:** You need different items to take different paths.

**Steps:**

1. **Extract the LoopNode body nodes** from the body
2. **Add them to the main flow** in the correct order
3. **Enable `itemsIterationEnabled`** on the nodes
4. **Add If-Else or Switch** nodes to route items

**Example Transformation:**

**Before (LoopNode):**
```
LoopNode
├─ If-Else: Route by priority
│  ├─ High: Node A
│  └─ Low: Node B
│
Output (merged)
```

**After (Universal Iteration):**
```
Input items
  ↓
If-Else: Route by priority
├─ High: Node A (itemsIterationEnabled)
└─ Low: Node B (itemsIterationEnabled)
  ↓
Output (naturally separated by route)
```

---

## Decision Tree

Use this flowchart to decide which pattern to use:

```
START

Q1: Do all items follow the SAME path through the workflow?
├─ YES → Q2
└─ NO → Use Universal Iteration

Q2: Is the processing self-contained (no downstream nodes outside loop)?
├─ YES → Q3
└─ NO → Use Universal Iteration

Q3: Do you need automatic batching, retry, or rate limiting?
├─ YES → Use LoopNode
└─ NO → Use Universal Iteration (simpler)

Q4: Is performance critical for large datasets?
├─ YES → Use LoopNode (better batching)
└─ NO → Use Universal Iteration (simpler)

RECOMMENDATION:
├─ If LoopNode answers match: Use LoopNode
└─ If Universal Iteration answers match: Use Universal Iteration
```

---

## Performance Comparison

### Scenario: Processing 10,000 items

#### LoopNode (with batching)
```
Configuration:
  batchSize: 100
  parallelExecution: true
  batchWaitTimeMs: 500

Execution:
  100 batches
  Each batch: ~1 second
  Total: ~100 seconds
```

#### Universal Iteration (no batching)
```
Configuration:
  itemsIterationEnabled: true (on each node)
  (sequential, one item at a time)

Execution:
  10,000 items
  Each item: ~10 ms (0.01 seconds)
  Total: ~100 seconds
```

**Result:** Comparable for this scenario, but LoopNode offers better control and visibility.

### Scenario: Processing 10,000 items with conditional routing

#### LoopNode (with If-Else inside)
```
10,000 iterations
  Each iteration: If-Else (3 ms) + chosen branch (7 ms)
Total: ~100 seconds
All outputs merged, then need to separate them again
```

#### Universal Iteration (with early routing)
```
Input: 10,000 items
If-Else: Routes 8,000 to Path A, 2,000 to Path B
Path A: 8,000 items × 10 ms = 80 seconds
Path B: 2,000 items × 10 ms = 20 seconds
Total: ~80 seconds (parallelizable)
Outputs naturally separated
```

**Winner:** Universal Iteration for conditional routing.

---

## Recommendation Summary

| Situation | Use | Reason |
|-----------|-----|--------|
| Batch import/export | LoopNode | Built-in batching, aggregation |
| Different paths per item | Universal Iteration | Items naturally routed |
| Large dataset with rate limiting | LoopNode | Better control |
| Short, simple flow | Universal Iteration | Less overhead |
| Nested processing (3+ levels) | LoopNode | Scope isolation |
| Real-time event processing | Universal Iteration | More responsive |
| Need retry/break logic | LoopNode | Built-in support |
| Multi-source aggregation | Universal Iteration | Easier to coordinate |

---

## Related Pages

- [00_Overview.md](00_Overview.md) – LoopNode quick intro
- [01_Basics.md](01_Basics.md) – How LoopNode works
- [04_Advanced_Scenarios.md](04_Advanced_Scenarios.md) – Real-world patterns

---

**Last Updated:** June 2026

