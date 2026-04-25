/**
 * Unit Tests for Yarn Inventory Management
 *
 * Tests raw material tracking from inward to consumption,
 * including dyeing work orders and consumption variance.
 */

interface YarnLot {
  lotId: string;
  supplier: string;
  yarnType: string;
  color: string;
  coneWeight: number;
  totalCones: number;
  totalWeight: number;
  dyeingLotId?: string;
  dyeingStatus: 'RAW' | 'IN_DYEING' | 'DYED' | 'QC_FAILED';
  location: string;
  status: 'AVAILABLE' | 'RESERVED' | 'IN_PRODUCTION' | 'EXHAUSTED';
  reservedForOrders: string[];
  consumedQuantity: number;
  remainingQuantity: number;
  inwardDate: Date;
  costPerKg: number;
  supplierLotNumber: string;
}

interface YarnConsumption {
  orderId: string;
  styleNumber: string;
  size: string;
  color: string;
  quantity: number;
  yarnRequired: number;
  yarnConsumed: number;
  consumptionRate: number;
  variance: number;
}

interface DyeingWorkOrder {
  workOrderId: string;
  yarnLotId: string;
  targetColor: string;
  quantity: number;
  dyeingVendor: string;
  status: 'ISSUED' | 'IN_PROGRESS' | 'RECEIVED' | 'QC_DONE';
  issuedDate: Date;
  expectedReturnDate: Date;
  actualReturnDate?: Date;
}

class YarnInventoryManager {
  private yarnLots: Map<string, YarnLot> = new Map();
  private dyeingOrders: Map<string, DyeingWorkOrder> = new Map();
  private consumptions: YarnConsumption[] = [];

  private standardRates: Record<string, number> = {
    'tshirt-xl': 180,
    'tshirt-l': 160,
    'tshirt-m': 140,
    'tshirt-s': 120,
    'sweater-xl': 350,
    'sweater-l': 320,
    'sweater-m': 290,
    'sweater-s': 260
  };

  addYarnLot(lot: YarnLot): void {
    lot.remainingQuantity = lot.totalWeight;
    lot.consumedQuantity = 0;
    lot.reservedForOrders = [];
    this.yarnLots.set(lot.lotId, lot);
  }

  reserveYarn(lotId: string, orderId: string, quantity: number): boolean {
    const lot = this.yarnLots.get(lotId);
    if (!lot || lot.remainingQuantity < quantity) {
      return false;
    }

    lot.reservedForOrders.push(orderId);
    lot.remainingQuantity -= quantity;

    if (lot.status === 'AVAILABLE') {
      lot.status = 'RESERVED';
    }

    return true;
  }

  consumeYarn(lotId: string, orderId: string, quantity: number): boolean {
    const lot = this.yarnLots.get(lotId);
    if (!lot || lot.remainingQuantity < quantity) {
      return false;
    }

    lot.consumedQuantity += quantity;
    lot.remainingQuantity -= quantity;

    if (lot.remainingQuantity <= 0) {
      lot.status = 'EXHAUSTED';
    } else if (lot.consumedQuantity > 0) {
      lot.status = 'IN_PRODUCTION';
    }

    return true;
  }

  createDyeingWorkOrder(order: DyeingWorkOrder): void {
    const lot = this.yarnLots.get(order.yarnLotId);
    if (!lot) return;

    lot.dyeingStatus = 'IN_DYEING';
    lot.dyeingLotId = order.workOrderId;
    this.dyeingOrders.set(order.workOrderId, order);
  }

  receiveDyedYarn(workOrderId: string, receivedQuantity: number, qcPassed: boolean): boolean {
    const order = this.dyeingOrders.get(workOrderId);
    if (!order) return false;

    const lot = this.yarnLots.get(order.yarnLotId);
    if (!lot) return false;

    order.actualReturnDate = new Date();
    order.status = qcPassed ? 'QC_DONE' : 'RECEIVED';
    lot.dyeingStatus = qcPassed ? 'DYED' : 'QC_FAILED';
    lot.totalWeight = receivedQuantity;
    lot.remainingQuantity = receivedQuantity;

    return true;
  }

