# SiyeFlow Workflow Schema & Engine Guide

This is the definitive guide to the SiyeFlow Workflow Engine. It covers the user guide, JSON schema specification, and backend runtime behavior.

---

# 📚 Part 1: User Guide (The Blocks)

SiyeFlow uses a **Node-Edge Graph** model. Blocks (Nodes) perform actions, and Wires (Edges) define the flow.

## Block Catalog

### 🟢 Start Block ("The Trigger")
The entry point. Defines environment profiles (Dev vs Prod) and inputs.
*   **Ports:** Output `trigger` + data outputs for each input variable.

### 🛑 End Block ("The Response")
The exit point. Returns the final JSON response to the caller.
*   **Ports:** Input `trigger`.

### 🌍 HTTP Request Block ("The Connector")
Makes REST API calls.
*   **Ports:** Input `trigger`, Outputs `success`/`fail`. Data: `status`, `body`.

### 🔀 Switch Block ("The Router")
Routes logic based on conditions (e.g., `{{status}} == "active"`).
*   **Ports:** Input `trigger`, Dynamic Outputs (e.g., `active`, `inactive`).

### ⚡ Batch Block ("The Parallel Processor")
Processes a list of items in parallel threads.
*   **Ports:** Input `trigger`, Outputs `item` (per item), `completed` (when all done).

### 📦 Variable Block ("The Memory")
Sets global variables usable by any future block.

### ⏱️ Delay Block ("The Pause")
Pauses execution for a set time (e.g., "Wait 2 days").

---

# 📐 Part 2: Schema Reference (JSON Spec)

The workflow file is a JSON object.

```json
{
  "id": "wf-123",
  "version": "2.0.0",
  "nodes": [ ... ],
  "edges": [ ... ]
}
```

## 1. The Node Object
Represents a logical step.

```typescript
interface Node {
  id: string;           // Unique ID
  type: string;         // "start", "http-request", etc.
  label?: string;       // UI Label
  data: JObject;        // ⚡ Configuration (Unique per type)
  interface?: NodeInterface; // (Optional) Custom Port Definitions
}
```

## 2. The Edge Object
Represents a connection.

```typescript
interface Edge {
  id: string;
  type: "execution" | "data"; // ⚪ Execution (Flow) vs 🔵 Data (Variables)
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
}
```

## 3. Configuration Schemas (Node.Data)

### Start Block Data
```json
{
  "inputs": {
    "apiUrl": { "type": "string", "required": true }
  },
  "profiles": [
    { "name": "Dev", "values": { "apiUrl": "http://localhost" } }
  ]
}
```

### HTTP Block Data
```json
{
  "method": "GET",
  "url": "{{apiUrl}}/users",
  "headers": { "Authorization": "Bearer {{token}}" }
}
```

### Switch Block Data
```json
{
  "expression": "{{statusCode}}",
  "cases": [
    { "id": "c1", "value": 200, "label": "Success" },
    { "id": "c2", "value": 500, "label": "Error" }
  ]
}
```

---

# ⚙️ Part 3: Runtime Behavior (Backend Spec)

How the engine executes the graph.

## 1. Graph Traversal
The engine uses a **Breadth-First Search (BFS)** approach.
*   It starts at the node with `type: "start"`.
*   After a node executes, it checks the **Execution Edges** connected to the `NextHandle` returned by the block.

## 2. Data Injection
Before running any node, the engine looks for **Data Edges** connected to that node.
*   It reads the value from the Source Node's output.
*   It injects that value into the Target Node's `data` configuration.

## 3. Block Lifecycles

| Block | Behavior |
| :--- | :--- |
| **Start** | Merges Profile Values + Runtime Inputs. Exposes them as outputs. |
| **HTTP** | Resolves URL/Headers. Executes Fetch. Returns 200 as `success` path, 400/500 as `fail` path. |
| **Variable** | Writes to the global Variable Store. |
| **Evaluate** | Runs a sandboxed JavaScript function. Returns the result. |
| **Batch** | Spawns concurrent execution contexts for each item in the input array. |

---

# 🔄 Part 4: Legacy Comparison

**Migration Note:**
*   **Old Schema:** `connections` were inside blocks. Ports were defined per instance.
*   **New Schema:** `edges` are separate. Ports are defined by the Registry (Code) or `interface` (JSON).
*   **Reason:** Performance (O(1) lookup), Scalability, and cleaner UI state.

