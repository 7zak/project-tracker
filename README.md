# ProductTracker - Clarity Smart Contract

A comprehensive Clarity smart contract for tracking products through their complete lifecycle, from creation to delivery (and potential recall). This project provides a robust, secure, and transparent way to monitor product status changes with full audit trails.

## 🚀 Features

- **Product Registration**: Register new products with unique IDs
- **Status Tracking**: Track products through predefined lifecycle stages
- **History Audit**: Complete audit trail of all status changes
- **Authorization**: Only manufacturers can update their products
- **Status Validation**: Enforced valid status transitions
- **Recall Support**: Products can be recalled from any status

## 📋 Product Lifecycle States

1. **Created** (1) - Initial state when product is registered
2. **In Production** (2) - Product is being manufactured
3. **Quality Check** (3) - Product undergoing quality assurance
4. **Shipped** (4) - Product has been shipped to customer
5. **Delivered** (5) - Product successfully delivered
6. **Recalled** (6) - Product recalled for safety/quality issues

## 🔄 Valid Status Transitions

```
Created → In Production | Recalled
In Production → Quality Check | Recalled
Quality Check → Shipped | In Production | Recalled
Shipped → Delivered | Recalled
Delivered → Recalled
Recalled → (Terminal state - no further transitions)
```

## 🛠️ Setup and Installation

### Prerequisites

