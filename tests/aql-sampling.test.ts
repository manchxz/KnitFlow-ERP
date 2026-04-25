/**
 * Unit Tests for AQL (Acceptable Quality Level) Sampling System
 *
 * Tests MIL-STD-105E based statistical sampling for textile inspection.
 * Validates accept/reject decisions based on defect counts.
 */

interface AQLParams {
  lotSize: number;
  inspectionLevel: 'I' | 'II' | 'III' | 'S-2' | 'S-3' | 'S-4';
  aqlLevel: 0.065 | 0.10 | 0.15 | 0.25 | 0.40 | 0.65 | 1.0 | 1.5 | 2.5 | 4.0;
  inspectionType: 'single' | 'double' | 'multiple';
}

interface SamplingPlan {
  sampleSize: number;
  acceptNumber: number;
  rejectNumber: number;
  aqlLevel: number;
}

interface InspectionResult {
  lotId: string;
  sampleSize: number;
  defectsFound: number;
  decision: 'ACCEPT' | 'REJECT';
  confidence: number;
  recommendations: string[];
}

interface DefectRecord {
  rollId: string;
  defectType: string;
  severity: 'critical' | 'major' | 'minor';
  points: number;
  location: string;
}

class AQLInspector {
  private sampleSizeCodeTable: Record<string, string> = {
    '2-8_I': 'A', '2-8_II': 'A', '2-8_III': 'B',
    '9-15_I': 'A', '9-15_II': 'B', '9-15_III': 'C',
    '16-25_I': 'B', '16-25_II': 'C', '16-25_III': 'D',
    '26-50_I': 'B', '26-50_II': 'D', '26-50_III': 'E',
    '51-90_I': 'C', '51-90_II': 'E', '51-90_III': 'F',
    '91-150_I': 'C', '91-150_II': 'F', '91-150_III': 'G',
    '151-280_I': 'D', '151-280_II': 'G', '151-280_III': 'H',
    '281-500_I': 'E', '281-500_II': 'H', '281-500_III': 'J',
    '501-1200_I': 'E', '501-1200_II': 'J', '501-1200_III': 'K',
    '1201-3200_I': 'F', '1201-3200_II': 'K', '1201-3200_III': 'L',
    '3201-10000_I': 'G', '3201-10000_II': 'L', '3201-10000_III': 'M',
    '10001-35000_I': 'H', '10001-35000_II': 'M', '10001-35000_III': 'N',
    '35001-150000_I': 'I', '35001-150000_II': 'N', '35001-150000_III': 'P',
    '150001-500000_I': 'J', '150001-500000_II': 'P', '150001-500000_III': 'Q',
    '500001+_I': 'K', '500001+_II': 'Q', '500001+_III': 'R',
  };

  private sampleSizeTable: Record<string, number> = {
    'A': 2, 'B': 3, 'C': 5, 'D': 8, 'E': 13, 'F': 20,
    'G': 32, 'H': 50, 'J': 80, 'K': 125, 'L': 200, 'M': 315,
    'N': 500, 'P': 800, 'Q': 1250, 'R': 2000
  };

  private aqlTable: Record<string, { accept: number; reject: number }> = {
    'A_0.065': { accept: 0, reject: 1 },
    'D_0.65': { accept: 0, reject: 1 },
    'E_1.0': { accept: 0, reject: 1 },
    'F_1.5': { accept: 0, reject: 1 },
    'G_1.5': { accept: 0, reject: 1 },
    'G_2.5': { accept: 1, reject: 2 },
    'H_1.5': { accept: 1, reject: 2 },
    'H_2.5': { accept: 2, reject: 3 },
    'H_4.0': { accept: 3, reject: 4 },
    'J_1.5': { accept: 2, reject: 3 },
    'J_2.5': { accept: 3, reject: 4 },
    'J_4.0': { accept: 5, reject: 6 },
    'K_1.5': { accept: 3, reject: 4 },
    'K_2.5': { accept: 5, reject: 6 },
    'K_4.0': { accept: 7, reject: 8 },
    'L_1.5': { accept: 5, reject: 6 },
    'L_2.5': { accept: 7, reject: 8 },
    'L_4.0': { accept: 10, reject: 11 },
  };

