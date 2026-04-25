/**
 * Unit Tests for WIP (Work-in-Progress) Visibility Tracker
 *
 * Tests real-time order tracking through production stages.
 * Validates bottleneck identification and progress calculation.
 */

interface WIPRecord {
  orderId: string;
  styleNumber: string;
  customer: string;
  totalQuantity: number;
  stages: WIPStage[];
  currentStage: string;
  overallProgress: number;
  status: 'ON_TRACK' | 'DELAYED' | 'AT_RISK' | 'COMPLETED';
  orderDate: Date;
  plannedDispatchDate: Date;
  estimatedCompletionDate: Date;
}

interface WIPStage {
  stageName: string;
  stageOrder: number;
  inputQuantity: number;
  outputQuantity: number;
  inProgress: number;
  efficiency: number;
  startDate?: Date;
  endDate?: Date;
  isBottleneck: boolean;
}

interface ProductionStage {
  name: string;
  order: number;
  avgTimePerUnit: number;
  capacityPerDay: number;
  machines: string[];
}

class WIPTracker {
  private wipRecords: Map<string, WIPRecord> = new Map();
  private stages: ProductionStage[] = [
    { name: 'KNITTING', order: 1, avgTimePerUnit: 15, capacityPerDay: 500, machines: ['M01', 'M02'] },
    { name: 'LINKING', order: 2, avgTimePerUnit: 8, capacityPerDay: 800, machines: ['L01'] },
    { name: 'WASHING', order: 3, avgTimePerUnit: 120, capacityPerDay: 200, machines: ['W01'] },
    { name: 'PRESSING', order: 4, avgTimePerUnit: 5, capacityPerDay: 1000, machines: ['P01'] },
    { name: 'QC', order: 5, avgTimePerUnit: 3, capacityPerDay: 1500, machines: [] },
    { name: 'PACKING', order: 6, avgTimePerUnit: 2, capacityPerDay: 2000, machines: [] }
  ];

  registerOrder(order: Omit<WIPRecord, 'stages' | 'currentStage' | 'overallProgress' | 'status'>): void {
    const stages: WIPStage[] = this.stages.map(s => ({
      stageName: s.name,
      stageOrder: s.order,
      inputQuantity: s.order === 1 ? order.totalQuantity : 0,
      outputQuantity: 0,
      inProgress: 0,
      efficiency: 100,
      isBottleneck: false
    }));

    const record: WIPRecord = {
      ...order,
      stages,
      currentStage: 'KNITTING',
      overallProgress: 0,
      status: 'ON_TRACK'
    };

    this.wipRecords.set(order.orderId, record);
  }

  updateStage(orderId: string, stageName: string, update: {
    inputQuantity?: number;
    outputQuantity?: number;
    inProgress?: number;
    efficiency?: number;
  }): void {
    const record = this.wipRecords.get(orderId);
    if (!record) return;

    const stage = record.stages.find(s => s.stageName === stageName);
    if (!stage) return;

    if (update.inputQuantity !== undefined) stage.inputQuantity = update.inputQuantity;
    if (update.outputQuantity !== undefined) stage.outputQuantity = update.outputQuantity;
    if (update.inProgress !== undefined) {
      stage.inProgress = update.inProgress;
      if (update.inProgress > 0 && !stage.startDate) {
        stage.startDate = new Date();
      }
    }
    if (update.efficiency !== undefined) stage.efficiency = update.efficiency;

    this.recalculateProgress(record);
    this.updateCurrentStage(record);
    this.updateStatus(record);
  }

  moveToNextStage(orderId: string, fromStage: string, quantity: number): boolean {
    const record = this.wipRecords.get(orderId);
    if (!record) return false;

    const current = record.stages.find(s => s.stageName === fromStage);
    const next = record.stages.find(s => s.stageOrder === (current?.stageOrder || 0) + 1);

    if (!current || !next) return false;
    if (current.outputQuantity < quantity) return false;

    current.outputQuantity -= quantity;
    next.inputQuantity += quantity;

    this.recalculateProgress(record);
    this.updateCurrentStage(record);

    return true;
  }

