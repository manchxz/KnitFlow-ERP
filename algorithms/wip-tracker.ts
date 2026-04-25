/**
 * Work-in-Progress (WIP) Visibility Tracker
 *
 * Real-time tracking of orders through production stages.
 *
 * 2025 Trend: Single-date WIP visibility is now a standard feature
 * in knitwear ERPs, enabling accurate daily workload assessment
 * (ref: KnitOne January 2026 release notes)
 *
 * Tracks:
 * - Orders by production stage (Knitting → Linking → Washing → Pressing → Packing)
 * - Bottleneck identification (where orders pile up)
 * - Daily WIP snapshots for trend analysis
 * - ETA predictions based on current progress
 */

interface WIPRecord {
  orderId: string;
  styleNumber: string;
  customer: string;
  totalQuantity: number;
  stages: WIPStage[];
  currentStage: string;
  overallProgress: number;     // 0-100%
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
  efficiency: number;          // %
  startDate?: Date;
  endDate?: Date;
  isBottleneck: boolean;
}

interface WIPSnapshot {
  date: Date;
  totalOrders: number;
  totalUnits: number;
  stageBreakdown: { stage: string; count: number; units: number }[];
  bottleneckStage: string | null;
  avgProgress: number;
}

interface ProductionStage {
  name: string;
  order: number;
  avgTimePerUnit: number;    // minutes
  capacityPerDay: number;    // units
  machines: string[];
}

class WIPTracker {
  private wipRecords: Map<string, WIPRecord> = new Map();
  private snapshots: WIPSnapshot[] = [];
  private stages: ProductionStage[] = [
    { name: 'KNITTING', order: 1, avgTimePerUnit: 15, capacityPerDay: 500, machines: ['M01', 'M02', 'M03', 'M04'] },
    { name: 'LINKING', order: 2, avgTimePerUnit: 8, capacityPerDay: 800, machines: ['L01', 'L02'] },
    { name: 'WASHING', order: 3, avgTimePerUnit: 120, capacityPerDay: 200, machines: ['W01', 'W02'] },
    { name: 'PRESSING', order: 4, avgTimePerUnit: 5, capacityPerDay: 1000, machines: ['P01', 'P02', 'P03'] },
    { name: 'QC', order: 5, avgTimePerUnit: 3, capacityPerDay: 1500, machines: [] },
    { name: 'PACKING', order: 6, avgTimePerUnit: 2, capacityPerDay: 2000, machines: [] }
  ];

  /**
   * Register a new order in WIP tracking
   */
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

  /**
   * Update stage progress for an order
   */
  updateStage(orderId: string, stageName: string, update: {
    inputQuantity?: number;
    outputQuantity?: number;
    inProgress?: number;
    efficiency?: number;
    endDate?: Date;
  }): void {
    const record = this.wipRecords.get(orderId);
    if (!record) return;

    const stage = record.stages.find(s => s.stageName === stageName);
    if (!stage) return;

    if (update.inputQuantity !== undefined) stage.inputQuantity = update.inputQuantity;
    if (update.outputQuantity !== undefined) stage.outputQuantity = update.outputQuantity;
    if (update.inProgress !== undefined) stage.inProgress = update.inProgress;
    if (update.efficiency !== undefined) stage.efficiency = update.efficiency;
    if (update.endDate !== undefined) stage.endDate = update.endDate;

    // Recalculate overall progress
    this.recalculateProgress(record);

    // Update current stage
    this.updateCurrentStage(record);

    // Update status based on dates
    this.updateStatus(record);
  }

  /**
   * Move units from one stage to next
   */
  moveToNextStage(orderId: string, fromStage: string, quantity: number): boolean {
    const record = this.wipRecords.get(orderId);
    if (!record) return false;

    const current = record.stages.find(s => s.stageName === fromStage);
    const next = record.stages.find(s => s.stageOrder === current!.stageOrder + 1);

    if (!current || !next) return false;
    if (current.outputQuantity < quantity) return false;

    // Move units
    current.outputQuantity -= quantity;
    next.inputQuantity += quantity;

    this.recalculateProgress(record);
    this.updateCurrentStage(record);

    return true;
  }

