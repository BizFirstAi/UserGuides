# Universal Item Iteration Features

This section documents the features and capabilities of Universal Item Iteration in Flow Studio.

## Feature Categories

### Core Iteration Features
- **Built-in Batching**: Group items into batches for efficient processing
- **Parallel Execution**: Process multiple items concurrently
- **Sequential Processing**: Process items one at a time (default)
- **Rate Limiting**: Control speed with batch wait times
- **Item Filtering**: Filter items before iteration starts
- **Item Sorting**: Sort items by any expression before iteration

### Error Handling Features
- **Break on First Error**: Stop processing immediately on failure
- **Continue on Error**: Skip failed items and continue
- **Automatic Retries**: Retry failed items up to N times with backoff
- **Per-Item Timeout**: Prevent hanging operations
- **Error Reporting**: Control which error is returned

### Result Management Features
- **Independent Results**: Each item's result flows downstream separately
- **Aggregated Results**: Collect all results into single array
- **Last Result Only**: Return only the final iteration's result
- **Result Filtering**: Apply filter expressions to reduce dataset

### Performance Features
- **Scalability**: Process unlimited items (memory dependent)
- **Memory Efficient**: Process in batches to manage memory usage
- **CPU Efficient**: Sequential for CPU-bound, parallel for I/O-bound
- **Timeout Protection**: Prevent resource exhaustion from hanging operations

### Variable Access Features
- **Current Item**: Access @{input:item} and nested properties
- **Iteration Index**: Access @{input:current_iteration_index}
- **Static Input**: Access top-level input properties in all iterations
- **Variable Scope**: Limited but predictable scope

## Supported Node Types

- SMTP/EmailSmtp (send bulk emails)
- HTTP Request (call APIs in parallel)
- DataMapping (transform items)
- Database (bulk insert/update)
- Custom (user-defined logic)

## Configuration Properties

21 total properties organized in 8 categories:

1. **Iteration Sources** (4) - Specify items
2. **Core Behavior** (4) - Basic controls
3. **Limits & Exits** (2) - Bounds
4. **Error Handling** (3) - Failure strategies
5. **Result Management** (2) - Output control
6. **Performance & Batching** (3) - Speed tuning
7. **Batch Timing** (2) - Rate limiting
8. **Filtering & Sorting** (2) - Pre-iteration transforms

See [../Markdown/02_Configuration.md](../Markdown/02_Configuration.md) for complete reference.

## Comparison with Loop Node

| Feature | Universal | Loop |
|---------|-----------|------|
| Single-node operations | ✅ Perfect | Works |
| Multi-node workflows | ❌ No | ✅ Yes |
| Setup time | ✅ 2 min | 10 min |
| Batching | ✅ Advanced | Basic |
| Parallel execution | ✅ Yes | Yes |
| Conditional branching | ❌ No | ✅ Yes |

## Performance Characteristics

- **Sequential**: 1 item/second baseline
- **Batch 10, Sequential**: Same as sequential (batching doesn't speed up sequential)
- **Batch 50, Parallel**: 50× speedup for I/O operations
- **Scalability**: Linear up to system resource limits

## Key Advantages

✅ Simple configuration (one property per detail)  
✅ Built-in performance tuning (batching, parallelization)  
✅ Advanced error handling (retries, filtering)  
✅ Flexible result aggregation  
✅ Rate limiting support  

## Limitations

❌ Single-node only (can't have multi-step per item)  
❌ No conditional branching within iteration  
❌ Limited variable scope isolation  
❌ Not all nodes support iteration  

## Common Use Cases

1. **Bulk Email**: Send emails to thousands of recipients
2. **Parallel API Calls**: Fetch data for multiple items concurrently
3. **Batch Database**: Insert/update many records efficiently
4. **Data Enrichment**: Enrich datasets from external sources
5. **Webhook Delivery**: Send webhooks with reliability and rate limiting
6. **Image Processing**: Resize/transform images in parallel
7. **Payment Processing**: Charge customers with retries
8. **Data Migration**: Move data between systems

## Real-World Performance Examples

- 10,000 emails: Sequential ~3 hours → Parallel batching ~6 minutes (30× faster)
- 1,000 API calls: Sequential ~16 minutes → Parallel 50-concurrent ~20 seconds (50× faster)
- 100,000 DB inserts: Batch 500 ~8 minutes
- 100 images: Sequential ~100s → Parallel 8-worker ~13s (8× faster)

---

See [../index.html](../index.html) for complete documentation.
