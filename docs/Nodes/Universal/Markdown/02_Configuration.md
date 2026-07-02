# Universal Item Iteration: Complete Configuration Reference

This page documents all **21 properties** that control Universal Item Iteration behavior, organized by category. For step-by-step setup, see [01_Getting_Started.md](01_Getting_Started.md).

## Property Categories Overview

| Category | Properties | Purpose |
|----------|-----------|---------|
| **Iteration Sources** | itemsIterationEnabled, itemsIterationPropertyName, itemsIterationPropertyFormula, itemsIterationSubQuery | Select which array to iterate |
| **Core Behavior** | maxAllowedCount, breakOnFirstError, skipOnEmpty, timeoutPerIteration | Basic loop control |
| **Limits & Exits** | minAllowedCount, forceExitAfterCount | Enforce bounds on iteration count |
| **Error Handling** | retryFailedItems, returnFirstError, breakOnFirstError* | Handle failures gracefully |
| **Result Management** | aggregateResults, returnLastResultOnly | Configure output results |
| **Performance & Batching** | batchSize, parallelExecution, reverseOrder | Tuning for scale |
| **Batch Timing** | batchWaitTimeMs, batchStartDelayMs | Rate limiting & delays |
| **Filtering & Sorting** | filterExpression, sortByExpression | Pre-iteration transformations |

*breakOnFirstError appears in both Core Behavior and Error Handling

---

## ITERATION SOURCES (4 Properties)

These properties tell the node which array to iterate over. Set exactly one of the three item source properties.

### `itemsIterationEnabled`

| Attribute | Value |
|-----------|-------|
| **Type** | Boolean |
| **Default** | `false` |
| **Required** | Yes (to enable iteration) |

**Description:**  
Enables or disables Universal Item Iteration on this node. When `true`, the node processes each item in the source array independently. When `false`, the node ignores all other iteration properties.

**When to Use:**
- Set to `true` to activate iteration
- Set to `false` to disable iteration (fallback to single-item processing)

**Example Configuration:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "customers"
}
```

**Impact:**
- Affects: All other iteration properties become active when `true`
- Performance: No performance impact when `false` (iteration disabled)

---

### `itemsIterationPropertyName`

| Attribute | Value |
|-----------|-------|
| **Type** | String |
| **Default** | `null` |
| **Required** | No (choose one of three item sources) |

**Description:**  
The name of a property in the input data that contains the array to iterate over. This is the simplest way to specify items—use when your items are a direct property of the input object.

**When to Use:**
- Your input has a top-level array field: `input.customers`, `input.orders`, `input.users`
- No transformation needed before iteration
- Most common use case

**Example Configuration:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "customers"
}
```

Input resolves to:
```json
{
  "customers": [
    { "id": 1, "email": "alice@example.com" },
    { "id": 2, "email": "bob@example.com" }
  ]
}
```

Result: Iteration processes the `customers` array (2 items).

**Example with Different Property:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "order_list"
}
```

This looks for `input.order_list` and iterates over it.

**Common Mistakes:**
- ❌ Setting both `itemsIterationPropertyName` and `itemsIterationPropertyFormula`—choose one
- ❌ Referencing a non-existent property—verify input data structure
- ❌ Pointing to a scalar value instead of an array—must be an array

---

### `itemsIterationPropertyFormula`

| Attribute | Value |
|-----------|-------|
| **Type** | String (Expression) |
| **Default** | `null` |
| **Required** | No (choose one of three item sources) |

**Description:**  
An expression that evaluates to the array to iterate over. Use when you need to **transform, filter, or compute** items before iteration.

**When to Use:**
- You need to filter items: only process customers with `plan == 'Pro'`
- You need to transform items: extract nested fields
- You need to combine multiple properties
- You need to apply custom logic

**Example Configuration: Filter Active Users**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyFormula": "@{input:users|filter(|is_active==true)}"
}
```

Input:
```json
{
  "users": [
    { "name": "Alice", "is_active": true },
    { "name": "Bob", "is_active": false },
    { "name": "Charlie", "is_active": true }
  ]
}
```

