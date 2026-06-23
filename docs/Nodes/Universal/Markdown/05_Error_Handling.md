# Universal Item Iteration: Error Handling

This guide explains strategies for handling failures during iteration and recovering gracefully.

## Understanding Error Scenarios

Errors can occur in three ways during Universal Item Iteration:

1. **Item Processing Error**: A single item fails (invalid data, API error, etc.)
2. **Timeout Error**: An item takes too long to process
3. **Configuration Error**: Items source doesn't exist or isn't an array

Each scenario requires different handling.

---

## Stop vs. Continue: `breakOnFirstError`

The most fundamental decision: should iteration stop on the first failure, or continue?

### `breakOnFirstError: true` — Stop on First Error

When any item fails, iteration stops immediately and the error is returned.

```
Item 1: ✓ Success
Item 2: ✗ Error
Item 3: Never executed (broken out)
```

**Configuration:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "payments",
  "breakOnFirstError": true
}
```

### When to Use `breakOnFirstError: true`

✅ **Payment Processing:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "charges",
  "breakOnFirstError": true,
  "retryFailedItems": 3
}
```
If one charge fails, stop and don't charge remaining customers.

✅ **Data Validation:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "records",
  "breakOnFirstError": true
}
```
If first record is invalid, stop and report error immediately.

✅ **Critical Operations:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "contracts",
  "breakOnFirstError": true,
  "returnFirstError": true
}
```
Each step must succeed before proceeding.

### `breakOnFirstError: false` — Continue on Error

When an item fails, skip it and continue processing remaining items.

```
Item 1: ✓ Success
Item 2: ✗ Error (skipped)
Item 3: ✓ Success
Item 4: ✗ Error (skipped)
```

**Configuration:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "emails",
  "breakOnFirstError": false
}
```

### When to Use `breakOnFirstError: false`

✅ **Bulk Email:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "recipients",
  "breakOnFirstError": false,
  "retryFailedItems": 2
}
```
Send emails to all valid recipients, skip invalid ones.

✅ **Data Enrichment:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "contacts",
  "breakOnFirstError": false
}
```
Enrich as many contacts as possible, skip ones that fail.

✅ **Batch Operations:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "records",
  "batchSize": 100,
  "breakOnFirstError": false
}
```
Process entire batch even if some items fail.

---

## Retrying Failed Items: `retryFailedItems`

Automatically retry failed items a specified number of times with exponential backoff.

### Configuration

```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "api_calls",
  "retryFailedItems": 3
}
```

### How Retries Work

**Example: Item fails on first attempt, then succeeds on retry**

```
Item 1: Attempt 1 → Error → Attempt 2 → Success ✓
Item 2: Attempt 1 → Success ✓ (no retry needed)
Item 3: Attempt 1 → Error → Attempt 2 → Error → Attempt 3 → Success ✓
```

So `retryFailedItems: 3` means up to 4 total attempts (1 initial + 3 retries).

### Exponential Backoff

Retries automatically increase wait time between attempts:

```
Attempt 1: 0ms initial
Attempt 2: 100ms wait (if first fails)
Attempt 3: 200ms wait (if second fails)
Attempt 4: 400ms wait (if third fails)
```

This avoids overwhelming a system that's temporarily down.

### Common Retry Counts

| Retry Count | Use Case |
|------------|----------|
| 0 | No retries (fail immediately) |
| 1 | One retry (2 total attempts) |
| 2 | Two retries (3 total attempts) |
| 3 | Three retries (4 total attempts) - default for I/O |
| 5 | Aggressive retry (6 attempts) - unreliable networks |

### Example 1: Transient Network Errors

```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "api_requests",
  "retryFailedItems": 3,
  "timeoutPerIteration": 5000
}
```

Network hiccups are common; retry 3 times before giving up.

### Example 2: API Rate Limits

```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "batch_requests",
  "retryFailedItems": 2,
  "batchWaitTimeMs": 500
}
```

Wait 500ms between batches plus exponential backoff for retries.

### Retries with `breakOnFirstError`

When both are enabled:

```json
{
  "breakOnFirstError": true,
  "retryFailedItems": 3
}
```

Behavior:
1. Item fails → Retry (up to 3 times)
2. If retries succeed → Continue with next item
3. If retries exhaust → Break immediately

---

## Which Error to Return: `returnFirstError`

When multiple items fail, which error should be reported?

### `returnFirstError: true`

Return the first error encountered and stop processing.

