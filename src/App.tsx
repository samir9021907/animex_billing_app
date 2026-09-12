import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { InvoiceForm } from './components/InvoiceForm';
import { InvoicePreviewModal } from './components/InvoicePreviewModal';
import { InvoiceHistory } from './components/InvoiceHistory';
import { MedicalStoresDirectory } from './components/MedicalStoresDirectory';
import { ProductsManager } from './components/ProductsManager';
import { ProfileManager } from './components/ProfileManager';
import { SettingsScreen } from './components/SettingsScreen';
import { LoginScreen } from './components/LoginScreen';
import { PurchasesManager } from './components/PurchasesManager';
import { Invoice, MedicalStore, Product, PurchaseInvoice } from './types';
import { INITIAL_INVOICES, INITIAL_PRODUCTS, INITIAL_STORES, INITIAL_PURCHASES } from './data/seedData';
import { syncInvoiceToBackend, deleteInvoiceFromBackend, syncStoreToBackend, deleteStoreFromBackend } from './utils/api';
import { authService, UserSession } from './services/authService';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => authService.getCurrentUser());
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  
  // Persistent state initialized from seedData / localStorage
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    try {
      const saved = localStorage.getItem('animex_invoices');
      if (saved !== null) {
        const parsed: Invoice[] = JSON.parse(saved);
        let hasChanges = false;
        const updated = parsed.map((inv, idx) => {
          if (inv.id === 'inv-4-sai-balaji' || (inv.invoiceNo === 4 && inv.billTo?.firmName?.includes('Sai Balaji'))) {
            hasChanges = true;
            return {
              ...inv,
              id: 'inv-4-sai-balaji',
              globalBillId: 4,
              invoiceNo: 2,
              companyInvoiceNumber: 2,
              invoiceNumber: 'ANX-2608-0002'
            };
          }
          if (inv.id === 'inv-1-shivba' || (inv.invoiceNo === 1 && inv.billTo?.firmName?.includes('Shivba'))) {
            return {
              ...inv,
              globalBillId: 1,
              invoiceNo: 1,
              companyInvoiceNumber: 1,
            };
          }
          if (inv.id === 'inv-5-shivba') {
            hasChanges = true;
            return {
              ...inv,
              id: 'inv-1-shivba',
              globalBillId: 1,
              invoiceNo: 1,
              companyInvoiceNumber: 1,
              invoiceNumber: 'ANX-2608-0001'
            };
          }
          if (inv.id === 'inv-2-sai-balaji') {
            return {
              ...inv,
              globalBillId: 2,
              invoiceNo: 1,
              companyInvoiceNumber: 1,
            };
          }
          if (inv.id === 'inv-6-shivba' || (inv.invoiceNo === 6 && inv.billTo?.firmName?.includes('Shivba'))) {
            hasChanges = true;
            return {
              ...inv,
              id: 'inv-3-shivba',
              globalBillId: 3,
              invoiceNo: 2,
              companyInvoiceNumber: 2,
              invoiceNumber: 'ANX-2608-0002'
            };
          }
          if (!inv.globalBillId) {
            hasChanges = true;
            return {
              ...inv,
              globalBillId: idx + 1
            };
          }
          return inv;
        });
        if (hasChanges) {
          localStorage.setItem('animex_invoices', JSON.stringify(updated));
        }
        return updated;
      }
      return INITIAL_INVOICES;
    } catch {
      return INITIAL_INVOICES;
    }
  });

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('animex_billing_products');
      if (saved !== null) {
        const parsed: Product[] = JSON.parse(saved);
        // Ensure every product has stockQuantity and boxCapacity from defaults
        return parsed.map(p => {
          const defaultSeed = INITIAL_PRODUCTS.find(sp => sp.id === p.id);
          return {
            ...p,
            stockQuantity: p.stockQuantity !== undefined ? p.stockQuantity : (defaultSeed?.stockQuantity ?? 100),
            boxCapacity: p.boxCapacity !== undefined ? p.boxCapacity : (defaultSeed?.boxCapacity ?? 50),
            minStockAlert: p.minStockAlert !== undefined ? p.minStockAlert : (defaultSeed?.minStockAlert ?? 50),
          };
        });
      }
      return INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  const [stores, setStores] = useState<MedicalStore[]>(() => {
    try {
      const saved = localStorage.getItem('animex_medical_stores');
      return saved !== null ? JSON.parse(saved) : INITIAL_STORES;
    } catch {
      return INITIAL_STORES;
    }
  });

  const [selectedPreviewInvoice, setSelectedPreviewInvoice] = useState<Invoice | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('animex_invoices', JSON.stringify(invoices));
    } catch {}
  }, [invoices]);

  useEffect(() => {
    try {
      localStorage.setItem('animex_billing_products', JSON.stringify(products));
    } catch {}
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem('animex_medical_stores', JSON.stringify(stores));
    } catch {}
  }, [stores]);

  const [purchases, setPurchases] = useState<PurchaseInvoice[]>(() => {
    try {
      const saved = localStorage.getItem('animex_purchase_invoices');
      return saved !== null ? JSON.parse(saved) : INITIAL_PURCHASES;
    } catch {
      return INITIAL_PURCHASES;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('animex_purchase_invoices', JSON.stringify(purchases));
    } catch {}
  }, [purchases]);

  const handleSavePurchase = (newPurchase: PurchaseInvoice, newProductsCreated?: Product[]) => {
    setPurchases([newPurchase, ...purchases]);

    setProducts((prevProducts) => {
      let baseList = prevProducts;
      if (newProductsCreated && newProductsCreated.length > 0) {
        const uniqueNew = newProductsCreated.filter((np) => !prevProducts.some((p) => p.id === np.id));
        baseList = [...prevProducts, ...uniqueNew];
      }

      return baseList.map((prod) => {
        const matchingItems = newPurchase.items.filter((it) => it.productId === prod.id);
        if (matchingItems.length === 0) return prod;

        const totalInwardQty = matchingItems.reduce((sum, it) => sum + (Number(it.totalUnits) || 0), 0);
        const lastUnitsPerBox = matchingItems[matchingItems.length - 1].unitsPerBox;

        return {
          ...prod,
          stockQuantity: (prod.stockQuantity ?? 0) + totalInwardQty,
          boxCapacity: lastUnitsPerBox > 0 ? lastUnitsPerBox : prod.boxCapacity || 50,
        };
      });
    });
  };

  const handleDeletePurchase = (purchaseId: string) => {
    const purToDelete = purchases.find((p) => p.id === purchaseId);
    setPurchases(purchases.filter((p) => p.id !== purchaseId));

    if (purToDelete) {
      setProducts((prevProducts) => {
        return prevProducts.map((prod) => {
          const matchingItems = purToDelete.items.filter((it) => it.productId === prod.id);
          if (matchingItems.length === 0) return prod;

          const totalInwardQty = matchingItems.reduce((sum, it) => sum + (Number(it.totalUnits) || 0), 0);
          return {
            ...prod,
            stockQuantity: Math.max(0, (prod.stockQuantity ?? 0) - totalInwardQty),
          };
        });
      });
    }
  };

  const handleSaveInvoice = (newInvoice: Invoice) => {
    const nextGlobal = invoices.length > 0 ? Math.max(...invoices.map(i => i.globalBillId || 0)) + 1 : 1;
    const finalInvoice: Invoice = {
      ...newInvoice,
      globalBillId: newInvoice.globalBillId || nextGlobal
    };

    // 1. Add invoice to history
    setInvoices([finalInvoice, ...invoices]);
    setSelectedPreviewInvoice(finalInvoice);
    syncInvoiceToBackend(finalInvoice);

    // 2. Automatic stock deduction for each billed product & check low stock
    const newlyLowStock: string[] = [];
    setProducts(prevProducts => {
      return prevProducts.map(prod => {
        const billedItems = finalInvoice.items.filter(item => item.productId === prod.id);
        if (billedItems.length === 0) return prod;

        const totalBilledQty = billedItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
        const currentStock = prod.stockQuantity ?? 0;
        const newStock = Math.max(0, currentStock - totalBilledQty);
        const limit = prod.minStockAlert || prod.boxCapacity || 50;

        if (newStock <= limit) {
          newlyLowStock.push(`• ${prod.name}: Only ${newStock} ${prod.defaultUnit} left (Alert Limit: ${limit} ${prod.defaultUnit})`);
        }

        return {
          ...prod,
          stockQuantity: newStock,
        };
      });
    });

    if (newlyLowStock.length > 0) {
      setTimeout(() => {
        alert(
          `⚠️ Low Stock Alert Notification!\n\n` +
          `The following product(s) have fallen below the minimum alert limit due to this bill:\n\n` +
          `${newlyLowStock.join('\n')}\n\n` +
          `Please replenish godown stock in time.`
        );
      }, 500);
    }
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    const invToDelete = invoices.find(inv => inv.id === invoiceId);
    if (window.confirm('Are you sure you want to delete this bill from history?')) {
      setInvoices(invoices.filter(inv => inv.id !== invoiceId));
      deleteInvoiceFromBackend(invoiceId);

      // Automatic stock restoration back to products
      if (invToDelete) {
        setProducts(prevProducts => {
          return prevProducts.map(prod => {
            const restoredItems = invToDelete.items.filter(item => item.productId === prod.id);
            if (restoredItems.length === 0) return prod;

            const totalRestoredQty = restoredItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
            return {
              ...prod,
              stockQuantity: (prod.stockQuantity ?? 0) + totalRestoredQty,
            };
          });
        });
      }
    }
  };

  // Add inward stock entry (Boxes * UnitsPerBox + LooseUnits)
  const handleInwardStock = (productId: string, boxes: number, unitsPerBox: number, looseUnits: number) => {
    const totalAdded = (boxes * unitsPerBox) + looseUnits;
    setProducts(prevProducts => {
      return prevProducts.map(prod => {
        if (prod.id !== productId) return prod;
        const currentStock = prod.stockQuantity ?? 0;
        return {
          ...prod,
          stockQuantity: currentStock + totalAdded,
          boxCapacity: unitsPerBox > 0 ? unitsPerBox : (prod.boxCapacity || 50),
        };
      });
    });
  };

  const handleAddStore = (newStore: MedicalStore) => {
    setStores([newStore, ...stores]);
    syncStoreToBackend(newStore);
  };

  const handleUpdateStore = (updatedStore: MedicalStore) => {
    setStores(stores.map(s => s.id === updatedStore.id ? updatedStore : s));
    syncStoreToBackend(updatedStore);
  };

  const handleDeleteStore = (storeId: string) => {
    setStores(stores.filter(s => s.id !== storeId));
    deleteStoreFromBackend(storeId);
  };

  const handleAddProduct = (newProduct: Product) => {
    setProducts([newProduct, ...products]);
  };

  const handleUpdateProduct = (updatedProduct: Product) => {
    setProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts(products.filter(p => p.id !== productId));
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out of Animex Billing?')) {
      authService.logout();
      setCurrentUser(null);
    }
  };

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  const nextInvoiceNo = invoices.length > 0
    ? Math.max(...invoices.map(i => i.companyInvoiceNumber || i.invoiceNo || 0)) + 1
    : 1;

  return (
    <div className="min-h-screen bg-slate-200 dark:bg-slate-950 flex flex-col antialiased font-sans">
      
      {/* Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        invoicesCount={invoices.length}
        products={products}
        user={currentUser}
        onLogout={handleLogout}
      />

      {/* Main View Router */}
      <main className="flex-grow p-4 sm:p-6 md:p-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            invoices={invoices}
            stores={stores}
            products={products}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onSelectInvoice={(inv) => setSelectedPreviewInvoice(inv)}
          />
        )}

        {activeTab === 'new-invoice' && (
          <InvoiceForm
            products={products}
            stores={stores}
            invoices={invoices}
            onSaveInvoice={handleSaveInvoice}
            nextInvoiceNo={nextInvoiceNo}
          />
        )}

        {activeTab === 'history' && (
          <InvoiceHistory
            invoices={invoices}
            onSelectInvoice={(inv) => setSelectedPreviewInvoice(inv)}
            onDeleteInvoice={handleDeleteInvoice}
          />
        )}

        {activeTab === 'stores' && (
          <MedicalStoresDirectory
            stores={stores}
            onAddStore={handleAddStore}
            onUpdateStore={handleUpdateStore}
            onDeleteStore={handleDeleteStore}
          />
        )}

        {activeTab === 'products' && (
          <ProductsManager
            products={products}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onInwardStock={handleInwardStock}
          />
        )}

        {activeTab === 'purchases' && (
          <PurchasesManager
            purchases={purchases}
            products={products}
            onSavePurchase={handleSavePurchase}
            onDeletePurchase={handleDeletePurchase}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileManager
            user={currentUser}
            onLogout={handleLogout}
            invoicesCount={invoices.length}
            storesCount={stores.length}
            productsCount={products.length}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsScreen
            onNavigateTab={(tab) => setActiveTab(tab)}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Printable Invoice Modal Replica */}
      {selectedPreviewInvoice && (
        <InvoicePreviewModal
          invoice={selectedPreviewInvoice}
          allInvoices={invoices}
          onClose={() => setSelectedPreviewInvoice(null)}
        />
      )}

      {/* Footer */}
      <footer className="bg-animex-blue-900 text-slate-300 py-4 text-center text-xs font-semibold border-t border-slate-800">
        ANIMEX ANIMAL HEALTH CARE PRIVATE LIMITED • Kopargaon, Ahmednagar • Helpline: 9307990811 / 8999323908
      </footer>

    </div>
  );
};

export default App;
