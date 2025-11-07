# SiyeFlow Schema - Block-Based Design

## Overview

The new schema uses typed blocks, where each block has a specific purpose and properties. This makes workflows more modular, powerful, and easier to visualize.

## Core Concepts

### 1. Block Types

Each block has a `type` field that determines its behavior:

```json
{
  "id": "unique-id",
  "type": "http-request|evaluate|condition|loop|delay|collect|log|variable",
  "name": "Human readable name",
  "description": "Optional description",
  // Type-specific properties...
}
```

### 2. Common Block Properties

All blocks share these properties:

```json
{
  "id": "string",              // Unique identifier
  "type": "string",            // Block type
  "name": "string",            // Display name
  "description": "string?",     // Optional description
  "inputs": {                  // Input parameters from other blocks
    "paramName": "{{sourceBlockId.outputName}}"
  },
  "outputs": {                 // Output variables this block produces
    "outputName": "jsonPath or value"
  },
  "onSuccess": "nextBlockId",  // Next block on success
  "onFailure": "errorBlockId", // Next block on failure
  "onComplete": "alwaysBlockId" // Always execute after (finally)
}
```

**Future Enhancement**: Add `"dependsOn": ["blockId1", "blockId2"]` property for parallel execution support.

## Block Types

### 1. Start Block (Entry Point)

The Start block now supports multiple profiles for different environments and configurations.

#### Basic Format (Legacy)
```json
{
  "id": "start",
  "type": "start",
  "name": "Workflow Start",
  "config": {
    "inputs": {
      "orderId": {
        "type": "string",
        "required": true,
        "description": "Order ID to process"
      },
      "userId": {
        "type": "string", 
        "required": true,
        "description": "User ID who owns the order"
      },
      "options": {
        "type": "object",
        "required": false,
        "description": "Additional processing options"
      }
    }
  },
  "outputs": {
    "orderId": "{{inputs.orderId}}",
    "userId": "{{inputs.userId}}",
    "timestamp": "{{$timestamp}}"
  },
  "onSuccess": "first-block"
}
```

#### Enhanced Format with Profiles (NEW)
```json
{
  "id": "start",
  "type": "start",
  "name": "Workflow Start with Profiles",
  "config": {
    "profiles": [
      {
        "name": "Development",
        "description": "Dev environment settings",
        "default": true,
        "inputs": {
          "apiUrl": {
            "type": "string",
            "value": "http://localhost:5216",
            "required": true,
            "description": "API endpoint URL"
          },
          "timeout": {
            "type": "number",
            "value": 5000,
            "description": "Request timeout in ms"
          },
          "debug": {
            "type": "boolean",
            "value": true
          }
        }
      },
      {
        "name": "Production",
        "description": "Production settings",
        "inputs": {
          "apiUrl": {
            "type": "string",
            "value": "https://api.production.com",
            "required": true
          },
          "timeout": {
            "type": "number",
            "value": 30000
          },
          "debug": {
            "type": "boolean",
            "value": false
          }
        }
      }
    ],
    "selectedProfile": "Development",
    "overrides": {
      "timeout": 3000
    }
  },
  "onSuccess": "http1"
}
```

#### Profile Properties

| Property | Type | Description |
|----------|------|-------------|
| `profiles` | Array | List of input profiles for different environments |
| `profiles[].name` | String | Unique profile identifier |
| `profiles[].description` | String | Profile description |
| `profiles[].default` | Boolean | Mark as default profile (only one should be true) |
| `profiles[].inputs` | Object | Input definitions with values |
| `selectedProfile` | String | Currently selected profile name |
| `overrides` | Object | Override specific values from the selected profile |

#### Input Resolution Order

1. **Profile Selection**: Use selected profile or default profile
2. **Config Overrides**: Apply values from `overrides` object
3. **Runtime Inputs**: Apply values passed via CLI or API
4. **Final Values**: Merged result available to workflow

#### CLI Usage

```bash
# Use default profile
siyeflow execute -w workflow.json

# Select specific profile
siyeflow execute -w workflow.json --profile Production

# Select profile with input overrides
siyeflow execute -w workflow.json -p Development -i '{"timeout": 1000}'
```

### 2. End Block (Exit Point)

