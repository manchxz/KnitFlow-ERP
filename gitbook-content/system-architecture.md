# How It Works

## Three Layers

The system has three parts that work together:

**Top Layer - What Users See**
- BOD Portal: Reports for management
- Supervisor Tablet: Workers enter production data
- Barcode Scanner: Quick roll tracking

**Middle Layer - The Brain**
- Inventory: Tracks all fabric rolls
- Production: Job scheduling and planning
- Quality: QC checks and photos
- Finance: GST and invoicing

**Bottom Layer - Data Storage**
- PostgreSQL: Main cloud database
- IndexedDB: Local storage on tablets (works offline)
- File Storage: Compressed photos

---

## The Offline-First Trick

**The Promise: Your data is safe even if WiFi dies for 3 days.**

Here's how:

1. Worker enters data on tablet
2. Saves immediately to local storage (IndexedDB)
3. Tries to sync to cloud
4. If offline: queues for later
5. When WiFi returns: auto-syncs everything

**Sync timing:**
- 1st retry: 1 second
- 2nd retry: 2 seconds
- 3rd retry: 4 seconds
- 4th retry: 8 seconds
- 5th retry: 16 seconds
- After that: every 30 seconds

This prevents overwhelming the server when connection is spotty.

---

## Photo Compression

Factory WiFi is slow (2-4 Mbps shared by everyone). Photos need to shrink:

- Original: 3 MB
- Resize to 800x600
- JPEG at 40% quality
- Final: 50-80 KB

**Result:** Upload goes from 60 seconds to 2 seconds.

---

## How a Roll Moves Through the Factory

```
INWARD → WAREHOUSE → ALLOCATED → PRODUCTION → QC → PACKED → DISPATCHED
   │          │           │            │       │       │          │
 Store      System      Planner     Operator  QC     Staff      Truck
 Clerk      Update      Schedules    Works   Check   Packs      Takes
                                        Inspects
```

Each step is tracked. Can't skip steps. Full history known.

---

## Why IndexedDB?

| Feature | LocalStorage | IndexedDB |
|---------|-------------|-----------|
| Storage | 5 MB limit | 50+ MB |
| Structure | Simple | Complex data |
| Async | No | Yes |
| Photos | No | Yes |
| Queries | No | Yes |

IndexedDB is the only browser storage that handles our volume.

---

## Performance

| Task | Target | Actual |
|------|--------|--------|
| Find a roll | Under 10ms | Yes |
| Schedule jobs | Under 50ms | Yes |
| Upload photo | Under 5 seconds | Yes |
| Sync after outage | Under 5 minutes | Yes |
| Users at once | 50+ | Yes |

---

Next: [What the modules do](core-modules.md)
