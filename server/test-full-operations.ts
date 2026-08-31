import { prisma } from "./src/app/lib/prisma";
import { ProductService } from "./src/modules/product/product.service";
import { SupplierService } from "./src/modules/supplier/supplier.service";
import { InventoryService } from "./src/modules/inventory/inventory.service";
import { SalesService } from "./src/modules/sales/sales.service";
import { TransferService } from "./src/modules/transfer/transfer.service";

async function runTest() {
  console.log("=== STARTING FULL OPERATIONS TEST ===");

  // 1. Setup test tenant, branch, and user
  const tenant = await (prisma as any).tenant.create({
    data: {
      name: "Test Operations Pharmacy Ltd",
      tier: "GROWTH",
      email: `ops-${Date.now()}@test.com`,
    },
  });
  console.log("✔ Created test tenant:", tenant.id);

  const [branchA, branchB] = await Promise.all([
    (prisma as any).branch.create({
      data: { tenantId: tenant.id, name: "Main Hub (Dhanmondi)" },
    }),
    (prisma as any).branch.create({
      data: { tenantId: tenant.id, name: "Branch 2 (Gulshan)" },
    }),
  ]);
  console.log("✔ Created branches:", branchA.name, "and", branchB.name);

  const user = await (prisma as any).user.create({
    data: {
      tenantId: tenant.id,
      branchId: branchA.id,
      name: "Dr. Rafiq",
      email: `rafiq-${Date.now()}@test.com`,
      username: `rafiq_${Date.now().toString().slice(-4)}`,
      passwordHash: "hash123",
      role: "COMPANY_OWNER",
    },
  });
  console.log("✔ Created user:", user.name);

  // 2. Test Dynamic Categories & Units
  const mainCategories = await ProductService.listCategories(tenant.id);
  const medicineMainCat = mainCategories.find((c: any) => c.name === "Medicine") || mainCategories[0];
  console.log("✔ Seeded/Found main categories count:", mainCategories.length, "(Primary:", medicineMainCat.name, ")");

  const subcategory = await ProductService.createCategory(tenant.id, user.id, {
    name: `Antibiotics-${Date.now().toString().slice(-4)}`,
    parentId: medicineMainCat.id,
    defaultUnit: "tablet",
    description: "Prescription antibiotics",
  });
  console.log("✔ Created subcategory under", medicineMainCat.name, ":", subcategory.name);

  const brand = await ProductService.createBrand(tenant.id, user.id, {
    name: `Square Pharma-${Date.now().toString().slice(-4)}`,
    description: "Leading manufacturer",
  });
  console.log("✔ Created dynamic brand:", brand.name);

  // 3. Create Product (Medicine with packaging hierarchy: 10 tablets/strip, 10 strips/box)
  const product = await ProductService.createProduct(tenant.id, user.id, {
    name: "Ciprofloxacin 500mg",
    sku: `CIPRO-${Date.now().toString().slice(-5)}`,
    barcode: `BAR-${Date.now().toString().slice(-6)}`,
    basePrice: 15, // 15 BDT per tablet
    categoryId: medicineMainCat.id,
    subcategoryId: subcategory.id,
    brandId: brand.id,
    brandName: brand.name,
    unit: "tablet",
    size: "500mg",
    defaultPackType: "BOX",
    stripsPerBox: 10,
    tabletsPerStrip: 10,
    shelfLocation: "Rack B-2",
  });
  console.log("✔ Created product with packaging hierarchy:", product.name, "(Category:", product.category, "›", product.subcategory, ")");

  // 4. Create Supplier
  const supplier = await SupplierService.createSupplier(tenant.id, user.id, {
    name: "Square Distributors Ltd",
    phone: "01711000000",
    company: "Square Group",
    contactPerson: "Mr. Farhan",
  });
  console.log("✔ Created supplier:", supplier.name);

  // 5. Stock Inward (Batch Purchase: 2 Boxes = 200 Tablets)
  // Purchase price: 10 BDT / tablet, Selling price: 15 BDT / tablet
  // Total cost: 200 * 10 = 2000 BDT, Paid: 1200 BDT, Due: 800 BDT
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 2); // 2 years future

  const purchase = await SupplierService.recordPurchase(tenant.id, user.id, {
    branchId: branchA.id,
    supplierId: supplier.id,
    invoiceNo: `INV-SUP-${Date.now().toString().slice(-5)}`,
    paidAmount: 1200,
    paymentMethod: "CASH",
    items: [
      {
        productId: product.id,
        batchNumber: "BATCH-2026-X1",
        barcode: product.barcode,
        expiryDate: expiryDate.toISOString(),
        packageType: "MEDICINE",
        boxQuantity: 2,
        stripsPerBox: 10,
        tabletsPerStrip: 10,
        quantity: 200, // 200 lowest sellable tablets
        unitPurchasePrice: 10,
        unitSellingPrice: 15,
        shelfLocation: "Rack B-2",
      },
    ],
  });
  console.log("✔ Recorded batch purchase. Total:", purchase.totalAmount, "Paid:", purchase.paidAmount, "Due:", purchase.dueAmount);

  // Verify Supplier Balance
  const updatedSupplier = await SupplierService.getSupplierById(supplier.id, tenant.id);
  console.log("✔ Supplier financial ledger verified. Purchased:", updatedSupplier.totalPurchased.toString(), "Due:", updatedSupplier.totalDue.toString());
  if (Number(updatedSupplier.totalDue) !== 800) {
    throw new Error(`Expected supplier due 800 but got ${updatedSupplier.totalDue}`);
  }

  // 6. Verify Branch Inventory has 200 Tablets
  const invList = await InventoryService.getBranchInventory(tenant.id, branchA.id, {});
  const productInv = invList.data.find((i: any) => i.productId === product.id);
  console.log("✔ Branch Inventory verified. Available stock:", productInv?.quantity, "tablets under batch:", productInv?.batchNumber);
  if (productInv?.quantity !== 200) {
    throw new Error(`Expected 200 tablets in inventory but got ${productInv?.quantity}`);
  }

  // 7. POS Sale (Cashier sells 2 Strips = 20 Tablets to a customer)
  const sale = await SalesService.createSale(tenant.id, user.id, {
    branchId: branchA.id,
    customerName: "Mohammad Ali",
    customerPhone: "01822334455",
    paymentMethod: "CASH",
    discount: 10, // 10 BDT discount
    discountType: "FIXED",
    tax: 0,
    paidAmount: 300,
    items: [
      {
        productId: product.id,
        unitType: "STRIP",
        unitMultiplier: 10, // 10 tablets per strip
        quantity: 2, // 2 strips = 20 tablets
        unitPrice: 150, // 150 BDT per strip (15 BDT * 10)
      },
    ],
  });
  console.log("✔ POS Sale completed. Receipt:", sale.receiptNo, "Total:", sale.totalAmount, "Paid:", sale.paidAmount, "Change:", sale.changeAmount);

  // 8. Verify Inventory reduced to 180 Tablets (200 - 20) via FEFO
  const invListAfterSale = await InventoryService.getBranchInventory(tenant.id, branchA.id, {});
  const productInvAfterSale = invListAfterSale.data.find((i: any) => i.productId === product.id);
  console.log("✔ Post-Sale Inventory verified:", productInvAfterSale?.quantity, "tablets remaining (Deducted 20 tablets).");
  if (productInvAfterSale?.quantity !== 180) {
    throw new Error(`Expected 180 tablets after sale but got ${productInvAfterSale?.quantity}`);
  }

  // 9. Generate Invoice / Receipt Data
  const receipt = await SalesService.getReceiptData(sale.id, tenant.id);
  console.log("✔ Professional Invoice data generated for:", receipt.invoice.receiptNo, "Pharmacy:", receipt.pharmacy.name, "Items count:", receipt.invoice.items.length);

  // 10. Inter-Branch Stock Transfer: Transfer 50 tablets from Branch A to Branch B
  const transfer = await TransferService.createTransfer(tenant.id, user.id, {
    fromBranchId: branchA.id,
    toBranchId: branchB.id,
    notes: "Restocking Gulshan branch",
    items: [
      {
        productId: product.id,
        quantity: 50,
      },
    ],
  });
  console.log("✔ Transfer requested. ID:", transfer.id, "Status:", transfer.status);

  // Approve Transfer
  await TransferService.approveTransfer(transfer.id, tenant.id, user.id);
  console.log("✔ Transfer approved by Regional Admin/Owner.");

  // Complete Transfer
  await TransferService.completeTransfer(transfer.id, tenant.id, user.id);
  console.log("✔ Transfer completed.");

  // Verify stock at Branch A (180 - 50 = 130) and Branch B (50)
  const [invA, invB] = await Promise.all([
    InventoryService.getBranchInventory(tenant.id, branchA.id, {}),
    InventoryService.getBranchInventory(tenant.id, branchB.id, {}),
  ]);
  const stockA = invA.data.find((i: any) => i.productId === product.id)?.quantity;
  const stockB = invB.data.find((i: any) => i.productId === product.id)?.quantity;
  console.log(`✔ Inter-branch stock transfer verified. Branch A stock: ${stockA} (expected 130), Branch B stock: ${stockB} (expected 50)`);
  if (stockA !== 130 || stockB !== 50) {
    throw new Error(`Stock transfer verification failed: Branch A has ${stockA}, Branch B has ${stockB}`);
  }

  // 11. Cleanup test tenant & cascading data
  await (prisma as any).tenant.delete({ where: { id: tenant.id } });
  console.log("✔ Cleaned up test tenant and operations records.");

  console.log("=== ALL FULL OPERATIONS TESTS PASSED SUCCESSFULLY! ===");
}

runTest()
  .catch((err) => {
    console.error("❌ TEST FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await (prisma as any).$disconnect();
  });