```json
{
  "id": "end",
  "type": "end",
  "name": "Workflow End",
  "config": {
    "outputs": {
      "success": {
        "type": "boolean",
        "value": "{{success}}"
      },
      "processedOrder": {
        "type": "object",
        "value": "{{order}}"
      },
      "totalAmount": {
        "type": "number",
        "value": "{{calculateTotal.result}}"
      },
      "logs": {
        "type": "array",
        "value": "{{$workflowLogs}}"
      }
    }
  }
}
```

### 3. Try/Catch/Finally Block

```json
{
  "id": "error-handler",
  "type": "try-catch",
  "name": "Process with Error Handling",
  "config": {
    "maxAttempts": 3,
    "retryDelay": 1000
  },
  "try": "risky-operation",      // First block in try section
  "catch": "handle-error",        // First block in catch section
  "finally": "cleanup-resources", // Always executes
  "outputs": {
    "error": "$error",
    "attempts": "$attempts"
  }
}
```

### 4. HTTP Request Block

```json
{
  "id": "fetch-user",
  "type": "http-request",
  "name": "Get User Details",
  "config": {
    "method": "GET|POST|PUT|DELETE|PATCH",
    "url": "{{baseUrl}}/api/users/{{userId}}",
    "headers": {
      "Authorization": "Bearer {{token}}"
    },
    "body": {
      "name": "{{userName}}"
    },
    "timeout": 30000,
    "retries": 3
  },
  "outputs": {
    "user": "$",
    "userId": "$.id",
    "userName": "$.name"
  }
}
```

### 5. Evaluate Block (Data Processing)

#### JSONPath Mode
```json
{
  "id": "extract-data",
  "type": "evaluate",
  "name": "Extract Order Data",
  "config": {
    "language": "jsonpath",
    "expressions": {
      "orderTotal": "$.items[*].price",
      "itemCount": "$.items.length",
      "highValueItems": "$.items[?(@.price > 100)]",
      "firstItem": "$.items[0]"
    }
  },
  "inputs": {
    "order": "{{fetch-order.response}}"
  },
  "outputs": {
    "total": "{{orderTotal}}",
    "count": "{{itemCount}}",
    "expensive": "{{highValueItems}}"
  }
}
```

#### TypeScript Mode
```json
{
  "id": "calculate-totals",
  "type": "evaluate", 
  "name": "Calculate Order Totals",
  "config": {
    "language": "typescript",
    "code": `
      // Available: inputs, env, utils
      const items = inputs.order.items;
      const subtotal = items.reduce((sum, item) => 
        sum + (item.price * item.quantity), 0
      );
      
      const tax = subtotal * 0.08;
      const shipping = subtotal > 100 ? 0 : 15;
      
      return {
        subtotal,
        tax,
        shipping,
        total: subtotal + tax + shipping,
        itemCount: items.length,
        freeShipping: shipping === 0
      };
    `
  },
  "inputs": {
    "order": "{{fetch-order.response}}"
  },
  "outputs": {
    "orderTotal": "$result.total",
    "shipping": "$result.shipping",
    "summary": "$result"
  }
}
```

### 3. Condition Block (If/Else)

```json
{
  "id": "check-status",
  "type": "condition",
  "name": "Check User Status",
  "config": {
    "expression": "inputs.user.status === 'active' && inputs.user.credits > 0"
  },
  "inputs": {
    "user": "{{fetch-user.user}}"
  },
  "branches": {
    "true": "process-active-user",
    "false": "handle-inactive-user"
  }
}
```

### 4. Loop Block (ForEach)

```json
{
  "id": "process-items",
  "type": "loop",
  "name": "Process Each Order Item",
  "config": {
    "items": "{{orders}}",
    "itemName": "order",
    "parallel": false,  // Sequential by default
    "maxConcurrency": 5 // If parallel is true
  },
  "inputs": {
    "orders": "{{fetch-orders.orders}}"
  },
  "loopBody": "process-single-order", // First block inside loop
  "outputs": {
    "processedOrders": "$loopResults"
  }
}
```

### 5. Collect Block (Aggregate Loop Results)

```json
{
  "id": "collect-results",
  "type": "collect",
  "name": "Aggregate Processing Results",
  "config": {
    "strategy": "array|object|concat|sum|average",
    "groupBy": "$.status", // Optional grouping
    "filter": "$.success === true" // Optional filtering
  },
  "inputs": {
    "results": "{{process-items.processedOrders}}"
  },
  "outputs": {
    "summary": "$"
  }
}
```