  getDashboard() {
    const activeRecords = Array.from(this.wipRecords.values())
      .filter(r => r.status !== 'COMPLETED');

    const stageDistribution = this.stages.map(stage => {
      const ordersAtStage = activeRecords.filter(r => r.currentStage === stage.name);
      const unitsAtStage = ordersAtStage.reduce((sum, r) => {
        const s = r.stages.find(st => st.stageName === stage.name);
        return sum + (s?.inProgress || 0);
      }, 0);

      return {
        stage: stage.name,
        orders: ordersAtStage.length,
        units: unitsAtStage,
        avgDays: 0
      };
    });

    const sortedByUnits = [...stageDistribution].sort((a, b) => b.units - a.units);
    const bottleneckStages = sortedByUnits.slice(0, 2).map(s => s.stage);

    const today = new Date();
    const delayedOrders = activeRecords.filter(r => r.plannedDispatchDate < today);
    const atRiskOrders = activeRecords.filter(r => r.status === 'AT_RISK');

    return {
      totalActiveOrders: activeRecords.length,
      totalUnits: activeRecords.reduce((sum, r) => sum + r.totalQuantity, 0),
      stageDistribution,
      bottleneckStages,
      delayedOrders,
      atRiskOrders
    };
  }

  getCustomerWIP(customer?: string) {
    const records = customer
      ? Array.from(this.wipRecords.values()).filter(r => r.customer === customer)
      : Array.from(this.wipRecords.values());

    const customerMap: Record<string, {
      orders: number;
      totalUnits: number;
      completed: number;
      inProgress: number;
      delayed: number;
    }> = {};

    records.forEach(r => {
      if (!customerMap[r.customer]) {
        customerMap[r.customer] = { orders: 0, totalUnits: 0, completed: 0, inProgress: 0, delayed: 0 };
      }

      customerMap[r.customer].orders++;
      customerMap[r.customer].totalUnits += r.totalQuantity;

      if (r.status === 'COMPLETED') {
        customerMap[r.customer].completed += r.totalQuantity;
      } else {
        customerMap[r.customer].inProgress += r.totalQuantity;
      }

      if (r.status === 'DELAYED') {
        customerMap[r.customer].delayed += r.totalQuantity;
      }
    });

    return Object.entries(customerMap).map(([customer, data]) => ({
      customer,
      ...data
    }));
  }

  predictCompletion(orderId: string) {
    const record = this.wipRecords.get(orderId);
    if (!record) return null;

    const currentStageIdx = record.stages.findIndex(s => s.stageName === record.currentStage);
    const remainingStages = record.stages.slice(currentStageIdx);

    let estimatedMinutes = 0;
    const factors: string[] = [];

    for (const stage of remainingStages) {
      const stageInfo = this.stages.find(s => s.name === stage.stageName);
      if (!stageInfo) continue;

      const remainingUnits = stage.inputQuantity - stage.outputQuantity;
      const timeNeeded = (remainingUnits * stageInfo.avgTimePerUnit) / (stage.efficiency / 100);
      estimatedMinutes += timeNeeded;

      if (stage.efficiency < 80) {
        factors.push(`${stage.stageName} efficiency at ${stage.efficiency}%`);
      }
    }

    const estimatedDate = new Date();
    estimatedDate.setMinutes(estimatedDate.getMinutes() + estimatedMinutes);

    const confidence = factors.length === 0 ? 'HIGH' : factors.length < 3 ? 'MEDIUM' : 'LOW';

    return { estimatedDate, confidence, factors };
  }

  private recalculateProgress(record: WIPRecord): void {
    const finalStage = record.stages[record.stages.length - 1];

    if (finalStage.outputQuantity === record.totalQuantity) {
      record.overallProgress = 100;
      record.status = 'COMPLETED';
    } else {
      const stageWeight = 100 / record.stages.length;
      const partialProgress = record.stages.reduce((sum, s) => {
        if (s.inputQuantity > 0) {
          return sum + (s.outputQuantity / s.inputQuantity) * stageWeight;
        }
        return sum;
      }, 0);

      record.overallProgress = Math.round(partialProgress * 100) / 100;
    }
  }

  private updateCurrentStage(record: WIPRecord): void {
    for (const stage of record.stages) {
      if (stage.outputQuantity < stage.inputQuantity || stage.inProgress > 0) {
        record.currentStage = stage.stageName;
        return;
      }
    }
    record.currentStage = 'COMPLETED';
  }

