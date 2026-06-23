# Universal Item Iteration: Best Practices

This guide covers design patterns, performance optimization, and real-world lessons learned.

## Design Patterns

### Pattern 1: The Simple Loop (5-10 Items)

For small collections, keep configuration simple:

```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "recipients",
  "recipients": "@{input:item|email}",
  "subject": "Hello @{input:item|name}!"
}
```

**When to use:**
- ✅ Processing < 100 items
- ✅ No performance concerns
- ✅ Each item takes < 1 second
- ✅ Failures are acceptable

**Example:** Send emails to 5 customers.

### Pattern 2: The Safe Bulk Operation (100-1000 Items)

Add safety guards for medium-sized datasets:

```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "records",
  "maxAllowedCount": 1000,
  "breakOnFirstError": false,
  "retryFailedItems": 2,
  "filterExpression": "@{input:item|is_valid}==true",
  "skipOnEmpty": true
}
```

**When to use:**
- ✅ Processing 100-1000 items
- ✅ Transient failures expected
- ✅ Valid items should be processed even if some fail
- ✅ Want safety limit to prevent runaway iteration

**Example:** Insert 500 database records, skip invalid ones.

### Pattern 3: The Parallel Powerhouse (1000+ Items, I/O-Bound)

For large datasets with I/O operations:

```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "user_ids",
  "batchSize": 20,
  "parallelExecution": true,
  "batchWaitTimeMs": 500,
  "retryFailedItems": 3,
  "timeoutPerIteration": 10000,
  "maxAllowedCount": 50000,
  "aggregateResults": true
}
```

**When to use:**
- ✅ Processing 1000+ items
- ✅ Operations are I/O-bound (API calls, database reads)
- ✅ Need speed (parallel execution)
- ✅ Rate limiting required (batch wait time)
- ✅ Want aggregated results

**Example:** Fetch data for 5000 users from external API in parallel.

### Pattern 4: The Critical Operation (Payment, Authentication)

For operations where safety is paramount:

```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "transactions",
  "breakOnFirstError": true,
  "retryFailedItems": 3,
  "returnFirstError": true,
  "skipOnEmpty": false,
  "minAllowedCount": 1,
  "timeoutPerIteration": 30000,
  "maxAllowedCount": 100
}
```

**When to use:**
- ✅ Operations must succeed or fail atomically (all or nothing)
- ✅ Each item is critical and expensive
- ✅ Failures must be reported with detail
- ✅ Want to fail fast if something goes wrong

**Example:** Charge credit cards for order batch.

### Pattern 5: The Graceful Degradation (Best Effort)

For operations where partial success is acceptable:

```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "contacts",
  "batchSize": 100,
  "parallelExecution": false,
  "breakOnFirstError": false,
  "retryFailedItems": 0,
  "skipOnEmpty": true,
  "aggregateResults": true
}
```

**When to use:**
- ✅ Best-effort processing
- ✅ Failures are logged but don't stop the workflow
- ✅ Want to process as many items as possible
- ✅ Can retry failures later manually or via scheduled job

**Example:** Update customer engagement scores from external source.

---

## Performance Tuning Guide

### Step 1: Establish Baseline

Test with your actual data volume:

```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "data",
  "maxAllowedCount": 100
}
```

Run with 100 items and note:
- Execution time
- Resource usage (CPU, memory, network)
- Any error patterns

### Step 2: Identify Bottleneck

- **Slow because each item takes long?** → Can't parallelize (CPU-bound), must optimize item processing
- **Slow because processing many items serially?** → Add batching and parallelization
- **Slow because waiting for I/O?** → Parallelize I/O

### Step 3: Apply Optimization

**If I/O-bound:**
```json
{
  "batchSize": 20,
  "parallelExecution": true,
  "batchWaitTimeMs": 100
}
```

**If CPU-bound:**
```json
{
  "batchSize": 4,
  "parallelExecution": true
}
```

**If rate-limited:**
```json
{
  "batchSize": 5,
  "batchWaitTimeMs": 1000
}
```

### Step 4: Monitor and Adjust

- Too much memory? Reduce `batchSize`
- Still too slow? Increase `batchSize`
- Hitting rate limit? Increase `batchWaitTimeMs`
- Timeouts? Increase `timeoutPerIteration`

---

## Memory Management

