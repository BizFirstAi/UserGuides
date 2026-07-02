# Loop Node Documentation: Configuration

## Complete Property Reference

The Loop Node has approximately 25 configurable properties organized into logical categories. This section documents every property with type, default value, and practical examples.

### Iteration Source Properties (3)

These properties determine which collection to iterate over.

#### itemsIterationEnabled
- **Type:** Boolean
- **Default:** `true`
- **Description:** Enables iteration. When `false`, the loop body does not run; the done port receives input unchanged.
- **Example:**
  ```json
  {
    "itemsIterationEnabled": true
  }
  ```
- **Use Case:** Conditional loops—disable iteration based on upstream data (e.g., only loop if `operationMode === "batch"`).

#### itemsIterationPropertyName
- **Type:** String
- **Default:** (empty)
- **Description:** Top-level property name containing the collection. For example, `"customers"` loops over `input.customers`.
- **Example:**
  ```json
  {
    "itemsIterationPropertyName": "orders"
  }
  ```
  Input: `{ "orders": [{ ... }, { ... }] }`

- **Use Case:** Simple, direct array at root level.
- **Mutually Exclusive With:** `itemsIterationPropertyFormula`, `itemsIterationSubQuery`

#### itemsIterationPropertyFormula
- **Type:** String (Expression)
- **Default:** (empty)
- **Description:** Dynamic expression to compute the collection. Supports transformations if your expression engine supports them.
- **Example:**
  ```json
  {
    "itemsIterationPropertyFormula": "@{data|orders|filter(x => x.status === 'pending')}"
  }
  ```
  Input: `{ "data": { "orders": [{ status: "pending" }, { status: "complete" }] } }`  
  Iterates over: Only pending orders

- **Use Case:** Computed or filtered collections.
- **Mutually Exclusive With:** `itemsIterationPropertyName`, `itemsIterationSubQuery`

#### itemsIterationSubQuery (JSONPath)
- **Type:** String (JSONPath)
- **Default:** (empty)
- **Description:** JSONPath query to extract collection from complex nested structures.
- **Example:**
  ```json
  {
    "itemsIterationSubQuery": "$.api.response.data.results[*]"
  }
  ```
  Input: 
  ```json
  {
    "api": {
      "response": {
        "data": {
          "results": [{ ... }, { ... }]
        }
      }
    }
  }
  ```

- **Use Case:** Deeply nested arrays or API responses.
- **Mutually Exclusive With:** `itemsIterationPropertyName`, `itemsIterationPropertyFormula`

---

### Core Control Properties (4)

Fundamental loop behavior.

#### maxAllowedCount
- **Type:** Integer
- **Default:** `10000`
- **Min:** `1`
- **Description:** Maximum items to iterate. Loop stops if collection exceeds this; behavior depends on `forceExitAfterCount`.
- **Example:**
  ```json
  {
    "maxAllowedCount": 100
  }
  ```
- **Use Case:** Prevent runaway loops on accidentally large datasets.
- **Pro Tip:** During development, set this low (e.g., 10) for faster testing.

#### breakOnFirstError
- **Type:** Boolean
- **Default:** `false`
- **Description:** If `true`, loop stops immediately when any iteration fails. Error port is triggered.
- **Example:**
  ```json
  {
    "breakOnFirstError": true
  }
  ```
- **Use Case:** All-or-nothing workflows (e.g., batch database transaction: if one insert fails, rollback entire batch).
- **Related:** See `retryFailedItems` for a gentler alternative.

#### skipOnEmpty
- **Type:** Boolean
- **Default:** `false`
- **Description:** If `true` and collection is empty, loop skips (body does not run); done port receives empty result. If `false`, empty collection is an error.
- **Example:**
  ```json
  {
    "skipOnEmpty": true
  }
  ```
- **Use Case:** Optional iterations (e.g., only loop if customer list exists, otherwise continue).

