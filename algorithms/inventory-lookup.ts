/**
 * Inventory Lookup - Hash Map for O(1) roll tracking
 *
 * Problem: Finding a roll in 10,000+ inventory takes hours
 * Solution: Hash map gives instant lookup by roll ID
 */

interface Roll {
  rollId: string;        // e.g., "R-2025-01234"
  fabric: string;        // e.g., "100% Cotton"
  gsm: number;           // e.g., 180
  shade: string;         // e.g., "Navy Blue"
  width: number;         // e.g., 60 inches
  weight: number;        // kg
  location: string;      // e.g., "WH-A-Row3-Shelf2"
  status: 'INWARD' | 'WAREHOUSE' | 'ALLOCATED' | 'PRODUCTION' | 'QC' | 'PACKED' | 'DISPATCHED';
  inwardDate: Date;
  quality: 'A' | 'B' | 'C';
}

class InventoryManager {
  // Main storage - rollId -> Roll data
  private rolls: Map<string, Roll> = new Map();

  // Quick lookup by shade and location
  private shadeIndex: Map<string, Set<string>> = new Map();
  private locationIndex: Map<string, Set<string>> = new Map();

  // Add new roll to inventory
  addRoll(roll: Roll): void {
    this.rolls.set(roll.rollId, roll);

    // Update indexes
    this.addToIndex(this.shadeIndex, roll.shade, roll.rollId);
    this.addToIndex(this.locationIndex, roll.location, roll.rollId);
  }

  // Find roll by barcode scan - O(1)
  getRoll(rollId: string): Roll | undefined {
    return this.rolls.get(rollId);
  }

  // Update roll status
  updateStatus(rollId: string, newStatus: Roll['status']): boolean {
    const roll = this.rolls.get(rollId);
    if (!roll) return false;

    // Validate state change
    if (!this.isValidTransition(roll.status, newStatus)) {
      throw new Error(`Can't go from ${roll.status} to ${newStatus}`);
    }

    roll.status = newStatus;
    return true;
  }

  // Get all rolls of a shade
  getByShade(shade: string): Roll[] {
    const ids = this.shadeIndex.get(shade);
    if (!ids) return [];
    return Array.from(ids).map(id => this.rolls.get(id)!).filter(Boolean);
  }

  // Get all rolls at a location
  getByLocation(location: string): Roll[] {
    const ids = this.locationIndex.get(location);
    if (!ids) return [];
    return Array.from(ids).map(id => this.rolls.get(id)!).filter(Boolean);
  }

  // Total rolls in inventory
  getCount(): number {
    return this.rolls.size;
  }

  // Summary by status
  getStatusSummary(): Record<string, number> {
    const summary: Record<string, number> = {};
    this.rolls.forEach(roll => {
      summary[roll.status] = (summary[roll.status] || 0) + 1;
    });
    return summary;
  }

  // Helper to update indexes
  private addToIndex(index: Map<string, Set<string>>, key: string, rollId: string): void {
    if (!index.has(key)) index.set(key, new Set());
    index.get(key)!.add(rollId);
  }

  // Valid state transitions
  private isValidTransition(current: Roll['status'], next: Roll['status']): boolean {
    const validTransitions: Record<string, string[]> = {
      'INWARD': ['WAREHOUSE'],
      'WAREHOUSE': ['ALLOCATED'],
      'ALLOCATED': ['PRODUCTION'],
      'PRODUCTION': ['QC'],
      'QC': ['PACKED', 'PRODUCTION'],  // QC fail -> reprocess
      'PACKED': ['DISPATCHED'],
      'DISPATCHED': []
    };
    return validTransitions[current]?.includes(next) ?? false;
  }
}

// Example usage
const inventory = new InventoryManager();

// Store clerk scans 10 new rolls
for (let i = 0; i < 10; i++) {
  inventory.addRoll({
    rollId: `R-2025-${1000 + i}`,
    fabric: '100% Cotton',
    gsm: 180,
    shade: 'Navy Blue',
    width: 60,
    weight: 25 + Math.random() * 5,
    location: `WH-A-Row${i % 3 + 1}-Shelf${i % 5 + 1}`,
    status: 'INWARD',
    inwardDate: new Date(),
    quality: 'A'
  });
}

// Supervisor scans to find roll
const roll = inventory.getRoll('R-2025-1005');
console.log(`Found: ${roll?.shade} ${roll?.gsm}GSM at ${roll?.location}`);
// Output: Found: Navy Blue 180GSM at WH-A-Row3-Shelf1

console.log(`Total rolls: ${inventory.getCount()}`);
// Output: Total rolls: 10

export { InventoryManager, Roll };
