import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types
} from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

// Status constants
const STATUS_CREATED = 1;
const STATUS_IN_PRODUCTION = 2;
const STATUS_QUALITY_CHECK = 3;
const STATUS_SHIPPED = 4;
const STATUS_DELIVERED = 5;
const STATUS_RECALLED = 6;

// Error constants
const ERR_UNAUTHORIZED = 100;
const ERR_PRODUCT_NOT_FOUND = 101;
const ERR_INVALID_STATUS = 102;
const ERR_PRODUCT_ALREADY_EXISTS = 103;
const ERR_INVALID_PRODUCT_ID = 104;
const ERR_EMPTY_NAME = 105;
const ERR_INVALID_STATUS_TRANSITION = 106;

Clarinet.test({
  name: "Can register a new product successfully",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    
    let block = chain.mineBlock([
      Tx.contractCall('product-tracker', 'register-product', [
        types.ascii("Test Product")
      ], deployer.address)
    ]);
    
    assertEquals(block.receipts.length, 1);
    assertEquals(block.receipts[0].result.expectOk(), types.uint(1));
  },
});

Clarinet.test({
  name: "Cannot register product with empty name",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    
    let block = chain.mineBlock([
      Tx.contractCall('product-tracker', 'register-product', [
        types.ascii("")
      ], deployer.address)
    ]);
    
    assertEquals(block.receipts.length, 1);
    assertEquals(block.receipts[0].result.expectErr(), types.uint(ERR_EMPTY_NAME));
  },
});

Clarinet.test({
  name: "Can retrieve product information after registration",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    
    // Register product
    let block = chain.mineBlock([
      Tx.contractCall('product-tracker', 'register-product', [
        types.ascii("Test Product")
      ], deployer.address)
    ]);
    
    // Get product info
    let getProduct = chain.callReadOnlyFn(
      'product-tracker',
      'get-product',
      [types.uint(1)],
      deployer.address
    );
    
    const productInfo = getProduct.result.expectSome().expectTuple();
    assertEquals(productInfo['name'], types.ascii("Test Product"));
    assertEquals(productInfo['manufacturer'], types.principal(deployer.address));
    assertEquals(productInfo['current-status'], types.uint(STATUS_CREATED));
  },
});

Clarinet.test({
  name: "Can update product status with valid transition",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    
    // Register product
    let block = chain.mineBlock([
      Tx.contractCall('product-tracker', 'register-product', [
        types.ascii("Test Product")
      ], deployer.address)
    ]);
    
    // Update status from CREATED to IN_PRODUCTION
    block = chain.mineBlock([
      Tx.contractCall('product-tracker', 'update-status', [
        types.uint(1),
        types.uint(STATUS_IN_PRODUCTION),
        types.ascii("Moving to production")
      ], deployer.address)
    ]);
    
    assertEquals(block.receipts.length, 1);
    assertEquals(block.receipts[0].result.expectOk(), types.bool(true));
    
    // Verify status was updated
    let getProduct = chain.callReadOnlyFn(
      'product-tracker',
      'get-product',
      [types.uint(1)],
      deployer.address
    );
    
    const productInfo = getProduct.result.expectSome().expectTuple();
    assertEquals(productInfo['current-status'], types.uint(STATUS_IN_PRODUCTION));
  },
});

Clarinet.test({
  name: "Cannot update status with invalid transition",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    
    // Register product
    let block = chain.mineBlock([
      Tx.contractCall('product-tracker', 'register-product', [
        types.ascii("Test Product")
      ], deployer.address)
    ]);
    
    // Try to update status from CREATED directly to DELIVERED (invalid)
    block = chain.mineBlock([
      Tx.contractCall('product-tracker', 'update-status', [
        types.uint(1),
        types.uint(STATUS_DELIVERED),
        types.ascii("Invalid transition")
      ], deployer.address)
    ]);
    
    assertEquals(block.receipts.length, 1);
    assertEquals(block.receipts[0].result.expectErr(), types.uint(ERR_INVALID_STATUS_TRANSITION));
  },
});