  getAvailability(yarnType?: string, color?: string) {
    let lots = Array.from(this.yarnLots.values());

    if (yarnType) {
      lots = lots.filter(l => l.yarnType === yarnType);
    }
    if (color) {
      lots = lots.filter(l => l.color === color);
    }

    const totalStock = lots.reduce((sum, l) => sum + l.totalWeight, 0);
    const reservedStock = lots
      .filter(l => l.status === 'RESERVED')
      .reduce((sum, l) => sum + (l.totalWeight - l.remainingQuantity), 0);
    const availableStock = lots
      .filter(l => l.status === 'AVAILABLE')
      .reduce((sum, l) => sum + l.remainingQuantity, 0);

    return { totalStock, availableStock, reservedStock, lots };
  }

  calculateRequirement(orderId: string, items: {
    styleNumber: string;
    size: string;
    color: string;
    quantity: number;
  }[]) {
    let totalYarnRequired = 0;
    const breakdown: { style: string; size: string; quantity: number; yarnRequired: number }[] = [];

    for (const item of items) {
      const key = `${item.styleNumber.toLowerCase()}-${item.size.toLowerCase()}`;
      const rate = this.standardRates[key] || 200;
      const yarnRequired = (rate * item.quantity) / 1000;
      totalYarnRequired += yarnRequired;

      breakdown.push({
        style: item.styleNumber,
        size: item.size,
        quantity: item.quantity,
        yarnRequired: Math.round(yarnRequired * 100) / 100
      });
    }

    const withWastage = totalYarnRequired * 1.05;
    const availability = this.getAvailability();
    const suggestions: string[] = [];

    if (availability.availableStock < withWastage) {
      const shortage = withWastage - availability.availableStock;
      suggestions.push(`Yarn shortage: Need ${shortage.toFixed(2)} kg more`);
    } else {
      suggestions.push('Sufficient yarn available for production');
    }

    return {
      totalYarnRequired: Math.round(withWastage * 100) / 100,
      breakdown,
      suggestions
    };
  }

  recordConsumption(consumption: YarnConsumption): void {
    const key = `${consumption.styleNumber.toLowerCase()}-${consumption.size.toLowerCase()}`;
    const standardRate = this.standardRates[key] || 200;

    consumption.consumptionRate = (consumption.yarnConsumed / consumption.quantity) * 1000;
    consumption.variance = ((consumption.consumptionRate - standardRate) / standardRate) * 100;

    this.consumptions.push(consumption);
  }

  getVarianceReport() {
    const styleVariances: Record<string, number[]> = {};

    for (const c of this.consumptions) {
      if (!styleVariances[c.styleNumber]) {
        styleVariances[c.styleNumber] = [];
      }
      styleVariances[c.styleNumber].push(c.variance);
    }

    const styles = Object.keys(styleVariances);
    const avgVariance = this.consumptions.length > 0
      ? this.consumptions.reduce((sum, c) => sum + c.variance, 0) / this.consumptions.length
      : 0;

    return { styles, avgVariance, overConsumption: [], underConsumption: [] };
  }

  getDashboard() {
    const lots = Array.from(this.yarnLots.values());
    const dyeingOrders = Array.from(this.dyeingOrders.values());

    return {
      totalYarnStock: lots.reduce((sum, l) => sum + l.totalWeight, 0),
      totalCones: lots.reduce((sum, l) => sum + l.totalCones, 0),
      inDyeing: dyeingOrders
        .filter(o => o.status === 'IN_PROGRESS')
        .reduce((sum, o) => sum + o.quantity, 0),
      reserved: lots
        .filter(l => l.status === 'RESERVED')
        .reduce((sum, l) => sum + l.totalWeight - l.remainingQuantity, 0),
      available: lots
        .filter(l => l.status === 'AVAILABLE')
        .reduce((sum, l) => sum + l.remainingQuantity, 0),
      dyeingVendors: [...new Set(dyeingOrders.map(o => o.dyeingVendor))],
      agingLots: 0
    };
  }
}