  /**
   * Get current WIP dashboard
   */
  getDashboard(): {
    totalActiveOrders: number;
    totalUnits: number;
    stageDistribution: { stage: string; orders: number; units: number; avgDays: number }[];
    bottleneckStages: string[];
    delayedOrders: WIPRecord[];
    atRiskOrders: WIPRecord[];
  } {
    const activeRecords = Array.from(this.wipRecords.values())
      .filter(r => r.status !== 'COMPLETED');

    const totalActiveOrders = activeRecords.length;
    const totalUnits = activeRecords.reduce((sum, r) => sum + r.totalQuantity, 0);

    // Stage distribution
    const stageDistribution = this.stages.map(productionStage => {
      const ordersAtStage = activeRecords.filter(r => r.currentStage === productionStage.name);
      const unitsAtStage = ordersAtStage.reduce((sum, r) => {
        const wipStage = r.stages.find(s => s.stageName === productionStage.name);
        return sum + (wipStage?.inProgress || 0);
      }, 0);

      // Calculate average days at this stage
      const avgDays = ordersAtStage.length > 0
        ? ordersAtStage.reduce((sum, r) => {
            const wipStage = r.stages.find(s => s.stageName === productionStage.name);
            if (wipStage?.startDate) {
              return sum + (Date.now() - wipStage.startDate.getTime()) / (1000 * 60 * 60 * 24);
            }
            return sum;
          }, 0) / ordersAtStage.length
        : 0;

      return {
        stage: productionStage.name,
        orders: ordersAtStage.length,
        units: unitsAtStage,
        avgDays: Math.round(avgDays * 10) / 10
      };
    });

    // Identify bottlenecks (stages with most accumulation)
    const sortedByUnits = [...stageDistribution].sort((a, b) => b.units - a.units);
    const bottleneckStages = sortedByUnits.slice(0, 2).map(s => s.stage);

    // Identify delayed and at-risk orders
    const today = new Date();
    const delayedOrders = activeRecords.filter(r =>
      r.plannedDispatchDate < today && r.status !== 'COMPLETED'
    );
    const atRiskOrders = activeRecords.filter(r => {
      const daysToDispatch = (r.plannedDispatchDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      const estimatedDays = (100 - r.overallProgress) / 100 * 5; // Rough estimate
      return daysToDispatch <= estimatedDays && daysToDispatch > 0;
    });

    return {
      totalActiveOrders,
      totalUnits,
      stageDistribution,
      bottleneckStages,
      delayedOrders,
      atRiskOrders
    };
  }

  /**
   * Take daily WIP snapshot for trend analysis
   */
  takeSnapshot(): WIPSnapshot {
    const today = new Date();
    const activeRecords = Array.from(this.wipRecords.values())
      .filter(r => r.status !== 'COMPLETED');

    const stageBreakdown = this.stages.map(stage => {
      const orders = activeRecords.filter(r => r.currentStage === stage.name);
      const units = orders.reduce((sum, r) => {
        const s = r.stages.find(st => st.stageName === stage.name);
        return sum + (s?.inProgress || 0);
      }, 0);

      return {
        stage: stage.name,
        count: orders.length,
        units
      };
    });

    const bottleneck = stageBreakdown.reduce((max, curr) =>
      curr.units > max.units ? curr : max
    );

    const snapshot: WIPSnapshot = {
      date: today,
      totalOrders: activeRecords.length,
      totalUnits: activeRecords.reduce((sum, r) => sum + r.totalQuantity, 0),
      stageBreakdown,
      bottleneckStage: bottleneck.units > 0 ? bottleneck.stage : null,
      avgProgress: activeRecords.length > 0
        ? activeRecords.reduce((sum, r) => sum + r.overallProgress, 0) / activeRecords.length
        : 0
    };

    this.snapshots.push(snapshot);
    return snapshot;
  }

  /**
   * Get WIP trend over time
   */
  getTrend(days: number = 7): {
    dates: Date[];
    totalUnits: number[];
    avgProgress: number[];
    bottleneckFrequency: Record<string, number>;
  } {
    const recentSnapshots = this.snapshots.slice(-days);

    const dates = recentSnapshots.map(s => s.date);
    const totalUnits = recentSnapshots.map(s => s.totalUnits);
    const avgProgress = recentSnapshots.map(s => s.avgProgress);

    const bottleneckFrequency: Record<string, number> = {};
    recentSnapshots.forEach(s => {
      if (s.bottleneckStage) {
        bottleneckFrequency[s.bottleneckStage] = (bottleneckFrequency[s.bottleneckStage] || 0) + 1;
      }
    });

    return { dates, totalUnits, avgProgress, bottleneckFrequency };
  }

  /**
   * Get orders by customer with WIP status
   */
  getCustomerWIP(customer?: string): {
    customer: string;
    orders: number;
    totalUnits: number;
    completed: number;
    inProgress: number;
    delayed: number;
  }[] {
    const records = customer
      ? Array.from(this.wipRecords.values()).filter(r => r.customer === customer)
      : Array.from(this.wipRecords.values());

    const customerMap: Record<string, {
      orders: WIPRecord[];
      totalUnits: number;
      completed: number;
      inProgress: number;
      delayed: number;
    }> = {};

    records.forEach(r => {
      if (!customerMap[r.customer]) {
        customerMap[r.customer] = { orders: [], totalUnits: 0, completed: 0, inProgress: 0, delayed: 0 };
      }

      customerMap[r.customer].orders.push(r);
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
      orders: data.orders.length,
      totalUnits: data.totalUnits,
      completed: data.completed,
      inProgress: data.inProgress,
      delayed: data.delayed
    }));
  }

