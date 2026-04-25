/**
 * Hash Map (O(1)) Roll Inventory Lookup
 * 
 * Instant access to any roll in inventory regardless of size.
 * Replaces hours of manual searching with a single barcode scan.
 * 
 * Time Complexity:
 *   - Lookup by Roll ID: O(1)
 *   - Insert new roll: O(1)
 *   - Update status: O(1)
 *   - Filter by shade/GSM: O(n) — acceptable for reporting
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
  // Primary storage: Hash Map for O(1) lookup by rollId
  private rolls: Map<string, Roll> = new Map();

  // Secondary indexes for filtered queries
  private shadeIndex: Map<string, Set<string>> = new Map();
  private locationIndex: Map<string, Set<string>> = new Map();

  /**
   * Add a new roll to inventory — O(1)
   */
  addRoll(roll: Roll): void {
    this.rolls.set(roll.rollId, roll);
    
    // Maintain secondary indexes
    this.addToIndex(this.shadeIndex, roll.shade, roll.rollId);
    this.addToIndex(this.locationIndex, roll.location, roll.rollId);
  }

  /**
   * Lookup roll by barcode scan — O(1)
   * Replaces hours of manual searching
   */
  getRoll(rollId: string): Roll | undefined {
    return this.rolls.get(rollId);
  }

  /**
   * Update roll status — O(1)
   * e.g., INWARD → WAREHOUSE → ALLOCATED → PRODUCTION
   */
  updateStatus(rollId: string, newStatus: Roll['status']): boolean {
    const roll = this.rolls.get(rollId);
    if (!roll) return false;
    
    // Validate state transition
    if (!this.isValidTransition(roll.status, newStatus)) {
      throw new Error(`Invalid transition: ${roll.status} → ${newStatus}`);
    }
    
    roll.status = newStatus;
    return true;
  }

  /**
   * Get all rolls by shade — useful for order allocation
   */
  getByShade(shade: string): Roll[] {
    const ids = this.shadeIndex.get(shade);
    if (!ids) return [];
    return Array.from(ids).map(id => this.rolls.get(id)!).filter(Boolean);
  }

  /**
   * Get all rolls at a location
   */
  getByLocation(location: string): Roll[] {
    const ids = this.locationIndex.get(location);
    if (!ids) return [];
    return Array.from(ids).map(id => this.rolls.get(id)!).filter(Boolean);
  }

  /**
   * Total inventory count
   */
  getCount(): number {
    return this.rolls.size;
  }

  /**
   * Get inventory summary by status
   */
  getStatusSummary(): Record<string, number> {
    const summary: Record<string, number> = {};
    this.rolls.forEach(roll => {
      summary[roll.status] = (summary[roll.status] || 0) + 1;
    });
    return summary;
  }

  private addToIndex(index: Map<string, Set<string>>, key: string, rollId: string): void {
    if (!index.has(key)) index.set(key, new Set());
    index.get(key)!.add(rollId);
  }

  private isValidTransition(current: Roll['status'], next: Roll['status']): boolean {
    const validTransitions: Record<string, string[]> = {
      'INWARD': ['WAREHOUSE'],
      'WAREHOUSE': ['ALLOCATED'],
      'ALLOCATED': ['PRODUCTION'],
      'PRODUCTION': ['QC'],
      'QC': ['PACKED', 'PRODUCTION'],  // QC fail → reprocess
      'PACKED': ['DISPATCHED'],
      'DISPATCHED': []
    };
    return validTransitions[current]?.includes(next) ?? false;
  }
}

// ===== EXAMPLE: Barcode Scan =====

const inventory = new InventoryManager();

// Store clerk scans 10 new rolls arriving
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

// Later: Supervisor scans barcode to find roll
const roll = inventory.getRoll('R-2025-1005');
console.log(`Found: ${roll?.shade} ${roll?.gsm}GSM at ${roll?.location}`);
// Output: Found: Navy Blue 180GSM at WH-A-Row3-Shelf1

// Total inventory
console.log(`Total rolls: ${inventory.getCount()}`);
// Output: Total rolls: 10

// Status summary
console.log(inventory.getStatusSummary());
// Output: { INWARD: 10 }