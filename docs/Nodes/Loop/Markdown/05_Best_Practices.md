# Loop Node Documentation: Best Practices

## Performance Optimization Tips

### 1. Batch Processing for Large Datasets

**When:** Processing 100+ items  
**What:** Enable `batchSize` and `parallelExecution`

**Example:**
```json
{
  "batchSize": 25,
  "parallelExecution": true,
  "batchWaitTimeMs": 500
}
```

**Result:** 1000 items process in ~20 batches, potentially much faster than sequential.

**Pro Tip:** Start with `batchSize: 10`, measure execution time, then increase gradually until you hit API/database limits.

### 2. Filtering Before Iteration

**When:** You only need to process a subset of items  
**What:** Use `filterExpression` instead of If-Else inside loop body

**❌ Bad (If-Else inside loop):**
```
Loop 1000 items → If-Else for each → Skip 900 → Process 100
Total iterations: 1000
```

**✅ Good (Filter in setup):**
```
Filter 1000 items → Keep 100 → Loop 100 items
Total iterations: 100
```

**Configuration:**
```json
{
  "filterExpression": "@{current_item|priority} === 'high'"
}
```

**Savings:** 90% fewer iterations in this example.

### 3. Limiting Dataset Size During Development

**When:** Building and testing workflows  
**What:** Set low `maxAllowedCount` initially

**Example:**
```json
{
  "maxAllowedCount": 10,  // Dev: test with 10 items
  // Later, increase to 1000 or more for production
}
```

**Benefit:** Fast feedback loop during development.

### 4. Avoid Unnecessary Aggregation

**When:** You don't need all results in an array  
**What:** Set `aggregateResults: false` and stream results

**Configuration:**
```json
{
  "aggregateResults": false
}
```

**Memory Impact:** Results propagate downstream as individual items (like universal iteration), not held in memory.

**Trade-off:** Less flexible for post-processing, but more scalable for huge datasets.

### 5. Sequential vs. Parallel

**Sequential (default, `parallelExecution: false`):**
- Safer (no race conditions)
- Better for CPU-bound tasks (calculations, parsing)
- Lower resource usage
- Simpler debugging

**Parallel (`parallelExecution: true`):**
- Faster for I/O-bound tasks (API calls, database reads)
- Requires `batchSize > 1`
- Higher memory usage
- More complex error handling

**Rule of Thumb:**
- I/O-bound (HTTP, database) → Enable parallelism
- CPU-bound (calculations, transformations) → Keep sequential

---

## Memory Considerations

### 1. Aggregation Memory Growth

**Problem:** Large datasets aggregated into memory can exhaust RAM.

```json
Loop 100,000 items
Each item produces 1 KB output
Result: 100 MB aggregated in memory
```

**Solution:**
- Set reasonable `maxAllowedCount` limits
- Use `forceExitAfterCount` for sampling
- Stream results (`aggregateResults: false`)
- Process in multiple smaller batches

### 2. Body Node Memory Leaks

**Problem:** Nodes in the loop body holding references from previous iterations.

**Example (Bad):**
```
Loop Body:
├─ Create large temporary object (e.g., 10 MB file download)
├─ Extract a small value
└─ Move to next iteration

Issue: Temporary object not garbage collected between iterations
```

**Solution:** Explicitly clear large objects after use.

### 3. Nested Loop Memory

**Problem:** Nested loops multiply memory usage.

```
Outer loop: 100 items
Inner loop: 100 items each
Total iterations: 10,000
Memory: 100 × 100 × output_size
```

**Solution:** Use `forceExitAfterCount` to limit nesting depth.

---

## When to Use Batching (batchSize Property)

### Small Datasets (< 100 items)
**Don't batch.** Overhead not worth it.
```json
{
  "batchSize": 1,
  "parallelExecution": false
}
```

### Medium Datasets (100–1000 items)
**Batch if I/O-bound.** Try `batchSize: 10–25`.
```json
{
  "batchSize": 20,
  "parallelExecution": true,
  "batchWaitTimeMs": 500
}
```