### Memory Usage Formula

```
Approximate Memory = batchSize × memoryPerItem × parallelWorkers
```

### Example Calculations

**Email sending (1KB per item):**
- batchSize: 100, parallelExecution: false
- Memory: 100 × 1KB × 1 = 100KB ✅ Negligible

**API calls (10KB per request + response):**
- batchSize: 50, parallelExecution: true (10 workers)
- Memory: 50 × 10KB × 10 = 5MB ✅ Acceptable

**Large data transformation (100KB per item):**
- batchSize: 100, parallelExecution: true (10 workers)
- Memory: 100 × 100KB × 10 = 100MB ❌ High

For large data transformation, reduce batch size:
```json
{
  "batchSize": 10,
  "parallelExecution": true
}
```

New memory: 10 × 100KB × 10 = 10MB ✅ Acceptable

---

## Common Mistakes and How to Avoid Them

### Mistake 1: Parallelizing CPU-Bound Work

**Wrong:**
```json
{
  "batchSize": 100,
  "parallelExecution": true
}
```

For CPU-intensive transformations on 4-core CPU, this causes context switching overhead and is slower than sequential.

**Right:**
```json
{
  "batchSize": 4,
  "parallelExecution": true
}
```

Match batch size to CPU core count.

### Mistake 2: Ignoring Rate Limits

**Wrong:**
```json
{
  "batchSize": 100,
  "parallelExecution": true
}
```

API rate limit is 100 req/second, so 100 concurrent requests violate the limit.

**Right:**
```json
{
  "batchSize": 10,
  "parallelExecution": true,
  "batchWaitTimeMs": 100
}
```

10 concurrent requests, wait 100ms between batches = 100 req/second.

### Mistake 3: No Timeout on Network Operations

**Wrong:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "api_calls"
}
```

If API hangs, iteration hangs indefinitely.

**Right:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "api_calls",
  "timeoutPerIteration": 5000
}
```

If item takes > 5 seconds, treat it as error.

### Mistake 4: Retrying Non-Transient Errors

**Wrong:**
```json
{
  "retryFailedItems": 5
}
```

If failure is due to bad data (non-transient), retrying 5 times wastes time.

**Right:**
```json
{
  "filterExpression": "@{input:item|email}|contains('@')",
  "retryFailedItems": 2
}
```

Filter invalid emails first, retry only for transient errors.

### Mistake 5: Not Testing at Scale

**Wrong:**
Develop with 10 items, deploy to production with 100,000 items. Hit memory limit or timeout.

**Right:**
1. Test with 10 items
2. Test with 1000 items (verify performance scales)
3. Test with 100,000 items (catch memory/timeout issues)
4. Deploy to production

---

## Monitoring and Debugging

### Enable Execution Logging

In node configuration, enable verbose logging:

```json
{
  "debugLogging": true,
  "logEveryIteration": true
}
```

This shows:
- Each iteration's input data
- Configuration values resolved for that iteration
- Output and any errors
- Execution time per iteration

### Key Metrics to Monitor

| Metric | What It Tells You |
|--------|------------------|
| **Iterations/second** | Throughput—how fast you're processing |
| **Error rate (%)** | Quality—what percentage fails |
| **Avg execution time** | Performance—single-item duration |
| **95th percentile time** | Outliers—slowest items |
| **Memory usage peak** | Resource constraints |
| **CPU usage** | If CPU-bound or I/O-bound |

### Debugging Iteration Issues

**Issue: Only first 10 items processed**
1. Check `maxAllowedCount` is not set to 10
2. Check `forceExitAfterCount` is not 10
3. Check `breakOnFirstError` didn't trigger
4. Look at execution logs for early exit

**Issue: All items fail**
1. Check that `@{input:item}` resolves correctly
2. Verify item data structure matches expectations
3. Check if external service is down
4. Look at first error message in logs

**Issue: Some batches slow, others fast**
1. Check if downstream service has variable latency
2. Check if network conditions are inconsistent
3. Monitor resource usage (might be GC pauses)

---

## Production Checklist

Before deploying iteration to production:

