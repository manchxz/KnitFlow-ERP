/**
 * Tests for Inventory Manager
 *
 * Tests the hash map for instant roll lookup
 */

interface Roll {
  rollId: string;
  fabric: string;
  gsm: number;
  shade: string;
  width: number;
  weight: number;
  location: string;
  status: 'INWARD' | 'WAREHOUSE' | 'ALLOCATED' | 'PRODUCTION' | 'QC' | 'PACKED' | 'DISPATCHED';
  inwardDate: Date;
  quality: 'A' | 'B' | 'C';
}

class InventoryManager {
  private rolls: Map<string, Roll> = new Map();
  private shadeIndex: Map<string, Set<string>> = new Map();
  private locationIndex: Map<string, Set<string>> = new Map();

  addRoll(roll: Roll): void {
    this.rolls.set(roll.rollId, roll);
    this.addToIndex(this.shadeIndex, roll.shade, roll.rollId);
    this.addToIndex(this.locationIndex, roll.location, roll.rollId);
  }

  getRoll(rollId: string): Roll | undefined {
    return this.rolls.get(rollId);
  }

  updateStatus(rollId: string, newStatus: Roll['status']): boolean {
    const roll = this.rolls.get(rollId);
    if (!roll) return false;

    if (!this.isValidTransition(roll.status, newStatus)) {
      throw new Error(`Invalid transition: ${roll.status} → ${newStatus}`);
    }

    roll.status = newStatus;
    return true;
  }

  getByShade(shade: string): Roll[] {
    const ids = this.shadeIndex.get(shade);
    if (!ids) return [];
    return Array.from(ids).map(id => this.rolls.get(id)!).filter(Boolean);
  }

  getByLocation(location: string): Roll[] {
    const ids = this.locationIndex.get(location);
    if (!ids) return [];
    return Array.from(ids).map(id => this.rolls.get(id)!).filter(Boolean);
  }

  getCount(): number {
    return this.rolls.size;
  }

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
      'QC': ['PACKED', 'PRODUCTION'],
      'PACKED': ['DISPATCHED'],
      'DISPATCHED': []
    };
    return validTransitions[current]?.includes(next) ?? false;
  }
}

describe('InventoryManager', () => {
  let inventory: InventoryManager;

  beforeEach(() => {
    inventory = new InventoryManager();
  });

  describe('Adding rolls', () => {
    it('adds a roll to inventory', () => {
      const roll = createRoll('R-2025-0001');
      inventory.addRoll(roll);

      expect(inventory.getCount()).toBe(1);
    });

    it('updates count with multiple rolls', () => {
      for (let i = 1; i <= 10; i++) {
        inventory.addRoll(createRoll(`R-2025-${1000 + i}`));
      }

      expect(inventory.getCount()).toBe(10);
    });
  });

  describe('Finding rolls', () => {
    it('finds roll by ID instantly', () => {
      const roll = createRoll('R-2025-0001', 'Navy Blue', 'WH-A-Row1-Shelf1');
      inventory.addRoll(roll);

      const found = inventory.getRoll('R-2025-0001');
      expect(found?.rollId).toBe('R-2025-0001');
      expect(found?.shade).toBe('Navy Blue');
    });

    it('returns undefined for missing roll', () => {
      expect(inventory.getRoll('R-2025-9999')).toBeUndefined();
    });
  });

  describe('Status updates', () => {
    it('updates roll status', () => {
      const roll = createRoll('R-2025-0001', 'Navy Blue', 'WH-A-Row1-Shelf1', 'INWARD');
      inventory.addRoll(roll);

      inventory.updateStatus('R-2025-0001', 'WAREHOUSE');
      expect(inventory.getRoll('R-2025-0001')?.status).toBe('WAREHOUSE');
    });

    it('rejects invalid status changes', () => {
      const roll = createRoll('R-2025-0001', 'Navy Blue', 'WH-A-Row1-Shelf1', 'INWARD');
      inventory.addRoll(roll);

      expect(() => {
        inventory.updateStatus('R-2025-0001', 'PRODUCTION');
      }).toThrow('Invalid transition');
    });

    it('returns false for non-existent roll', () => {
      expect(inventory.updateStatus('R-2025-9999', 'WAREHOUSE')).toBe(false);
    });
  });

  describe('Finding by shade', () => {
    it('returns rolls by shade', () => {
      inventory.addRoll(createRoll('R-2025-0001', 'Navy Blue'));
      inventory.addRoll(createRoll('R-2025-0002', 'Navy Blue'));
      inventory.addRoll(createRoll('R-2025-0003', 'Red'));

      const navyRolls = inventory.getByShade('Navy Blue');
      expect(navyRolls.length).toBe(2);
    });

    it('returns empty array for unknown shade', () => {
      expect(inventory.getByShade('Unknown')).toEqual([]);
    });
  });

  describe('Finding by location', () => {
    it('returns rolls by location', () => {
      inventory.addRoll(createRoll('R-2025-0001', 'Navy Blue', 'WH-A-Row1-Shelf1'));
      inventory.addRoll(createRoll('R-2025-0002', 'Red', 'WH-A-Row1-Shelf1'));
      inventory.addRoll(createRoll('R-2025-0003', 'Navy Blue', 'WH-B-Row2-Shelf3'));

      const row1Rolls = inventory.getByLocation('WH-A-Row1-Shelf1');
      expect(row1Rolls.length).toBe(2);
    });
  });

  describe('Status summary', () => {
    it('returns count by status', () => {
      inventory.addRoll(createRoll('R-2025-0001', 'Navy Blue', 'WH-A-Row1', 'INWARD'));
      inventory.addRoll(createRoll('R-2025-0002', 'Red', 'WH-A-Row2', 'INWARD'));
      inventory.addRoll(createRoll('R-2025-0003', 'Blue', 'WH-B-Row1', 'WAREHOUSE'));

      const summary = inventory.getStatusSummary();
      expect(summary.INWARD).toBe(2);
      expect(summary.WAREHOUSE).toBe(1);
    });
  });

  describe('Real scenario - Barcode scan', () => {
    it('finds roll quickly after barcode scan', () => {
      // Store clerk scans 10 rolls
      for (let i = 0; i < 10; i++) {
        inventory.addRoll(createRoll(
          `R-2025-${1000 + i}`,
          'Navy Blue',
          `WH-A-Row${i % 3 + 1}-Shelf${i % 5 + 1}`
        ));
      }

      // Supervisor scans to find roll
      const roll = inventory.getRoll('R-2025-1005');
      expect(roll?.shade).toBe('Navy Blue');
      expect(roll?.location).toBe('WH-A-Row3-Shelf1');
    });
  });
});

// Helper to create test rolls
function createRoll(
  rollId: string,
  shade: string = 'Navy Blue',
  location: string = 'WH-A-Row1-Shelf1',
  status: Roll['status'] = 'INWARD'
): Roll {
  return {
    rollId,
    fabric: '100% Cotton',
    gsm: 180,
    shade,
    width: 60,
    weight: 25,
    location,
    status,
    inwardDate: new Date(),
    quality: 'A'
  };
}
