# Algorithms & Data Structures

## Data Structure Selection Rationale

| Feature | Structure | Complexity | Rationale |
|---------|-----------|------------|-----------|
| Roll Lookup | Hash Map | O(1) | Direct access by roll ID |
| Job Queue | Priority Queue (Min-Heap) | O(log n) | Critical orders first |
| BOM | Tree | O(n) | Hierarchical components |
| Production Log | Queue (FIFO) | O(1) | Sequential processing |
| QC Defects | Array | O(n) | Simple list iteration |
| Navigation | Graph | O(V+E) | Connected machine network |

## 1. Priority Queue (Min-Heap) — Job Scheduling

The Min-Heap maintains the heap property: parent node is always smaller than or equal to its children. This ensures O(log n) insertion and extraction.

### Key Operations
- **Insert (enqueue)**: O(log n) — Add new job, heapify up
- **Extract Min (dequeue)**: O(log n) — Remove highest priority, heapify down
- **Peek**: O(1) — View next job without removal

### Real-World Scenario
Friday 4 PM, three urgent orders:
- ABC Exports: Monday deadline, P1 Critical
- XYZ Garments: Wednesday deadline, P2 High
- Local Buyer: Friday deadline, P3 Normal

**Without Priority Queue**: First-come-first-served → ABC misses Monday → Rs.50,000 penalty
**With Priority Queue**: ABC (P1) → XYZ (P2) → Local (P3) → All deadlines met

---

## 2. Hash Map — Roll Inventory Lookup

O(1) constant-time lookup regardless of inventory size (10,000+ rolls).

### How It Works
```
Key: 'R-2025-01234' 
→ Hash Function → Bucket[42]
→ Value: {fabric: 'cotton', gsm: 180, shade: 'navy', location: 'WH-A'}
```

### Comparison
- **Hash Map**: 1 operation (instant)
- **Linear Search**: 5,000 operations on average (for 10,000 rolls)

---

## 3. Tree — BOM Traversal

### Depth-First Search (DFS)
Go deep first, then wide. Used for calculating total material requirements.

### Breadth-First Search (BFS)
Go wide first, then deep. Used for finding all stages at the same processing level.

### Yield Calculation Example
```
100 kg Greige
→ Turning: 98 kg (2% loss)
→ Scouring: 95 kg (3% loss)
→ Dyeing: 93 kg (2% loss)
→ Drying: 92 kg (1% loss)
→ Compacting: 91 kg (1% loss)
Overall Yield: 91%
```

For 500 kg finished order: Need 500 / 0.91 = 549.45 kg greige

---

## 4. GST Calculation Algorithm

### Design Decisions
1. **Back-calculation**: Taxable value from total (MRP) rather than adding tax
2. **Rounding**: 2 decimal places for currency precision
3. **HSN Lookup**: Lookup table with default fallback

### Example
Order: Rs.100,000 sweater (HSN 6110, 5% GST)
- Taxable Value: 100,000 / 1.05 = 95,238.10
- CGST (2.5%): 2,380.95
- SGST (2.5%): 2,380.95
- Total Tax: 4,761.90

---

## 5. Offline Sync with Exponential Backoff

### Retry Strategy
```
1st retry: 1 second
2nd retry: 2 seconds
3rd retry: 4 seconds
4th retry: 8 seconds
5th retry: 16 seconds
Max retry: 30 seconds (cap)
```

### Why Exponential Backoff?
- Prevents retry storms from overwhelming server
- Ensures eventual consistency
- Adapts to intermittent connectivity
- Bandwidth-efficient for metered connections