# Algorithms Deep Dive

## Data Structure Selection Rationale

| Feature | Structure | Complexity | Why This Choice |
|---------|-----------|------------|-----------------|
| Roll Lookup | Hash Map | O(1) | Direct access by roll ID |
| Job Queue | Priority Queue (Min-Heap) | O(log n) | Critical orders first |
| BOM | Tree | O(n) | Hierarchical components |
| Production Log | Queue (FIFO) | O(1) | Sequential processing |
| QC Defects | Array | O(n) | Simple list iteration |

---

## 1. Priority Queue (Min-Heap) — Job Scheduling

### What is a Min-Heap?

A Min-Heap is a binary tree where every parent node is smaller than or equal to its children. This ensures the smallest element (highest priority) is always at the root.

```
        1 (P1 - ABC Exports)
       / \
      /   \
    2 (P2)  3 (P3)
   / \
  4   5
```

### Key Operations

| Operation | Complexity | How It Works |
|-----------|------------|--------------|
| **Insert (enqueue)** | O(log n) | Add new job at bottom, "bubble up" to maintain heap property |
| **Extract Min (dequeue)** | O(log n) | Remove root, move last element to root, "bubble down" |
| **Peek** | O(1) | View next job without removal |

### Real-World Scenario: Friday 4 PM

Three urgent orders come in:
- **ABC Exports**: Monday deadline, P1 Critical
- **XYZ Garments**: Wednesday deadline, P2 High
- **Local Buyer**: Friday deadline, P3 Normal

**Heap Structure:**
```
        1 (ABC - Monday)
       / \
      /   \
    2 (XYZ) 3 (Local)
```

Monday morning: Extract min → ABC gets processed first.

**Without Priority Queue**: First-come-first-served → ABC misses Monday → Rs.50,000 penalty

**With Priority Queue**: ABC (P1) → XYZ (P2) → Local (P3) → All deadlines met

---

## 2. Hash Map — Roll Inventory Lookup (O(1))

### The Problem

10,000+ rolls in inventory. Linear search takes 5,000 operations on average.

### The Solution

O(1) constant-time lookup regardless of inventory size.

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    HASH MAP BUCKETS                        │
├─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┤
│  0  │  1  │  2  │ ... │  42 │ ... │ 99  │ ... │  N  │
├─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┤
│          │           │              │                   │
│    ┌─────┴──────┐    │    ┌───────────┴──────┐            │
│    │ Roll Data  │    │    │   Roll Data        │            │
│    │ R-2025-001 │    │    │   R-2025-1234      │            │
│    │ Cotton     │    │    │   Cotton, 180GSM   │            │
│    │ Navy Blue  │    │    │   Navy Blue        │            │
│    └────────────┘    │    └────────────────────┘            │
│                      │                                      │
└──────────────────────┴──────────────────────────────────────┘
```

### Lookup Process

```
Key: 'R-2025-01234'
       │
       ▼
┌──────────────┐
│ Hash Function │ → Returns: 42
└──────┬───────┘
       │
       ▼
Bucket[42] → {roll data} ←── INSTANT (1 operation)
```

### Comparison

| Method | Operations for 10,000 rolls | Time at 1ms/op |
|--------|------------------------------|----------------|
| **Hash Map** | 1 | 1ms |
| **Linear Search** | 5,000 (avg) | 5,000ms (5 sec) |
| **Binary Search** | log₂(10,000) ≈ 14 | 14ms |

**Result**: Hash Map is 5,000x faster than linear search.

---

## 3. Tree — BOM Traversal

### Why a Tree?

Bill of Materials is inherently hierarchical:
```
Finished Product
├── Component A
│   ├── Sub-component A1
│   └── Sub-component A2
└── Component B
    └── Sub-component B1
```

### Traversal Methods

#### Depth-First Search (DFS)
Go deep first, then wide.

```
    A
   / \
  B   C
 / \
D   E

DFS Order: A → B → D → E → C
```

**Use Case**: Calculating total material requirements (sum all leaf nodes).

#### Breadth-First Search (BFS)
Go wide first, then deep.

```
    A
   / \
  B   C
 / \
D   E

BFS Order: A → B → C → D → E
```

**Use Case**: Finding all stages at the same processing level.

### Yield Calculation Example

```
500 kg Finished Order
│
└── Need: 500 / 0.91 = 549.45 kg Greige

Breakdown:
├── Greige: 549.45 kg
├── Turning: 538.46 kg (98%)
├── Scouring: 511.54 kg (95%)
├── Dyeing: 500 kg (93%)
└── Overall Yield: 91%
```

---

## 4. GST Calculation Algorithm

### Design Decisions

1. **Back-calculation**: Taxable value from total (MRP) rather than adding tax
2. **Rounding**: 2 decimal places for currency precision
3. **HSN Lookup**: Lookup table with default fallback

### Formula

```
Taxable Value = Total Amount / (1 + GST Rate/100)
CGST = SGST = Taxable Value × (GST Rate/2) / 100
Total Tax = Taxable Value × GST Rate / 100
```

### Example

Order: Rs.100,000 sweater (HSN 6110, 5% GST)

```
Step 1: Taxable Value
100,000 / 1.05 = 95,238.095... → 95,238.10

Step 2: CGST (2.5%)
95,238.10 × 0.025 = 2,380.952... → 2,380.95

Step 3: SGST (2.5%)
95,238.10 × 0.025 = 2,380.952... → 2,380.95

Step 4: Total Tax
2,380.95 + 2,380.95 = 4,761.90

Step 5: Verification
95,238.10 + 4,761.90 = 100,000 ✓
```

---

## 5. Offline Sync with Exponential Backoff

### The Problem

Factory WiFi is unreliable. Retry storms can overwhelm servers.

### The Solution

Exponential backoff: Wait longer between each retry.

### Retry Strategy

```
Attempt 1: Wait 1 second → Retry
Attempt 2: Wait 2 seconds → Retry
Attempt 3: Wait 4 seconds → Retry
Attempt 4: Wait 8 seconds → Retry
Attempt 5: Wait 16 seconds → Retry
Attempt 6+: Wait 30 seconds (max cap) → Retry
```

### Why Exponential Backoff?

- ✅ **Prevents retry storms** from overwhelming server
- ✅ **Ensures eventual consistency**
- ✅ **Adapts to intermittent connectivity**
- ✅ **Bandwidth-efficient** for metered connections

### The 3-Day Blackout Test

| Day | Action | Pending Records |
|-----|--------|-----------------|
| 1 | WiFi working, normal operation | 0 |
| 1 | WiFi dies | Queue starts |
| 2 | Operating offline | +3 records |
| 3 | Still offline | +2 records |
| 4 | WiFi restored | Auto-sync all 5 records |

**Result**: 100% data integrity, <5 minute sync, zero duplicates.

---

## Next: Implementation

Learn about the [tech stack, testing strategy, and cost comparison](implementation.md).