  getSamplingPlan(params: AQLParams): SamplingPlan {
    const codeLetter = this.getSampleSizeCodeLetter(params.lotSize, params.inspectionLevel);
    const sampleSize = this.sampleSizeTable[codeLetter];
    const key = `${codeLetter}_${params.aqlLevel}`;
    const aqlData = this.aqlTable[key] || { accept: 0, reject: 1 };

    return {
      sampleSize,
      acceptNumber: aqlData.accept,
      rejectNumber: aqlData.reject,
      aqlLevel: params.aqlLevel
    };
  }

  inspectLot(lotId: string, params: AQLParams, defects: DefectRecord[]): InspectionResult {
    const plan = this.getSamplingPlan(params);
    const sampleDefects = defects.slice(0, plan.sampleSize);
    const totalDefects = sampleDefects.reduce((sum, d) =>
      sum + (d.severity === 'critical' ? 4 : d.severity === 'major' ? 2 : 1), 0);
    const criticalDefects = sampleDefects.filter(d => d.severity === 'critical').length;

    let decision: 'ACCEPT' | 'REJECT';
    if (criticalDefects > 0) {
      decision = 'REJECT';
    } else if (totalDefects <= plan.acceptNumber) {
      decision = 'ACCEPT';
    } else if (totalDefects >= plan.rejectNumber) {
      decision = 'REJECT';
    } else {
      decision = 'ACCEPT';
    }

    return {
      lotId,
      sampleSize: plan.sampleSize,
      defectsFound: totalDefects,
      decision,
      confidence: criticalDefects > 0 ? 99 : totalDefects <= plan.acceptNumber ? 95 : 70,
      recommendations: decision === 'REJECT' ? ['Lot rejected - Review production process'] : ['Lot meets quality standards']
    };
  }

  getInspectionStats(lotResults: InspectionResult[]) {
    const totalLots = lotResults.length;
    const acceptedLots = lotResults.filter(r => r.decision === 'ACCEPT').length;
    const avgDefectRate = lotResults.reduce((sum, r) => sum + (r.defectsFound / r.sampleSize), 0) / totalLots * 100;

    return {
      totalLots,
      acceptedLots,
      rejectedLots: totalLots - acceptedLots,
      acceptanceRate: (acceptedLots / totalLots) * 100,
      avgDefectRate,
      qualityTrend: 'STABLE' as const
    };
  }

  getRecommendedAQL(fabricType: string, customerTier: 'premium' | 'standard' | 'value'): number {
    const recommendations: Record<string, Record<string, number>> = {
      'premium': { 'sweater': 1.0, 'tshirt': 1.0, 'woven': 0.65, 'knit': 1.0 },
      'standard': { 'sweater': 1.5, 'tshirt': 1.5, 'woven': 1.0, 'knit': 1.5 },
      'value': { 'sweater': 2.5, 'tshirt': 2.5, 'woven': 1.5, 'knit': 2.5 }
    };

    return recommendations[customerTier][fabricType] || 1.5;
  }

  private getSampleSizeCodeLetter(lotSize: number, level: string): string {
    const range = this.getLotSizeRange(lotSize);
    return this.sampleSizeCodeTable[`${range}_${level}`] || 'K';
  }

