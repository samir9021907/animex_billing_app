import { MedicalStore, Product, Invoice, PurchaseInvoice } from '../types';

export const INITIAL_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Animex Liv 1lit', category: 'Liver Tonics', defaultUnit: 'Ltr', mrp: 350.00, defaultPrice: 312.80, boxCapacity: 20, stockQuantity: 500, minStockAlert: 50 },
  { id: 'p2', name: 'Calcimex Gold 1lit', category: 'Calcium Supplements', defaultUnit: 'Ltr', mrp: 290.00, defaultPrice: 255.00, boxCapacity: 20, stockQuantity: 600, minStockAlert: 50 },
  { id: 'p3', name: 'Calcimex gel advance (300ml)', category: 'Calcium Supplements', defaultUnit: 'Ml', mrp: 275.00, defaultPrice: 243.00, boxCapacity: 50, stockQuantity: 1000, minStockAlert: 100 },
  { id: 'p4', name: 'Milkymex DS (10kg)', category: 'Mineral Mixtures', defaultUnit: 'Bucket', mrp: 1850.00, defaultPrice: 1632.00, boxCapacity: 4, stockQuantity: 80, minStockAlert: 10 },
  { id: 'p5', name: 'Rumen mex (300ml)', category: 'Rumen & Gut Health', defaultUnit: 'Ml', mrp: 240.00, defaultPrice: 210.80, boxCapacity: 100, stockQuantity: 1500, minStockAlert: 100 },
  { id: 'p6', name: 'Utrimex (500ml)', category: 'Uterine & Fertility Boosters', defaultUnit: 'Ml', mrp: 165.00, defaultPrice: 142.10, boxCapacity: 70, stockQuantity: 700, minStockAlert: 70 },
  { id: 'p7', name: 'Calcimex Gold (5 lit)', category: 'Calcium Supplements', defaultUnit: 'Can', mrp: 1050.00, defaultPrice: 918.00, boxCapacity: 4, stockQuantity: 60, minStockAlert: 10 },
  { id: 'p8', name: 'Milkymex DS (25kg)', category: 'Mineral Mixtures', defaultUnit: 'Bucket', mrp: 3700.00, defaultPrice: 3264.00, boxCapacity: 2, stockQuantity: 40, minStockAlert: 10 },
  { id: 'p9', name: 'Milkymex DS (1kg)', category: 'Mineral Mixtures', defaultUnit: 'Pack', mrp: 210.00, defaultPrice: 180.00, boxCapacity: 25, stockQuantity: 500, minStockAlert: 50 },
];

export const INITIAL_STORES: MedicalStore[] = [];

export const INITIAL_INVOICES: Invoice[] = [];

export const INITIAL_PURCHASES: PurchaseInvoice[] = [
  {
    id: 'pur-1',
    billNo: 'MFG-884',
    date: '28-08-2026',
    supplierName: 'Apex Pharma Laboratories Pvt. Ltd.',
    supplierPhone: '9822334455',
    supplierCity: 'Ahmedabad, Gujarat',
    supplierGstin: '24AAACA1234F1Z5',
    items: [
      {
        id: 'pi-1',
        productId: 'p5',
        productName: 'Rumen mex (300ml)',
        batchNo: 'RN-2601',
        mfgDate: '08/2026',
        expDate: '07/2028',
        boxes: 15,
        unitsPerBox: 100,
        looseUnits: 0,
        totalUnits: 1500,
        costPerUnit: 110.00,
        totalCost: 165000.00,
        previousStock: 0,
        newStock: 1500,
      }
    ],
    totalAmount: 165000.00,
    paidAmount: 165000.00,
    balanceAmount: 0.00,
    paymentStatus: 'PAID',
    notes: 'Direct Factory Inward • Batch Tested & Passed Quality Inspection',
    createdAt: '2026-08-28T14:30:00.000Z'
  },
  {
    id: 'pur-2',
    billNo: 'SB-412',
    date: '30-08-2026',
    supplierName: 'Sunrise Biotech Formulations',
    supplierPhone: '9890112233',
    supplierCity: 'Vadodara, Gujarat',
    supplierGstin: '24AABCS5678K1Z2',
    items: [
      {
        id: 'pi-2',
        productId: 'p6',
        productName: 'Utrimex (500ml)',
        batchNo: 'UT-2608',
        mfgDate: '08/2026',
        expDate: '07/2028',
        boxes: 10,
        unitsPerBox: 70,
        looseUnits: 0,
        totalUnits: 700,
        costPerUnit: 75.00,
        totalCost: 52500.00,
        previousStock: 0,
        newStock: 700,
      }
    ],
    totalAmount: 52500.00,
    paidAmount: 30000.00,
    balanceAmount: 22500.00,
    paymentStatus: 'PARTIAL',
    notes: 'Balance due on next month supply cycle',
    createdAt: '2026-08-30T10:15:00.000Z'
  },
  {
    id: 'pur-3',
    billNo: 'GF-901',
    date: '02-09-2026',
    supplierName: 'Gujarat Animal Formulations',
    supplierPhone: '9422003344',
    supplierCity: 'Anand, Gujarat',
    supplierGstin: '24AAACG9012D1Z9',
    items: [
      {
        id: 'pi-3',
        productId: 'p3',
        productName: 'Calcimex gel advance (300ml)',
        batchNo: 'CG-2609',
        mfgDate: '08/2026',
        expDate: '01/2028',
        boxes: 20,
        unitsPerBox: 50,
        looseUnits: 0,
        totalUnits: 1000,
        costPerUnit: 125.00,
        totalCost: 125000.00,
        previousStock: 0,
        newStock: 1000,
      }
    ],
    totalAmount: 125000.00,
    paidAmount: 125000.00,
    balanceAmount: 0.00,
    paymentStatus: 'PAID',
    notes: 'Premium Gel batch received in good condition',
    createdAt: '2026-09-02T16:00:00.000Z'
  }
];
