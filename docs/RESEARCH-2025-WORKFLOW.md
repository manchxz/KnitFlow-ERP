# Research: Knitwear Manufacturing ERP Workflows (2025)

## Sources
- KnitOne ERP 2026 Release Notes (January, February)
- MySweaterFactory Production Process Guide
- iFactory Digital Work Orders Research
- Knitwear.io Manufacturing Process Documentation

---

## Knitwear-Specific Production Workflow

Unlike generic garment manufacturing, knitwear has unique stages:

### Standard Knitwear Flow
```
Yarn → Knitting → Linking → Washing → QC → Packing → Dispatch
```

### Stage Details

**1. Yarn Preparation**
- Match color numbers precisely
- Verify yarn quality, twist, count
- Check batch consistency before knitting
- Yarn lock reports for traceability

**2. Knitting (Flat-Bed Machines)**
- Computerized flat knitting machines
- Gauge ranges: 3GG (chunky) to 14GG (fine)
- Machine assignment based on gauge requirements
- Programs loaded per design specification

**3. Linking/Assembly**
- Join body, sleeves, ribs
- Linking accuracy critical for V-necks
- Skilled handwork even in modern factories
- Loop-by-loop joining (not sewing with thread)

**4. Washing & Finishing**
- Pre-shrinking treatment
- Softening and shape retention
- Fiber-specific treatments:
  - Wool: Anti-pilling enzyme wash
  - Cotton: Controlled relaxation finishing

**5. Quality Control**
- 4-point inspection system
- Grade assignment (A/B/C/Reject)
- Photo documentation
- Defect logging by type

**6. Packing & Shipping**
- Labeling
- Export documentation
- Final dispatch

---

## Digital Work Order Benefits (2025 Research)

### Impact of Going Digital
| Metric | Improvement |
|--------|-------------|
| Workflow errors | -70% |
| Task completion speed | +45% |
| Lost job cards | Eliminated |
| Wrong task assignments | Reduced significantly |
| Time saved | 2-3 hours/day recovered |

### Key Features Needed
1. Real-time status tracking
2. Digital job cards (no paper)
3. Machine assignment validation
4. Operator skill matching
5. Progress logging at each stage

---

## WIP (Work-in-Progress) Tracking

### Day-Specific Visibility
Modern ERPs provide:
- Daily workload assessment
- Stage-specific accumulation alerts
- Bottleneck identification
- Production quantity editing controls

### Critical for Knitwear
- Linking stage often becomes bottleneck
- Washing capacity limits throughput
- Different gauges have different speeds
- 3GG (fast) vs 14GG (slow) production times

---

## Supervisor Data Entry Training

### Best Practices from Industry

**1. Start Small (Pilot Approach)**
- Begin with single production line
- Test with one shift
- Get feedback before full rollout
- Involve supervisors in design

**2. Tablet Interface Design**
- Large touch targets (glove-friendly)
- High contrast (bright factory lights)
- Minimal steps per entry
- Both "Real Time" and "Normal" modes

**3. Training Sequence**
- Week 1: Shadow mode (parallel with paper)
- Week 2: Digital entry, paper backup
- Week 3: Digital only
- Week 4: Full independence

**4. Critical Data Points**
- Machine start/stop times
- Production counts per hour
- Defect counts by type
- Roll consumption
- Operator assignment

**5. Validation Checks**
- Prevent impossible quantities
- Flag unusual stoppage times
- Validate machine-operator pairing
- Alert on missed entries

---

## Manual Entry Pain Points (Research Findings)

### Current Problems
1. **Lost job cards** - 2-3 hours/day searching
2. **Misread handwriting** - Errors in quantity recording
3. **Delayed data** - 24+ hour lag in visibility
4. **No photos** - QC issues hard to document
5. **Wrong task assignment** - Skill mismatch not caught

### Digital Solutions
1. Barcode scanning for instant job card retrieval
2. Numeric entry (no handwriting)
3. Real-time sync (when online)
4. Photo capture with compression
5. Operator skill database

---

## Logging Requirements for Knitwear

### Machine-Level Logging
- Start time, stop time
- Reason for stoppage (breakdown, material, quality)
- Efficiency percentage
- Gauge setting
- Program number

### Operator-Level Logging
- Login/logout times
- Machines operated
- Production quantity
- Defects produced
- Skill level

### Roll-Level Logging
- Roll ID consumption
- Yardage used per garment
- Wastage tracking
- Location tracking

### Order-Level Logging
- Stage transitions with timestamps
- Time spent at each stage
- Bottleneck identification
- Completion percentage

---

## Implementation Insights

### What Works
1. **Early supervisor involvement** - They design the workflow
2. **Pilot programs** - Test before scaling
3. **Offline capability** - Factory WiFi is unreliable
4. **Simple interfaces** - Complex screens don't work on floor
5. **Gradual rollout** - One module at a time

### What Doesn't Work
1. **Mandating without training** - Resistance and errors
2. **Complex forms** - Supervisors skip fields
3. **Real-time only** - Offline periods break trust
4. **IoT sensors** - Fail in harsh environments
5. **Paper + digital** - Doubles work, adoption fails

---

## Key Metrics to Track

### Production Metrics
- Pieces per machine per hour
- Linking accuracy rate
- Washing yield (shrinkage %)
- QC pass rate by grade
- On-time delivery %

### Supervisor Metrics
- Data entry timeliness
- Accuracy of quantities
- Photo documentation rate
- Machine status updates

### System Metrics
- Sync success rate
- Offline operation duration
- Data integrity after outages
- User adoption percentage

---

*Research compiled April 2025*
*Sources: KnitOne, MySweaterFactory, iFactory, Knitwear.io*