Result: Iteration processes only 2 items (Alice and Charlie).

**Example Configuration: Extract Nested Array**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyFormula": "@{input:data|orders}"
}
```

Input:
```json
{
  "data": {
    "orders": [
      { "id": 1, "total": 100 },
      { "id": 2, "total": 200 }
    ]
  }
}
```

Result: Iteration processes nested `data.orders` array (2 items).

**Example Configuration: Conditional Mapping**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyFormula": "@{input:customers|filter(|amount > 1000)}"
}
```

This iterates only over high-value customers (amount > $1000).

**When Expression Fails:**
- If the expression evaluates to `null` or `undefined`, iteration is skipped (unless `skipOnEmpty` is `false`)
- If expression doesn't evaluate to an array, an error occurs
- Check execution logs to debug expression evaluation

---

### `itemsIterationSubQuery`

| Attribute | Value |
|-----------|-------|
| **Type** | String (JSONPath) |
| **Default** | `null` |
| **Required** | No (choose one of three item sources) |

**Description:**  
A JSONPath expression that extracts an array from deeply nested input data. Use when your items are buried in a complex JSON structure.

**When to Use:**
- API responses with nested data structures
- Complex configuration objects
- When `itemsIterationPropertyName` can't reach the data
- When you want to use standard JSONPath syntax

**Example Configuration: Extract from API Response**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationSubQuery": "$.response.data.customers[*]"
}
```

Input:
```json
{
  "response": {
    "data": {
      "customers": [
        { "id": 1, "email": "alice@example.com" },
        { "id": 2, "email": "bob@example.com" }
      ]
    }
  }
}
```

Result: Iteration processes `$.response.data.customers` array (2 items).

**Example Configuration: Array Element Access**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationSubQuery": "$.items[0].records[*]"
}
```

This extracts the first item's records array.

**JSONPath Syntax Reference:**
| Pattern | Meaning |
|---------|---------|
| `$.field` | Top-level property |
| `$.field.nested` | Nested property |
| `$[0]` | First array element |
| `$[*]` | All array elements |
| `$.items[*].name` | All names in items array |

**Common Mistakes:**
- ❌ Forgetting `$` prefix: use `$.response.data`, not `response.data`
- ❌ Using wrong syntax: use `[*]` not `*` for "all elements"
- ❌ Path doesn't exist in input: verify structure before using

---

## CORE BEHAVIOR (4 Properties)

These properties control fundamental iteration behavior: how many items to process, error handling, empty arrays, and timeouts.

### `maxAllowedCount`

| Attribute | Value |
|-----------|-------|
| **Type** | Integer |
| **Default** | `null` (no limit) |
| **Required** | No |

**Description:**  
The maximum number of items to process. If the source array has more items, iteration stops after processing this many. Useful for safety limits and development testing.

**When to Use:**
- Safety limit during development: prevent accidentally processing 1 million items
- Rate limiting: only process first 100 items per run
- Cost control: API calls cost money, limit to affordable amount
- Testing: `maxAllowedCount: 5` to test with small subset before scaling

**Example Configuration: Development Limit**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "orders",
  "maxAllowedCount": 10
}
```

Input array: 500 orders  
Result: Only first 10 orders processed, remaining 490 ignored.

**Example Configuration: Production Safety**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "api_users",
  "maxAllowedCount": 1000
}
```

This prevents runaway iteration if data volume unexpectedly spikes.

**Performance Impact:**
- Minimal—limit is checked before processing starts
- Saves execution time by skipping remaining items

---

### `breakOnFirstError`

| Attribute | Value |
|-----------|-------|
| **Type** | Boolean |
| **Default** | `false` |
| **Required** | No |

**Description:**  
When `true`, iteration stops immediately if any item fails. When `false`, the node skips failed items and continues with remaining items.

**When to Use:**
- `true`: Failure is critical, must stop immediately (payment processing, data validation)
- `false`: Failures are acceptable, process as much as possible (bulk email, data enrichment)

