# Universal Item Iteration: Batching and Parallelization

This guide explains how to optimize performance using batching and parallelization strategies. Perfect for processing large datasets efficiently.

## Sequential Processing (Default)

When `batchSize` is not set (`null`), items are processed one at a time, sequentially.

```
Item 1: [===========] 1 second
Item 2: [===========] 1 second  
Item 3: [===========] 1 second
Total: 3 seconds
```

### Configuration

```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "orders",
  "batchSize": null
}
```

### When to Use

✅ **Operations that must complete serially:**
- Data transformations (order matters)
- Writes to single database connection
- Operations with state dependencies
- High CPU usage (avoid context switching)

❌ **Not ideal for:**
- API calls (can parallelize)
- Network operations
- I/O bound tasks

### Performance Characteristics

| Items | Sequential Time | Parallel Time |
|-------|-----------------|---------------|
| 10 | 10s | 1s |
| 100 | 100s | 10s |
| 1000 | 1000s | 100s |

*(Assuming 1 second per item, 10 parallel workers)*

---

## Sequential Batching

Items are grouped into batches, and batches are processed one after another (not in parallel).

```
Batch 1 [Item1, Item2, Item3]: [===========] 3 seconds
Batch 2 [Item4, Item5, Item6]: [===========] 3 seconds  
Batch 3 [Item7, Item8, Item9]: [===========] 3 seconds
Total: 9 seconds
```

### Configuration

```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "records",
  "batchSize": 3,
  "parallelExecution": false
}
```

**Important:** `parallelExecution: false` (or omitted) processes batches sequentially.

### When to Use

✅ **Database bulk operations:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "records",
  "batchSize": 500,
  "parallelExecution": false
}
```
Insert 500 records per batch, one batch at a time.

✅ **Rate-limited APIs (with spacing):**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "api_calls",
  "batchSize": 10,
  "batchWaitTimeMs": 1000,
  "parallelExecution": false
}
```
Process 10 items, wait 1 second, process next 10.

✅ **Large data transformations:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "records",
  "batchSize": 100,
  "parallelExecution": false
}
```
Transform 100 records at a time, maintains predictable memory usage.

### Advantages

- ✅ Predictable memory usage (process one batch at a time)
- ✅ Easy to reason about (batches process serially)
- ✅ Good for CPU-intensive operations (no contention)
- ✅ Works with rate limiting

### Disadvantages

- ❌ Slower than parallelization for I/O operations
- ❌ Poor CPU utilization while waiting for I/O

---

## Parallel Batching

Items are grouped into batches, and items within each batch are processed concurrently.

```
Batch 1 [Item1|Item2|Item3|Item4|Item5]: [==|==|==|==|==] 1 second (5 parallel)
Batch 2 [Item6|Item7|Item8|Item9|Item10]: [==|==|==|==|==] 1 second
Total: 2 seconds
```

### Configuration

```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "api_requests",
  "batchSize": 5,
  "parallelExecution": true
}
```

**Key:** `parallelExecution: true` enables concurrency within each batch.

### When to Use

✅ **API calls and HTTP requests:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "user_ids",
  "batchSize": 10,
  "parallelExecution": true
}
```
Make 10 API calls concurrently. 10 × 1s = 1s total (not 10s).

✅ **Database queries (read-heavy):**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "query_params",
  "batchSize": 20,
  "parallelExecution": true
}
```
Execute 20 queries in parallel (read operations are safe).

✅ **Email sending (SMTP):**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "recipients",
  "batchSize": 50,
  "parallelExecution": true
}
```
Send 50 emails concurrently.