Clarinet.test({
  name: "Only manufacturer can update product status",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    
    // Register product as deployer
    let block = chain.mineBlock([
      Tx.contractCall('product-tracker', 'register-product', [
        types.ascii("Test Product")
      ], deployer.address)
    ]);
    
    // Try to update status as different user
    block = chain.mineBlock([
      Tx.contractCall('product-tracker', 'update-status', [
        types.uint(1),
        types.uint(STATUS_IN_PRODUCTION),
        types.ascii("Unauthorized update")
      ], wallet1.address)
    ]);
    
    assertEquals(block.receipts.length, 1);
    assertEquals(block.receipts[0].result.expectErr(), types.uint(ERR_UNAUTHORIZED));
  },
});

Clarinet.test({
  name: "Cannot update non-existent product",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    
    let block = chain.mineBlock([
      Tx.contractCall('product-tracker', 'update-status', [
        types.uint(999),
        types.uint(STATUS_IN_PRODUCTION),
        types.ascii("Non-existent product")
      ], deployer.address)
    ]);
    
    assertEquals(block.receipts.length, 1);
    assertEquals(block.receipts[0].result.expectErr(), types.uint(ERR_PRODUCT_NOT_FOUND));
  },
});

Clarinet.test({
  name: "Can retrieve product history",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    
    // Register product
    let block = chain.mineBlock([
      Tx.contractCall('product-tracker', 'register-product', [
        types.ascii("Test Product")
      ], deployer.address)
    ]);
    
    // Update status
    block = chain.mineBlock([
      Tx.contractCall('product-tracker', 'update-status', [
        types.uint(1),
        types.uint(STATUS_IN_PRODUCTION),
        types.ascii("Production started")
      ], deployer.address)
    ]);
    
    // Get initial history entry
    let getHistory = chain.callReadOnlyFn(
      'product-tracker',
      'get-product-history',
      [types.uint(1), types.uint(1)],
      deployer.address
    );
    
    const historyEntry = getHistory.result.expectSome().expectTuple();
    assertEquals(historyEntry['status'], types.uint(STATUS_CREATED));
    assertEquals(historyEntry['notes'], types.ascii("Product created"));
    
    // Get second history entry
    getHistory = chain.callReadOnlyFn(
      'product-tracker',
      'get-product-history',
      [types.uint(1), types.uint(2)],
      deployer.address
    );
    
    const historyEntry2 = getHistory.result.expectSome().expectTuple();
    assertEquals(historyEntry2['status'], types.uint(STATUS_IN_PRODUCTION));
    assertEquals(historyEntry2['notes'], types.ascii("Production started"));
  },
});

Clarinet.test({
  name: "Can check valid status transitions",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    
    // Register product
    let block = chain.mineBlock([
      Tx.contractCall('product-tracker', 'register-product', [
        types.ascii("Test Product")
      ], deployer.address)
    ]);
    
    // Check valid transition from CREATED to IN_PRODUCTION
    let canTransition = chain.callReadOnlyFn(
      'product-tracker',
      'can-transition-to',
      [types.uint(1), types.uint(STATUS_IN_PRODUCTION)],
      deployer.address
    );
    assertEquals(canTransition.result, types.bool(true));
    
    // Check invalid transition from CREATED to DELIVERED
    canTransition = chain.callReadOnlyFn(
      'product-tracker',
      'can-transition-to',
      [types.uint(1), types.uint(STATUS_DELIVERED)],
      deployer.address
    );
    assertEquals(canTransition.result, types.bool(false));
  },
});

Clarinet.test({
  name: "Can get status names",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    
    let statusName = chain.callReadOnlyFn(
      'product-tracker',
      'get-status-name',
      [types.uint(STATUS_CREATED)],
      deployer.address
    );
    assertEquals(statusName.result, types.ascii("Created"));
    
    statusName = chain.callReadOnlyFn(
      'product-tracker',
      'get-status-name',
      [types.uint(STATUS_DELIVERED)],
      deployer.address
    );
    assertEquals(statusName.result, types.ascii("Delivered"));
  },
});

Clarinet.test({
  name: "Product IDs increment correctly",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    // Register first product
    let block = chain.mineBlock([
      Tx.contractCall('product-tracker', 'register-product', [
        types.ascii("Product 1")
      ], deployer.address)
    ]);
    assertEquals(block.receipts[0].result.expectOk(), types.uint(1));

    // Register second product
    block = chain.mineBlock([
      Tx.contractCall('product-tracker', 'register-product', [
        types.ascii("Product 2")
      ], deployer.address)
    ]);
    assertEquals(block.receipts[0].result.expectOk(), types.uint(2));

    // Check next product ID
    let nextId = chain.callReadOnlyFn(
      'product-tracker',
      'get-next-product-id',
      [],
      deployer.address
    );
    assertEquals(nextId.result, types.uint(3));
  },
});