**Example Configuration: Stop on First Error**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "payments",
  "breakOnFirstError": true
}
```

Payments: [Item1 ✓, Item2 ✗, Item3 ✓]  
Result: Process Item1, fail on Item2, stop. Item3 never processed.

**Example Configuration: Continue on Error**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "emails",
  "breakOnFirstError": false
}
```

Emails: [Item1 ✓, Item2 ✗, Item3 ✓]  
Result: Process Item1, skip Item2, process Item3. All attempts made.

**Interaction with `retryFailedItems`:**
- If `breakOnFirstError: true` and `retryFailedItems > 0`: Retries happen before break decision
- If retries exhaust, then break occurs

---

### `skipOnEmpty`

| Attribute | Value |
|-----------|-------|
| **Type** | Boolean |
| **Default** | `true` |
| **Required** | No |

**Description:**  
When `true`, iteration is skipped silently if the items array is empty. When `false`, an error is raised if items array is empty.

**When to Use:**
- `true` (default): Empty arrays are normal, no error needed (most use cases)
- `false`: Empty array indicates a problem, should error (data validation, quality checks)

**Example Configuration: Silent Skip (Default)**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "orders",
  "skipOnEmpty": true
}
```

Input: `orders: []`  
Result: No iterations occur, workflow continues normally (no error).

**Example Configuration: Error on Empty**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "orders",
  "skipOnEmpty": false
}
```

Input: `orders: []`  
Result: Error raised—"Expected orders array but got empty result."

**When to Use `skipOnEmpty: false`:**
- Data validation: We require at least one order
- Audit trail: We want to know when data is missing
- Error handling: Downstream logic depends on at least one item

---

### `timeoutPerIteration`

| Attribute | Value |
|-----------|-------|
| **Type** | Integer (milliseconds) |
| **Default** | `null` (no timeout) |
| **Required** | No |

**Description:**  
Maximum time (in milliseconds) allowed for each individual iteration to complete. If an iteration exceeds this timeout, it fails and is treated as an error.

**When to Use:**
- Prevent hanging requests: External APIs sometimes hang
- Enforce SLA: Each item must complete in under 5 seconds
- Resource protection: Stop runaway iterations

**Example Configuration: 10-Second Per-Item Timeout**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "api_calls",
  "timeoutPerIteration": 10000
}
```

Each API call must complete in 10 seconds. If it takes longer, it times out and is counted as a failure.

**Example Configuration: 30-Second Timeout for Heavy Operations**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "data_transforms",
  "timeoutPerIteration": 30000
}
```

This allows up to 30 seconds per item for CPU-intensive transformations.

**Performance Impact:**
- Prevents resources being consumed by stuck iterations
- Failed timeouts count as errors and may trigger retry logic

---

## LIMITS & EXITS (2 Properties)

These properties enforce bounds on the number of items processed and allow early exit.

### `minAllowedCount`

| Attribute | Value |
|-----------|-------|
| **Type** | Integer |
| **Default** | `null` (no minimum) |
| **Required** | No |

**Description:**  
The minimum number of items required to process. If the source array has fewer items than this, an error is raised.

**When to Use:**
- Data validation: Require at least 10 records to make the batch operation worthwhile
- Quality checks: Insufficient data indicates a problem
- Business logic: Batch operations need minimum volume

**Example Configuration: Minimum 5 Items**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "orders",
  "minAllowedCount": 5
}
```

Input array: 3 orders  
Result: Error raised—"Expected minimum 5 items, got 3."

Input array: 10 orders  
Result: Normal iteration (meets minimum).

**Example Configuration: Batch Size Requirement**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "records",
  "minAllowedCount": 100,
  "maxAllowedCount": 1000
}
```

Requires between 100 and 1000 records per batch.

---

### `forceExitAfterCount`

| Attribute | Value |
|-----------|-------|
| **Type** | Integer |
| **Default** | `null` (no forced exit) |
| **Required** | No |