#### timeoutPerIteration
- **Type:** Integer (milliseconds)
- **Default:** `0` (no timeout)
- **Description:** Maximum time allowed per iteration. If exceeded, iteration fails (or retries if `retryFailedItems` enabled).
- **Example:**
  ```json
  {
    "timeoutPerIteration": 5000
  }
  ```
  Each iteration gets 5 seconds max.

- **Use Case:** Prevent slow iterations from blocking the workflow (e.g., API call with network timeout).

---

### Result Management Properties (2)

Control how loop outputs are aggregated and returned.

#### aggregateResults
- **Type:** Boolean
- **Default:** `true`
- **Description:** If `true`, collect all iteration outputs into an array. If `false`, return outputs individually (flow-wide propagation, similar to universal iteration).
- **Example:**
  ```json
  {
    "aggregateResults": true
  }
  ```
- **Use Case:** Standard; return array of results for processing downstream.

#### returnLastResultOnly
- **Type:** Boolean
- **Default:** `false`
- **Description:** If `true`, return only the output from the final iteration (ignore earlier outputs).
- **Example:**
  ```json
  {
    "returnLastResultOnly": true
  }
  ```
  Loop runs 3 times; only iteration 3 output is returned.

- **Use Case:** Accumulation patterns where each iteration updates a state (e.g., progressive calculation: final state is the answer).
- **Note:** Overrides `aggregateResults` if both are set.

---

### Limit & Exit Properties (3)

Fine-grained control over when to stop iterating.

#### minAllowedCount
- **Type:** Integer
- **Default:** `0`
- **Min:** `0`
- **Description:** Minimum collection size. If actual size < this, loop fails (error port).
- **Example:**
  ```json
  {
    "minAllowedCount": 1
  }
  ```
  Fails if collection is empty.

- **Use Case:** Require at least one item (e.g., batch operations must have ≥1 record).

#### forceExitAfterCount
- **Type:** Integer
- **Default:** `0` (disabled)
- **Description:** Force exit after N successful iterations, even if more items remain.
- **Example:**
  ```json
  {
    "forceExitAfterCount": 50
  }
  ```
  Process first 50 items, skip the rest.

- **Use Case:** Sampling (process first N items) or test runs (limit scope).

#### timeoutPerIteration (Duplicate Note)
Already listed under Core Control. See above.

---

### Error Handling Properties (3)

Strategies for dealing with failed iterations.

#### retryFailedItems
- **Type:** Boolean
- **Default:** `false`
- **Description:** If `true`, automatically retry failed iterations (once per item, sequential).
- **Example:**
  ```json
  {
    "retryFailedItems": true
  }
  ```
- **Use Case:** Transient failures (network hiccup). Retry gives a second chance without failing the entire loop.

#### returnFirstError
- **Type:** Boolean
- **Default:** `false`
- **Description:** If `true`, return first error encountered (halt and report immediately instead of continuing to collect more errors).
- **Example:**
  ```json
  {
    "returnFirstError": true
  }
  ```
- **Use Case:** Fail-fast for dependency chains (stop as soon as any item fails).
- **Related:** `breakOnFirstError` (different: breaks vs returns the first error).

#### breakOnFirstError (Duplicate Note)
Already listed under Core Control. See above.

---

### Performance Properties (3)

Optimize execution for speed and resource usage.

#### batchSize
- **Type:** Integer
- **Default:** `1`
- **Min:** `1`
- **Description:** Process N items in parallel (if `parallelExecution` is enabled). Default `1` = sequential processing.
- **Example:**
  ```json
  {
    "batchSize": 10,
    "parallelExecution": true
  }
  ```
  Process 10 items in parallel, then next 10, etc.

- **Use Case:** Large datasets. Batch 10-50 items for parallel processing to improve throughput.
- **Note:** Must pair with `parallelExecution: true` to have effect.

#### parallelExecution
- **Type:** Boolean
- **Default:** `false`
- **Description:** If `true`, allow items in the current batch to execute in parallel. Requires `batchSize > 1`.
- **Example:**
  ```json
  {
    "parallelExecution": true,
    "batchSize": 10
  }
  ```