describe('YarnInventoryManager', () => {
  let manager: YarnInventoryManager;

  beforeEach(() => {
    manager = new YarnInventoryManager();
  });

  describe('Yarn Lot Management', () => {
    it('should add yarn lot to inventory', () => {
      const lot: YarnLot = {
        lotId: 'YL-2025-0001',
        supplier: 'Reliance Industries',
        yarnType: '100% Cotton 30s',
        color: 'Raw White',
        coneWeight: 1.5,
        totalCones: 100,
        totalWeight: 150,
        dyeingStatus: 'RAW',
        location: 'YARN-STORE-A',
        status: 'AVAILABLE',
        reservedForOrders: [],
        consumedQuantity: 0,
        remainingQuantity: 0,
        inwardDate: new Date('2025-04-20'),
        costPerKg: 285,
        supplierLotNumber: 'RI-2025-APR-12345'
      };

      manager.addYarnLot(lot);
      const availability = manager.getAvailability();

      expect(availability.totalStock).toBe(150);
      expect(availability.lots.length).toBe(1);
    });

    it('should reserve yarn for production order', () => {
      const lot: YarnLot = {
        lotId: 'YL-2025-0001',
        supplier: 'Reliance',
        yarnType: 'Cotton',
        color: 'Navy Blue',
        coneWeight: 1.5,
        totalCones: 100,
        totalWeight: 150,
        dyeingStatus: 'DYED',
        location: 'STORE-A',
        status: 'AVAILABLE',
        reservedForOrders: [],
        consumedQuantity: 0,
        remainingQuantity: 0,
        inwardDate: new Date(),
        costPerKg: 300,
        supplierLotNumber: 'SUP-001'
      };

      manager.addYarnLot(lot);
      const result = manager.reserveYarn('YL-2025-0001', 'ORD-001', 50);

      expect(result).toBe(true);

      const availability = manager.getAvailability();
      expect(availability.reservedStock).toBeGreaterThan(0);
    });

    it('should reject reservation if insufficient stock', () => {
      const lot: YarnLot = {
        lotId: 'YL-2025-0001',
        supplier: 'Reliance',
        yarnType: 'Cotton',
        color: 'Navy Blue',
        coneWeight: 1.5,
        totalCones: 10,
        totalWeight: 15,
        dyeingStatus: 'DYED',
        location: 'STORE-A',
        status: 'AVAILABLE',
        reservedForOrders: [],
        consumedQuantity: 0,
        remainingQuantity: 0,
        inwardDate: new Date(),
        costPerKg: 300,
        supplierLotNumber: 'SUP-001'
      };

      manager.addYarnLot(lot);
      const result = manager.reserveYarn('YL-2025-0001', 'ORD-001', 100);

      expect(result).toBe(false);
    });
  });

  describe('Yarn Consumption', () => {
    it('should record yarn consumption', () => {
      const lot: YarnLot = {
        lotId: 'YL-2025-0001',
        supplier: 'Reliance',
        yarnType: 'Cotton',
        color: 'Navy Blue',
        coneWeight: 1.5,
        totalCones: 100,
        totalWeight: 150,
        dyeingStatus: 'DYED',
        location: 'STORE-A',
        status: 'AVAILABLE',
        reservedForOrders: [],
        consumedQuantity: 0,
        remainingQuantity: 0,
        inwardDate: new Date(),
        costPerKg: 300,
        supplierLotNumber: 'SUP-001'
      };

      manager.addYarnLot(lot);
      manager.consumeYarn('YL-2025-0001', 'ORD-001', 30);

      const availability = manager.getAvailability();
      expect(availability.availableStock).toBe(120);
    });

    it('should mark lot as exhausted when fully consumed', () => {
      const lot: YarnLot = {
        lotId: 'YL-2025-0001',
        supplier: 'Reliance',
        yarnType: 'Cotton',
        color: 'Navy Blue',
        coneWeight: 1.5,
        totalCones: 10,
        totalWeight: 15,
        dyeingStatus: 'DYED',
        location: 'STORE-A',
        status: 'AVAILABLE',
        reservedForOrders: [],
        consumedQuantity: 0,
        remainingQuantity: 0,
        inwardDate: new Date(),
        costPerKg: 300,
        supplierLotNumber: 'SUP-001'
      };

      manager.addYarnLot(lot);
      manager.consumeYarn('YL-2025-0001', 'ORD-001', 15);

      const lots = manager.getAvailability().lots;
      expect(lots[0].status).toBe('EXHAUSTED');
    });
  });

  describe('Dyeing Work Orders', () => {
    it('should create dyeing work order', () => {
      const lot: YarnLot = {
        lotId: 'YL-2025-0001',
        supplier: 'Reliance',
        yarnType: 'Cotton',
        color: 'Raw White',
        coneWeight: 1.5,
        totalCones: 100,
        totalWeight: 150,
        dyeingStatus: 'RAW',
        location: 'STORE-A',
        status: 'AVAILABLE',
        reservedForOrders: [],
        consumedQuantity: 0,
        remainingQuantity: 0,
        inwardDate: new Date(),
        costPerKg: 280,
        supplierLotNumber: 'SUP-001'
      };

      manager.addYarnLot(lot);

      const order: DyeingWorkOrder = {
        workOrderId: 'DWO-001',
        yarnLotId: 'YL-2025-0001',
        targetColor: 'Navy Blue',
        quantity: 150,
        dyeingVendor: 'Bharat Dyeing',
        status: 'ISSUED',
        issuedDate: new Date(),
        expectedReturnDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      };

      manager.createDyeingWorkOrder(order);

      const lots = manager.getAvailability().lots;
      expect(lots[0].dyeingStatus).toBe('IN_DYEING');
    });

    it('should receive dyed yarn with weight loss', () => {
      const lot: YarnLot = {
        lotId: 'YL-2025-0001',
        supplier: 'Reliance',
        yarnType: 'Cotton',
        color: 'Raw White',
        coneWeight: 1.5,
        totalCones: 100,
        totalWeight: 150,
        dyeingStatus: 'IN_DYEING',
        location: 'STORE-A',
        status: 'AVAILABLE',
        reservedForOrders: [],
        consumedQuantity: 0,
        remainingQuantity: 0,
        inwardDate: new Date(),
        costPerKg: 280,
        supplierLotNumber: 'SUP-001'
      };

      manager.addYarnLot(lot);

      const order: DyeingWorkOrder = {
        workOrderId: 'DWO-001',
        yarnLotId: 'YL-2025-0001',
        targetColor: 'Navy Blue',
        quantity: 150,
        dyeingVendor: 'Bharat Dyeing',
        status: 'IN_PROGRESS',
        issuedDate: new Date(),
        expectedReturnDate: new Date()
      };

      manager.createDyeingWorkOrder(order);

      // Receive with 3% dyeing loss
      manager.receiveDyedYarn('DWO-001', 145.5, true);

      const lots = manager.getAvailability().lots;
      expect(lots[0].dyeingStatus).toBe('DYED');
      expect(lots[0].totalWeight).toBe(145.5);
    });
  });

  describe('Requirement Calculation', () => {
    it('should calculate yarn requirement for T-shirts', () => {
      const lot: YarnLot = {
        lotId: 'YL-2025-0001',
        supplier: 'Reliance',
        yarnType: 'Cotton',
        color: 'Navy Blue',
        coneWeight: 1.5,
        totalCones: 100,
        totalWeight: 200,
        dyeingStatus: 'DYED',
        location: 'STORE-A',
        status: 'AVAILABLE',
        reservedForOrders: [],
        consumedQuantity: 0,
        remainingQuantity: 0,
        inwardDate: new Date(),
        costPerKg: 300,
        supplierLotNumber: 'SUP-001'
      };

      manager.addYarnLot(lot);

      const requirement = manager.calculateRequirement('ORD-001', [
        { styleNumber: 'TSHIRT', size: 'XL', color: 'Navy Blue', quantity: 500 }
      ]);

      // TSHIRT-XL = 180g per unit
      // 500 × 180g = 90,000g = 90kg
      // With 5% wastage: 90 × 1.05 = 94.5kg
      expect(requirement.totalYarnRequired).toBeCloseTo(94.5, 1);
    });

    it('should detect yarn shortage', () => {
      const lot: YarnLot = {
        lotId: 'YL-2025-0001',
        supplier: 'Reliance',
        yarnType: 'Cotton',
        color: 'Navy Blue',
        coneWeight: 1.5,
        totalCones: 10,
        totalWeight: 15,
        dyeingStatus: 'DYED',
        location: 'STORE-A',
        status: 'AVAILABLE',
        reservedForOrders: [],
        consumedQuantity: 0,
        remainingQuantity: 0,
        inwardDate: new Date(),
        costPerKg: 300,
        supplierLotNumber: 'SUP-001'
      };

      manager.addYarnLot(lot);

      const requirement = manager.calculateRequirement('ORD-001', [
        { styleNumber: 'TSHIRT', size: 'XL', color: 'Navy Blue', quantity: 500 }
      ]);

      expect(requirement.suggestions[0]).toContain('shortage');
    });
  });

  describe('Consumption Variance', () => {
    it('should calculate consumption rate and variance', () => {
      manager.recordConsumption({
        orderId: 'ORD-001',
        styleNumber: 'TSHIRT',
        size: 'XL',
        color: 'Navy Blue',
        quantity: 100,
        yarnRequired: 18.9,
        yarnConsumed: 20,
        consumptionRate: 0,
        variance: 0
      });

      const report = manager.getVarianceReport();
      expect(report.styles.length).toBe(1);
      expect(report.styles).toContain('TSHIRT');
      expect(report.avgVariance).toBeDefined();
    });
  });
});