```
Item 1: ✓
Item 2: ✗ Error (stop here, return this error)
Item 3: Never processed
Item 4: Never processed
```

**Configuration:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "records",
  "returnFirstError": true,
  "breakOnFirstError": true
}
```

**Use when:** You want to fail fast and investigate first error in detail.

### `returnFirstError: false`

Process all items, then return all errors (or first error, depending on node behavior).

```
Item 1: ✓
Item 2: ✗ Error (continue)
Item 3: ✓
Item 4: ✗ Error (continue)
```

**Configuration:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "records",
  "returnFirstError": false,
  "breakOnFirstError": false
}
```

**Use when:** You want to know all errors for full visibility.

---

## Empty Arrays: `skipOnEmpty`

What happens when the items array is empty?

### `skipOnEmpty: true` — Silent Skip (Default)

No iterations occur, no error. Workflow continues normally.

```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "items",
  "skipOnEmpty": true
}
```

**Input:** `items: []`  
**Result:** Iteration is skipped, workflow continues.

**Use when:** Empty arrays are normal and expected.

### `skipOnEmpty: false` — Error on Empty

If items array is empty, an error is raised.

```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "items",
  "skipOnEmpty": false
}
```

**Input:** `items: []`  
**Result:** Error raised—"Expected items array but got empty result."

**Use when:** Empty array indicates a data problem that needs investigation.

### Example: Require Minimum Items

```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "orders",
  "skipOnEmpty": false,
  "minAllowedCount": 1
}
```

Both properties together enforce that at least 1 item is required.

---

## Timeout Handling: `timeoutPerIteration`

Prevent items from hanging indefinitely by setting a per-item timeout.

### Configuration

```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "api_calls",
  "timeoutPerIteration": 10000
}
```

Each item must complete within 10 seconds.

### When to Use

✅ **Network Operations:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "http_requests",
  "timeoutPerIteration": 5000
}
```
Prevent hanging HTTP connections.

✅ **External API Calls:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "webhook_calls",
  "timeoutPerIteration": 30000
}
```
30-second limit for webhook deliveries.

✅ **Database Queries:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "queries",
  "timeoutPerIteration": 15000
}
```
Each query must complete in 15 seconds.

### What Happens on Timeout

```
Item 1: [===========] Completes in 3s ✓
Item 2: [====timeout!] Exceeds 10s limit ✗ (treated as error)
Item 3: [===========] Completes in 5s ✓
```

A timeout is treated as an error and respects `breakOnFirstError` and `retryFailedItems`.

### Common Timeout Values

| Timeout | Use Case |
|---------|----------|
| 1000ms (1s) | Very fast operations (usually should fail if slower) |
| 5000ms (5s) | API calls, HTTP requests |
| 10000ms (10s) | Database operations |
| 30000ms (30s) | Complex transformations, file operations |
| 60000ms (1min) | Large file processing |

---

## Common Error Scenarios

### Scenario 1: Partial Failure in Bulk Email

**Problem:** Send emails to 1000 recipients; 50 have invalid addresses.

**Configuration:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "recipients",
  "breakOnFirstError": false,
  "retryFailedItems": 1,
  "skipOnEmpty": true
}
```

**Behavior:**
- Invalid recipients cause errors
- `breakOnFirstError: false` → Continue sending to valid recipients
- `retryFailedItems: 1` → Retry once if recipient temporarily unreachable
- `skipOnEmpty: true` → No error if no recipients

**Result:** 950 emails sent successfully, 50 failed (acceptable for bulk send).

### Scenario 2: Critical Payment Processing

**Problem:** Charge 100 customers; must succeed for all or abort.

**Configuration:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "customers",
  "breakOnFirstError": true,
  "retryFailedItems": 2,
  "returnFirstError": true,
  "skipOnEmpty": false,
  "minAllowedCount": 1,
  "timeoutPerIteration": 30000
}
```

**Behavior:**
- `breakOnFirstError: true` → Stop immediately on first failure
- `retryFailedItems: 2` → Try 3 times before breaking
- `returnFirstError: true` → Report first error details
- `skipOnEmpty: false` → Error if no customers provided
- `minAllowedCount: 1` → Require at least 1 customer
- `timeoutPerIteration: 30000` → 30-second limit per charge

**Result:** All or nothing—charge all 100 or abort with clear error.

### Scenario 3: Data Enrichment with Graceful Degradation

**Problem:** Enrich 10,000 records with external API data; some API calls will fail.

**Configuration:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "records",
  "batchSize": 50,
  "parallelExecution": true,
  "breakOnFirstError": false,
  "retryFailedItems": 2,
  "batchWaitTimeMs": 500,
  "timeoutPerIteration": 10000,
  "filterExpression": "@{input:item|status}=='active'"
}
```

