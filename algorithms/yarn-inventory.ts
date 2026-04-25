/**
 * Yarn Inventory Management for Knitwear Manufacturing
 *
 * Tracks raw yarn from inward to consumption, separate from finished rolls.
 *
 * Key Features:
 * - Yarn lot tracking (supplier batch → dyeing → knitting)
 * - Consumption rate calculation (grams per garment)
 * - Over/under consumption alerts
 * - Dyeing lot management (outsourced process tracking)
 *
 * 2025 Trend: Knitwear ERPs now track yarn separately from fabric
 * to prevent overbuying and optimize purchasing (ref: KnitOne ERP)
 */

interface YarnLot {
  lotId: string;              // e.g., "YL-2025-0001"
  supplier: string;
  yarnType: string;           // e.g., "100% Cotton 30s"
  color: string;              // e.g., "Raw White" or "Navy Blue"
  coneWeight: number;         // kg per cone
  totalCones: number;
  totalWeight: number;        // kg

  // Lot details
  dyeingLotId?: string;       // Reference if dyed
  dyeingStatus: 'RAW' | 'IN_DYEING' | 'DYED' | 'QC_FAILED';

  // Location and status
  location: string;           // e.g., "YARN-STORE-A"
  status: 'AVAILABLE' | 'RESERVED' | 'IN_PRODUCTION' | 'EXHAUSTED';

  // Consumption tracking
  reservedForOrders: string[]; // Order IDs
  consumedQuantity: number;    // kg used
  remainingQuantity: number;  // kg available

  // Metadata
  inwardDate: Date;
  costPerKg: number;
  supplierLotNumber: string;  // Supplier's batch number
}

interface YarnConsumption {
  orderId: string;
  styleNumber: string;
  size: string;
  color: string;
  quantity: number;           // units to produce
  yarnRequired: number;         // kg calculated
  yarnConsumed: number;         // kg actual
  consumptionRate: number;      // grams per garment
  variance: number;             // % over/under
}

interface DyeingWorkOrder {
  workOrderId: string;
  yarnLotId: string;
  targetColor: string;
  quantity: number;             // kg to dye
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

  // Standard consumption rates by garment type (grams per unit)
  private standardRates: Record<string, number> = {
    'tshirt-xl': 180,
    'tshirt-l': 160,
    'tshirt-m': 140,
    'tshirt-s': 120,
    'sweater-xl': 350,
    'sweater-l': 320,
    'sweater-m': 290,
    'sweater-s': 260,
    'hoodie-xl': 450,
    'hoodie-l': 420,
    'hoodie-m': 380,
    'hoodie-s': 340
  };

  /**
   * Add new yarn lot to inventory
   */
  addYarnLot(lot: YarnLot): void {
    lot.remainingQuantity = lot.totalWeight;
    lot.consumedQuantity = 0;
    lot.reservedForOrders = [];
    this.yarnLots.set(lot.lotId, lot);
  }

  /**
   * Reserve yarn for a production order
   */
  reserveYarn(lotId: string, orderId: string, quantity: number): boolean {
    const lot = this.yarnLots.get(lotId);
    if (!lot || lot.remainingQuantity < quantity) {
      return false;
    }

    lot.reservedForOrders.push(orderId);
    lot.remainingQuantity -= quantity;

    if (lot.reservedForOrders.length > 0 && lot.status === 'AVAILABLE') {
      lot.status = 'RESERVED';
    }

    return true;
  }