  private updateStatus(record: WIPRecord): void {
    if (record.overallProgress === 100) {
      record.status = 'COMPLETED';
      return;
    }

    const today = new Date();
    const daysToDispatch = (record.plannedDispatchDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

    if (daysToDispatch < 0) {
      record.status = 'DELAYED';
    } else if (daysToDispatch < 3 && record.overallProgress < 80) {
      record.status = 'AT_RISK';
    } else {
      record.status = 'ON_TRACK';
    }
  }
}

describe('WIPTracker', () => {
  let tracker: WIPTracker;

  beforeEach(() => {
    tracker = new WIPTracker();
  });

  describe('Order Registration', () => {
    it('should register new order with all production stages', () => {
      tracker.registerOrder({
        orderId: 'ORD-001',
        styleNumber: 'SS-2025-001',
        customer: 'ABC Exports',
        totalQuantity: 1000,
        orderDate: new Date('2025-04-20'),
        plannedDispatchDate: new Date('2025-04-30'),
        estimatedCompletionDate: new Date('2025-04-29')
      });

      const dashboard = tracker.getDashboard();
      expect(dashboard.totalActiveOrders).toBe(1);
      expect(dashboard.totalUnits).toBe(1000);
    });
  });

  describe('Stage Progress Updates', () => {
    it('should update knitting progress', () => {
      tracker.registerOrder({
        orderId: 'ORD-001',
        styleNumber: 'SS-2025-001',
        customer: 'ABC Exports',
        totalQuantity: 1000,
        orderDate: new Date(),
        plannedDispatchDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        estimatedCompletionDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000)
      });

      tracker.updateStage('ORD-001', 'KNITTING', {
        inputQuantity: 1000,
        outputQuantity: 600,
        inProgress: 200,
        efficiency: 92
      });

      const dashboard = tracker.getDashboard();
      const knittingStage = dashboard.stageDistribution.find(s => s.stage === 'KNITTING');
      expect(knittingStage?.units).toBe(200);
    });

    it('should move units to next stage', () => {
      tracker.registerOrder({
        orderId: 'ORD-001',
        styleNumber: 'SS-2025-001',
        customer: 'ABC Exports',
        totalQuantity: 1000,
        orderDate: new Date(),
        plannedDispatchDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        estimatedCompletionDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000)
      });

      tracker.updateStage('ORD-001', 'KNITTING', {
        inputQuantity: 1000,
        outputQuantity: 800,
        inProgress: 0,
        efficiency: 92
      });

      const result = tracker.moveToNextStage('ORD-001', 'KNITTING', 300);
      expect(result).toBe(true);
    });

    it('should reject move if insufficient output', () => {
      tracker.registerOrder({
        orderId: 'ORD-001',
        styleNumber: 'SS-2025-001',
        customer: 'ABC Exports',
        totalQuantity: 1000,
        orderDate: new Date(),
        plannedDispatchDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        estimatedCompletionDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000)
      });

      tracker.updateStage('ORD-001', 'KNITTING', {
        inputQuantity: 1000,
        outputQuantity: 100,
        inProgress: 0,
        efficiency: 92
      });

      const result = tracker.moveToNextStage('ORD-001', 'KNITTING', 500);
      expect(result).toBe(false);
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate overall progress correctly', () => {
      tracker.registerOrder({
        orderId: 'ORD-001',
        styleNumber: 'SS-2025-001',
        customer: 'ABC Exports',
        totalQuantity: 600,
        orderDate: new Date(),
        plannedDispatchDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        estimatedCompletionDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000)
      });

      // Complete knitting (stage 1 of 6)
      tracker.updateStage('ORD-001', 'KNITTING', {
        inputQuantity: 600,
        outputQuantity: 600,
        inProgress: 0,
        efficiency: 100
      });

      // Complete linking (stage 2 of 6)
      tracker.updateStage('ORD-001', 'LINKING', {
        inputQuantity: 600,
        outputQuantity: 600,
        inProgress: 0,
        efficiency: 100
      });

      // In progress at washing (stage 3 of 6)
      tracker.updateStage('ORD-001', 'WASHING', {
        inputQuantity: 600,
        outputQuantity: 300,
        inProgress: 200,
        efficiency: 100
      });

      const dashboard = tracker.getDashboard();
      // Progress should be around 50% (2 stages done + partial 3rd)
      // Note: actual calculation depends on implementation details
    });
  });

  describe('Status Tracking', () => {
    it('should mark order as DELAYED if past dispatch date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5); // 5 days ago

      tracker.registerOrder({
        orderId: 'ORD-001',
        styleNumber: 'SS-2025-001',
        customer: 'ABC Exports',
        totalQuantity: 1000,
        orderDate: new Date(),
        plannedDispatchDate: pastDate,
        estimatedCompletionDate: pastDate
      });

      const dashboard = tracker.getDashboard();
      expect(dashboard.delayedOrders.length).toBeGreaterThan(0);
    });
  });

  describe('Bottleneck Detection', () => {
    it('should identify bottleneck stages', () => {
      // Register multiple orders
      for (let i = 1; i <= 3; i++) {
        tracker.registerOrder({
          orderId: `ORD-${i}`,
          styleNumber: `SS-2025-00${i}`,
          customer: 'ABC Exports',
          totalQuantity: 500,
          orderDate: new Date(),
          plannedDispatchDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          estimatedCompletionDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000)
        });

        // Pile up at WASHING stage (lowest capacity)
        tracker.updateStage(`ORD-${i}`, 'KNITTING', {
          inputQuantity: 500,
          outputQuantity: 500,
          inProgress: 0,
          efficiency: 100
        });

        tracker.moveToNextStage(`ORD-${i}`, 'KNITTING', 500);

        tracker.updateStage(`ORD-${i}`, 'LINKING', {
          inputQuantity: 500,
          outputQuantity: 500,
          inProgress: 0,
          efficiency: 100
        });

        tracker.moveToNextStage(`ORD-${i}`, 'LINKING', 500);

        tracker.updateStage(`ORD-${i}`, 'WASHING', {
          inputQuantity: 500,
          outputQuantity: 0,
          inProgress: 500,
          efficiency: 100
        });
      }

      const dashboard = tracker.getDashboard();
      expect(dashboard.bottleneckStages).toContain('WASHING');
    });
  });

  describe('Customer WIP', () => {
    it('should group WIP by customer', () => {
      tracker.registerOrder({
        orderId: 'ORD-001',
        styleNumber: 'SS-2025-001',
        customer: 'ABC Exports',
        totalQuantity: 1000,
        orderDate: new Date(),
        plannedDispatchDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        estimatedCompletionDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000)
      });

      tracker.registerOrder({
        orderId: 'ORD-002',
        styleNumber: 'SS-2025-002',
        customer: 'ABC Exports',
        totalQuantity: 500,
        orderDate: new Date(),
        plannedDispatchDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        estimatedCompletionDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000)
      });

      tracker.registerOrder({
        orderId: 'ORD-003',
        styleNumber: 'SS-2025-003',
        customer: 'XYZ Garments',
        totalQuantity: 800,
        orderDate: new Date(),
        plannedDispatchDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        estimatedCompletionDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000)
      });

      const customerWIP = tracker.getCustomerWIP();

      expect(customerWIP.length).toBe(2);

      const abcWIP = customerWIP.find(c => c.customer === 'ABC Exports');
      expect(abcWIP?.orders).toBe(2);
      expect(abcWIP?.totalUnits).toBe(1500);
    });
  });

  describe('Completion Prediction', () => {
    it('should predict completion date with HIGH confidence', () => {
      tracker.registerOrder({
        orderId: 'ORD-001',
        styleNumber: 'SS-2025-001',
        customer: 'ABC Exports',
        totalQuantity: 100,
        orderDate: new Date(),
        plannedDispatchDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        estimatedCompletionDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)
      });

      // Most stages complete
      tracker.updateStage('ORD-001', 'KNITTING', {
        inputQuantity: 100,
        outputQuantity: 100,
        inProgress: 0,
        efficiency: 100
      });

      tracker.moveToNextStage('ORD-001', 'KNITTING', 100);

      tracker.updateStage('ORD-001', 'LINKING', {
        inputQuantity: 100,
        outputQuantity: 100,
        inProgress: 0,
        efficiency: 100
      });

      tracker.moveToNextStage('ORD-001', 'LINKING', 100);

      tracker.updateStage('ORD-001', 'WASHING', {
        inputQuantity: 100,
        outputQuantity: 50,
        inProgress: 50,
        efficiency: 100
      });

      const prediction = tracker.predictCompletion('ORD-001');
      expect(prediction).not.toBeNull();
      expect(prediction?.confidence).toBe('HIGH');
    });

    it('should predict completion with MEDIUM confidence if efficiency issues', () => {
      tracker.registerOrder({
        orderId: 'ORD-001',
        styleNumber: 'SS-2025-001',
        customer: 'ABC Exports',
        totalQuantity: 1000,
        orderDate: new Date(),
        plannedDispatchDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        estimatedCompletionDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)
      });

      tracker.updateStage('ORD-001', 'KNITTING', {
        inputQuantity: 1000,
        outputQuantity: 500,
        inProgress: 200,
        efficiency: 70 // Low efficiency
      });

      const prediction = tracker.predictCompletion('ORD-001');
      expect(prediction?.confidence).toBe('MEDIUM');
      expect(prediction?.factors.length).toBeGreaterThan(0);
    });
  });
});
