/**
 * Unit Tests for OEE (Overall Equipment Effectiveness) Tracker
 *
 * Tests the industry-standard OEE calculation for knitting machines.
 * Validates Availability × Performance × Quality formula.
 */

interface MachineShiftData {
  machineId: string;
  shiftDate: Date;
  shiftNumber: number;
  plannedProductionTime: number;
  downtimeMinutes: number;
  idealCycleTime: number;
  actualOutput: number;
  totalOutput: number;
  defectOutput: number;
}

interface OEEResult {
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  grade: 'A' | 'B' | 'C' | 'D';
}

class OEETracker {
  private machineData: Map<string, MachineShiftData[]> = new Map();

  recordShift(data: MachineShiftData): void {
    const key = this.getMachineKey(data.machineId, data.shiftDate);
    if (!this.machineData.has(key)) {
      this.machineData.set(key, []);
    }
    this.machineData.get(key)!.push(data);
  }

  calculateOEE(machineId: string, date: Date, shiftNumber?: number): OEEResult {
    const key = this.getMachineKey(machineId, date);
    const shifts = this.machineData.get(key) || [];
    const relevantShifts = shiftNumber
      ? shifts.filter(s => s.shiftNumber === shiftNumber)
      : shifts;

    if (relevantShifts.length === 0) {
      return { availability: 0, performance: 0, quality: 0, oee: 0, grade: 'D' };
    }

    const aggregated = this.aggregateShifts(relevantShifts);
    const availability = this.calculateAvailability(aggregated);
    const performance = this.calculatePerformance(aggregated);
    const quality = this.calculateQuality(aggregated);
    const oee = (availability * performance * quality) / 10000;

    return {
      availability: Math.round(availability * 100) / 100,
      performance: Math.round(performance * 100) / 100,
      quality: Math.round(quality * 100) / 100,
      oee: Math.round(oee * 100) / 100,
      grade: this.getGrade(oee)
    };
  }

  getImprovementRecommendations(machineId: string): string[] {
    const today = new Date();
    const oee = this.calculateOEE(machineId, today);
    const recommendations: string[] = [];

    if (oee.availability < 90) {
      recommendations.push(`Availability at ${oee.availability}% - Consider preventive maintenance`);
    }
    if (oee.performance < 85) {
      recommendations.push(`Performance at ${oee.performance}% - Check for speed variations`);
    }
    if (oee.quality < 95) {
      recommendations.push(`Quality at ${oee.quality}% - Review defect patterns`);
    }

    return recommendations;
  }

  private getMachineKey(machineId: string, date: Date): string {
    return `${machineId}_${date.toISOString().split('T')[0]}`;
  }

  private aggregateShifts(shifts: MachineShiftData[]): MachineShiftData {
    return shifts.reduce((acc, shift) => ({
      machineId: shift.machineId,
      shiftDate: shift.shiftDate,
      shiftNumber: 0,
      plannedProductionTime: acc.plannedProductionTime + shift.plannedProductionTime,
      downtimeMinutes: acc.downtimeMinutes + shift.downtimeMinutes,
      idealCycleTime: shift.idealCycleTime,
      actualOutput: acc.actualOutput + shift.actualOutput,
      totalOutput: acc.totalOutput + shift.totalOutput,
      defectOutput: acc.defectOutput + shift.defectOutput
    }), {
      machineId: '', shiftDate: new Date(), shiftNumber: 0,
      plannedProductionTime: 0, downtimeMinutes: 0, idealCycleTime: 0,
      actualOutput: 0, totalOutput: 0, defectOutput: 0
    });
  }

  private calculateAvailability(data: MachineShiftData): number {
    const runTime = data.plannedProductionTime - data.downtimeMinutes;
    return (runTime / data.plannedProductionTime) * 100;
  }

  private calculatePerformance(data: MachineShiftData): number {
    const runTime = data.plannedProductionTime - data.downtimeMinutes;
    const idealOutputTime = data.actualOutput * data.idealCycleTime;
    return (idealOutputTime / runTime) * 100;
  }

  private calculateQuality(data: MachineShiftData): number {
    const goodOutput = data.totalOutput - data.defectOutput;
    return (goodOutput / data.totalOutput) * 100;
  }

  private getGrade(oee: number): 'A' | 'B' | 'C' | 'D' {
    if (oee >= 85) return 'A';
    if (oee >= 70) return 'B';
    if (oee >= 60) return 'C';
    return 'D';
  }
}