**Behavior:**
- Process active records only
- Batch 50 at a time, parallel for speed
- Wait 500ms between batches (rate limit)
- Retry failures 2 times
- 10-second timeout per record
- Continue if some records fail

**Result:** Enrich as many records as possible; collect failures for later retry.

### Scenario 4: Stale Cache Update

**Problem:** Update cache for 5000 items; don't care if some fail (can retry later).

**Configuration:**
```json
{
  "itemsIterationEnabled": true,
  "itemsIterationPropertyName": "items",
  "batchSize": 200,
  "parallelExecution": false,
  "breakOnFirstError": false,
  "retryFailedItems": 0,
  "skipOnEmpty": true
}
```

**Behavior:**
- Process 200 items per batch, sequentially
- No retries (failures are acceptable)
- Continue on errors
- Silent if no items

**Result:** Update as much cache as possible; failures are logged and can be retried later.

---

## Error Handling Best Practices

### Best Practice 1: Always Set `timeoutPerIteration` for Network Ops

```json
{
  "timeoutPerIteration": 5000
}
```

Prevents hanging indefinitely on network issues.

### Best Practice 2: Use `retryFailedItems` for Transient Errors

```json
{
  "retryFailedItems": 2
}
```

Recovers from temporary network hiccups automatically.

### Best Practice 3: Combine `breakOnFirstError` with `returnFirstError` for Critical Ops

```json
{
  "breakOnFirstError": true,
  "returnFirstError": true
}
```

Fast failure with clear error details.

### Best Practice 4: Use `filterExpression` to Pre-Validate

```json
{
  "filterExpression": "@{input:item|email} != null && @{input:item|email}|contains('@')"
}
```

Skip obviously invalid items before processing.

### Best Practice 5: Set `minAllowedCount` and `maxAllowedCount` for Safety

```json
{
  "minAllowedCount": 1,
  "maxAllowedCount": 10000
}
```

Catch data quality issues (too few items) and runaway iterations (too many).

---

## Error Codes and Troubleshooting

### Error: "Items source is not an array"

**Cause:** `itemsIterationPropertyName` points to a non-array value.

**Fix:** 
1. Verify input has the property
2. Confirm it's an array, not an object or scalar
3. Check spelling and nesting

### Error: "Item processing timed out"

**Cause:** Item took longer than `timeoutPerIteration`.

**Fix:**
1. Increase `timeoutPerIteration`
2. Check if operation is slow (network, database, computation)
3. Add `retryFailedItems` to handle transient slowness

### Error: "Expected minimum N items, got M"

**Cause:** Input has fewer items than `minAllowedCount`.

**Fix:**
1. Check input data source (database query, API response, etc.)
2. Adjust `minAllowedCount` if requirement changed
3. Add debugging to see what items are provided

### Error: "All items failed"

**Cause:** Every item resulted in error, even with retries.

**Fix:**
1. Check `breakOnFirstError` and `retryFailedItems` settings
2. Review execution logs for individual item errors
3. Verify item data structure matches expectations
4. Check if external service is down

### Error: "Empty items array" (when `skipOnEmpty: false`)

**Cause:** Items source is empty array.

**Fix:**
1. Check data source for empty result
2. Verify query/filter logic if using formula or filter expression
3. Increase `minAllowedCount` to 0 if empty is acceptable

---

## Pro Tips for Error Handling

> **💡 Enable Execution Logging**  
> Turn on debug logs to see every error message. This is invaluable for troubleshooting.

> **💡 Test Error Paths**  
> Intentionally inject errors (bad data, disabled service) to verify error handling works.

> **💡 Monitor Retry Behavior**  
> Check logs to see if retries are helping or if items fail immediately (may indicate permanent error, not transient).

> **💡 Balance Safety vs. Pragmatism**  
> `breakOnFirstError: true` is safe but slow. `breakOnFirstError: false` is faster but requires error handling downstream.

> **💡 Use Filters Before Iteration**  
> Pre-filter invalid items rather than handling errors during iteration. It's faster and cleaner.

---

**Next:** See [06_Best_Practices.md](06_Best_Practices.md) for performance and design patterns.