  /**
   * Predict completion date for an order
   */
  predictCompletion(orderId: string): {
    estimatedDate: Date;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    factors: string[];
  } | null {
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

  // ===== PRIVATE METHODS =====

  private recalculateProgress(record: WIPRecord): void {
    const totalOutput = record.stages.reduce((sum, s) => sum + s.outputQuantity, 0);
    const finalStage = record.stages[record.stages.length - 1];

    if (finalStage.outputQuantity === record.totalQuantity) {
      record.overallProgress = 100;
      record.status = 'COMPLETED';
    } else {
      // Weight progress by stage completion
      const stageWeight = 100 / record.stages.length;
      const completedStages = record.stages.filter(s => s.outputQuantity >= s.inputQuantity).length;
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
        if (!stage.startDate && stage.inProgress > 0) {
          stage.startDate = new Date();
        }
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

// ===== EXAMPLE: Tracking Orders Through Production =====

const wip = new WIPTracker();

// Register new order
wip.registerOrder({
  orderId: 'ORD-2025-001',
  styleNumber: 'SS-2025-042',
  customer: 'ABC Exports',
  totalQuantity: 1000,
  orderDate: new Date('2025-04-20'),
  plannedDispatchDate: new Date('2025-04-30'),
  estimatedCompletionDate: new Date('2025-04-29')
});

// Update knitting progress
wip.updateStage('ORD-2025-001', 'KNITTING', {
  inputQuantity: 1000,
  outputQuantity: 600,
  inProgress: 200,
  efficiency: 92
});

// Move completed pieces to linking
wip.moveToNextStage('ORD-2025-001', 'KNITTING', 300);

// Update linking
wip.updateStage('ORD-2025-001', 'LINKING', {
  inputQuantity: 300,
  outputQuantity: 150,
  inProgress: 100,
  efficiency: 88
});

// Take daily snapshot
const snapshot = wip.takeSnapshot();
console.log('WIP Snapshot:', snapshot);

// Get dashboard
const dashboard = wip.getDashboard();
console.log('Active Orders:', dashboard.totalActiveOrders);
console.log('Bottleneck:', dashboard.bottleneckStages);

// Predict completion
const prediction = wip.predictCompletion('ORD-2025-001');
console.log('Completion Prediction:', prediction);

export { WIPTracker, WIPRecord, WIPStage, WIPSnapshot, ProductionStage };