**Description:**  
Forces iteration to stop after processing this many items, similar to `maxAllowedCount`, but triggers explicitly when count is reached.

**When to Use:**
- Gradually increase volume: Start with 10 items, then 50, then 100
- Development & testing: Test with exactly 5 items
- Breaking up large operations: Process in controlled batches

**Example Configuration: Process Exactly 50 Items**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "data",
  "forceExitAfterCount": 50
}
```

Input array: 1000 items  
Result: Stop after 50 items, remaining 950 ignored.

**Difference from `maxAllowedCount`:**
- `maxAllowedCount: 50` – Limit to maximum 50
- `forceExitAfterCount: 50` – Stop exactly at 50 (more explicit intent)

In practice, these behave similarly. Use `forceExitAfterCount` when you want to explicitly show "stop here" intent.

---

## ERROR HANDLING (3 Properties)

These properties control how the node responds to failures during iteration and which error to return.

### `retryFailedItems`

| Attribute | Value |
|-----------|-------|
| **Type** | Integer |
| **Default** | `0` (no retries) |
| **Required** | No |

**Description:**  
Number of times to retry failed items. When an item fails, instead of treating it as final failure, the system retries it up to this many times before giving up.

**When to Use:**
- Network calls: Transient errors happen, retry makes them recoverable
- Rate limits: Retry with backoff when API rate limit is hit
- Temporary failures: Database connection drops, retry when it recovers
- Reliability: Increase success rate from 95% to 99.5% with retries

**Example Configuration: Retry Failed Items 3 Times**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "api_calls",
  "retryFailedItems": 3
}
```

Item fails on attempt 1 → Retry (attempt 2) → Retry (attempt 3) → Retry (attempt 4) → Finally fails

So this is `initialAttempt + retryFailedItems = 1 + 3 = 4` total attempts.

**Example Configuration: Aggressive Retry for Network Calls**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "webhook_deliveries",
  "retryFailedItems": 5,
  "batchWaitTimeMs": 2000
}
```

Retry up to 5 times with 2-second delay between batches. Increases chance of successful delivery.

**Retry Backoff:**
- Retries use exponential backoff (delay increases with each retry)
- Not instantaneous—gives transient issues time to resolve
- Respects `batchWaitTimeMs` for timing between retries

**Interaction with `breakOnFirstError`:**
- If `breakOnFirstError: true`: Retries exhaust before break decision
- If retries succeed, iteration continues
- If retries fail and break is enabled, iteration stops

---

### `returnFirstError`

| Attribute | Value |
|-----------|-------|
| **Type** | Boolean |
| **Default** | `false` |
| **Required** | No |

**Description:**  
When `true`, if any item fails, the first error encountered is returned/raised (stops processing). When `false`, iteration continues and returns all results (partial success is acceptable).

**When to Use:**
- `true`: Fail-fast approach, any error aborts
- `false`: Resilient approach, collect all results even with some failures

**Example Configuration: Return First Error**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "payments",
  "returnFirstError": true
}
```

Items: [Item1 ✓, Item2 ✗ (error), Item3 ✓]  
Result: Stop immediately, return Item2's error. Item3 never runs.

**Example Configuration: Collect All Errors**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "records",
  "returnFirstError": false
}
```

Items: [Item1 ✓, Item2 ✗, Item3 ✓]  
Result: Process all items, return all results including Item2's error.

**Difference from `breakOnFirstError`:**
- `breakOnFirstError: true` – Stop processing immediately
- `returnFirstError: true` – Process all, but elevate first error in output
- Often used together for "fail fast with full diagnostics"

---

## RESULT MANAGEMENT (2 Properties)

These properties control how results are aggregated and returned after iteration completes.

### `aggregateResults`

| Attribute | Value |
|-----------|-------|
| **Type** | Boolean |
| **Default** | `false` |
| **Required** | No |

**Description:**  
When `true`, all iteration results are collected into an array. When `false`, each iteration result flows independently to the next node.

**When to Use:**
- `true`: You want all results grouped (pass to database bulk insert, return summary)
- `false`: Each result flows independently (default, each item's result goes downstream)

**Example Configuration: Aggregate Results**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "customers",
  "aggregateResults": true
}
```