  /**
   * Record yarn consumption for a production run
   */
  consumeYarn(lotId: string, orderId: string, quantity: number): boolean {
    const lot = this.yarnLots.get(lotId);
    if (!lot) return false;

    // Check if this quantity is available (including reserved)
    const totalAvailable = lot.remainingQuantity +
      lot.reservedForOrders.filter(id => id === orderId).length * 0; // Reserved for this order

    if (lot.remainingQuantity < quantity) {
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

  /**
   * Create dyeing work order (outsourced process)
   */
  createDyeingWorkOrder(order: DyeingWorkOrder): void {
    const lot = this.yarnLots.get(order.yarnLotId);
    if (!lot) return;

    lot.dyeingStatus = 'IN_DYEING';
    lot.dyeingLotId = order.workOrderId;
    this.dyeingOrders.set(order.workOrderId, order);
  }

  /**
   * Receive dyed yarn back from vendor
   */
  receiveDyedYarn(workOrderId: string, receivedQuantity: number, qcPassed: boolean): boolean {
    const order = this.dyeingOrders.get(workOrderId);
    if (!order) return false;

    const lot = this.yarnLots.get(order.yarnLotId);
    if (!lot) return false;

    order.actualReturnDate = new Date();
    order.status = qcPassed ? 'QC_DONE' : 'RECEIVED';

    // Update lot status
    lot.dyeingStatus = qcPassed ? 'DYED' : 'QC_FAILED';
    lot.totalWeight = receivedQuantity; // Update with actual dyed weight
    lot.remainingQuantity = receivedQuantity;

    // Calculate dyeing loss
    const dyeingLoss = ((order.quantity - receivedQuantity) / order.quantity) * 100;

    return true;
  }

  /**
   * Get yarn availability for planning
   */
  getAvailability(yarnType?: string, color?: string): {
    totalStock: number;
    availableStock: number;
    reservedStock: number;
    lots: YarnLot[];
  } {
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

    return {
      totalStock,
      availableStock,
      reservedStock,
      lots
    };
  }

  /**
   * Calculate yarn requirement for an order
   */
  calculateRequirement(orderId: string, items: {
    styleNumber: string;
    size: string;
    color: string;
    quantity: number;
  }[]): {
    totalYarnRequired: number;
    breakdown: { style: string; size: string; quantity: number; yarnRequired: number }[];
    suggestions: string[];
  } {
    let totalYarnRequired = 0;
    const breakdown: { style: string; size: string; quantity: number; yarnRequired: number }[] = [];

    for (const item of items) {
      const key = `${item.styleNumber.toLowerCase()}-${item.size.toLowerCase()}`;
      const rate = this.standardRates[key] || 200; // Default 200g if unknown

      const yarnRequired = (rate * item.quantity) / 1000; // Convert to kg
      totalYarnRequired += yarnRequired;

      breakdown.push({
        style: item.styleNumber,
        size: item.size,
        quantity: item.quantity,
        yarnRequired: Math.round(yarnRequired * 100) / 100
      });
    }

    // Add 5% wastage buffer
    const withWastage = totalYarnRequired * 1.05;

    // Check availability
    const availability = this.getAvailability();
    const suggestions: string[] = [];

    if (availability.availableStock < withWastage) {
      const shortage = withWastage - availability.availableStock;
      suggestions.push(`Yarn shortage: Need ${shortage.toFixed(2)} kg more`);
      suggestions.push(`Current stock: ${availability.availableStock.toFixed(2)} kg`);
    } else {
      suggestions.push('Sufficient yarn available for production');
    }

    return {
      totalYarnRequired: Math.round(withWastage * 100) / 100,
      breakdown,
      suggestions
    };
  }

  /**
   * Record consumption and track variance
   */
  recordConsumption(consumption: YarnConsumption): void {
    const key = `${consumption.styleNumber.toLowerCase()}-${consumption.size.toLowerCase()}`;
    const standardRate = this.standardRates[key] || 200;

    consumption.consumptionRate = (consumption.yarnConsumed / consumption.quantity) * 1000;
    consumption.variance = ((consumption.consumptionRate - standardRate) / standardRate) * 100;

    this.consumptions.push(consumption);
  }

  /**
   * Get consumption variance report
   */
  getVarianceReport(): {
    styles: string[];
    avgVariance: number;
    overConsumption: { style: string; variance: number }[];
    underConsumption: { style: string; variance: number }[];
  } {
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

    const overConsumption = styles
      .map(s => ({
        style: s,
        variance: styleVariances[s].reduce((a, b) => a + b, 0) / styleVariances[s].length
      }))
      .filter(s => s.variance > 5)
      .sort((a, b) => b.variance - a.variance);

    const underConsumption = styles
      .map(s => ({
        style: s,
        variance: styleVariances[s].reduce((a, b) => a + b, 0) / styleVariances[s].length
      }))
      .filter(s => s.variance < -5)
      .sort((a, b) => a.variance - b.variance);

    return {
      styles,
      avgVariance,
      overConsumption,
      underConsumption
    };
  }

  /**
   * Get aging report (yarn sitting too long)
   */
  getAgingReport(daysThreshold: number = 90): YarnLot[] {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - daysThreshold);

    return Array.from(this.yarnLots.values())
      .filter(lot => lot.inwardDate < threshold && lot.status !== 'EXHAUSTED')
      .sort((a, b) => a.inwardDate.getTime() - b.inwardDate.getTime());
  }

  /**
   * Dashboard summary
   */
  getDashboard(): {
    totalYarnStock: number;
    totalCones: number;
    inDyeing: number;
    reserved: number;
    available: number;
    dyeingVendors: string[];
    agingLots: number;
  } {
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
      agingLots: this.getAgingReport().length
    };
  }
}

// ===== EXAMPLE: Managing Raw Yarn Inventory =====

const yarnManager = new YarnInventoryManager();

// Receive raw yarn from supplier
yarnManager.addYarnLot({
  lotId: 'YL-2025-0001',
  supplier: 'Reliance Industries',
  yarnType: '100% Cotton 30s',
  color: 'Raw White',
  coneWeight: 1.5, // 1.5 kg per cone
  totalCones: 100,
  totalWeight: 150, // 100 × 1.5 kg
  dyeingStatus: 'RAW',
  location: 'YARN-STORE-A',
  status: 'AVAILABLE',
  reservedForOrders: [],
  consumedQuantity: 0,
  remainingQuantity: 0,
  inwardDate: new Date('2025-04-20'),
  costPerKg: 285,
  supplierLotNumber: 'RI-2025-APR-12345'
});

// Send for dyeing
yarnManager.createDyeingWorkOrder({
  workOrderId: 'DWO-2025-001',
  yarnLotId: 'YL-2025-0001',
  targetColor: 'Navy Blue',
  quantity: 150,
  dyeingVendor: 'Bharat Dyeing Works',
  status: 'ISSUED',
  issuedDate: new Date('2025-04-22'),
  expectedReturnDate: new Date('2025-04-25')
});

// Receive dyed yarn (with 3% dyeing loss)
yarnManager.receiveDyedYarn('DWO-2025-001', 145.5, true);

// Check availability
const availability = yarnManager.getAvailability('100% Cotton 30s', 'Navy Blue');
console.log('Navy Blue Cotton Availability:', availability.totalStock, 'kg');

// Calculate requirement for an order
const requirement = yarnManager.calculateRequirement('ORD-2025-001', [
  { styleNumber: 'TSHIRT', size: 'XL', color: 'Navy Blue', quantity: 500 },
  { styleNumber: 'TSHIRT', size: 'L', color: 'Navy Blue', quantity: 800 }
]);
console.log('Total Yarn Required:', requirement.totalYarnRequired, 'kg');

// Dashboard
const dashboard = yarnManager.getDashboard();
console.log('Yarn Dashboard:', dashboard);

export { YarnInventoryManager, YarnLot, YarnConsumption, DyeingWorkOrder };