✅ **File operations (downloads/uploads):**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "file_urls",
  "batchSize": 8,
  "parallelExecution": true
}
```
Download 8 files at once.

### Advantages

- ✅ Massive speedup for I/O operations (10-100×)
- ✅ Efficient resource usage (don't wait idle)
- ✅ Scales well for network operations
- ✅ Reduces total execution time dramatically

### Disadvantages

- ❌ Higher resource usage (CPU, memory, connections)
- ❌ More complex debugging (concurrent execution)
- ❌ May fail if downstream system can't handle concurrency
- ❌ Can cause rate limit issues if not tuned

### Performance Comparison

**Scenario: Send 100 emails (each email takes 1 second)**

| Approach | Configuration | Time | Resource Usage |
|----------|---|------|-----------------|
| Sequential | No batching | 100s | Low |
| Batch 10, Sequential | `batchSize: 10, parallel: false` | 100s | Low |
| Batch 10, Parallel | `batchSize: 10, parallel: true` | 10s | Medium |
| Batch 50, Parallel | `batchSize: 50, parallel: true` | 2s | High |
| Batch 100, Parallel | `batchSize: 100, parallel: true` | 1s | Very High |

---

## Choosing the Right Batch Size

Batch size depends on operation type and system constraints.

### For API Calls

**Rule of thumb:** Match API concurrency limit

```json
{
  "batchSize": 10,
  "parallelExecution": true,
  "batchWaitTimeMs": 500
}
```

| API Concurrency Limit | Batch Size | Wait Time |
|----------------------|-----------|-----------|
| 10 concurrent max | 10 | 100ms |
| 50 concurrent max | 50 | 0ms |
| 100+ concurrent max | 50-100 | 0ms |
| Strict rate limit (10/sec) | 5-10 | 100ms |

### For Database Operations

**Sequential batching preferred** (better for locks, connections):

```json
{
  "batchSize": 500,
  "parallelExecution": false
}
```

| Database | Batch Size | Notes |
|----------|-----------|-------|
| PostgreSQL | 500-1000 | Can handle bulk inserts well |
| MySQL | 100-500 | Smaller for InnoDB (locks) |
| MongoDB | 1000-5000 | Bulk operations are efficient |
| DynamoDB | 25 | DynamoDB limit is 25 batch items |

### For Data Transformations

**Sequential batching** (CPU-bound):

```json
{
  "batchSize": 100,
  "parallelExecution": false
}
```

Process 100 items per batch, maintain predictable memory footprint.

### For File Operations

**Parallel with moderate batch size**:

```json
{
  "batchSize": 5,
  "parallelExecution": true,
  "batchWaitTimeMs": 0
}
```

Disk I/O benefits from parallelization, but too many concurrent disk operations causes contention.

---

## Rate Limiting with Batch Timing

When working with rate-limited APIs, use `batchWaitTimeMs` to space out batches.

### Scenario: API Allows 100 Requests/Second

Rate limit: 100 req/s = 10ms per request

```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "requests",
  "batchSize": 10,
  "parallelExecution": true,
  "batchWaitTimeMs": 100
}
```

**Timeline:**
- 0-1ms: Start 10 requests (0-10ms elapsed per concurrent request)
- 100ms: Batch 1 completes, wait 100ms
- 200ms: Batch 2 starts (10 more requests)
- 300ms: Batch 2 completes, wait 100ms
- 400ms: Batch 3 starts

**Rate achieved:** 100 requests / 400ms = 250 req/s (respects the 100 req/s limit)

### Scenario: Stripe API (100 Requests/Second)

```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "charges",
  "batchSize": 10,
  "parallelExecution": true,
  "batchWaitTimeMs": 100
}
```

This ensures you stay below Stripe's rate limit while maximizing throughput.

### Scenario: Slow Downstream System (Max 5 Requests/Second)

```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "operations",
  "batchSize": 5,
  "parallelExecution": false,
  "batchWaitTimeMs": 200
}
```

Process 5 items, wait 200ms (200ms per 5 items = 1 item per 40ms = 25 req/s... wait that's too fast)

**Better:**
```json
{
  "batchSize": 1,
  "batchWaitTimeMs": 200
}
```

Process 1 item, wait 200ms = 5 items/second.

---

## Staggered Startup with batchStartDelayMs

Use `batchStartDelayMs` to delay the start of the first batch.

### Scenario: Multiple Workflows Starting Simultaneously

Problem: All workflows hit the API at the same time, causing spike.

**Workflow 1:**
```json
{
  "batchStartDelayMs": 0
}
```

**Workflow 2:**
```json
{
  "batchStartDelayMs": 5000
}
```

**Workflow 3:**
```json
{
  "batchStartDelayMs": 10000
}
```

Timeline:
- 0s: Workflow 1 starts processing
- 5s: Workflow 2 starts processing
- 10s: Workflow 3 starts processing

This prevents thundering herd and distributes load over time.

---

## Real-World Examples

### Example 1: Bulk Email Campaign

**Scenario:** Send promotional emails to 50,000 customers

**Configuration:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "customers",
  "batchSize": 100,
  "parallelExecution": true,
  "batchWaitTimeMs": 500,
  "filterExpression": "@{input:item|opt_in}==true",
  "maxAllowedCount": 10000
}
```

**Analysis:**
- Process 100 emails at a time in parallel
- Wait 500ms between batches (respects SMTP server limits)
- Filter out non-opted-in customers
- Safety limit of 10,000 (don't accidentally send 50,000)

**Performance:**
- 100 emails × 1s per email = 1s per batch
- 100 batches total (for 10,000 emails after filtering)
- Wait time: 100 batches × 500ms = 50s
- Total: ~100s to send 10,000 emails

### Example 2: Parallel API Data Enrichment

**Scenario:** Enrich 1,000 user records by fetching external data

**Configuration:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "users",
  "batchSize": 20,
  "parallelExecution": true,
  "batchWaitTimeMs": 0,
  "retryFailedItems": 3,
  "timeoutPerIteration": 10000
}
```

**Analysis:**
- Fetch data for 20 users concurrently
- No wait time between batches (API can handle it)
- Retry failed enrichments 3 times
- 10-second timeout per user lookup

**Performance:**
- 20 concurrent API calls × 1s average = 1s per batch
- 50 batches (1000 users ÷ 20)
- Total: ~50 seconds to enrich all users

### Example 3: Database Bulk Insert

**Scenario:** Insert 100,000 records into PostgreSQL

**Configuration:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "records",
  "batchSize": 1000,
  "parallelExecution": false,
  "skipOnEmpty": false,
  "minAllowedCount": 100,
  "aggregateResults": true
}
```