Items: 3 customers  
Iteration 1 output: `{ "sent": true, "id": 1 }`  
Iteration 2 output: `{ "sent": true, "id": 2 }`  
Iteration 3 output: `{ "sent": true, "id": 3 }`

Result: Single aggregated output:
```json
[
  { "sent": true, "id": 1 },
  { "sent": true, "id": 2 },
  { "sent": true, "id": 3 }
]
```

**Example Configuration: Independent Results (Default)**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "customers",
  "aggregateResults": false
}
```

Items: 3 customers  
Result: Three separate outputs flow to next node (each one individually).

**Interaction with `returnLastResultOnly`:**
- If both `aggregateResults: true` and `returnLastResultOnly: true`: Only last item's result is returned (array of 1 item)
- If `aggregateResults: false`: Each result flows independently regardless of `returnLastResultOnly`

---

### `returnLastResultOnly`

| Attribute | Value |
|-----------|-------|
| **Type** | Boolean |
| **Default** | `false` |
| **Required** | No |

**Description:**  
When `true`, only the result from the last iteration is returned. Previous iterations' results are discarded.

**When to Use:**
- Status check: Only care about final status, not all intermediate results
- Overwrite behavior: Later items overwrite earlier ones
- Memory optimization: Don't store all results, just the last

**Example Configuration: Return Only Last Result**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "status_updates",
  "returnLastResultOnly": true
}
```

Items: 5 status updates  
Iterations 1-4: Processed, results discarded  
Iteration 5: Result is returned  

Result: Only the 5th status update's result flows downstream.

**Example Configuration: Keep All Results (Default)**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "status_updates",
  "returnLastResultOnly": false
}
```

All 5 status updates' results flow downstream.

**Use Case Example:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "order_changes",
  "returnLastResultOnly": true
}
```

Process multiple state changes (pending → processing → shipped → delivered), return only the final state.

---

## PERFORMANCE & BATCHING (3 Properties)

These properties control execution speed and parallelization strategy.

### `batchSize`

| Attribute | Value |
|-----------|-------|
| **Type** | Integer |
| **Default** | `null` (process all items serially) |
| **Required** | No |

**Description:**  
Number of items to process per batch. If `null`, all items are processed sequentially one at a time. If set to N, items are grouped into batches of N, and batches are processed serially (or in parallel if `parallelExecution: true`).

**When to Use:**
- Batch size = null: Sequential processing, good for heavy operations or when order matters
- Batch size = 10: Process 10 at a time, good for rate-limited APIs
- Batch size = 100: Larger batches, good for database bulk operations
- Batch size = 1: Same as null (sequential)

**Example Configuration: Sequential Batching (100 items per batch)**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "records",
  "batchSize": 100,
  "parallelExecution": false
}
```

Items: 500 records  
Batch 1: Items 1-100 (processed)  
Batch 2: Items 101-200 (processed after Batch 1)  
Batch 3: Items 201-300  
Batch 4: Items 301-400  
Batch 5: Items 401-500

Total time: ~5× time of one batch

**Example Configuration: Parallel Batching (50 items per batch, process concurrently)**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "api_users",
  "batchSize": 50,
  "parallelExecution": true
}
```

Items: 100 users  
Batch 1: Items 1-50 (all 50 processed concurrently)  
Batch 2: Items 51-100 (all 50 processed concurrently after Batch 1)

Total time: ~2× time of one item (instead of 100×)

**Performance Impact:**
- Without batching: Process 1 item at a time
- With batching: Group N items, faster for I/O-bound operations
- With parallelization: Even faster, up to 10-100× speedup depending on operation

**Common Batch Sizes:**
| Batch Size | Use Case |
|-----------|----------|
| null | Sequential (one at a time) |
| 5-10 | Rate-limited APIs (respect limits) |
| 50-100 | Database bulk inserts |
| 100-1000 | Large data transforms |