describe('OEETracker', () => {
  let tracker: OEETracker;

  beforeEach(() => {
    tracker = new OEETracker();
  });

  describe('OEE Formula', () => {
    it('should calculate OEE = Availability × Performance × Quality', () => {
      tracker.recordShift({
        machineId: 'M01',
        shiftDate: new Date('2025-04-25'),
        shiftNumber: 1,
        plannedProductionTime: 480,
        downtimeMinutes: 48,  // 10% downtime
        idealCycleTime: 0.5,
        actualOutput: 800,
        totalOutput: 800,
        defectOutput: 16      // 2% defects
      });

      const oee = tracker.calculateOEE('M01', new Date('2025-04-25'), 1);

      // Availability: (480-48)/480 = 90%
      expect(oee.availability).toBe(90);
      // Performance: (800×0.5)/(480-48) = 400/432 = 92.59%
      expect(oee.performance).toBeCloseTo(92.59, 2);
      // Quality: (800-16)/800 = 98%
      expect(oee.quality).toBe(98);
      // OEE: 0.90 × 0.9259 × 0.98 = 81.6%
      expect(oee.oee).toBeCloseTo(81.67, 2);
    });

    it('should return Grade A for world-class OEE (≥85%)', () => {
      tracker.recordShift({
        machineId: 'M01',
        shiftDate: new Date('2025-04-25'),
        shiftNumber: 1,
        plannedProductionTime: 480,
        downtimeMinutes: 24,  // 5% downtime
        idealCycleTime: 0.5,
        actualOutput: 860,    // 95% efficiency
        totalOutput: 860,
        defectOutput: 8.6     // 1% defects
      });

      const oee = tracker.calculateOEE('M01', new Date('2025-04-25'), 1);
      expect(oee.oee).toBeGreaterThanOrEqual(85);
      expect(oee.grade).toBe('A');
    });

    it('should return Grade D for poor OEE (<60%)', () => {
      tracker.recordShift({
        machineId: 'M01',
        shiftDate: new Date('2025-04-25'),
        shiftNumber: 1,
        plannedProductionTime: 480,
        downtimeMinutes: 240, // 50% downtime!
        idealCycleTime: 0.5,
        actualOutput: 400,    // 50% speed
        totalOutput: 400,
        defectOutput: 40      // 10% defects
      });

      const oee = tracker.calculateOEE('M01', new Date('2025-04-25'), 1);
      expect(oee.oee).toBeLessThan(60);
      expect(oee.grade).toBe('D');
    });
  });

  describe('Availability Calculation', () => {
    it('should calculate 100% availability with no downtime', () => {
      tracker.recordShift({
        machineId: 'M01',
        shiftDate: new Date('2025-04-25'),
        shiftNumber: 1,
        plannedProductionTime: 480,
        downtimeMinutes: 0,
        idealCycleTime: 0.5,
        actualOutput: 960,
        totalOutput: 960,
        defectOutput: 0
      });

      const oee = tracker.calculateOEE('M01', new Date('2025-04-25'), 1);
      expect(oee.availability).toBe(100);
    });

    it('should calculate availability with breakdown time', () => {
      tracker.recordShift({
        machineId: 'M01',
        shiftDate: new Date('2025-04-25'),
        shiftNumber: 1,
        plannedProductionTime: 480,
        downtimeMinutes: 60,  // 1 hour breakdown
        idealCycleTime: 0.5,
        actualOutput: 840,
        totalOutput: 840,
        defectOutput: 0
      });

      const oee = tracker.calculateOEE('M01', new Date('2025-04-25'), 1);
      expect(oee.availability).toBe(87.5); // (480-60)/480
    });
  });

  describe('Performance Calculation', () => {
    it('should calculate perfect performance at ideal speed', () => {
      tracker.recordShift({
        machineId: 'M01',
        shiftDate: new Date('2025-04-25'),
        shiftNumber: 1,
        plannedProductionTime: 480,
        downtimeMinutes: 0,
        idealCycleTime: 0.5,
        actualOutput: 960,   // 960 × 0.5 = 480 minutes
        totalOutput: 960,
        defectOutput: 0
      });

      const oee = tracker.calculateOEE('M01', new Date('2025-04-25'), 1);
      expect(oee.performance).toBe(100);
    });

    it('should detect slow running (reduced speed)', () => {
      tracker.recordShift({
        machineId: 'M01',
        shiftDate: new Date('2025-04-25'),
        shiftNumber: 1,
        plannedProductionTime: 480,
        downtimeMinutes: 0,
        idealCycleTime: 0.5,
        actualOutput: 768,   // 80% of ideal
        totalOutput: 768,
        defectOutput: 0
      });

      const oee = tracker.calculateOEE('M01', new Date('2025-04-25'), 1);
      expect(oee.performance).toBe(80);
    });
  });

  describe('Quality Calculation', () => {
    it('should calculate 100% quality with no defects', () => {
      tracker.recordShift({
        machineId: 'M01',
        shiftDate: new Date('2025-04-25'),
        shiftNumber: 1,
        plannedProductionTime: 480,
        downtimeMinutes: 0,
        idealCycleTime: 0.5,
        actualOutput: 800,
        totalOutput: 800,
        defectOutput: 0
      });

      const oee = tracker.calculateOEE('M01', new Date('2025-04-25'), 1);
      expect(oee.quality).toBe(100);
    });

    it('should calculate quality with defects', () => {
      tracker.recordShift({
        machineId: 'M01',
        shiftDate: new Date('2025-04-25'),
        shiftNumber: 1,
        plannedProductionTime: 480,
        downtimeMinutes: 0,
        idealCycleTime: 0.5,
        actualOutput: 1000,
        totalOutput: 1000,
        defectOutput: 50      // 5% defects
      });

      const oee = tracker.calculateOEE('M01', new Date('2025-04-25'), 1);
      expect(oee.quality).toBe(95);
    });
  });

  describe('Recommendations', () => {
    it('should recommend maintenance for low availability', () => {
      tracker.recordShift({
        machineId: 'M01',
        shiftDate: new Date(),
        shiftNumber: 1,
        plannedProductionTime: 480,
        downtimeMinutes: 60,
        idealCycleTime: 0.5,
        actualOutput: 800,
        totalOutput: 800,
        defectOutput: 8
      });

      const recommendations = tracker.getImprovementRecommendations('M01');
      expect(recommendations.some(r => r.includes('preventive maintenance'))).toBe(true);
    });

    it('should recommend defect review for low quality', () => {
      tracker.recordShift({
        machineId: 'M01',
        shiftDate: new Date(),
        shiftNumber: 1,
        plannedProductionTime: 480,
        downtimeMinutes: 0,
        idealCycleTime: 0.5,
        actualOutput: 1000,
        totalOutput: 1000,
        defectOutput: 80    // 8% defects = low quality
      });

      const recommendations = tracker.getImprovementRecommendations('M01');
      expect(recommendations.some(r => r.includes('defect patterns'))).toBe(true);
    });
  });

  describe('Real-world scenario', () => {
    it('should track world-class knitting machine performance', () => {
      // Simulate a high-performing machine
      tracker.recordShift({
        machineId: 'M01',
        shiftDate: new Date('2025-04-25'),
        shiftNumber: 1,
        plannedProductionTime: 480,
        downtimeMinutes: 12,   // 2.5% downtime (excellent)
        idealCycleTime: 0.5,
        actualOutput: 936,     // 98% speed
        totalOutput: 936,
        defectOutput: 4.68   // 0.5% defects (excellent)
      });

      const oee = tracker.calculateOEE('M01', new Date('2025-04-25'), 1);

      expect(oee.availability).toBeCloseTo(97.5, 1);
      expect(oee.performance).toBeCloseTo(98, 0);
      expect(oee.quality).toBe(99.5);
      expect(oee.oee).toBeGreaterThan(85); // World class
      expect(oee.grade).toBe('A');
    });

    it('should identify machine needing attention', () => {
      // Simulate a struggling machine
      tracker.recordShift({
        machineId: 'M02',
        shiftDate: new Date('2025-04-25'),
        shiftNumber: 1,
        plannedProductionTime: 480,
        downtimeMinutes: 96,   // 20% downtime (poor)
        idealCycleTime: 0.5,
        actualOutput: 700,   // Slow running
        totalOutput: 700,
        defectOutput: 35     // 5% defects
      });

      const oee = tracker.calculateOEE('M02', new Date('2025-04-25'), 1);
      const recommendations = tracker.getImprovementRecommendations('M02');

      expect(oee.grade).toBe('C');
      expect(recommendations.length).toBeGreaterThan(0);
    });
  });
});
