/**
 * Unit Tests for GST Calculation Engine
 *
 * Tests HSN lookup and GST calculation for textile manufacturing.
 * Validates intra-state (CGST/SGST) and inter-state (IGST) calculations.
 */

interface HSNEntry {
  code: string;
  description: string;
  rate: number;
}

interface GSTBreakdown {
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  totalAmount: number;
}

interface InvoiceLineItem {
  description: string;
  hsnCode: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  stateCode: string;
  companyState: string;
}

class GSTEngine {
  private hsnTable: Map<string, HSNEntry> = new Map([
    ['6109', { code: '6109', description: 'T-shirts, singlets', rate: 5 }],
    ['6110', { code: '6110', description: 'Sweaters, pullovers', rate: 5 }],
    ['6101', { code: '6101', description: 'Coats, overcoats', rate: 5 }],
    ['6103', { code: '6103', description: 'Suits, ensembles', rate: 12 }],
    ['6104', { code: '6104', description: 'Dresses', rate: 12 }],
    ['6106', { code: '6106', description: 'Blouses, shirts', rate: 5 }],
    ['6114', { code: '6114', description: ' scarves, shawls', rate: 5 }],
    ['6117', { code: '6117', description: 'Accessories (ties, gloves)', rate: 5 }],
  ]);

  private companyState: string = 'KA';

  getRate(hsnCode: string): number {
    const entry = this.hsnTable.get(hsnCode.substring(0, 4));
    return entry ? entry.rate : 18;
  }

  calculate(item: InvoiceLineItem): GSTBreakdown {
    const rate = this.getRate(item.hsnCode);
    const discountMultiplier = (100 - item.discountPercent) / 100;
    const totalAmount = item.quantity * item.unitPrice * discountMultiplier;

    const taxableValue = totalAmount / (1 + rate / 100);
    const totalTax = totalAmount - taxableValue;

    const isIntraState = item.stateCode === this.companyState;

    if (isIntraState) {
      const halfTax = this.round(totalTax / 2);
      return {
        taxableValue: this.round(taxableValue),
        cgst: halfTax,
        sgst: halfTax,
        igst: 0,
        totalTax: this.round(totalTax),
        totalAmount: this.round(totalAmount)
      };
    } else {
      return {
        taxableValue: this.round(taxableValue),
        cgst: 0,
        sgst: 0,
        igst: this.round(totalTax),
        totalTax: this.round(totalTax),
        totalAmount: this.round(totalAmount)
      };
    }
  }

  calculateInvoice(items: InvoiceLineItem[]): {
    items: (InvoiceLineItem & GSTBreakdown)[];
    totals: GSTBreakdown;
  } {
    const calculatedItems = items.map(item => ({
      ...item,
      ...this.calculate(item)
    }));

    const totals: GSTBreakdown = calculatedItems.reduce(
      (acc, item) => ({
        taxableValue: acc.taxableValue + item.taxableValue,
        cgst: acc.cgst + item.cgst,
        sgst: acc.sgst + item.sgst,
        igst: acc.igst + item.igst,
        totalTax: acc.totalTax + item.totalTax,
        totalAmount: acc.totalAmount + item.totalAmount
      }),
      { taxableValue: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0, totalAmount: 0 }
    );

    return { items: calculatedItems, totals };
  }

