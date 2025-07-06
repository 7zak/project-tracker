;; ProductTracker Smart Contract
;; A comprehensive product lifecycle tracking system

;; Constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED (err u100))
(define-constant ERR_PRODUCT_NOT_FOUND (err u101))
(define-constant ERR_INVALID_STATUS (err u102))
(define-constant ERR_PRODUCT_ALREADY_EXISTS (err u103))
(define-constant ERR_INVALID_PRODUCT_ID (err u104))
(define-constant ERR_EMPTY_NAME (err u105))
(define-constant ERR_INVALID_STATUS_TRANSITION (err u106))

;; Product Status Constants
(define-constant STATUS_CREATED u1)
(define-constant STATUS_IN_PRODUCTION u2)
(define-constant STATUS_QUALITY_CHECK u3)
(define-constant STATUS_SHIPPED u4)
(define-constant STATUS_DELIVERED u5)
(define-constant STATUS_RECALLED u6)

;; Data Structures
(define-map products
  { product-id: uint }
  {
    name: (string-ascii 100),
    manufacturer: principal,
    current-status: uint,
    created-at: uint,
    updated-at: uint
  }
)

(define-map product-history
  { product-id: uint, sequence: uint }
  {
    status: uint,
    timestamp: uint,
    updated-by: principal,
    notes: (string-ascii 200)
  }
)

(define-map product-sequence-counter
  { product-id: uint }
  { counter: uint }
)

(define-data-var next-product-id uint u1)

;; Private Functions
(define-private (is-valid-status (status uint))
  (or 
    (is-eq status STATUS_CREATED)
    (is-eq status STATUS_IN_PRODUCTION)
    (is-eq status STATUS_QUALITY_CHECK)
    (is-eq status STATUS_SHIPPED)
    (is-eq status STATUS_DELIVERED)
    (is-eq status STATUS_RECALLED)
  )
)

(define-private (is-valid-status-transition (current-status uint) (new-status uint))
  (or
    ;; From CREATED
    (and (is-eq current-status STATUS_CREATED) 
         (or (is-eq new-status STATUS_IN_PRODUCTION) (is-eq new-status STATUS_RECALLED)))
    ;; From IN_PRODUCTION
    (and (is-eq current-status STATUS_IN_PRODUCTION) 
         (or (is-eq new-status STATUS_QUALITY_CHECK) (is-eq new-status STATUS_RECALLED)))
    ;; From QUALITY_CHECK
    (and (is-eq current-status STATUS_QUALITY_CHECK) 
         (or (is-eq new-status STATUS_SHIPPED) (is-eq new-status STATUS_IN_PRODUCTION) (is-eq new-status STATUS_RECALLED)))
    ;; From SHIPPED
    (and (is-eq current-status STATUS_SHIPPED) 
         (or (is-eq new-status STATUS_DELIVERED) (is-eq new-status STATUS_RECALLED)))
    ;; From DELIVERED
    (and (is-eq current-status STATUS_DELIVERED) 
         (is-eq new-status STATUS_RECALLED))
    ;; RECALLED is terminal state - no transitions allowed
  )
)

(define-private (get-next-sequence (product-id uint))
  (let ((current-counter (default-to u0 (get counter (map-get? product-sequence-counter { product-id: product-id })))))
    (+ current-counter u1)
  )
)

;; Public Functions

;; Register a new product
(define-public (register-product (name (string-ascii 100)))
  (let 
    (
      (product-id (var-get next-product-id))
      (current-time (unwrap-panic (get-stacks-block-info? time (- stacks-block-height u1))))
    )
    (asserts! (> (len name) u0) ERR_EMPTY_NAME)
    
    ;; Create product record
    (map-set products
      { product-id: product-id }
      {
        name: name,
        manufacturer: tx-sender,
        current-status: STATUS_CREATED,
        created-at: current-time,
        updated-at: current-time
      }
    )
    
    ;; Initialize sequence counter
    (map-set product-sequence-counter
      { product-id: product-id }
      { counter: u1 }
    )
    
    ;; Add initial history entry
    (map-set product-history
      { product-id: product-id, sequence: u1 }
      {
        status: STATUS_CREATED,
        timestamp: current-time,
        updated-by: tx-sender,
        notes: "Product created"
      }
    )
    
    ;; Increment next product ID
    (var-set next-product-id (+ product-id u1))
    
    (ok product-id)
  )
)

;; Update product status
(define-public (update-status (product-id uint) (new-status uint) (notes (string-ascii 200)))
  (let 
    (
      (product (unwrap! (map-get? products { product-id: product-id }) ERR_PRODUCT_NOT_FOUND))
      (current-time (unwrap-panic (get-stacks-block-info? time (- stacks-block-height u1))))
      (current-status (get current-status product))
      (next-seq (get-next-sequence product-id))
    )
    ;; Validate status
    (asserts! (is-valid-status new-status) ERR_INVALID_STATUS)
    
    ;; Validate status transition
    (asserts! (is-valid-status-transition current-status new-status) ERR_INVALID_STATUS_TRANSITION)
    
    ;; Only manufacturer can update status
    (asserts! (is-eq tx-sender (get manufacturer product)) ERR_UNAUTHORIZED)
    
    ;; Update product record
    (map-set products
      { product-id: product-id }
      (merge product {
        current-status: new-status,
        updated-at: current-time
      })
    )
    
    ;; Add history entry
    (map-set product-history
      { product-id: product-id, sequence: next-seq }
      {
        status: new-status,
        timestamp: current-time,
        updated-by: tx-sender,
        notes: notes
      }
    )
    
    ;; Update sequence counter
    (map-set product-sequence-counter
      { product-id: product-id }
      { counter: next-seq }
    )
    
    (ok true)
  )
)

;; Read-only Functions

;; Get product information
(define-read-only (get-product (product-id uint))
  (map-get? products { product-id: product-id })
)

;; Get product history entry
(define-read-only (get-product-history (product-id uint) (sequence uint))
  (map-get? product-history { product-id: product-id, sequence: sequence })
)

;; Get current sequence number for a product
(define-read-only (get-product-sequence-count (product-id uint))
  (default-to u0 (get counter (map-get? product-sequence-counter { product-id: product-id })))
)

;; Get status name for display
(define-read-only (get-status-name (status uint))
  (if (is-eq status STATUS_CREATED) "Created"
  (if (is-eq status STATUS_IN_PRODUCTION) "In Production"
  (if (is-eq status STATUS_QUALITY_CHECK) "Quality Check"
  (if (is-eq status STATUS_SHIPPED) "Shipped"
  (if (is-eq status STATUS_DELIVERED) "Delivered"
  (if (is-eq status STATUS_RECALLED) "Recalled"
  "Unknown"))))))
)

;; Check if a status transition is valid
(define-read-only (can-transition-to (product-id uint) (new-status uint))
  (match (map-get? products { product-id: product-id })
    product (is-valid-status-transition (get current-status product) new-status)
    false
  )
)

;; Get next available product ID
(define-read-only (get-next-product-id)
  (var-get next-product-id)
)
