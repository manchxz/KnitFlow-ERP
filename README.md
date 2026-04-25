# KnitFlow ERP

A simple ERP system for textile factories. Built because paper tracking was killing our productivity.

## Why I Built This

I run a 40-machine textile factory in Bangalore. We were losing 20-30% of productive time to:
- Searching for fabric rolls (2 hours daily)
- Paper logs getting lost or misread
- No idea what was happening on the factory floor until end of day
- Manual GST calculations with errors

Tried Industry 4.0 IoT sensors. They cost Rs.30,000 per machine and failed within months due to dust, heat, and power fluctuations.

So I built this instead. Total cost: Rs.2 lakhs (tablets + barcode scanners).

## What It Does

### 1. Inventory Tracking (Hash Map - O(1))
Scan a barcode, instantly find any roll in 10,000+ inventory. No more searching for 2 hours.

### 2. Job Scheduling (Priority Queue)
20 orders, 8 machines - which one first? The system prioritizes by deadline automatically.

### 3. Works Offline
Factory WiFi dies every other day. This saves data locally and syncs when WiFi returns. Tested for 3 days without internet - 100% data integrity.

## Results After 6 Months

- 15% less production downtime
- 8% more output
- Photos upload in 2 seconds instead of 60 (97% compression)
- Zero data loss during WiFi outages

## Tech Stuff

- React + TypeScript frontend
- Flask backend
- PostgreSQL for cloud
- IndexedDB for offline storage

## Files

- `algorithms/` - Core logic (job scheduling, inventory lookup)
- `tests/` - Unit tests (all passing)
- `docs/` - Documentation
- `gitbook-content/` - Ready to publish as a book

## Try It

```bash
git clone https://github.com/manchxz/KnitFlow-ERP.git
cd KnitFlow-ERP
npm install
npm test
```

## GitHub

[github.com/manchxz/KnitFlow-ERP](https://github.com/manchxz/KnitFlow-ERP)

## About Me

Built this at Amithraj Apparels, Bangalore. 35,000-50,000 units/month. I manage the machines, work with supervisors, and know that software must work when WiFi doesn't.

Contact: contact@mahatomanish.com

MIT License - free to use.
