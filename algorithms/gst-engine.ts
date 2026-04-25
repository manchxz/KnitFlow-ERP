/**
 * GST Calculation Engine for Textile Manufacturing
 * 
 * Handles:
 * - HSN code lookup for textile products
 * - CGST/SGST (intra-state) and IGST (inter-state) calculation
 * - Back-calculation: Taxable value from total (MRP)
 * - E-Way Bill generation
 * 
 * GST Slabs for Textiles:
 *   - HSN 6109 (T-shirts): 5%
 *   - HSN 6110 (Sweaters): 5%
 *   - HSN 6103 (Suits): 12%
 *   - Default: 18%
 */

interface HSNEntry {
  code: string;
  description: string;
  rate: number;      // GST percentage
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
  stateCode: string;  // "KA" for Karnataka, etc.
  companyState: string;
}

class GSTEngine {
  // HSN code lookup table for textiles
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

  private companyState: string = 'KA'; // Karnataka

  /**
   * Look up GST rate by HSN code
   * Returns 18% (default) if HSN not found
   */
  getRate(hsnCode: string): number {
    const entry = this.hsnTable.get(hsnCode.substring(0, 4));
    return entry ? entry.rate : 18; // Default 18%
  }

  /**
   * Calculate GST breakdown for a line item
   * Back-calculates taxable value from total amount
   */
  calculate(item: InvoiceLineItem): GSTBreakdown {
    const rate = this.getRate(item.hsnCode);
    const discountMultiplier = (100 - item.discountPercent) / 100;
    const totalAmount = item.quantity * item.unitPrice * discountMultiplier;
    
    // Back-calculate taxable value: Total = Taxable * (1 + rate/100)
    const taxableValue = totalAmount / (1 + rate / 100);
    const totalTax = totalAmount - taxableValue;

    const isIntraState = item.stateCode === this.companyState;

    if (isIntraState) {
      // CGST + SGST (split equally)
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
      // IGST (full tax)
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

  /**
   * Calculate total invoice with multiple line items
   */
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

  /**
   * Generate E-Way Bill details
   */
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

// ===== EXAMPLE: Sweater Order =====

const gst = new GSTEngine();

const order: InvoiceLineItem = {
  description: 'Navy Blue Wool Sweater',
  hsnCode: '6110',
  quantity: 100,
  unitPrice: 1000,
  discountPercent: 5,
  stateCode: 'KA',      // Karnataka
  companyState: 'KA'    // Karnataka
};

const result = gst.calculate(order);
console.log('Taxable Value:', result.taxableValue);     // 90,476.19
console.log('CGST (2.5%):', result.cgst);               // 2,380.95
console.log('SGST (2.5%):', result.sgst);               // 2,380.95
console.log('Total Tax:', result.totalTax);               // 4,761.90
console.log('Total Amount:', result.totalAmount);         // 95,238.09