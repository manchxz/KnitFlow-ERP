# Offline-First Architecture

## The Problem

Factory WiFi is unreliable:
- Metal machines block signals
- Power fluctuations cause router reboots
- 50+ devices compete for bandwidth
- Power outages are common
- Rural factories may have no broadband

## The Promise

> "Your data is safe even if WiFi dies for 3 days"

## Architecture

```
User Action
    |
    v
IndexedDB (Local) ———→ PostgreSQL (Cloud)
    |                       |
    |←—— Sync when online —→|
    |
    +—— Queue when offline
            |
            +—— Exponential Backoff Retry
```

## How It Works

### Normal Operation (Online)
1. User enters data on tablet
2. Data saved immediately to IndexedDB (local)
3. App syncs to PostgreSQL (cloud) in real-time
4. Both copies are consistent

### Offline Operation
1. User enters data on tablet
2. Data saved immediately to IndexedDB (local)
3. Sync attempt fails (no connection)
4. Data queued with "pending" status
5. User continues working normally

### Reconnection
1. WiFi returns
2. App detects connectivity
3. Queued data syncs automatically
4. Conflicts resolved using offline_id
5. All data consistent

## Exponential Backoff

```
Attempt 1: Wait 1 second → Retry
Attempt 2: Wait 2 seconds → Retry
Attempt 3: Wait 4 seconds → Retry
Attempt 4: Wait 8 seconds → Retry
Attempt 5: Wait 16 seconds → Retry
Attempt 6+: Wait 30 seconds (max) → Retry
```

Prevents server overload while ensuring eventual consistency.

## The 3-Day Blackout Test

### Procedure
1. Disconnect WiFi
2. Operate factory for 3 days using only local data
3. Reconnect WiFi
4. Verify sync integrity

### Pass Criteria
- 100% data integrity (no lost records)
- <5 minute sync time
- Zero duplicates
- Conflict resolution works correctly

## Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Local Storage | IndexedDB (via Dexie.js) | Offline data persistence |
| Cloud Database | PostgreSQL (via Supabase) | Central data store |
| Sync Logic | Custom exponential backoff | Reliable data transfer |
| Conflict Resolution | offline_id + timestamp | Merge without duplication |

## Why IndexedDB?

| Feature | LocalStorage | IndexedDB |
|---------|-------------|-----------|
| Storage Limit | 5 MB | 50+ MB |
| Structured Data | No | Yes (indexes) |
| Async Operations | No | Yes |
| Binary Data | No | Yes (photos) |
| Query Capability | No | Yes (key ranges) |

IndexedDB is the only browser storage that handles the volume and variety of manufacturing data.

## Supervisor Tablet Design

The tablet app is designed for factory floor conditions:
- Large touch targets (gloves-friendly)
- High contrast UI (bright factory lights)
- Works offline (no WiFi dependency)
- Photo capture with auto-compression
- Barcode scanner integration

## Cost Comparison

| Approach | Setup Cost | Monthly Cost | Reliability |
|----------|-----------|-------------|-------------|
| IoT Sensors | Rs.30L+ (1000 machines) | Rs.50K maintenance | Fails without power |
| KnitFlow Offline-First | Rs.2L (tablets + scanners) | Rs.5K cloud | Works without power/WiFi |