---

### `parallelExecution`

| Attribute | Value |
|-----------|-------|
| **Type** | Boolean |
| **Default** | `false` |
| **Required** | No |

**Description:**  
When `true` and `batchSize` is set, items within each batch are processed concurrently (in parallel). When `false`, batches are sequential. Has no effect if `batchSize` is `null`.

**When to Use:**
- `true`: I/O-bound operations (API calls, HTTP requests, database queries)
- `false`: CPU-bound operations (data transformation, encryption, heavy computation)

**Example Configuration: Parallel API Calls**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "user_ids",
  "batchSize": 10,
  "parallelExecution": true
}
```

Process 10 API calls concurrently. If each call takes 1 second, batch of 10 takes ~1 second (not 10 seconds).

**Example Configuration: Sequential Data Transform**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "data",
  "batchSize": 100,
  "parallelExecution": false
}
```

Process data transforms sequentially in batches of 100. CPU resources are focused, no contention.

**Performance Gains:**
| Operation | Sequential | Parallel (10 concurrent) |
|-----------|-----------|--------------------------|
| 10 × 1s API calls | 10 seconds | 1 second |
| 100 × 100ms API calls | 10 seconds | 1 second |
| 10 × 10ms data transforms | 100ms | ~50ms (overhead) |

**Important:**
- Parallel execution increases resource usage (CPU, memory, connections)
- For I/O operations: Gains are massive (10-100× speedup)
- For CPU operations: Gains are minimal, may cause contention
- Monitor resource usage when enabling parallelization

---

### `reverseOrder`

| Attribute | Value |
|-----------|-------|
| **Type** | Boolean |
| **Default** | `false` |
| **Required** | No |

**Description:**  
When `true`, items are processed in reverse order (last item first). When `false`, items are processed in original order (first item first).

**When to Use:**
- LIFO processing: Last in, first out (stack behavior)
- Priority queues: Process high-priority items last (they added later)
- Debugging: Test with last items first
- Edge case testing: Last items often have special data

**Example Configuration: Reverse Order Processing**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "queue",
  "reverseOrder": true
}
```

Items: [Item1, Item2, Item3, Item4, Item5]  
Processing order: Item5 → Item4 → Item3 → Item2 → Item1

**Example Configuration: Sort Then Reverse**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "tasks",
  "sortByExpression": "@{input:item|priority}",
  "reverseOrder": true
}
```

First sort by priority (ascending), then reverse to process highest priority first.

**Common Use Cases:**
- Stack-like processing (LIFO)
- Cleanup operations: Clean up newest items first
- Dependency management: Process items with no dependencies last

---

## BATCH TIMING (2 Properties)

These properties control delays and timing between batch executions, useful for rate limiting and avoiding system overload.

### `batchWaitTimeMs`

| Attribute | Value |
|-----------|-------|
| **Type** | Integer (milliseconds) |
| **Default** | `0` (no wait) |
| **Required** | No |

**Description:**  
Delay (in milliseconds) to wait between batch completions. After one batch finishes, wait this long before starting the next batch.

**When to Use:**
- Rate limiting: API allows 100 requests per second, set delay to 10ms
- System load: Avoid overwhelming downstream system
- Cost control: Spread expenses over time
- Graceful degradation: Prevent cascade failures

**Example Configuration: 1-Second Delay Between Batches**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "api_calls",
  "batchSize": 10,
  "batchWaitTimeMs": 1000
}
```

Batch 1: Process 10 items (0s - 1s)  
Wait: 1 second (1s - 2s)  
Batch 2: Process 10 items (2s - 3s)  
Wait: 1 second (3s - 4s)  
Batch 3: Process 10 items (4s - 5s)

Total for 30 items: ~5 seconds (rate limited)

**Example Configuration: 100ms Delay (Rate Limiting)**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "requests",
  "batchSize": 5,
  "batchWaitTimeMs": 100
}
```

This creates 100ms delays between batches, respecting typical rate limits.