### Large Datasets (1000–100,000 items)
**Batch aggressively.** Try `batchSize: 50–100`.
```json
{
  "batchSize": 100,
  "parallelExecution": true,
  "batchWaitTimeMs": 1000
}
```

### Massive Datasets (100,000+ items)
**Stream results, use force exit for testing.**
```json
{
  "batchSize": 100,
  "parallelExecution": true,
  "aggregateResults": false,
  "forceExitAfterCount": 10000
}
```

---

## Common Mistakes and How to Avoid Them

### Mistake 1: Forgetting Variable Scope Isolation

**Problem:**
```json
Outer Flow: counter = 0
Loop Body: Set counter = counter + 1 (repeated 100 times)
After Loop: counter is still 0 (not 100)
```

**Why:** Loop variables are scoped; modifications don't escape.

**Solution:** Use loop aggregation to collect results.
```json
{
  "aggregateResults": true
  // Collect all outputs into array for post-processing
}
```

### Mistake 2: Not Testing with Sample Data

**Problem:** Loops work fine with 10 items in testing, fail with 10,000 in production.

**Solution:** Before going live:
1. Test with actual size dataset (or representative sample)
2. Monitor memory and execution time
3. Adjust batching accordingly

### Mistake 3: Ignoring timeoutPerIteration

**Problem:** If an API is slow, one iteration hangs forever.

```json
{
  "timeoutPerIteration": 0  // No timeout (dangerous)
}
```

**Solution:** Always set a timeout.
```json
{
  "timeoutPerIteration": 30000  // 30 seconds per iteration
}
```

### Mistake 4: Using breakOnFirstError for Resilience Workflows

**Problem:** One failure stops entire loop.

```json
{
  "breakOnFirstError": true
}
```

**When This is Wrong:** Batch imports (continue on errors, report summary).

**Solution:**
```json
{
  "breakOnFirstError": false,
  "retryFailedItems": true
}
```

### Mistake 5: Not Monitoring Batch Wait Time

**Problem:** Rate limiting set too aggressively.

```json
{
  "batchSize": 10,
  "batchWaitTimeMs": 5000  // 5 second wait between batches
  // 100 items = 10 batches × 5 sec = 50 seconds total
}
```

**Solution:** Calculate expected duration before configuring.

---

## Debugging: What the Logs Tell You

### Log Structure

Every loop execution produces logs with this hierarchy:

```
Loop Started: [timestamp]
├─ Setup Phase:
│  ├─ Collection source: "customers"
│  ├─ Items found: 100
│  ├─ Filter applied: true
│  ├─ Items after filter: 85
│  └─ Setup complete
│
├─ Iteration Phase:
│  ├─ Batch 1 (Items 1-25):
│  │  ├─ Item 1: current_item = { id: 1, ... }
│  │  │  └─ Body output: { processed: true, ... }
│  │  ├─ Item 2: current_item = { id: 2, ... }
│  │  │  └─ Body output: { processed: true, ... }
│  │  └─ Batch 1 completed: 25 items, 0 errors
│  │
│  ├─ Batch 2 (Items 26-50):
│  │  └─ ...
│  │
│  └─ All batches completed
│
├─ Aggregation Phase:
│  └─ 85 outputs aggregated into result array
│
└─ Loop Completed
   ├─ Items processed: 85
   ├─ Items succeeded: 84
   ├─ Items failed: 1
   └─ Duration: 12.5 seconds
```

### Reading Error Logs

**Error Type: Collection Not Found**
```
Error: Collection 'customers' not found in input
Phase: SETUP
Solution: Check itemsIterationPropertyName or input data
```

**Error Type: Timeout**
```
Error: Iteration timeout at item 42
Phase: ITERATION
Details: Body execution exceeded 30000 ms
Solution: Increase timeoutPerIteration or optimize body nodes
```

**Error Type: Max Count Exceeded**
```
Error: Collection size (500) exceeds maxAllowedCount (100)
Phase: SETUP
Solution: Increase maxAllowedCount or filter collection
```

