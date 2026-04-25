# System Architecture

## Three-Layer Architecture

KnitFlow uses a clean three-layer architecture separating concerns and enabling offline-first operation:

```
+--------------------------------------------------+
|                  PRESENTATION LAYER               |
|  +-------------+  +----------------+  +---------+ |
|  | BOD Portal  |  | Supervisor     |  | Barcode | |
|  | (Reports)   |  | Tablet         |  | Scanner | |
|  +-------------+  +----------------+  +---------+ |
+--------------------------+-----------------------+
                           |
+--------------------------v-----------------------+
|               BUSINESS LOGIC LAYER                |
|  +----------------+  +------------------+        |
|  | Inventory      |  | Production       |        |
|  | Service        |  | Service          |        |
|  +----------------+  +------------------+        |
|  +----------------+  +------------------+        |
|  | Quality        |  | Finance          |        |
|  | Service        |  | Service          |        |
|  +----------------+  +------------------+        |
+--------------------------+-----------------------+
                           |
+--------------------------v-----------------------+
|                  DATA ACCESS LAYER                |
|  +----------------+  +------------------+        |
|  | PostgreSQL     |  | IndexedDB        |        |
|  | (Cloud)        |  | (Local/Offline)  |        |
|  +----------------+  +------------------+        |
|  +----------------+                               |
|  | File Storage   |                               |
|  | (Compressed)   |                               |
|  +----------------+                               |
+--------------------------------------------------+
```

## Layer Responsibilities

### Presentation Layer
- **BOD Portal**: Executive dashboards, financial reports, analytics drilldown
- **Supervisor Tablet**: Production data entry, job card updates, QC checks
- **Barcode Scanner App**: Quick roll tracking, inventory movements

### Business Logic Layer
- **Inventory Service**: Roll tracking, stock management, location mapping
- **Production Service**: Job cards, priority scheduling, machine allocation
- **Quality Service**: 4-point inspection, defect tracking, photo compression
- **Finance Service**: GST calculation, invoicing, cost tracking

### Data Access Layer
- **PostgreSQL**: Primary cloud database for persistent storage
- **IndexedDB**: Local browser storage for offline operation
- **File Storage**: Compressed photo storage for QC evidence

## The Offline-First Promise

> "Your data is safe even if WiFi dies for 3 days"

### How It Works

```
1. User enters data on tablet
2. Data saved immediately to IndexedDB (local)
3. App attempts sync to PostgreSQL (cloud)
4. If offline: data queued for later sync
5. When WiFi returns: queued data syncs automatically
```

### Sync Pipeline

```
User Action → IndexedDB (instant) → Sync Attempt
                                    ↓
                            Online? → PostgreSQL
                            Offline? → Queue + Retry
                                          ↓
                                    Exponential Backoff
                                    (1s → 2s → 4s → ... → 30s)
```

## Data Flow: Roll to Dispatch

```
INWARD → WAREHOUSE → ALLOCATION → PRODUCTION → QC → PACKING → INVOICE → DISPATCH
   ↓         ↓           ↓            ↓        ↓      ↓         ↓          ↓
Store     System      Planner     Operator  Inspector Staff   System    Clerk
Clerk     Auto        Manual      Manual    Manual    Manual  Auto      Manual
```

## Database Schema

### Core Tables
- `fabric_rolls` — Roll inventory with state tracking
- `job_cards` — Production jobs with priority
- `bom_trees` — Bill of Materials hierarchies
- `qc_records` — Quality inspection results
- `invoices` — Sales and GST calculations
- `sync_queue` — Offline sync pending records

### Key Indexes
- `roll_id` (PRIMARY KEY)
- `shade, gsm` (composite for filtering)
- `status` (state-based queries)
- `location` (warehouse queries)
- `created_at` (time-range queries)

## Performance Targets

| Metric | Target |
|--------|--------|
| Roll lookup | <10ms (O(1)) |
| Job scheduling | <50ms (O(log n)) |
| Photo upload | <5s on 2Mbps |
| Sync recovery | <5 min after 3-day blackout |
| Concurrent users | 50+ |
| Response time | <2 seconds |

## Security

- Role-based access control (Supervisor, QC, Clerk, Manager, Admin)
- Encrypted local storage (IndexedDB)
- HTTPS for all cloud sync
- Photo compression before upload (privacy + bandwidth)