**Common Wait Times:**
| Delay | Use Case |
|-------|----------|
| 0ms | No rate limiting (fastest) |
| 10ms | Very fast APIs (1000+ req/s) |
| 100ms | Normal APIs (10-100 req/s) |
| 500ms | Slower APIs or downstream systems |
| 1000ms | Expensive operations or strict rate limits |

---

### `batchStartDelayMs`

| Attribute | Value |
|-----------|-------|
| **Type** | Integer (milliseconds) |
| **Default** | `0` (start immediately) |
| **Required** | No |

**Description:**  
Delay (in milliseconds) before the first batch starts processing. Useful for staggering operations or allowing time for setup.

**When to Use:**
- Staggering: Multiple workflows start at slightly different times
- Warm-up: Give system time to initialize before heavy load
- Testing: Verify system handles delayed start
- Cascading: Prevent all workflows from hitting at once

**Example Configuration: 5-Second Startup Delay**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "jobs",
  "batchStartDelayMs": 5000
}
```

Wait 5 seconds, then start processing first batch.

**Example Configuration: Stagger Multiple Workflows**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "data",
  "batchStartDelayMs": 2000
}
```

Workflow 1: Start immediately  
Workflow 2: Start after 2 seconds  
Workflow 3: Start after 4 seconds  

This staggering prevents thundering herd.

---

## FILTERING & SORTING (2 Properties)

These properties allow pre-iteration filtering and ordering of items, reducing dataset size or changing processing order before iteration.

### `filterExpression`

| Attribute | Value |
|-----------|-------|
| **Type** | String (Expression) |
| **Default** | `null` (no filtering) |
| **Required** | No |

**Description:**  
An expression that returns `true` to include an item or `false` to exclude it. Only items matching the filter are iterated.

**When to Use:**
- Reduce dataset: Only iterate over active users, not inactive ones
- Quality control: Only process valid records
- Targeting: Only iterate over high-value customers
- Data governance: Only process records matching policy

**Example Configuration: Filter Active Customers**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "customers",
  "filterExpression": "@{input:item|status} == 'active'"
}
```

Input: 100 customers (30 active, 70 inactive)  
Result: Only 30 iterations (active customers only)

**Example Configuration: Filter by Threshold**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "orders",
  "filterExpression": "@{input:item|total} > 1000"
}
```

Process only orders over $1000 (high-value orders).

**Example Configuration: Complex Filter**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "records",
  "filterExpression": "@{input:item|status}=='pending' AND @{input:item|priority}=='high'"
}
```

Filter for high-priority pending items.

**Filter Expression Operators:**
| Operator | Meaning | Example |
|----------|---------|---------|
| `==` | Equals | `@{input:item\|status}=='active'` |
| `!=` | Not equals | `@{input:item\|type}!='spam'` |
| `>` | Greater than | `@{input:item\|amount}>100` |
| `<` | Less than | `@{input:item\|age}<18` |
| `>=` | Greater or equal | `@{input:item\|score}>=80` |
| `<=` | Less or equal | `@{input:item\|score}<=90` |
| `AND` | Both conditions | `cond1 AND cond2` |
| `OR` | Either condition | `cond1 OR cond2` |

---

### `sortByExpression`

| Attribute | Value |
|-----------|-------|
| **Type** | String (Expression) |
| **Default** | `null` (original order) |
| **Required** | No |

**Description:**  
An expression that returns a value to sort items by. Items are sorted by this value in ascending order before iteration (lowest to highest, A to Z, earliest to latest).

**When to Use:**
- Priority processing: Process high-priority items first
- Chronological: Process oldest items first (FIFO)
- Alphabetical: Sort by name or ID
- Volume: Process largest items first (might finish batches faster)

**Example Configuration: Sort by Priority (Low to High)**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "tasks",
  "sortByExpression": "@{input:item|priority}"
}
```

Items: [priority=3, priority=1, priority=2]  
Sorted: [priority=1, priority=2, priority=3]  
Processing order: 1 → 2 → 3

