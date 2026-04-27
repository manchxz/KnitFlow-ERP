# Core Modules

## 1. Inventory & Traceability

### Problem
Finding a specific roll in 10,000+ inventory takes hours of manual searching.

### Solution: Hash Map (O(1) Lookup)
- Key: Roll ID (e.g., `R-2025-01234`)
- Value: Roll metadata (fabric, GSM, shade, location, status)
- Lookup: Instant, regardless of inventory size

### Roll State Machine
```
INWARD → WAREHOUSE → ALLOCATED → PRODUCTION → QC → PACKED → DISPATCHED
```
Prevents invalid operations and tracks full lifecycle history.

### Key Features
- Barcode scanning for instant roll identification
- Location tracking across multiple warehouses
- State transition validation
- Stock alerts for low inventory

---

## 2. Production Planning & Job Cards

### Problem
20 pending orders, 8 machines, 15 operators — which job next?

### Solution: Priority Queue (Min-Heap O(log n))
Jobs prioritized by:
1. Deadline urgency
2. Customer importance
3. Machine availability
4. Material readiness

### Knitwear-Specific Workflow (2025 Research)

**Stage Flow for Flat-Knit Garments:**
```
Yarn → Knitting → Linking → Washing → QC → Packing → Dispatch
```

**Machine Gauge Considerations:**
- 3GG (Chunky): Fast production, ~minutes per panel
- 14GG (Fine): Slow production, ~1+ hours per panel
- Machine assignment must match gauge requirements

**Linking Stage = Common Bottleneck**
- Skilled handwork required
- V-neck symmetry critical
- Loop-by-loop joining (not sewing)
- Often limits overall throughput

### Job Card Lifecycle
```
CREATED → ASSIGNED → IN_PROGRESS → COMPLETED → QC_PENDING → QC_PASSED → INVOICED
```

### Key Features
- Priority-based auto-scheduling
- Machine conflict detection
- **Operator skill matching** (critical for linking quality)
- **Gauge-aware machine assignment**
- **Stage-specific bottleneck alerts**
- Deadline tracking with alerts

### Digital Work Order Benefits (2025 Research)
- 70% reduction in workflow errors
- 45% faster task completion
- Eliminates lost job cards (saves 2-3 hours/day)
- Real-time status tracking

---

## 3. Bill of Materials (BOM)

### Problem
Inaccurate material estimation causes waste and cost overruns.

### Solution: Tree Structure with DFS Traversal
```
Finished Product (500 kg Navy Blue)
├── Dyeing (Yield: 93%)
│   ├── Scouring (Yield: 95%)
│   │   └── Turning (Yield: 98%)
│   │       └── Greige Fabric (Input: 549 kg)
```

### Yield Calculation
Input: 549 kg greige → Output: 500 kg finished (91% overall yield)

### Key Features
- Multi-level BOM support
- Automatic yield calculation
- Material requirement planning
- Cost rollup from components

---

## 4. Quality Control System

### 4-Point Inspection System

| Defect Size | Points | Example |
|------------|--------|---------|
| < 3 inches | 1 | Minor loop |
| 3-6 inches | 2 | Small stain |
| 6-9 inches | 3 | Needle line |
| > 9 inches | 4 | Large hole |

### Grade Assignment
- **Grade A**: ≤20 points (Premium price)
- **Grade B**: 21-40 points (Standard price)
- **Grade C**: 41-60 points (Discounted)
- **Reject**: >60 points (Return/Reprocess)

### Photo Compression
- Original: 3 MB → Compressed: 50-80 KB (97% reduction)
- Enables fast upload on 2-4 Mbps factory WiFi

---

## 5. Sales, Dispatch & Finance

### GST Calculation Engine
Handles textile-specific HSN codes:
- HSN 6109 (T-shirts): 5%
- HSN 6110 (Sweaters): 5%
- HSN 6103 (Suits): 12%
- Default: 18%

Supports both intra-state (CGST+SGST) and inter-state (IGST) calculations.

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
- Indexed queries for fast filtering
- Cached dashboards for instant load
- Paginated reports for large datasets
- Lazy loading for drilldown navigation

---

## 7. Workflow Logging & Supervisor Data Entry

### Research Findings (2025)

**Critical Data Points for Knitwear:**
- Machine start/stop times with reason codes
- Production counts per hour by gauge
- Linking accuracy rates
- Washing yield (shrinkage %)
- Roll consumption tracking
- Operator assignment validation

### Tablet Interface Design for Supervisors

**Based on Industry Best Practices:**
- Large touch targets (glove-friendly)
- High contrast UI (bright factory lights)
- Minimal steps per entry
- Both "Real Time" and "Normal" entry modes

### Training Sequence (4-Week Rollout)

**Week 1: Shadow Mode**
- Supervisor uses tablet alongside paper
- No pressure, learn interface
- Parallel data entry

**Week 2: Digital Entry with Paper Backup**
- Primary entry on tablet
- Paper as backup
- Daily comparison checks

**Week 3: Digital Only**
- Paper eliminated
- Full supervisor responsibility
- Support on standby

**Week 4: Full Independence**
- Normal operations
- Regular check-ins
- Feedback collection

### Validation Checks
- Prevent impossible quantities (e.g., 14GG can't produce 3GG speeds)
- Flag unusual stoppage times
- Validate machine-operator pairing
- Alert on missed hourly entries

### Pain Points Solved

**Before (Paper-Based):**
- Lost job cards: 2-3 hours/day searching
- Misread handwriting: Data errors
- 24+ hour delay in visibility
- No photo documentation for QC
- Wrong task assignments

**After (Digital):**
- Barcode scanning: Instant retrieval
- Numeric entry: No handwriting
- Real-time sync: Instant visibility (when online)
- Photo capture: QC documentation
- Skill database: Proper assignment

### Key Metrics Logged

**Production Metrics:**
- Pieces per machine per hour
- Gauge-specific efficiency
- Linking accuracy rate
- Washing yield percentage
- QC pass rate by grade

**Supervisor Metrics:**
- Data entry timeliness
- Quantity accuracy
- Photo documentation rate
- Machine status update frequency