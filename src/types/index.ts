export interface Product {
  id: string;
  name: string;
  category: string;
  defaultUnit: string;
  defaultPrice: number;
  mrp?: number;
  stockQuantity?: number; // Total available loose units in godown
  boxCapacity?: number;   // Number of units in 1 standard box (e.g. 50, 70, 100)
  minStockAlert?: number; // Minimum stock threshold for low stock alert
}

export interface MedicalStore {
  id: string;
  firmName: string;
  contactName: string;
  phone: string;
  email?: string;
  gstin?: string;
  district: string;
  state: string;
  address: string;
  customerType?: 'store' | 'customer';
  _pendingCloudSync?: boolean;
}

export type BillStatus = 'PAID' | 'PENDING' | 'PARTIALLY PAID' | 'CANCELLED';

export interface InvoiceItem {
  id: string;
  productId: string;
  itemName: string;
  quantity: number;
  unit: string;
  mrp?: number;
  pricePerUnit: number;
  amount: number;
  isFree?: boolean;
  isScheme?: boolean;
}

export interface Invoice {
  id: string;
  invoiceNo: number;
  companyInvoiceNumber?: number;
  invoiceNumber?: string;
  globalBillId?: number;
  date: string;
  billTo: MedicalStore;
  items: InvoiceItem[];
  subTotal: number;
  discount: number;
  totalAmount: number;
  paymentType: string;
  amountInWords: string;
  receivedAmount: number;
  balanceAmount: number;
  status: BillStatus | string;
  notes?: string;
  termsAndConditions: string;
  createdAt: string;
  _pendingCloudSync?: boolean;
}

export interface CompanyProfile {
  companyName: string;
  tagline: string;
  contactPerson: string;
  email: string;
  phone: string;
  gstin: string;
  drugLicenseNo?: string;
  panNumber?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  bankName?: string;
  accountNo?: string;
  ifscCode?: string;
  upiId?: string;
}

export interface PurchaseItem {
  id: string;
  productId: string;
  productName: string;
  batchNo: string;
  mfgDate?: string;
  expDate?: string;
  boxes: number;
  unitsPerBox: number;
  looseUnits: number;
  totalUnits: number;
  costPerUnit: number;
  totalCost: number;
  previousStock?: number;
  newStock?: number;
}

export interface PurchaseInvoice {
  id: string;
  billNo: string;
  date: string;
  supplierName: string;
  supplierPhone?: string;
  supplierCity?: string;
  supplierGstin?: string;
  items: PurchaseItem[];
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID';
  notes?: string;
  createdAt: string;
}
