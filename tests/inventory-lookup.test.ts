/**
 * Unit Tests for Inventory Lookup (Hash Map)
 *
 * Tests O(1) roll lookup implementation for textile inventory.
 * Validates instant access to roll data by barcode/roll ID.
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

  describe('addRoll', () => {
    it('should add a roll to inventory', () => {
      const roll = createRoll('R-2025-0001');
      inventory.addRoll(roll);

      expect(inventory.getCount()).toBe(1);
    });

    it('should update count with multiple rolls', () => {
      for (let i = 1; i <= 10; i++) {
        inventory.addRoll(createRoll(`R-2025-${1000 + i}`));
      }

      expect(inventory.getCount()).toBe(10);
    });
  });

  describe('getRoll', () => {
    it('should return roll by ID (O(1) lookup)', () => {
      const roll = createRoll('R-2025-0001', 'Navy Blue', 'WH-A-Row1-Shelf1');
      inventory.addRoll(roll);

      const found = inventory.getRoll('R-2025-0001');
      expect(found?.rollId).toBe('R-2025-0001');
      expect(found?.shade).toBe('Navy Blue');
    });

    it('should return undefined for non-existent roll', () => {
      expect(inventory.getRoll('R-2025-9999')).toBeUndefined();
    });
  });

  describe('updateStatus', () => {
    it('should update roll status', () => {
      const roll = createRoll('R-2025-0001', 'Navy Blue', 'WH-A-Row1-Shelf1', 'INWARD');
      inventory.addRoll(roll);

      inventory.updateStatus('R-2025-0001', 'WAREHOUSE');
      expect(inventory.getRoll('R-2025-0001')?.status).toBe('WAREHOUSE');
    });

    it('should reject invalid status transitions', () => {
      const roll = createRoll('R-2025-0001', 'Navy Blue', 'WH-A-Row1-Shelf1', 'INWARD');
      inventory.addRoll(roll);

      expect(() => {
        inventory.updateStatus('R-2025-0001', 'PRODUCTION');
      }).toThrow('Invalid transition');
    });

    it('should return false for non-existent roll', () => {
      expect(inventory.updateStatus('R-2025-9999', 'WAREHOUSE')).toBe(false);
    });
  });

  describe('getByShade', () => {
    it('should return rolls by shade', () => {
      inventory.addRoll(createRoll('R-2025-0001', 'Navy Blue'));
      inventory.addRoll(createRoll('R-2025-0002', 'Navy Blue'));
      inventory.addRoll(createRoll('R-2025-0003', 'Red'));

      const navyRolls = inventory.getByShade('Navy Blue');
      expect(navyRolls.length).toBe(2);
    });

    it('should return empty array for unknown shade', () => {
      expect(inventory.getByShade('Unknown')).toEqual([]);
    });
  });

  describe('getByLocation', () => {
    it('should return rolls by location', () => {
      inventory.addRoll(createRoll('R-2025-0001', 'Navy Blue', 'WH-A-Row1-Shelf1'));
      inventory.addRoll(createRoll('R-2025-0002', 'Red', 'WH-A-Row1-Shelf1'));
      inventory.addRoll(createRoll('R-2025-0003', 'Navy Blue', 'WH-B-Row2-Shelf3'));

      const row1Rolls = inventory.getByLocation('WH-A-Row1-Shelf1');
      expect(row1Rolls.length).toBe(2);
    });
  });

  describe('getStatusSummary', () => {
    it('should return count by status', () => {
      inventory.addRoll(createRoll('R-2025-0001', 'Navy Blue', 'WH-A-Row1', 'INWARD'));
      inventory.addRoll(createRoll('R-2025-0002', 'Red', 'WH-A-Row2', 'INWARD'));
      inventory.addRoll(createRoll('R-2025-0003', 'Blue', 'WH-B-Row1', 'WAREHOUSE'));

      const summary = inventory.getStatusSummary();
      expect(summary.INWARD).toBe(2);
      expect(summary.WAREHOUSE).toBe(1);
    });
  });

  describe('barcode scan scenario', () => {
    it('should instantly find roll after barcode scan', () => {
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

// Test helper
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