  generateEWayBill(invoiceValue: number, distance: number): {
    required: boolean;
    validity: string;
  } {
    const required = invoiceValue > 50000;
    let validity: string;

    if (distance <= 100) validity = '1 day';
    else if (distance <= 300) validity = '3 days';
    else if (distance <= 500) validity = '5 days';
    else if (distance <= 1000) validity = '10 days';
    else validity = '15 days';

    return { required, validity };
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

describe('GSTEngine', () => {
  let gst: GSTEngine;

  beforeEach(() => {
    gst = new GSTEngine();
  });

  describe('getRate', () => {
    it('should return 5% for T-shirts (HSN 6109)', () => {
      expect(gst.getRate('6109')).toBe(5);
    });

    it('should return 5% for Sweaters (HSN 6110)', () => {
      expect(gst.getRate('6110')).toBe(5);
    });

    it('should return 12% for Suits (HSN 6103)', () => {
      expect(gst.getRate('6103')).toBe(12);
    });

    it('should return 18% for unknown HSN codes', () => {
      expect(gst.getRate('9999')).toBe(18);
    });
  });

  describe('calculate', () => {
    it('should calculate 5% GST for intra-state sweater order', () => {
      const item: InvoiceLineItem = {
        description: 'Navy Blue Wool Sweater',
        hsnCode: '6110',
        quantity: 100,
        unitPrice: 1000,
        discountPercent: 5,
        stateCode: 'KA',
        companyState: 'KA'
      };

      const result = gst.calculate(item);

      // Expected: 100 * 1000 * 0.95 = 95,000 (after discount)
      // Taxable value: 95,000 / 1.05 = 90,476.19
      expect(result.taxableValue).toBeCloseTo(90476.19, 2);
      expect(result.cgst).toBeCloseTo(2380.95, 2);
      expect(result.sgst).toBeCloseTo(2380.95, 2);
      expect(result.igst).toBe(0);
      expect(result.totalTax).toBeCloseTo(4761.90, 2);
      expect(result.totalAmount).toBeCloseTo(95238.09, 2);
    });

    it('should calculate 12% GST for intra-state suit order', () => {
      const item: InvoiceLineItem = {
        description: 'Formal Suit',
        hsnCode: '6103',
        quantity: 10,
        unitPrice: 5000,
        discountPercent: 0,
        stateCode: 'KA',
        companyState: 'KA'
      };

      const result = gst.calculate(item);

      // Expected: 10 * 5000 = 50,000
      // Taxable value: 50,000 / 1.12 = 44,642.86
      expect(result.taxableValue).toBeCloseTo(44642.86, 2);
      expect(result.cgst).toBeCloseTo(2678.57, 2);
      expect(result.sgst).toBeCloseTo(2678.57, 2);
      expect(result.totalTax).toBeCloseTo(5357.14, 2);
    });

    it('should calculate IGST for inter-state orders', () => {
      const item: InvoiceLineItem = {
        description: 'T-shirt',
        hsnCode: '6109',
        quantity: 100,
        unitPrice: 500,
        discountPercent: 0,
        stateCode: 'TN', // Tamil Nadu (different from KA)
        companyState: 'KA'
      };

      const result = gst.calculate(item);

      // Expected: 5% IGST (full), no CGST/SGST
      expect(result.cgst).toBe(0);
      expect(result.sgst).toBe(0);
      expect(result.igst).toBeGreaterThan(0);
      expect(result.totalTax).toBeCloseTo(result.igst, 2);
    });
  });

  describe('calculateInvoice', () => {
    it('should calculate totals for multiple line items', () => {
      const items: InvoiceLineItem[] = [
        {
          description: 'Sweater',
          hsnCode: '6110',
          quantity: 10,
          unitPrice: 1000,
          discountPercent: 0,
          stateCode: 'KA',
          companyState: 'KA'
        },
        {
          description: 'T-shirt',
          hsnCode: '6109',
          quantity: 20,
          unitPrice: 500,
          discountPercent: 0,
          stateCode: 'KA',
          companyState: 'KA'
        }
      ];

      const result = gst.calculateInvoice(items);

      expect(result.items.length).toBe(2);
      expect(result.totals.totalAmount).toBeGreaterThan(0);
      expect(result.totals.cgst).toBeGreaterThan(0);
      expect(result.totals.sgst).toBeGreaterThan(0);
    });
  });

  describe('generateEWayBill', () => {
    it('should require E-Way Bill for invoices > 50,000', () => {
      const result = gst.generateEWayBill(60000, 150);
      expect(result.required).toBe(true);
      expect(result.validity).toBe('3 days');
    });

    it('should not require E-Way Bill for small invoices', () => {
      const result = gst.generateEWayBill(30000, 50);
      expect(result.required).toBe(false);
    });

    it('should set validity based on distance', () => {
      expect(gst.generateEWayBill(60000, 50).validity).toBe('1 day');
      expect(gst.generateEWayBill(60000, 200).validity).toBe('3 days');
      expect(gst.generateEWayBill(60000, 400).validity).toBe('5 days');
      expect(gst.generateEWayBill(60000, 800).validity).toBe('10 days');
      expect(gst.generateEWayBill(60000, 1500).validity).toBe('15 days');
    });
  });

  describe('accuracy tests', () => {
    it('should maintain GST calculation accuracy to 2 decimal places', () => {
      const item: InvoiceLineItem = {
        description: 'Bulk Order',
        hsnCode: '6110',
        quantity: 1000,
        unitPrice: 999.99,
        discountPercent: 2.5,
        stateCode: 'KA',
        companyState: 'KA'
      };

      const result = gst.calculate(item);

      // Verify all values are properly rounded
      expect(result.taxableValue).toBe(Math.round(result.taxableValue * 100) / 100);
      expect(result.cgst).toBe(Math.round(result.cgst * 100) / 100);
      expect(result.sgst).toBe(Math.round(result.sgst * 100) / 100);
    });
  });
});