### Identifying Performance Bottlenecks

**Slow Setup?**
```
Setup Phase: 5 seconds
Solution: Check filter/sort expression complexity
```

**Slow Body Execution?**
```
Average item duration: 2 seconds
100 items × 2 sec = 200 seconds total
Solution: Enable parallel batching or optimize body nodes
```

**Memory Issues?**
```
Peak memory: 500 MB
Solution: Reduce batchSize, set aggregateResults: false, or reduce dataset
```

---

## Testing Loops in Isolation

### Unit Test Pattern

1. **Isolate the loop** by creating a test workflow with only:
   - Input data (sample)
   - Loop Node
   - Logger (to capture output)

2. **Test configurations:**
   - Empty collection (if `skipOnEmpty: true`)
   - Single item
   - Multiple items
   - Edge cases (null values, malformed data)

3. **Example test case:**
   ```json
   {
     "test_name": "Process 10 customers",
     "input": {
       "customers": [
         { "id": 1, "name": "Alice" },
         ...
         { "id": 10, "name": "Jane" }
       ]
     },
     "loop_config": {
       "itemsIterationPropertyName": "customers",
       "maxAllowedCount": 100
     },
     "expected_output": {
       "itemsProcessed": 10,
       "itemsSucceeded": 10
     }
   }
   ```

4. **Verify:**
   - Output count matches input count
   - No unexpected errors
   - Body nodes executed correctly per iteration
   - Memory usage reasonable

### Load Testing Pattern

1. **Start small:** Test with 10, 100, 1000 items
2. **Measure:** Record execution time and memory for each
3. **Extrapolate:** If 1000 items take 10 seconds, 100,000 items ≈ 1000 seconds
4. **Optimize:** Adjust batchSize, parallelism, etc. and re-test
5. **Set limits:** Based on observed limits, set production `maxAllowedCount`

---

## Monitoring Execution Time

### Expected Durations

**Sequential, single item processing:**
```
10 items: ~5–10 seconds
100 items: ~50–100 seconds
1000 items: ~500–1000 seconds (8–16 minutes)
```

**With batching (20-item batches, parallel):**
```
1000 items: ~50–100 seconds (for I/O-bound tasks)
10000 items: ~500–1000 seconds
```

### Timing Measurements

Enable detailed logging to measure:

**Per-batch timing:**
```
Batch 1: 5.2 seconds
Batch 2: 4.8 seconds
Batch 3: 5.1 seconds
Average: 5 seconds per batch
```

**Per-item timing:**
```
Item 1: 0.2 seconds
Item 2: 0.25 seconds
...
Average: 0.21 seconds per item
```

**If timing is unexpectedly slow:**
1. Check if body nodes are calling slow external APIs
2. Increase timeout might indicate network issues
3. Try reducing batch size (less parallelism = less contention)

---

## Pro Tips Summary

> **💡 Start Simple, Scale Up**
> Build with default settings, test, measure, optimize only if needed.

> **💡 Use Aggregation Wisely**
> Aggregation is powerful but memory-intensive. Use `forceExitAfterCount` for large datasets.

> **💡 Parallel ≠ Always Faster**
> Parallelism helps I/O-bound tasks. For CPU-bound, sequential is often faster.

> **💡 Monitor Logs During Development**
> Logs are your best debugging friend. Check them religiously.

> **💡 Set Timeouts Always**
> Runaway iterations are a pain. Always configure `timeoutPerIteration`.

> **💡 Filter Before Looping**
> Use `filterExpression` in setup, not If-Else in body.

> **💡 Test with Production Data Volume**
> If production will have 100,000 items, test with that size before going live.

---

## Related Pages

- [02_Configuration.md](02_Configuration.md) – Property reference
- [04_Advanced_Scenarios.md](04_Advanced_Scenarios.md) – Real-world patterns
- [03_Variables_And_Scope.md](03_Variables_And_Scope.md) – Scope management

---

**Last Updated:** June 2026