- [Clarinet](https://github.com/hirosystems/clarinet) - Clarity development environment
- [Node.js](https://nodejs.org/) (for running tests)
- [Git](https://git-scm.com/)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/7zak/project-tracker.git
   cd project-tracker
   ```

2. **Install Clarinet** (if not already installed):
   ```bash
   # macOS
   brew install clarinet

   # Or download from GitHub releases
   # https://github.com/hirosystems/clarinet/releases
   ```

3. **Verify installation**:
   ```bash
   clarinet --version
   ```

## 🧪 Running Tests

Execute the comprehensive test suite:

```bash
# Run all tests
clarinet test

# Run tests with coverage
clarinet test --coverage

# Run specific test file
clarinet test tests/product-tracker_test.ts
```

### Test Coverage

The test suite covers:
- ✅ Product registration functionality
- ✅ Status update operations with valid/invalid transitions
- ✅ Authorization checks (only manufacturer can update)
- ✅ Product history retrieval
- ✅ Error conditions and edge cases
- ✅ Complete lifecycle workflows
- ✅ Recall functionality
- ✅ Status validation

## 📖 Contract API Reference

### Public Functions

#### `register-product`
Register a new product in the system.

**Parameters:**
- `name` (string-ascii 100): Product name (cannot be empty)

**Returns:**
- `(ok uint)`: Product ID on success
- `(err u105)`: If name is empty

**Example:**
```clarity
(contract-call? .product-tracker register-product "iPhone 15 Pro")
```

#### `update-status`
Update the status of an existing product.

**Parameters:**
- `product-id` (uint): ID of the product to update
- `new-status` (uint): New status code (1-6)
- `notes` (string-ascii 200): Notes about the status change

**Returns:**
- `(ok true)`: On successful update
- `(err u100)`: Unauthorized (not the manufacturer)
- `(err u101)`: Product not found
- `(err u102)`: Invalid status code
- `(err u106)`: Invalid status transition

**Example:**
```clarity
(contract-call? .product-tracker update-status u1 u2 "Started production")
```

### Read-Only Functions

#### `get-product`
Retrieve product information.

**Parameters:**
- `product-id` (uint): Product ID

**Returns:**
- `(some {...})`: Product details if found
- `none`: If product doesn't exist

#### `get-product-history`
Get a specific history entry for a product.

**Parameters:**
- `product-id` (uint): Product ID
- `sequence` (uint): History sequence number

**Returns:**
- `(some {...})`: History entry if found
- `none`: If entry doesn't exist

#### `get-status-name`
Get human-readable status name.

**Parameters:**
- `status` (uint): Status code

**Returns:**
- `(string-ascii)`: Status name

#### `can-transition-to`
Check if a status transition is valid.

**Parameters:**
- `product-id` (uint): Product ID
- `new-status` (uint): Target status

**Returns:**
- `true`: If transition is valid
- `false`: If transition is invalid

## 💡 Usage Examples

### Complete Product Lifecycle

```clarity
;; 1. Register a new product
(contract-call? .product-tracker register-product "Smart Watch v2")
;; Returns: (ok u1)

;; 2. Start production
(contract-call? .product-tracker update-status u1 u2 "Production line started")

;; 3. Quality check
(contract-call? .product-tracker update-status u1 u3 "QA testing in progress")

;; 4. Ship product
(contract-call? .product-tracker update-status u1 u4 "Shipped via FedEx")

;; 5. Delivery confirmation
(contract-call? .product-tracker update-status u1 u5 "Delivered to customer")

;; 6. Check final status
(contract-call? .product-tracker get-product u1)
```

### Product Recall Scenario

```clarity
;; Recall a product (can be done from any status)
(contract-call? .product-tracker update-status u1 u6 "Battery safety recall")

;; Verify recall status
(contract-call? .product-tracker get-product u1)
;; Status will be 6 (Recalled)

;; Attempting further updates will fail
(contract-call? .product-tracker update-status u1 u5 "Cannot deliver")
;; Returns: (err u106) - Invalid status transition
```

## 🏗️ Project Architecture

### Directory Structure

```
project-tracker/
├── contracts/
│   └── product-tracker.clar     # Main smart contract
├── tests/
│   └── product-tracker_test.ts  # Comprehensive test suite
├── Clarinet.toml                # Project configuration
└── README.md                    # This documentation
```

### Contract Design

The ProductTracker contract uses several key data structures:

- **Products Map**: Stores core product information
- **Product History Map**: Maintains audit trail of all changes
- **Sequence Counter Map**: Tracks history entry numbering

### Security Features

- **Authorization**: Only product manufacturers can update status
- **Validation**: Strict status transition rules prevent invalid updates
- **Immutable History**: All status changes are permanently recorded
- **Input Validation**: Prevents empty names and invalid status codes

## 🔧 Development

### Local Development Setup

1. **Start Clarinet console**:
   ```bash
   clarinet console
   ```

2. **Deploy contract locally**:
   ```clarity
   ::deploy_contracts
   ```

3. **Interact with contract**:
   ```clarity
   (contract-call? .product-tracker register-product "Test Product")
   ```

### Adding New Features

When extending the contract:

1. **Update constants** if adding new status types
2. **Modify validation functions** for new business rules
3. **Add comprehensive tests** for new functionality
4. **Update documentation** to reflect changes

### Testing Best Practices

- Test both success and failure scenarios
- Verify authorization checks
- Test edge cases and boundary conditions
- Ensure proper error handling
- Validate state changes and history tracking

## 🚨 Error Codes Reference

| Code | Constant | Description |
|------|----------|-------------|
| 100 | ERR_UNAUTHORIZED | Caller is not authorized to perform action |
| 101 | ERR_PRODUCT_NOT_FOUND | Product with given ID doesn't exist |
| 102 | ERR_INVALID_STATUS | Invalid status code provided |
| 103 | ERR_PRODUCT_ALREADY_EXISTS | Product already exists (unused) |
| 104 | ERR_INVALID_PRODUCT_ID | Invalid product ID (unused) |
| 105 | ERR_EMPTY_NAME | Product name cannot be empty |
| 106 | ERR_INVALID_STATUS_TRANSITION | Status transition not allowed |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes and add tests
4. Ensure all tests pass: `clarinet test`
5. Commit your changes: `git commit -m 'feat: add new feature'`
6. Push to the branch: `git push origin feature/new-feature`
7. Submit a pull request

### Commit Message Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `test:` - Test additions or modifications
- `refactor:` - Code refactoring
- `chore:` - Maintenance tasks

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

If you have questions or need help:

1. Check the [documentation](#-contract-api-reference)
2. Review the [test examples](tests/product-tracker_test.ts)
3. Open an issue on GitHub
4. Contact the maintainer: hexchange001@gmail.com

## 🔮 Future Enhancements

Potential improvements for future versions:

- **Multi-manufacturer support**: Allow products to change ownership
- **Batch operations**: Update multiple products simultaneously
- **Custom status types**: Allow manufacturers to define custom statuses
- **Integration APIs**: REST API wrapper for web applications
- **Event notifications**: Emit events for status changes
- **Metadata support**: Additional product attributes and specifications

---

**Built with ❤️ using Clarity and Stacks blockchain**