### 6. Delay Block

```json
{
  "id": "wait-for-processing",
  "type": "delay",
  "name": "Wait 5 Seconds",
  "config": {
    "duration": 5000, // milliseconds
    "dynamic": "{{delayTime}}" // Or use dynamic value
  }
}
```

### 7. Log Block

```json
{
  "id": "log-results",
  "type": "log",
  "name": "Log Processing Results",
  "config": {
    "level": "info|debug|warn|error",
    "message": "Processed {{count}} items successfully",
    "data": {
      "results": "{{results}}",
      "timestamp": "{{$timestamp}}"
    }
  },
  "inputs": {
    "results": "{{collect-results.summary}}",
    "count": "{{collect-results.summary.length}}"
  }
}
```

### 8. Variable Block (Set/Get Variables)

```json
{
  "id": "set-config",
  "type": "variable",
  "name": "Set Configuration",
  "config": {
    "operation": "set|get|delete",
    "variables": {
      "apiKey": "{{env.API_KEY}}",
      "baseUrl": "https://api.example.com",
      "retryCount": 3
    }
  },
  "outputs": {
    "config": "$variables"
  }
}
```


## Complete Workflow Example

```json
{
  "name": "Order Processing Workflow",
  "description": "Process orders with retry and error handling",
  "inputs": {
    "orderId": "string",
    "userId": "string"
  },
  "blocks": [
    {
      "id": "start",
      "type": "variable",
      "name": "Initialize Variables",
      "config": {
        "operation": "set",
        "variables": {
          "baseUrl": "https://api.example.com",
          "startTime": "{{$timestamp}}"
        }
      },
      "onSuccess": "fetch-order"
    },
    {
      "id": "fetch-order",
      "type": "http-request",
      "name": "Get Order Details",
      "config": {
        "method": "GET",
        "url": "{{baseUrl}}/orders/{{orderId}}"
      },
      "inputs": {
        "orderId": "{{inputs.orderId}}"
      },
      "outputs": {
        "order": "$",
        "items": "$.items"
      },
      "onSuccess": "check-order-status",
      "onFailure": "log-error"
    },
    {
      "id": "check-order-status",
      "type": "condition",
      "name": "Is Order Pending?",
      "config": {
        "expression": "inputs.order.status === 'pending'"
      },
      "inputs": {
        "order": "{{fetch-order.order}}"
      },
      "branches": {
        "true": "process-items",
        "false": "skip-processing"
      }
    },
    {
      "id": "process-items",
      "type": "loop",
      "name": "Process Each Item",
      "config": {
        "items": "{{items}}",
        "itemName": "item",
        "parallel": true,
        "maxConcurrency": 3
      },
      "inputs": {
        "items": "{{fetch-order.items}}"
      },
      "loopBody": "validate-item",
      "onSuccess": "collect-results"
    },
    {
      "id": "validate-item",
      "type": "http-request",
      "name": "Validate Item Stock",
      "config": {
        "method": "POST",
        "url": "{{baseUrl}}/inventory/check"
      },
      "inputs": {
        "item": "{{$loopItem}}"
      },
      "outputs": {
        "available": "$.available",
        "itemId": "{{$loopItem.id}}"
      },
      "onSuccess": "extract-item-data"
    },
    {
      "id": "extract-item-data",
      "type": "evaluate",
      "name": "Extract Item Properties",
      "config": {
        "language": "jsonpath",
        "expressions": {
          "price": "$.price",
          "quantity": "$.quantity", 
          "category": "$.category",
          "isHighValue": "$.price > 100"
        }
      },
      "inputs": {
        "item": "{{$loopItem}}"
      },
      "outputs": {
        "itemPrice": "{{price}}",
        "itemQty": "{{quantity}}"
      },
      "onSuccess": "calculate-price"
    },
    {
      "id": "calculate-price",
      "type": "evaluate",
      "name": "Calculate Item Total",
      "config": {
        "language": "typescript",
        "code": `
          const price = inputs.price;
          const qty = inputs.quantity;
          const discount = inputs.category === 'premium' ? 0.15 : 0.1;
          
          const subtotal = price * qty;
          const discountAmount = subtotal * discount;
          const total = subtotal - discountAmount;
          
          return {
            subtotal,
            discountAmount,
            total,
            discountPercent: discount * 100,
            processedItem: {
              ...inputs.$loopItem,
              total,
              discount: discountAmount
            }
          };
        `
      },
      "inputs": {
        "price": "{{extract-item-data.itemPrice}}",
        "quantity": "{{extract-item-data.itemQty}}",
        "category": "{{extract-item-data.category}}",
        "$loopItem": "{{$loopItem}}"
      },
      "outputs": {
        "itemTotal": "$result.total",
        "processedItem": "$result.processedItem"
      }
    },
    {
      "id": "collect-results",
      "type": "collect",
      "name": "Aggregate Results",
      "config": {
        "strategy": "array"
      },
      "outputs": {
        "processedItems": "$"
      },
      "onSuccess": "calculate-total"
    },
    {
      "id": "calculate-total",
      "type": "evaluate",
      "name": "Calculate Order Total",
      "config": {
        "language": "typescript",
        "code": `
          const items = inputs.items;
          const subtotal = items.reduce((sum, item) => sum + item.total, 0);
          const totalSaved = items.reduce((sum, item) => sum + item.discount, 0);
          
          // Apply additional order-level discount for bulk orders
          const orderDiscount = items.length >= 5 ? subtotal * 0.05 : 0;
          const finalTotal = subtotal - orderDiscount;
          
          return {
            itemCount: items.length,
            subtotal,
            totalSaved,
            orderDiscount,
            finalTotal,
            averageItemPrice: finalTotal / items.length
          };
        `
      },
      "inputs": {
        "items": "{{collect-results.processedItems}}"
      },
      "outputs": {
        "orderTotal": "$result.finalTotal",
        "orderSummary": "$result"
      },
      "onSuccess": "update-order"
    },
    {
      "id": "update-order",
      "type": "http-request",
      "name": "Update Order Status",
      "config": {
        "method": "PATCH",
        "url": "{{baseUrl}}/orders/{{orderId}}"
      },
      "inputs": {
        "orderId": "{{inputs.orderId}}",
        "total": "{{calculate-total.orderTotal}}",
        "status": "processed"
      },
      "onSuccess": "log-success",
      "onFailure": "log-error"
    },
    {
      "id": "log-success",
      "type": "log",
      "name": "Log Success",
      "config": {
        "level": "info",
        "message": "Order {{orderId}} processed successfully. Total: ${{total}}"
      },
      "inputs": {
        "orderId": "{{inputs.orderId}}",
        "total": "{{calculate-total.orderTotal}}"
      }
    },
    {
      "id": "log-error",
      "type": "log",
      "name": "Log Error",
      "config": {
        "level": "error",
        "message": "Failed to process order {{orderId}}"
      }
    },
    {
      "id": "skip-processing",
      "type": "log",
      "name": "Skip Non-Pending Order",
      "config": {
        "level": "info",
        "message": "Order {{orderId}} is not pending, skipping processing"
      }
    }
  ]
}
```