**Example Configuration: Sort by Date (Earliest First)**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "events",
  "sortByExpression": "@{input:item|timestamp}"
}
```

Process events in chronological order (oldest first).

**Example Configuration: Sort Descending (with Reverse)**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "scores",
  "sortByExpression": "@{input:item|score}",
  "reverseOrder": true
}
```

Sort by score ascending, then reverse to get descending (highest scores first).

**Example Configuration: Sort by Nested Field**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "customers",
  "sortByExpression": "@{input:item|address|zip_code}"
}
```

Sort customers by their ZIP code (geographic ordering).

**Sorting Types:**
- **Numeric**: Numbers sort as 1, 2, 3, 10, 20, 100
- **String**: Alphabetically A, B, Z, a, b, z
- **Date**: By timestamp (ISO format, unix, etc.)
- **Mixed**: System attempts conversion, behavior varies

---

## PROPERTY REFERENCE TABLE

Quick lookup for all 21 properties:

| # | Property | Type | Default | Category |
|---|----------|------|---------|----------|
| 1 | itemsIterationEnabled | Boolean | false | Iteration Source |
| 2 | itemsIterationPropertyName | String | null | Iteration Source |
| 3 | itemsIterationPropertyFormula | String | null | Iteration Source |
| 4 | itemsIterationSubQuery | String | null | Iteration Source |
| 5 | maxAllowedCount | Integer | null | Core Behavior |
| 6 | breakOnFirstError | Boolean | false | Core Behavior |
| 7 | skipOnEmpty | Boolean | true | Core Behavior |
| 8 | timeoutPerIteration | Integer | null | Core Behavior |
| 9 | minAllowedCount | Integer | null | Limits & Exits |
| 10 | forceExitAfterCount | Integer | null | Limits & Exits |
| 11 | retryFailedItems | Integer | 0 | Error Handling |
| 12 | returnFirstError | Boolean | false | Error Handling |
| 13 | aggregateResults | Boolean | false | Result Management |
| 14 | returnLastResultOnly | Boolean | false | Result Management |
| 15 | batchSize | Integer | null | Performance |
| 16 | parallelExecution | Boolean | false | Performance |
| 17 | reverseOrder | Boolean | false | Performance |
| 18 | batchWaitTimeMs | Integer | 0 | Batch Timing |
| 19 | batchStartDelayMs | Integer | 0 | Batch Timing |
| 20 | filterExpression | String | null | Filtering |
| 21 | sortByExpression | String | null | Filtering |

---

## Common Configuration Combinations

### Scenario 1: Safe Bulk Processing (Retry on Failure)
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "records",
  "retryFailedItems": 3,
  "breakOnFirstError": false,
  "maxAllowedCount": 1000
}
```

Process records, retry failures 3 times, continue on errors, safety limit of 1000.

### Scenario 2: Parallel API Calls (Rate Limited)
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "user_ids",
  "batchSize": 10,
  "parallelExecution": true,
  "batchWaitTimeMs": 500
}
```

Process 10 API calls at once, wait 500ms between batches to respect rate limits.

### Scenario 3: Filtered Bulk Insert (Database)
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "records",
  "filterExpression": "@{input:item|is_valid}==true",
  "batchSize": 500,
  "aggregateResults": true
}
```

Filter for valid records, batch insert in groups of 500, return aggregated results.

### Scenario 4: Priority Processing with Retries
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "tasks",
  "sortByExpression": "@{input:item|priority}",
  "reverseOrder": true,
  "retryFailedItems": 2,
  "breakOnFirstError": false
}
```

Sort by priority (descending), process high-priority first, retry on failure 2 times.

### Scenario 5: Careful Single Processing (Fail Fast)
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "payments",
  "breakOnFirstError": true,
  "skipOnEmpty": false,
  "minAllowedCount": 1
}
```

Process one item at a time, fail fast on error, error if empty input.

---

**Next Steps:** See [03_Batching_And_Parallelization.md](03_Batching_And_Parallelization.md) for performance tuning details.