- [ ] Tested with actual data volume (not just small sample)
- [ ] Timeout set for any network operations (`timeoutPerIteration`)
- [ ] Error handling configured (`breakOnFirstError`, `retryFailedItems`)
- [ ] Safety limits set (`maxAllowedCount`)
- [ ] Performance tuned (batch size, parallelization)
- [ ] Monitoring enabled (execution logs, metrics)
- [ ] Failure alerts configured
- [ ] Rollback plan in place (can disable iteration quickly)
- [ ] Documentation updated with expected performance

### Example Production-Ready Configuration

```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "orders",
  "batchSize": 50,
  "parallelExecution": true,
  "batchWaitTimeMs": 200,
  "timeoutPerIteration": 10000,
  "retryFailedItems": 2,
  "breakOnFirstError": false,
  "skipOnEmpty": true,
  "maxAllowedCount": 10000,
  "aggregateResults": true
}
```

This configuration:
- ✅ Processes 50 items at a time in parallel (performance)
- ✅ Waits 200ms between batches (rate limiting)
- ✅ 10-second timeout per item (prevent hanging)
- ✅ Retries failures twice (transient error recovery)
- ✅ Continues on errors (graceful degradation)
- ✅ Silent if empty (normal case handling)
- ✅ Limited to 10,000 items (safety bound)
- ✅ Aggregates results (easy downstream processing)

---

## Cost Optimization

### Pay Per Request (e.g., API Calls)

**Configuration that minimizes cost:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "items",
  "filterExpression": "@{input:item|is_valid}==true",
  "skipOnEmpty": true
}
```

Filter invalid items first to avoid paying for failed requests.

### Pay Per Second (e.g., Compute)

**Configuration that minimizes cost:**
```json
{
  "batchSize": 16,
  "parallelExecution": true
}
```

Parallelize to finish faster (fewer compute-seconds billed).

### Pay Per Connection (e.g., Database)

**Configuration that minimizes cost:**
```json
{
  "batchSize": 500,
  "parallelExecution": false
}
```

Use one connection per batch (sequential) rather than many connections (parallel).

---

## Real-World Success Stories

### Story 1: Email Marketing Campaign

**Situation:** Send personalized emails to 50,000 customers.

**Initial Problem:** Sequential processing took 14 hours.

**Optimization:**
```json
{
  "batchSize": 100,
  "parallelExecution": true,
  "batchWaitTimeMs": 50
}
```

**Result:** Reduced to 1.5 hours (10× faster). Cost stayed the same (SMTP is cheap).

### Story 2: Data Enrichment

**Situation:** Enrich 100,000 customer records with third-party data.

**Initial Problem:** API timeouts, memory spikes.

**Optimization:**
```json
{
  "batchSize": 20,
  "parallelExecution": true,
  "batchWaitTimeMs": 100,
  "timeoutPerIteration": 5000,
  "retryFailedItems": 2
}
```

**Result:** Completed successfully, no crashes, 95% success rate (5% retried successfully).

### Story 3: Payment Processing

**Situation:** Charge 1,000 customers for subscription renewals.

**Initial Problem:** One failed charge would break the entire batch.

**Optimization:**
```json
{
  "breakOnFirstError": false,
  "retryFailedItems": 3,
  "maxAllowedCount": 1000
}
```

**Result:** 99.2% charges processed successfully on first try, retries recovered most failures. Manual review for 8 remaining failures.

---

## Pro Tips from Experience

> **💡 Start Simple, Add Complexity Later**  
> Don't optimize prematurely. Get basic iteration working first, then add batching, parallelization, error handling.

> **💡 Monitor, Don't Guess**  
> Look at actual execution metrics, not assumptions. What you think is slow might not be.

> **💡 Test at Scale**  
> A configuration that works for 100 items might fail for 100,000. Test with real volumes.

> **💡 Fail Gracefully**  
> For most operations, `breakOnFirstError: false` and `retryFailedItems: 2` is safer than fail-fast.

> **💡 Document Your Choices**  
> Comment your configuration explaining why batch size is 50, why parallel is enabled, etc. Future you will thank you.

> **💡 Build Observability**  
> Enable logs, set up alerts, monitor key metrics. Iteration is hard to debug without good visibility.

> **💡 Have a Rollback Plan**  
> If iteration causes problems, you should be able to disable it immediately and fall back to Loop Node or sequential processing.

---

**Next:** See [07_vs_Loop_Node.md](07_vs_Loop_Node.md) for comparison with Loop Node architecture.
