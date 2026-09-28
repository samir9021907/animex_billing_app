import { MedicalStore, Product, Invoice, PurchaseInvoice } from '../types';

export const INITIAL_PRODUCTS: Product[] = [
  { id: '7e379411-5b6b-450a-bbf8-61de5cdfccc1', name: 'Animex Liv 1lit', category: 'Liver Tonics', defaultUnit: 'Ltr', mrp: 350.00, defaultPrice: 312.80, boxCapacity: 20, stockQuantity: 500, minStockAlert: 40 },
  { id: '02112ee5-88cd-4c09-a6b0-1b536c5634c0', name: 'Calcimex Gold 1lit', category: 'Calcium Supplements', defaultUnit: 'Ltr', mrp: 290.00, defaultPrice: 255.00, boxCapacity: 20, stockQuantity: 600, minStockAlert: 40 },
  { id: '3f9a63c4-9680-445d-9ab5-a3cc62ab773b', name: 'Calcimex Gold (5 lit)', category: 'Calcium Supplements', defaultUnit: 'Can', mrp: 1050.00, defaultPrice: 918.00, boxCapacity: 4, stockQuantity: 60, minStockAlert: 8 },
  { id: '16d55069-3598-4514-ab37-3c5bb9136970', name: 'Calcimex gel advance (300ml)', category: 'Calcium Supplements', defaultUnit: 'Bottle', mrp: 275.00, defaultPrice: 243.00, boxCapacity: 40, stockQuantity: 800, minStockAlert: 80 },
  { id: '17c925e5-584c-4ee6-8b6d-30d5774ea73a', name: 'Utrimex (500ml)', category: 'Uterine & Fertility Boosters', defaultUnit: 'Bottle', mrp: 165.00, defaultPrice: 142.10, boxCapacity: 24, stockQuantity: 720, minStockAlert: 48 },
  { id: 'cae069ab-64cf-4aae-b6c1-f8dcee3bc99f', name: 'Rumen mex (300ml)', category: 'Rumen & Gut Health', defaultUnit: 'Bottle', mrp: 240.00, defaultPrice: 210.80, boxCapacity: 40, stockQuantity: 800, minStockAlert: 80 },
  { id: 'aea1fc91-c997-450f-88cc-7000e046ccf8', name: 'Milkymex DS (10kg)', category: 'Mineral Mixtures', defaultUnit: 'Bucket', mrp: 1850.00, defaultPrice: 1632.00, boxCapacity: 2, stockQuantity: 80, minStockAlert: 10 },
  { id: '8cf875b1-f7d9-4b36-91e8-0cf2ab35c4f2', name: 'Milkymex DS (25kg)', category: 'Mineral Mixtures', defaultUnit: 'Bucket', mrp: 3700.00, defaultPrice: 3264.00, boxCapacity: 1, stockQuantity: 9, minStockAlert: 2 },
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
        productId: 'cae069ab-64cf-4aae-b6c1-f8dcee3bc99f',
        productName: 'Rumen mex (300ml)',
        batchNo: 'RN-2601',
        mfgDate: '08/2026',
        expDate: '07/2028',
        boxes: 15,
        unitsPerBox: 40,
        looseUnits: 0,
        totalUnits: 600,
        costPerUnit: 110.00,
        totalCost: 66000.00,
        previousStock: 0,
        newStock: 600,
      }
    ],
    totalAmount: 66000.00,
    paidAmount: 66000.00,
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
        productId: '17c925e5-584c-4ee6-8b6d-30d5774ea73a',
        productName: 'Utrimex (500ml)',
        batchNo: 'UT-2608',
        mfgDate: '08/2026',
        expDate: '07/2028',
        boxes: 10,
        unitsPerBox: 24,
        looseUnits: 0,
        totalUnits: 240,
        costPerUnit: 75.00,
        totalCost: 18000.00,
        previousStock: 0,
        newStock: 240,
      }
    ],
    totalAmount: 18000.00,
    paidAmount: 18000.00,
    balanceAmount: 0.00,
    paymentStatus: 'PAID',
    notes: 'Direct Factory Inward • Batch Tested & Passed Quality Inspection',
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
        productId: '16d55069-3598-4514-ab37-3c5bb9136970',
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