## Benefits of This Design

1. **Modularity**: Each block type has its own schema and behavior
2. **Extensibility**: Easy to add new block types
3. **Visual Clarity**: UI can render different blocks with different styles/icons
4. **Type Safety**: Each block type has defined inputs/outputs
5. **Reusability**: Blocks can be saved as templates
6. **Debugging**: Clear flow with logging and evaluation blocks
7. **Power**: Supports complex workflows with loops, conditions, and data processing

## Special Variables

- `{{$timestamp}}` - Current timestamp
- `{{$loopIndex}}` - Current loop iteration (in loop blocks)
- `{{$loopItem}}` - Current item being processed (in loop blocks)
- `{{$env.VAR_NAME}}` - Environment variables
- `{{$result}}` - Result of evaluate block
- `{{$error}}` - Error object in catch blocks
- `{{$attempts}}` - Retry attempt count
- `{{$workflowLogs}}` - All logs from the workflow

## TypeScript Execution Environment

When using TypeScript in Evaluate blocks, the following are available:

### Built-in Variables
```typescript
// All block inputs
inputs: {
  [key: string]: any
}

// Environment variables
env: {
  [key: string]: string
}

// Current context
context: {
  workflowId: string,
  executionId: string,
  blockId: string,
  timestamp: Date
}

// In loops
loop?: {
  index: number,
  item: any,
  total: number
}
```