- **Use Case:** I/O-bound workflows (API calls, database reads). Parallel execution masks I/O latency.
- **Caution:** Do not use for workflows with shared state conflicts.

#### reverseOrder
- **Type:** Boolean
- **Default:** `false`
- **Description:** If `true`, iterate collection in reverse order (last item first).
- **Example:**
  ```json
  {
    "reverseOrder": true
  }
  ```
  Input: `["a", "b", "c"]` → Iterates: "c", "b", "a"

- **Use Case:** LIFO processing (Last-In-First-Out), e.g., unwind a stack.

---

### Filtering & Sorting Properties (2)

Reduce or reorder the collection before iteration.

#### filterExpression
- **Type:** String (Expression)
- **Default:** (empty)
- **Description:** Expression that evaluates to a boolean. Items where the expression is `false` are skipped.
- **Example:**
  ```json
  {
    "filterExpression": "@{current_item|status} === 'pending'"
  }
  ```
  Only iterate items with `status === 'pending'`.

- **Use Case:** Process only items matching criteria without explicitly filtering upstream.
- **Note:** Filter happens during setup, before iteration begins.

#### sortByExpression
- **Type:** String (Expression)
- **Default:** (empty)
- **Description:** Expression defining sort key. Items are sorted by this value before iteration.
- **Example:**
  ```json
  {
    "sortByExpression": "@{current_item|priority}"
  }
  ```
  Sort items by priority (ascending).

- **Use Case:** Ensure items process in a specific order (e.g., high-priority orders first).
- **Advanced:** Can reference nested properties: `@{current_item|address|zipCode}`

---

### Batch Timing Properties (2)

Control delays between batches or iterations.

#### batchWaitTimeMs
- **Type:** Integer (milliseconds)
- **Default:** `0`
- **Description:** Wait time between batch completions. After batch N completes, wait this long before starting batch N+1.
- **Example:**
  ```json
  {
    "batchSize": 10,
    "batchWaitTimeMs": 1000
  }
  ```
  Process 10 items, wait 1 second, process next 10, etc.

- **Use Case:** Rate limiting external APIs (e.g., 10 requests per second).

#### batchStartDelayMs
- **Type:** Integer (milliseconds)
- **Default:** `0`
- **Description:** Initial delay before the first batch starts.
- **Example:**
  ```json
  {
    "batchStartDelayMs": 500
  }
  ```
  Wait 500ms, then start iteration.

- **Use Case:** Stagger workflow execution, coordinate with other async tasks.

---

## Configuration Examples

### Example 1: Simple Sequential Processing

```json
{
  "itemsIterationPropertyName": "customers",
  "itemsIterationEnabled": true,
  "maxAllowedCount": 1000,
  "aggregateResults": true
}
```

**Use Case:** Process a list of customers one by one, collect all results.

### Example 2: Parallel Batch Processing with Rate Limiting

```json
{
  "itemsIterationPropertyName": "orders",
  "itemsIterationEnabled": true,
  "batchSize": 25,
  "parallelExecution": true,
  "batchWaitTimeMs": 2000,
  "maxAllowedCount": 10000,
  "aggregateResults": true
}
```

**Use Case:** Process 10,000 orders in parallel batches of 25, with 2-second wait between batches to avoid rate limits.

### Example 3: Filter + Fail-Fast Pattern

```json
{
  "itemsIterationPropertyName": "transactions",
  "filterExpression": "@{current_item|amount} > 1000",
  "breakOnFirstError": true,
  "returnFirstError": true,
  "maxAllowedCount": 500
}
```

**Use Case:** Process only high-value transactions (>$1000), stop immediately if any fails.

### Example 4: Retry with Timeout

```json
{
  "itemsIterationSubQuery": "$.payments[*]",
  "retryFailedItems": true,
  "timeoutPerIteration": 10000,
  "skipOnEmpty": true,
  "aggregateResults": true
}
```

