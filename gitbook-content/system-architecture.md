# System Architecture

## Three-Layer Design

KnitFlow uses a clean three-layer architecture separating concerns and enabling offline-first operation:

```
┌─────────────────────────────────────────────────────────┐
│              PRESENTATION LAYER                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ BOD Portal   │  │ Supervisor   │  │ Barcode      │  │
│  │ (Reports)    │  │ Tablet       │  │ Scanner      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└──────────────────────────┬────────────────────────────┘
                           │
┌──────────────────────────v────────────────────────────┐
│              BUSINESS LOGIC LAYER                     │
│  ┌────────────────┐  ┌──────────────────┐           │
│  │ Inventory      │  │ Production       │           │
│  │ Service        │  │ Service          │           │
│  └────────────────┘  └──────────────────┘           │
│  ┌────────────────┐  ┌──────────────────┐           │
│  │ Quality        │  │ Finance          │           │
│  │ Service        │  │ Service          │           │
│  └────────────────┘  └──────────────────┘           │
└──────────────────────────┬────────────────────────────┘
                           │
┌──────────────────────────v────────────────────────────┐
│                DATA ACCESS LAYER                     │
│  ┌────────────────┐  ┌──────────────────┐           │
│  │ PostgreSQL     │  │ IndexedDB        │           │
│  │ (Cloud)        │  │ (Local/Offline)  │           │
│  └────────────────┘  └──────────────────┘           │
│  ┌────────────────┐                                 │
│  │ File Storage   │                                 │
│  │ (Compressed)   │                                 │
│  └────────────────┘                                 │
└───────────────────────────────────────────────────────┘
```

---

## Layer Responsibilities

### Presentation Layer

| Component | Purpose | Users |
|-----------|---------|-------|
| **BOD Portal** | Executive dashboards, financial reports, analytics drilldown | Directors, Managers |
| **Supervisor Tablet** | Production data entry, job card updates, QC checks | Floor Supervisors |
| **Barcode Scanner App** | Quick roll tracking, inventory movements | Store Clerks |

### Business Logic Layer

| Service | Responsibility |
|---------|---------------|
| **Inventory Service** | Roll tracking, stock management, location mapping |
| **Production Service** | Job cards, priority scheduling, machine allocation |
| **Quality Service** | 4-point inspection, defect tracking, photo compression |
| **Finance Service** | GST calculation, invoicing, cost tracking |

### Data Access Layer

| Storage | Type | Purpose |
|---------|------|---------|
| **PostgreSQL** | Cloud Database | Primary persistent storage |
| **IndexedDB** | Local Browser DB | Offline operation, instant access |
| **File Storage** | Cloud Object Store | Compressed QC photos |

---

## The Offline-First Promise

> **"Your data is safe even if WiFi dies for 3 days"**

### How It Works

```
User enters data on tablet
         │
         ▼
┌─────────────────┐
│  IndexedDB      │ ←── Saved instantly (local)
│  (Local)        │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐   ┌──────────┐
│Online?│   │ Offline? │
└───┬───┘   └────┬─────┘
    │              │
    ▼              ▼
┌─────────┐   ┌──────────┐
│PostgreSQL│   │ Queue    │
│(Cloud)   │   │ + Retry  │
└─────────┘   └────┬─────┘
                   │
              ┌────┴────┐
              ▼
    ┌────────────────────┐
    │ Exponential Backoff│
    │ 1s → 2s → 4s → 30s │
    └────────────────────┘
```

### Sync Pipeline

| Step | Action | Time |
|------|--------|------|
| 1 | User enters data | Instant |
| 2 | Save to IndexedDB | <10ms |
| 3 | Attempt cloud sync | <500ms |
| 4 | If offline, queue with retry | Automatic |
| 5 | When WiFi returns, auto-sync | <5 min for 3 days data |

---

## Photo Compression Pipeline

Factory WiFi is slow (2-4 Mbps shared by 20+ devices). Photos must be compressed before upload:

```
Original Photo (3 MB)
        │
        ▼
┌──────────────────┐
│ Resize 800x600   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ JPEG 40% quality │
└────────┬─────────┘
         │
         ▼
Final Photo (50-80 KB) ←── 97% size reduction
```

**Result**: Upload time reduced from 60 seconds to 2 seconds on 2Mbps WiFi.

---

## Data Flow: Roll to Dispatch

```
┌────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌────┐   ┌────────┐   ┌────────┐   ┌──────────┐
│ INWARD │ → │ WAREHOUSE│ → │ALLOCATION│ → │PRODUCTION│ → │ QC │ → │PACKING │ → │ INVOICE│ → │ DISPATCH │
└────┬───┘   └────┬─────┘   └────┬─────┘   └────┬─────┘   └─┬──┘   └───┬────┘   └───┬────┘   └────┬─────┘
     │            │              │              │            │          │            │            │
Store│         System        Planner      Operator    Inspector   Staff       System       Clerk
Clerk│           Auto           Manual       Manual       Manual     Manual       Auto        Manual
```

### Roll State Machine

```
INWARD → WAREHOUSE → ALLOCATED → PRODUCTION → QC → PACKED → DISPATCHED
  │          │           │            │       │       │          │
  ▼          ▼           ▼            ▼       ▼       ▼          ▼
New      Available   Reserved    In Progress  Check  Ready     Shipped
Stock    for Use     for Order   on Machine        for Ship
```

Each transition is validated—no skipping stages, no invalid operations.

---

## Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| Roll lookup | <10ms (O(1)) | ✅ Achieved |
| Job scheduling | <50ms (O(log n)) | ✅ Achieved |
| Photo upload | <5s on 2Mbps | ✅ Achieved |
| Sync recovery | <5 min after 3-day blackout | ✅ Achieved |
| Concurrent users | 50+ | ✅ Tested |
| Response time | <2 seconds | ✅ Achieved |

---

## Security

- **Role-based access control**: Supervisor, QC, Clerk, Manager, Admin
- **Encrypted local storage**: IndexedDB with encryption
- **HTTPS**: All cloud sync over TLS
- **Photo privacy**: Compression + local processing before upload

---

## Next: Core Modules

Learn about the [6 Core Modules](core-modules.md) that make up KnitFlow ERP.
