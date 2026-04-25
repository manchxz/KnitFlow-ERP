# KnitFlow ERP

> A human-first manufacturing ERP system for textile factories. Digitize decisions, not machines.

[![GitBook](https://img.shields.io/badge/Technical_Book-GitBook-blue)](https://knitflow.gitbook.io)
[![License](https://img.shields.io/badge/license-MIT-green)]()

## The Problem

Textile factories in India lose **20-30% of productive time** to:
- Paper-based tracking that delays data by 24+ hours
- Lost or misread handwritten production logs
- No real-time visibility into machine status or inventory
- Vendor delivery uncertainty causing stockouts or overstock
- Manual GST calculations prone to errors

Traditional Industry 4.0 solutions require **Rs.30,000+ per machine** for IoT sensors, industrial electricians, and fail in harsh factory environments (dust, vibration, power fluctuations).

## The Solution

KnitFlow ERP takes a different approach — **"Digitize the Decision, Not the Machine"**:

| Traditional IoT | KnitFlow ERP |
|----------------|--------------|
| Rs.30,000+ per machine sensors | Rs.5,000 barcode scanners |
| Industrial electricians needed | Supervisor tablets (Rs.12,000) |
| Fails in harsh environments | Works offline during WiFi outages |
| Workers feel "watched" | Workers empowered with data |
| 12+ month implementation | 6 month implementation |

## Key Results

- **15% reduction** in production downtime through real-time monitoring
- **8% increase** in overall output through priority-based job scheduling
- **97% photo compression** enabling fast uploads on 2-4 Mbps factory WiFi
- **100% data integrity** during 3-day WiFi blackout scenarios (offline-first architecture)
- **O(1) roll lookups** regardless of inventory size (10,000+ rolls)

## System Architecture

```
Presentation Layer          Business Logic Layer         Data Access Layer
    |                               |                             |
    |  BOD Portal                   |  Inventory Service          |  PostgreSQL (Cloud)
    |  Supervisor Tablet            |  Production Service         |  IndexedDB (Local)
    |  Barcode Scanner App          |  Quality Service            |  File Storage
    |                               |  Finance Service            |
    +-------------------------------+-----------------------------+
                                    |
                          Offline Sync Pipeline
                          (Exponential Backoff)
```

### 3-Layer Design
- **Presentation**: BOD Portal (executive dashboards), Supervisor Tablet (production entry), Barcode Scanner (roll tracking)
- **Business Logic**: Inventory, Production Planning, Quality Control, Sales & Finance services
- **Data Access**: PostgreSQL (cloud), IndexedDB (local/offline), File Storage (compressed photos)

## Core Modules

### 1. Inventory & Traceability (Hash Map - O(1))
Barcode-based roll tracking with O(1) lookup for 10,000+ rolls using Hash Maps. Every roll transitions through a state machine: `INWARD → WAREHOUSE → ALLOCATED → PRODUCTION → QC → PACKED → DISPATCHED`.

### 2. Production Planning (Priority Queue - O(log n))
Min-Heap based job scheduling ensuring critical orders meet deadlines. Jobs prioritized by deadline, customer importance, and machine availability.

### 3. Bill of Materials (Tree Structure)
Hierarchical BOM representation with DFS traversal for accurate material yield calculations (91% typical yield across 5 processing stages).

### 4. Quality Control (4-Point System)
Industry-standard 4-point inspection: defects scored 1-4 points by size, auto-assigned grades (A: ≤20pts, B: 21-40, C: 41-60, Reject: >60).

### 5. Sales, Dispatch & Finance
- GST calculation engine for textile-specific HSN codes (5%, 12%, 18% slabs)
- Cost-per-kg tracking with variance analysis
- E-Way Bill integration
- P&L and balance sheet generation

### 6. Analytics & Reporting (10-Level Drilldown)
```
Entity → Division → Plant → Department → Machine → Operator → Order → Batch → Roll → Transaction
```
6 report types: Stock, Production, Quality, Cost, Sales, Financial.

## Technical Highlights

### Data Structures & Algorithms

| Feature | Data Structure | Complexity | Why |
|---------|---------------|------------|-----|
| Roll Lookup | Hash Map | O(1) | Instant access regardless of scale |
| Job Scheduling | Priority Queue (Min-Heap) | O(log n) | Critical orders first |
| BOM Traversal | Tree (DFS/BFS) | O(n) | Accurate yield calculation |
| Production Log | Queue (FIFO) | O(1) | First-in-first-out tracking |
| QC Defects | Array | O(n) | Simple sequential list |
| Navigation | Graph | O(V+E) | Machine routing optimization |

### Offline-First Architecture

Factory WiFi is unreliable. KnitFlow works offline using IndexedDB local storage with exponential backoff sync to PostgreSQL cloud database.

```
User enters data → Saved to IndexedDB (instant) → Sync attempted → 
If offline: queued with retry → When WiFi returns: auto-sync
```

**Sync retry delays**: 1s → 2s → 4s → 8s → 16s → 30s (max)

### Photo Compression Pipeline

Factory WiFi is slow (2-4 Mbps shared by 20 devices). Photos compressed from 3MB to 50-80KB:

```
Original (3 MB) → Resize 800x600 → JPEG 40% quality → Final (50-80 KB)
```

### GST Calculation Engine

Handles intra-state (CGST+SGST) and inter-state (IGST) calculations with HSN code lookup:

```typescript
// Example: Sweater order worth Rs.100,000
// HSN 6110 → 5% GST
// Taxable Value: 95,238.10 | CGST: 2,380.95 | SGST: 2,380.95
```

## Testing Strategy

### The 3-Day Blackout Test
1. Disconnect WiFi
2. Operate for 3 days using only local data
3. Reconnect WiFi
4. Verify: 100% data integrity, <5 min sync, zero duplicates

### The Supervisor Shadow Test
1. Supervisor uses both tablet and paper for 5 days
2. Compare counts at end of each day
3. Acceptance: <2% variance

### Load Testing
- 50 concurrent users
- 10,000 rolls in inventory
- 500 job cards/day
- Target: <2 second response time

## Philosophy

> **"Digitize the Decision, Not the Machine"**

KnitFlow recognizes that Indian textile manufacturing operates in resource-constrained environments. Rather than replacing workers with expensive automation, it empowers them with affordable digital tools that work reliably in harsh conditions.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js, TypeScript |
| Backend | Flask, Python |
| Database | PostgreSQL (cloud), IndexedDB (local) |
| Cloud | Azure, Vercel |
| Data Viz | Power BI, Streamlit |
| Sync | Dexie.js, Supabase |

## Documentation

- [Technical Book (GitBook)](https://knitflow.gitbook.io) — Comprehensive technical guide
- [Architecture Overview](docs/ARCHITECTURE.md)
- [Core Modules](docs/MODULES.md)
- [Algorithms & Data Structures](docs/ALGORITHMS.md)
- [Offline-First Design](docs/OFFLINE_FIRST.md)

## About

Built at **Amithraj Apparels**, a 40-machine flat-knit textile manufacturing unit in Bangalore producing 35,000–50,000 units/month. Designed from the factory floor up by someone who manages the machines, negotiates with vendors, and understands that software must work when the WiFi doesn't.

---

*Version 1.0 | April 2025*