**Use Case:** Process payments from a nested API response, retry failures, timeout if iteration takes > 10 seconds, skip silently if no payments.

### Example 5: Priority-Ordered Processing (Limited)

```json
{
  "itemsIterationPropertyName": "tickets",
  "sortByExpression": "@{current_item|priority}",
  "forceExitAfterCount": 5,
  "aggregateResults": true
}
```

**Use Case:** Sort tickets by priority, process only the top 5 (urgent).

### Example 6: Accumulation (Final State Only)

```json
{
  "itemsIterationPropertyFormula": "@{accounts}",
  "returnLastResultOnly": true
}
```

**Use Case:** Calculate running balance across all transactions, return final balance.

---

## Configuration UI Walkthrough

### In Flow Studio Designer

1. **Double-click Loop Node** (or right-click → Configure)
2. **Iteration Source Section:**
   - Choose one of three radio buttons:
     - Property Name: `[______]` (e.g., "orders")
     - Formula: `[______]` (e.g., "@{data|orders}")
     - JSONPath: `[______]` (e.g., "$.data.orders")
   
3. **Core Controls Section:**
   - ☑ Enabled (checkbox)
   - Max Items: `[______]` (number)
   - Break on Error: ☑ (checkbox)
   - Skip if Empty: ☑ (checkbox)
   - Per-Item Timeout: `[______]` (milliseconds)

4. **Results Section:**
   - ☑ Aggregate Results
   - ☑ Return Last Only

5. **Filtering Section:**
   - Filter Expression: `[______]` (optional formula)
   - Sort Expression: `[______]` (optional formula)

6. **Performance Section:**
   - Batch Size: `[______]` (default 1)
   - ☑ Parallel Execution
   - ☑ Reverse Order

7. **Error Handling Section:**
   - ☑ Retry Failed Items
   - ☑ Return First Error
   - ☑ Break on First Error

8. **Batch Timing Section:**
   - Wait Between Batches (ms): `[______]`
   - Initial Delay (ms): `[______]`

9. **Limits Section:**
   - Min Items: `[______]`
   - Force Exit After: `[______]`

---

## Pro Tips

> **💡 Development vs. Production**
> During development, set `maxAllowedCount` to a small value (10–50) for faster iteration. Increase for production.

> **💡 Error Handling Strategy**
> - Use `breakOnFirstError: true` for critical operations (all-or-nothing).
> - Use `retryFailedItems: true` for transient failures (network).
> - Use neither for resilience workflows (skip failures, continue).

> **💡 Parallel vs. Sequential**
> - Parallel batching shines for I/O-bound tasks (HTTP, database).
> - Keep sequential for CPU-bound tasks (calculations, parsing).

> **💡 Filter + Sort Performance**
> Filtering and sorting happen during setup, not in each iteration. This is efficient and happens once per loop invocation.

---

## Common Mistakes

| Mistake | Problem | Fix |
|---------|---------|-----|
| Using `propertyFormula` when property is top-level | Unnecessary complexity | Use `propertyName` instead |
| Setting `parallelExecution: true` without `batchSize > 1` | No effect | Set `batchSize ≥ 2` |
| Forgetting `skipOnEmpty: true` when collection might be null | Loop errors on null | Add `skipOnEmpty: true` |
| Using `timeoutPerIteration` without understanding units | Timeout too short/long | Remember: units are **milliseconds** (1000 ms = 1 second) |
| Setting both `aggregateResults` and `returnLastResultOnly` | Ambiguous | `returnLastResultOnly` takes precedence |

---

## Related Pages

- [00_Overview.md](00_Overview.md) – Quick introduction
- [01_Basics.md](01_Basics.md) – How loops work
- [03_Variables_And_Scope.md](03_Variables_And_Scope.md) – Accessing loop variables
- [04_Advanced_Scenarios.md](04_Advanced_Scenarios.md) – Real-world configurations

---

**Last Updated:** June 2026