  private getLotSizeRange(lotSize: number): string {
    if (lotSize <= 8) return '2-8';
    if (lotSize <= 15) return '9-15';
    if (lotSize <= 25) return '16-25';
    if (lotSize <= 50) return '26-50';
    if (lotSize <= 90) return '51-90';
    if (lotSize <= 150) return '91-150';
    if (lotSize <= 280) return '151-280';
    if (lotSize <= 500) return '281-500';
    if (lotSize <= 1200) return '501-1200';
    if (lotSize <= 3200) return '1201-3200';
    if (lotSize <= 10000) return '3201-10000';
    if (lotSize <= 35000) return '10001-35000';
    if (lotSize <= 150000) return '35001-150000';
    if (lotSize <= 500000) return '150001-500000';
    return '500001+';
  }
}

describe('AQLInspector', () => {
  let inspector: AQLInspector;

  beforeEach(() => {
    inspector = new AQLInspector();
  });

  describe('Sampling Plan Generation', () => {
    it('should calculate sample size for small lot (50 rolls)', () => {
      const params: AQLParams = {
        lotSize: 50,
        inspectionLevel: 'II',
        aqlLevel: 1.5,
        inspectionType: 'single'
      };

      const plan = inspector.getSamplingPlan(params);

      expect(plan.sampleSize).toBeGreaterThan(0);
      expect(plan.aqlLevel).toBe(1.5);
      expect(plan.acceptNumber).toBeDefined();
      expect(plan.rejectNumber).toBeDefined();
    });

    it('should calculate sample size for large lot (5000 rolls)', () => {
      const params: AQLParams = {
        lotSize: 5000,
        inspectionLevel: 'II',
        aqlLevel: 1.5,
        inspectionType: 'single'
      };

      const plan = inspector.getSamplingPlan(params);

      expect(plan.sampleSize).toBeGreaterThan(100); // Larger samples for larger lots
      expect(plan.acceptNumber).toBeGreaterThan(0);
    });

    it('should use larger sample for Level III (tightened)', () => {
      const level2 = inspector.getSamplingPlan({
        lotSize: 1000, inspectionLevel: 'II', aqlLevel: 1.5, inspectionType: 'single'
      });
      const level3 = inspector.getSamplingPlan({
        lotSize: 1000, inspectionLevel: 'III', aqlLevel: 1.5, inspectionType: 'single'
      });

      expect(level3.sampleSize).toBeGreaterThan(level2.sampleSize);
    });
  });

  describe('Accept/Reject Decisions', () => {
    it('should ACCEPT lot when defects ≤ accept number', () => {
      const params: AQLParams = {
        lotSize: 500,
        inspectionLevel: 'II',
        aqlLevel: 1.5,
        inspectionType: 'single'
      };

      const defects: DefectRecord[] = [
        { rollId: 'R-001', defectType: 'Stain', severity: 'minor', points: 1, location: 'edge' },
        { rollId: 'R-002', defectType: 'Hole', severity: 'minor', points: 1, location: 'center' }
      ];

      const result = inspector.inspectLot('LOT-001', params, defects);
      expect(result.decision).toBe('ACCEPT');
    });

    it('should REJECT lot when defects ≥ reject number', () => {
      const params: AQLParams = {
        lotSize: 500,
        inspectionLevel: 'II',
        aqlLevel: 1.5,
        inspectionType: 'single'
      };

      // Create many defects to trigger rejection
      const defects: DefectRecord[] = Array(20).fill(null).map((_, i) => ({
        rollId: `R-${i}`,
        defectType: 'Stain',
        severity: 'major',
        points: 2,
        location: 'center'
      }));

      const result = inspector.inspectLot('LOT-001', params, defects);
      expect(result.decision).toBe('REJECT');
    });

    it('should auto-REJECT lot with critical defects', () => {
      const params: AQLParams = {
        lotSize: 500,
        inspectionLevel: 'II',
        aqlLevel: 1.5,
        inspectionType: 'single'
      };

      const defects: DefectRecord[] = [
        { rollId: 'R-001', defectType: 'Contamination', severity: 'critical', points: 4, location: 'center' }
      ];

      const result = inspector.inspectLot('LOT-001', params, defects);
      expect(result.decision).toBe('REJECT');
      expect(result.confidence).toBe(99);
    });
  });

  describe('AQL Level Recommendations', () => {
    it('should recommend AQL 1.0 for premium sweaters', () => {
      const aql = inspector.getRecommendedAQL('sweater', 'premium');
      expect(aql).toBe(1.0);
    });

    it('should recommend AQL 1.5 for standard knitwear', () => {
      const aql = inspector.getRecommendedAQL('knit', 'standard');
      expect(aql).toBe(1.5);
    });

    it('should recommend AQL 2.5 for value products', () => {
      const aql = inspector.getRecommendedAQL('tshirt', 'value');
      expect(aql).toBe(2.5);
    });

    it('should recommend stricter AQL for woven fabrics', () => {
      const premiumWoven = inspector.getRecommendedAQL('woven', 'premium');
      expect(premiumWoven).toBe(0.65); // Stricter than knitwear
    });
  });

  describe('Inspection Statistics', () => {
    it('should calculate acceptance rate across multiple lots', () => {
      const results = [
        { lotId: 'LOT-001', sampleSize: 80, defectsFound: 1, decision: 'ACCEPT' as const, confidence: 95, recommendations: [] },
        { lotId: 'LOT-002', sampleSize: 80, defectsFound: 2, decision: 'ACCEPT' as const, confidence: 95, recommendations: [] },
        { lotId: 'LOT-003', sampleSize: 80, defectsFound: 5, decision: 'REJECT' as const, confidence: 70, recommendations: [] }
      ];

      const stats = inspector.getInspectionStats(results);

      expect(stats.totalLots).toBe(3);
      expect(stats.acceptedLots).toBe(2);
      expect(stats.rejectedLots).toBe(1);
      expect(stats.acceptanceRate).toBeCloseTo(66.67, 2);
    });

    it('should calculate average defect rate', () => {
      const results = [
        { lotId: 'LOT-001', sampleSize: 100, defectsFound: 2, decision: 'ACCEPT' as const, confidence: 95, recommendations: [] },
        { lotId: 'LOT-002', sampleSize: 100, defectsFound: 3, decision: 'ACCEPT' as const, confidence: 95, recommendations: [] }
      ];

      const stats = inspector.getInspectionStats(results);

      expect(stats.avgDefectRate).toBe(2.5); // (2/100 + 3/100) / 2 = 2.5%
    });
  });

  describe('Real-world textile scenarios', () => {
    it('should handle fabric roll inspection scenario', () => {
      const params: AQLParams = {
        lotSize: 100, // 100 rolls
        inspectionLevel: 'II',
        aqlLevel: 1.5,
        inspectionType: 'single'
      };

      // Industry-standard 4-point defects
      const defects: DefectRecord[] = [
        { rollId: 'R-005', defectType: 'Needle line', severity: 'major', points: 2, location: 'face' },
        { rollId: 'R-023', defectType: 'Hole', severity: 'major', points: 4, location: 'body' },
        { rollId: 'R-067', defectType: 'Stain', severity: 'minor', points: 2, location: 'edge' }
      ];

      const result = inspector.inspectLot('FAB-2025-001', params, defects);

      expect(result.sampleSize).toBeGreaterThan(0);
      expect(result.defectsFound).toBe(8); // 2 + 4 + 2
      expect(result.decision).toBeDefined();
    });

    it('should handle premium quality inspection (AQL 1.0)', () => {
      const params: AQLParams = {
        lotSize: 200,
        inspectionLevel: 'II',
        aqlLevel: 1.0,
        inspectionType: 'single'
      };

      // Only 1 minor defect in sample
      const defects: DefectRecord[] = [
        { rollId: 'R-001', defectType: 'Slub', severity: 'minor', points: 1, location: 'selvedge' }
      ];

      const result = inspector.inspectLot('PREM-2025-001', params, defects);

      expect(result.decision).toBe('ACCEPT');
    });
  });
});
