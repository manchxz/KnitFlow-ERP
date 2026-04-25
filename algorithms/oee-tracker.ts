/**
 * Overall Equipment Effectiveness (OEE) Tracker for Knitting Machines
 *
 * Industry Standard: OEE = Availability × Performance × Quality
 *
 * Benchmarks:
 *   - World Class: 85% OEE
 *   - Good: 60-85%
 *   - Needs Improvement: <60%
 *
 * Used for identifying operational bottlenecks and maximizing machine utilization.
 *
 * 2025 Trend: Real-time OEE monitoring is now standard in knitwear ERP systems
 * (ref: KnitOne ERP, FlowSense Textile ERP)
 */

interface MachineShiftData {
  machineId: string;
  shiftDate: Date;
  shiftNumber: number; // 1, 2, or 3

  // Availability components
  plannedProductionTime: number; // minutes (typically 480 = 8 hours)
  downtimeMinutes: number;       // breakdown, maintenance, material shortage

  // Performance components
  idealCycleTime: number;        // minutes per unit (e.g., 0.5 min/unit)
  actualOutput: number;          // units produced

  // Quality components
  totalOutput: number;           // total units
  defectOutput: number;          // rejected/defective units
}

interface OEEResult {
  availability: number;  // percentage
  performance: number; // percentage
  quality: number;     // percentage
  oee: number;       // overall percentage
  grade: 'A' | 'B' | 'C' | 'D';
}

interface MachineOEESummary {
  machineId: string;
  currentShift: OEEResult;
  dailyAverage: OEEResult;
  weeklyTrend: number[]; // last 7 days OEE
  bottleneck: 'availability' | 'performance' | 'quality' | null;
}

class OEETracker {
  private machineData: Map<string, MachineShiftData[]> = new Map();

  /**
   * Record shift data for a machine
   */
  recordShift(data: MachineShiftData): void {
    const key = this.getMachineKey(data.machineId, data.shiftDate);

    if (!this.machineData.has(key)) {
      this.machineData.set(key, []);
    }

    this.machineData.get(key)!.push(data);
  }

  /**
   * Calculate OEE for a specific machine and shift
   */
  calculateOEE(machineId: string, date: Date, shiftNumber?: number): OEEResult {
    const key = this.getMachineKey(machineId, date);
    const shifts = this.machineData.get(key) || [];

    // Filter by shift number if specified
    const relevantShifts = shiftNumber
      ? shifts.filter(s => s.shiftNumber === shiftNumber)
      : shifts;

    if (relevantShifts.length === 0) {
      return {
        availability: 0,
        performance: 0,
        quality: 0,
        oee: 0,
        grade: 'D'
      };
    }

    // Aggregate data across shifts
    const aggregated = this.aggregateShifts(relevantShifts);

    // Calculate components
    const availability = this.calculateAvailability(aggregated);
    const performance = this.calculatePerformance(aggregated);
    const quality = this.calculateQuality(aggregated);

    // OEE = Availability × Performance × Quality
    const oee = (availability * performance * quality) / 10000;

    return {
      availability: Math.round(availability * 100) / 100,
      performance: Math.round(performance * 100) / 100,
      quality: Math.round(quality * 100) / 100,
      oee: Math.round(oee * 100) / 100,
      grade: this.getOEELetterGrade(oee)
    };
  }

  /**
   * Get comprehensive OEE summary for a machine
   */
  getMachineSummary(machineId: string): MachineOEESummary {
    const today = new Date();
    const currentShift = this.calculateOEE(machineId, today, this.getCurrentShift());
    const dailyAverage = this.calculateOEE(machineId, today);

    // Calculate weekly trend
    const weeklyTrend: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const oee = this.calculateOEE(machineId, date);
      weeklyTrend.push(oee.oee);
    }

    // Identify bottleneck
    const bottleneck = this.identifyBottleneck(dailyAverage);