**Analysis:**
- Batch insert 1000 records at a time
- Process batches sequentially (one transaction at a time)
- Require at least 100 records (quality check)
- Aggregate all results for summary report

**Performance:**
- 1000 records per batch × 5s = 5s per batch
- 100 batches (100,000 records)
- Total: ~500 seconds = ~8 minutes

### Example 4: Image Processing (CPU-Bound)

**Scenario:** Resize 10,000 images

**Configuration:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "image_paths",
  "batchSize": 4,
  "parallelExecution": true
}
```

**Analysis:**
- Process 4 images at a time (match CPU cores on 4-core system)
- Don't parallelize too much (CPU contention)
- Process concurrently (use all cores)

**Performance:**
- 4 images per batch × 2s per image = 2s per batch
- 2500 batches (10,000 images)
- Total: ~5000 seconds = ~83 minutes

*(Note: Sequential would take 5500 minutes, so 4× speedup is good for CPU-bound work)*

### Example 5: Payment Processing (High Stakes)

**Scenario:** Charge 1,000 customers, must be reliable

**Configuration:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "customers",
  "batchSize": 1,
  "parallelExecution": false,
  "breakOnFirstError": true,
  "retryFailedItems": 3,
  "returnFirstError": true,
  "timeoutPerIteration": 30000
}
```

**Analysis:**
- Process one payment at a time (high stakes, no parallelization)
- Break on first error (don't charge customers if something fails)
- Retry 3 times for transient failures
- 30-second timeout for payment completion
- Return first error details

**Performance:**
- 1 payment per batch × 3s = 3s per batch
- 1000 batches
- Total: ~3000 seconds = ~50 minutes

---

## Performance Tuning Checklist

When performance is an issue, follow this checklist:

- [ ] **Identify bottleneck**: Is it the item processing or something else?
- [ ] **Check operation type**: I/O-bound (can parallelize) or CPU-bound (can't)?
- [ ] **Enable batching**: If not already enabled
- [ ] **Enable parallelization** (if I/O-bound): Process 5-50 items concurrently
- [ ] **Adjust batch size**: Start with 10, increase gradually
- [ ] **Add rate limiting**: If downstream system has limits
- [ ] **Monitor resource usage**: Memory, CPU, network connections
- [ ] **Test at scale**: Small test (10 items), medium (100), large (1000+)

---

## Common Pitfalls

### Pitfall 1: Too High Parallelization Causes Memory Spike

```json
{
  "batchSize": 1000,
  "parallelExecution": true
}
```

**Problem:** 1000 concurrent operations = 1000× memory usage

**Fix:** Reduce batch size
```json
{
  "batchSize": 20,
  "parallelExecution": true
}
```

### Pitfall 2: Rate Limit Violations

```json
{
  "batchSize": 100,
  "batchWaitTimeMs": 0
}
```

**Problem:** 100 requests at once violates rate limit

**Fix:** Add appropriate wait time
```json
{
  "batchSize": 10,
  "batchWaitTimeMs": 1000
}
```

### Pitfall 3: Parallelizing CPU-Bound Work

```json
{
  "batchSize": 16,
  "parallelExecution": true
}
```

**Problem:** On 4-core CPU, 16 parallel threads cause context switching overhead, slower than sequential

**Fix:** Match batch size to core count
```json
{
  "batchSize": 4,
  "parallelExecution": true
}
```

### Pitfall 4: Ignoring Timeouts in Parallel Mode

```json
{
  "batchSize": 50,
  "parallelExecution": true
}
```

**Problem:** One stuck operation hangs the entire batch

**Fix:** Set per-operation timeout
```json
{
  "batchSize": 50,
  "parallelExecution": true,
  "timeoutPerIteration": 5000
}
```

---

## Nested Iteration (Advanced)

You can combine Loop Node with Universal Iteration for advanced patterns:

```
Loop Node (10 customers)
  └─ HTTP Node [Universal Iteration: 5 product checks per customer]
     └─ 10 × 5 = 50 API calls total
```

**Configuration:**

HTTP Node inside Loop body:
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "products",
  "batchSize": 5,
  "parallelExecution": true
}
```

**Be careful:** Nested iteration multiplies iterations. 10 × 5 = 50 total. 10 × 100 = 1000 total.

---

## Pro Tips for Optimal Performance

> **💡 Start Conservative**  
> Begin with sequential processing, then add batching, then add parallelization. Measure each change.

> **💡 Match Batch Size to Limits**  
> API rate limit: 100 req/s → batch size of 10-20  
> Database connection pool: 20 connections → batch size of 20  
> Memory constraint: 1GB available → batch size adjusted for memory usage

> **💡 Monitor During Execution**  
> Watch CPU, memory, network usage in real time. If one resource maxes out, that's your limit.

> **💡 Test Before Production**  
> Always test with realistic data volume before deploying to production. A configuration that works for 100 items might fail for 100,000.

> **💡 Use Execution Logs**  
> Enable debug logging to see per-batch execution times and identify slow batches.

---

**Next:** See [04_Variable_Access.md](04_Variable_Access.md) to learn how to access current item data in your configurations.
