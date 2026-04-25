# Core Modules

## 1. Inventory & Traceability (O(1) Hash Map)

### The Problem
Finding a specific roll in 10,000+ inventory takes hours of manual searching.

### The Solution
**Hash Map (O(1) Lookup)**

- **Key**: Roll ID (e.g., `R-2025-01234`)
- **Value**: Roll metadata (fabric, GSM, shade, location, status)
- **Lookup**: Instant, regardless of inventory size

```
Key: 'R-2025-01234'
       │
       ▼
Hash Function
       │
       ▼
┌──────────────────────────────┐
│ Bucket[42]                   │
│ {                            │
│   fabric: 'Cotton',          │
│   gsm: 180,                  │
│   shade: 'Navy Blue',        │
│   location: 'WH-A-Row3',     │
│   status: 'WAREHOUSE'        │
│ }                            │
└──────────────────────────────┘
```

### Roll State Machine

```
INWARD → WAREHOUSE → ALLOCATED → PRODUCTION → QC → PACKED → DISPATCHED
```

Prevents invalid operations and tracks full lifecycle history.

### Key Features
- 📱 **Barcode scanning** for instant roll identification
- 📍 **Location tracking** across multiple warehouses
- ✅ **State transition validation**
- 🔔 **Stock alerts** for low inventory

---

## 2. Production Planning & Job Cards (Min-Heap O(log n))

### The Problem
20 pending orders, 8 machines, 15 operators—which job next?

### The Solution
**Priority Queue (Min-Heap O(log n))**

Jobs prioritized by:
1. Deadline urgency
2. Customer importance
3. Machine availability
4. Material readiness

### The Friday 4 PM Scenario

```
Without Priority Queue:
├── Order 1: ABC Exports (Monday deadline, P1 Critical)
├── Order 2: XYZ Garments (Wednesday, P2 High)
└── Order 3: Local Buyer (Friday, P3 Normal)
Result: First-come-first-served → ABC misses Monday → Rs.50,000 penalty

With Priority Queue:
1. ABC Exports (P1) → Start Monday
2. XYZ Garments (P2) → Start Wednesday
3. Local Buyer (P3) → Start Friday
Result: All deadlines met → Zero penalties
```

### Job Card Lifecycle

```
CREATED → ASSIGNED → IN_PROGRESS → COMPLETED → QC_PENDING → QC_PASSED → INVOICED
```

### Key Features
- 🎯 **Priority-based auto-scheduling**
- ⚠️ **Machine conflict detection**
- 👷 **Operator skill matching**
- ⏰ **Deadline tracking** with alerts

---

## 3. Bill of Materials (Tree Structure)

### The Problem
Inaccurate material estimation causes waste and cost overruns.

### The Solution
**Tree Structure with DFS Traversal**

```
Finished Product (500 kg Navy Blue)
│
├── Dyeing (Yield: 93%)
│   ├── Scouring (Yield: 95%)
│   │   └── Turning (Yield: 98%)
│   │       └── Greige Fabric (Input: 549 kg)
```

### Yield Calculation

| Stage | Input | Output | Loss |
|-------|-------|--------|------|
| Greige | 549 kg | 538 kg | 2% |
| Turning | 538 kg | 527 kg | 2% |
| Scouring | 527 kg | 501 kg | 5% |
| Dyeing | 501 kg | 500 kg | 0.2% |
| **Overall** | **549 kg** | **500 kg** | **91% yield** |

**Formula**: For 500 kg finished order, need 500 / 0.91 = **549.45 kg greige**

### Key Features
- 🌳 **Multi-level BOM support**
- 🧮 **Automatic yield calculation**
- 📦 **Material requirement planning**
- 💰 **Cost rollup** from components

---

## 4. Quality Control System

### 4-Point Inspection System

| Defect Size | Points | Example |
|-------------|--------|---------|
| < 3 inches | 1 | Minor loop |
| 3-6 inches | 2 | Small stain |
| 6-9 inches | 3 | Needle line |
| > 9 inches | 4 | Large hole |

### Grade Assignment

| Grade | Points | Price |
|-------|--------|-------|
| **A** | ≤20 | Premium (+10%) |
| **B** | 21-40 | Standard |
| **C** | 41-60 | Discounted (-15%) |
| **Reject** | >60 | Return/Reprocess |

### Photo Compression

- **Original**: 3 MB
- **Compressed**: 50-80 KB
- **Reduction**: 97%

Enables fast upload on 2-4 Mbps factory WiFi.

---

## 5. Sales, Dispatch & Finance

### GST Calculation Engine

Handles textile-specific HSN codes:

| HSN Code | Product | GST Rate |
|----------|---------|----------|
| 6109 | T-shirts | 5% |
| 6110 | Sweaters | 5% |
| 6103 | Suits | 12% |
| Default | Other | 18% |

Supports both:
- **Intra-state**: CGST (2.5%) + SGST (2.5%)
- **Inter-state**: IGST (5%)

### Example Calculation

**Order**: Rs.100,000 sweater (HSN 6110, 5% GST)

```
Taxable Value: 100,000 / 1.05 = 95,238.10
CGST (2.5%):     2,380.95
SGST (2.5%):     2,380.95
─────────────────────────
Total Tax:       4,761.90
Total Amount:  100,000.00
```

### Cost Tracking

```
Total Cost = Material Cost + Labor Cost + Overhead Cost
Per kg Cost = Total Cost / Total Quantity
```

### Variance Analysis
Compares standard vs actual consumption for continuous improvement.

---

## 6. Analytics & Reporting

### 10-Level Drilldown

```
Entity → Division → Plant → Department → Machine → Operator → Order → Batch → Roll → Transaction
```

### Report Types

1. **Stock Report**: By location, fabric type, shade
2. **Production Report**: By machine, operator, shift
3. **Quality Report**: Defect analysis, grade-wise output
4. **Cost Report**: Per kg cost, variance analysis
5. **Sales Report**: By customer, region, product
6. **Financial Report**: P&L, Balance Sheet, GST returns

### Performance Optimization
- ⚡ **Indexed queries** for fast filtering
- 💾 **Cached dashboards** for instant load
- 📄 **Paginated reports** for large datasets
- 🔽 **Lazy loading** for drilldown navigation

---

## Next: Algorithms Deep Dive

Learn [why each data structure was chosen](algorithms-deep-dive.md) and how they work.