Clarinet.test({
  name: "Complete product lifecycle workflow",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    // Register product
    let block = chain.mineBlock([
      Tx.contractCall('product-tracker', 'register-product', [
        types.ascii("Lifecycle Test Product")
      ], deployer.address)
    ]);
    assertEquals(block.receipts[0].result.expectOk(), types.uint(1));

    // Move through complete lifecycle
    const transitions = [
      { status: STATUS_IN_PRODUCTION, notes: "Production started" },
      { status: STATUS_QUALITY_CHECK, notes: "Quality testing" },
      { status: STATUS_SHIPPED, notes: "Shipped to customer" },
      { status: STATUS_DELIVERED, notes: "Delivered successfully" }
    ];

    for (let i = 0; i < transitions.length; i++) {
      block = chain.mineBlock([
        Tx.contractCall('product-tracker', 'update-status', [
          types.uint(1),
          types.uint(transitions[i].status),
          types.ascii(transitions[i].notes)
        ], deployer.address)
      ]);
      assertEquals(block.receipts[0].result.expectOk(), types.bool(true));
    }

    // Verify final status
    let getProduct = chain.callReadOnlyFn(
      'product-tracker',
      'get-product',
      [types.uint(1)],
      deployer.address
    );

    const productInfo = getProduct.result.expectSome().expectTuple();
    assertEquals(productInfo['current-status'], types.uint(STATUS_DELIVERED));

    // Verify sequence count
    let sequenceCount = chain.callReadOnlyFn(
      'product-tracker',
      'get-product-sequence-count',
      [types.uint(1)],
      deployer.address
    );
    assertEquals(sequenceCount.result, types.uint(5)); // Initial + 4 updates
  },
});

Clarinet.test({
  name: "Can recall product from any status",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    // Register and move to shipped status
    let block = chain.mineBlock([
      Tx.contractCall('product-tracker', 'register-product', [
        types.ascii("Recall Test Product")
      ], deployer.address),
      Tx.contractCall('product-tracker', 'update-status', [
        types.uint(1),
        types.uint(STATUS_IN_PRODUCTION),
        types.ascii("Production")
      ], deployer.address),
      Tx.contractCall('product-tracker', 'update-status', [
        types.uint(1),
        types.uint(STATUS_QUALITY_CHECK),
        types.ascii("Quality check")
      ], deployer.address),
      Tx.contractCall('product-tracker', 'update-status', [
        types.uint(1),
        types.uint(STATUS_SHIPPED),
        types.ascii("Shipped")
      ], deployer.address)
    ]);

    // Recall the product
    block = chain.mineBlock([
      Tx.contractCall('product-tracker', 'update-status', [
        types.uint(1),
        types.uint(STATUS_RECALLED),
        types.ascii("Safety recall issued")
      ], deployer.address)
    ]);

    assertEquals(block.receipts[0].result.expectOk(), types.bool(true));

    // Verify recalled status
    let getProduct = chain.callReadOnlyFn(
      'product-tracker',
      'get-product',
      [types.uint(1)],
      deployer.address
    );

    const productInfo = getProduct.result.expectSome().expectTuple();
    assertEquals(productInfo['current-status'], types.uint(STATUS_RECALLED));

    // Verify no further transitions are allowed from recalled
    block = chain.mineBlock([
      Tx.contractCall('product-tracker', 'update-status', [
        types.uint(1),
        types.uint(STATUS_DELIVERED),
        types.ascii("Cannot deliver recalled product")
      ], deployer.address)
    ]);

    assertEquals(block.receipts[0].result.expectErr(), types.uint(ERR_INVALID_STATUS_TRANSITION));
  },
});

Clarinet.test({
  name: "Cannot update with invalid status code",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    // Register product
    let block = chain.mineBlock([
      Tx.contractCall('product-tracker', 'register-product', [
        types.ascii("Test Product")
      ], deployer.address)
    ]);

    // Try to update with invalid status
    block = chain.mineBlock([
      Tx.contractCall('product-tracker', 'update-status', [
        types.uint(1),
        types.uint(999), // Invalid status
        types.ascii("Invalid status")
      ], deployer.address)
    ]);

    assertEquals(block.receipts[0].result.expectErr(), types.uint(ERR_INVALID_STATUS));
  },
});