### Utility Functions
```typescript
// Lodash utilities
_: {
  map, filter, reduce, groupBy, sortBy, uniq, flatten, pick, omit, etc.
}

// Date utilities
dayjs: {
  format, parse, add, subtract, diff, etc.
}

// HTTP client (for simple requests)
http: {
  get(url: string, options?: any): Promise<any>,
  post(url: string, data: any, options?: any): Promise<any>
}

// Crypto utilities
crypto: {
  hash(data: string, algorithm: 'sha256'|'md5'): string,
  randomUUID(): string,
  encode(data: string, encoding: 'base64'|'hex'): string
}
```

### Example TypeScript Usage
```typescript
// Complex data transformation
const orders = inputs.orders;
const grouped = _.groupBy(orders, 'status');

const summary = {
  total: orders.length,
  byStatus: _.mapValues(grouped, g => ({
    count: g.length,
    value: _.sumBy(g, 'total')
  })),
  avgProcessingTime: _.meanBy(orders, o => 
    dayjs(o.completedAt).diff(o.createdAt, 'hours')
  )
};

// External API call (if needed)
const exchangeRate = await http.get(
  `https://api.exchange.com/rates/${inputs.currency}`
);

return {
  ...summary,
  exchangeRate: exchangeRate.rate,
  convertedTotal: summary.total * exchangeRate.rate
};
```

## Workflow Composition (Reusable Workflows)

The Start/End blocks enable workflows to be used as sub-workflows in other flows:

### Defining a Reusable Workflow

```json
{
  "name": "Calculate Order Total",
  "type": "workflow",  // Marks this as reusable
  "blocks": [
    {
      "id": "start",
      "type": "start",
      "config": {
        "inputs": {
          "items": { "type": "array", "required": true },
          "discountCode": { "type": "string", "required": false }
        }
      }
    },
    // ... processing blocks ...
    {
      "id": "end",
      "type": "end",
      "config": {
        "outputs": {
          "total": { "type": "number", "value": "{{calculatedTotal}}" },
          "discount": { "type": "number", "value": "{{discountAmount}}" }
        }
      }
    }
  ]
}
```

### Using a Workflow as a Block

```json
{
  "id": "calc-order-total",
  "type": "workflow",
  "name": "Calculate Total",
  "config": {
    "workflowId": "calculate-order-total",
    "async": false
  },
  "inputs": {
    "items": "{{order.items}}",
    "discountCode": "{{customer.discountCode}}"
  },
  "outputs": {
    "orderTotal": "{{total}}",
    "appliedDiscount": "{{discount}}"
  }
}
```

This enables:
- **Modular workflows** - Break complex flows into manageable pieces
- **Reusability** - Use common patterns across different workflows
- **Testing** - Test workflows in isolation
- **Versioning** - Version and update workflows independently

## Future Block Types

### Wait Block (Synchronization Point)
For parallel execution support, waits for multiple blocks to complete:

```json
{
  "id": "wait-for-data",
  "type": "wait",
  "name": "Wait for All User Data",
  "config": {
    "waitFor": ["fetch-orders", "fetch-profile", "fetch-preferences"],
    "strategy": "all",        // all: wait for all, any: first to complete
    "timeout": 30000,         // Optional timeout in ms
    "continueOnError": false  // Whether to continue if some blocks fail
  }
}
```

### Fork Block (Parallel Branching)
Explicitly splits execution into multiple parallel paths:

```json
{
  "id": "fork-requests",
  "type": "fork",
  "name": "Parallel API Calls",
  "config": {
    "branches": ["fetch-orders", "fetch-profile", "fetch-settings"]
  }
}
```

### Cache Block
Caches data for reuse across workflow executions:

```json
{
  "id": "cache-user-data",
  "type": "cache",
  "name": "Cache User Profile",
  "config": {
    "key": "user:{{userId}}",
    "ttl": 3600,
    "operation": "get|set|delete"
  }
}
```

## Benefits of This Design

1. **Modularity**: Each block type has its own schema and behavior
2. **Extensibility**: Easy to add new block types
3. **Visual Clarity**: UI can render different blocks with different styles/icons
4. **Type Safety**: Start/End blocks define clear interfaces
5. **Reusability**: Workflows can be composed and nested
6. **Error Handling**: Try/catch/finally for robust execution
7. **Debugging**: Clear flow with logging and evaluation blocks
8. **Power**: Supports complex workflows with loops, conditions, and data processing

Ready to start implementing these enhancements?