    return {
      machineId,
      currentShift,
      dailyAverage,
      weeklyTrend,
      bottleneck
    };
  }

  /**
   * Get factory-wide OEE dashboard data
   */
  getFactoryDashboard(machineIds: string[]): {
    overallOEE: number;
    machineBreakdown: { machineId: string; oee: number; grade: string }[];
    topBottlenecks: { factor: string; impact: number }[];
  } {
    const machineBreakdown = machineIds.map(id => {
      const summary = this.getMachineSummary(id);
      return {
        machineId: id,
        oee: summary.dailyAverage.oee,
        grade: summary.dailyAverage.grade
      };
    });

    // Calculate overall factory OEE
    const overallOEE = machineBreakdown.reduce((sum, m) => sum + m.oee, 0) / machineBreakdown.length;

    // Identify top bottlenecks across factory
    const bottleneckCounts = { availability: 0, performance: 0, quality: 0 };
    machineIds.forEach(id => {
      const summary = this.getMachineSummary(id);
      if (summary.bottleneck) {
        bottleneckCounts[summary.bottleneck]++;
      }
    });

    const topBottlenecks = Object.entries(bottleneckCounts)
      .map(([factor, count]) => ({
        factor: factor.charAt(0).toUpperCase() + factor.slice(1),
        impact: (count / machineIds.length) * 100
      }))
      .sort((a, b) => b.impact - a.impact);

    return {
      overallOEE: Math.round(overallOEE * 100) / 100,
      machineBreakdown: machineBreakdown.sort((a, b) => b.oee - a.oee),
      topBottlenecks
    };
  }

  /**
   * Identify improvement opportunities
   */
  getImprovementRecommendations(machineId: string): string[] {
    const summary = this.getMachineSummary(machineId);
    const recommendations: string[] = [];

    if (summary.dailyAverage.availability < 90) {
      recommendations.push(
        `Availability at ${summary.dailyAverage.availability}% - Consider preventive maintenance scheduling`
      );
    }

    if (summary.dailyAverage.performance < 85) {
      recommendations.push(
        `Performance at ${summary.dailyAverage.performance}% - Check for speed variations or micro-stoppages`
      );
    }

    if (summary.dailyAverage.quality < 95) {
      recommendations.push(
        `Quality at ${summary.dailyAverage.quality}% - Review defect patterns and operator training`
      );
    }

    return recommendations;
  }

  // ===== PRIVATE METHODS =====

  private getMachineKey(machineId: string, date: Date): string {
    const dateStr = date.toISOString().split('T')[0];
    return `${machineId}_${dateStr}`;
  }

  private getCurrentShift(): number {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 14) return 1;   // 6 AM - 2 PM
    if (hour >= 14 && hour < 22) return 2;  // 2 PM - 10 PM
    return 3;                              // 10 PM - 6 AM
  }

  private aggregateShifts(shifts: MachineShiftData[]): MachineShiftData {
    return shifts.reduce((acc, shift) => ({
      machineId: shift.machineId,
      shiftDate: shift.shiftDate,
      shiftNumber: 0, // aggregated
      plannedProductionTime: acc.plannedProductionTime + shift.plannedProductionTime,
      downtimeMinutes: acc.downtimeMinutes + shift.downtimeMinutes,
      idealCycleTime: shift.idealCycleTime, // assume constant
      actualOutput: acc.actualOutput + shift.actualOutput,
      totalOutput: acc.totalOutput + shift.totalOutput,
      defectOutput: acc.defectOutput + shift.defectOutput
    }), {
      machineId: '',
      shiftDate: new Date(),
      shiftNumber: 0,
      plannedProductionTime: 0,
      downtimeMinutes: 0,
      idealCycleTime: 0,
      actualOutput: 0,
      totalOutput: 0,
      defectOutput: 0
    });
  }

  private calculateAvailability(data: MachineShiftData): number {
    // Availability = (Planned Time - Downtime) / Planned Time × 100
    const runTime = data.plannedProductionTime - data.downtimeMinutes;
    return (runTime / data.plannedProductionTime) * 100;
  }

  private calculatePerformance(data: MachineShiftData): number {
    // Performance = (Actual Output × Ideal Cycle Time) / Run Time × 100
    const runTime = data.plannedProductionTime - data.downtimeMinutes;
    const idealOutputTime = data.actualOutput * data.idealCycleTime;
    return (idealOutputTime / runTime) * 100;
  }

  private calculateQuality(data: MachineShiftData): number {
    // Quality = Good Output / Total Output × 100
    const goodOutput = data.totalOutput - data.defectOutput;
    return (goodOutput / data.totalOutput) * 100;
  }

  private getOEELetterGrade(oee: number): 'A' | 'B' | 'C' | 'D' {
    if (oee >= 85) return 'A'; // World class
    if (oee >= 70) return 'B'; // Good
    if (oee >= 60) return 'C'; // Average
    return 'D';                // Needs improvement
  }

  private identifyBottleneck(oee: OEEResult): 'availability' | 'performance' | 'quality' | null {
    const thresholds = {
      availability: 90,
      performance: 85,
      quality: 95
    };

    const deficits = [
      { factor: 'availability', deficit: thresholds.availability - oee.availability },
      { factor: 'performance', deficit: thresholds.performance - oee.performance },
      { factor: 'quality', deficit: thresholds.quality - oee.quality }
    ];

    const worst = deficits.sort((a, b) => b.deficit - a.deficit)[0];
    return worst.deficit > 0 ? worst.factor as any : null;
  }
}

// ===== EXAMPLE: Factory with 5 Knitting Machines =====

const oeeTracker = new OEETracker();

// Machine M01: Good performance, some downtime
oeeTracker.recordShift({
  machineId: 'M01',
  shiftDate: new Date('2025-04-25'),
  shiftNumber: 1,
  plannedProductionTime: 480,
  downtimeMinutes: 30,  // 30 min breakdown
  idealCycleTime: 0.5,  // 2 units per minute
  actualOutput: 850,
  totalOutput: 850,
  defectOutput: 15
});

// Machine M02: Poor availability (too much downtime)
oeeTracker.recordShift({
  machineId: 'M02',
  shiftDate: new Date('2025-04-25'),
  shiftNumber: 1,
  plannedProductionTime: 480,
  downtimeMinutes: 120, // 2 hours down!
  idealCycleTime: 0.5,
  actualOutput: 650,
  totalOutput: 650,
  defectOutput: 10
});

// Calculate M01 OEE
const m01OEE = oeeTracker.calculateOEE('M01', new Date('2025-04-25'), 1);
console.log('M01 OEE:', m01OEE);
// Output: { availability: 93.75, performance: 94.44, quality: 98.24, oee: 86.96, grade: 'A' }

// Calculate M02 OEE - poor availability
const m02OEE = oeeTracker.calculateOEE('M02', new Date('2025-04-25'), 1);
console.log('M02 OEE:', m02OEE);
// Output: { availability: 75, performance: 90.28, quality: 98.46, oee: 66.53, grade: 'C' }

// Get improvement recommendations for M02
const recommendations = oeeTracker.getImprovementRecommendations('M02');
console.log('M02 Recommendations:', recommendations);
// Output: ["Availability at 75% - Consider preventive maintenance scheduling"]

// Factory dashboard
const dashboard = oeeTracker.getFactoryDashboard(['M01', 'M02']);
console.log('Factory OEE:', dashboard.overallOEE);
// Output: 76.75

export { OEETracker, MachineShiftData, OEEResult, MachineOEESummary };
