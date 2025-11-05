var f = Object.defineProperty;
var w = (r, o, t) => o in r ? f(r, o, { enumerable: !0, configurable: !0, writable: !0, value: t }) : r[o] = t;
var n = (r, o, t) => w(r, typeof o != "symbol" ? o + "" : o, t);
var a = /* @__PURE__ */ ((r) => (r.Start = "start", r.End = "end", r.HttpRequest = "http-request", r.Evaluate = "evaluate", r.Condition = "condition", r.Loop = "loop", r.Delay = "delay", r.Variable = "variable", r.Log = "log", r.Collect = "collect", r.TryCatch = "try-catch", r.Workflow = "workflow", r))(a || {});
class p {
  constructor() {
    n(this, "id", "");
    n(this, "name", "");
    n(this, "description");
    n(this, "inputs");
    n(this, "outputs");
    n(this, "onSuccess");
    n(this, "onFailure");
    n(this, "onComplete");
  }
}
class m {
  constructor() {
    n(this, "inputs");
  }
}
class b extends p {
  constructor() {
    super(...arguments);
    n(this, "type", "start");
    n(this, "config", new m());
  }
}
class B {
  constructor() {
    n(this, "outputs");
  }
}
class C extends p {
  constructor() {
    super(...arguments);
    n(this, "type", "end");
    n(this, "config", new B());
  }
}
class E {
  constructor() {
    n(this, "method", "");
    n(this, "url", "");
    n(this, "headers");
    n(this, "body");
    n(this, "timeout");
    n(this, "retries");
    n(this, "successCodes");
  }
}
class x extends p {
  constructor() {
    super(...arguments);
    n(this, "type", "http-request");
    n(this, "config", new E());
  }
}
class S {
  constructor() {
    n(this, "operation", "");
    n(this, "variables");
  }
}
class $ extends p {
  constructor() {
    super(...arguments);
    n(this, "type", "variable");
    n(this, "config", new S());
  }
}
class D {
  constructor() {
    n(this, "expression", "");
    n(this, "onTrue", "");
    n(this, "onFalse", "");
  }
}
class L extends p {
  constructor() {
    super(...arguments);
    n(this, "type", "condition");
    n(this, "config", new D());
  }
}
class P {
  constructor() {
    n(this, "milliseconds", 0);
  }
}
class M extends p {
  constructor() {
    super(...arguments);
    n(this, "type", "delay");
    n(this, "config", new P());
  }
}
class T {
  constructor() {
    n(this, "message", "");
    n(this, "level", "");
  }
}
class W extends p {
  constructor() {
    super(...arguments);
    n(this, "type", "log");
    n(this, "config", new T());
  }
}
class I {
  constructor() {
    n(this, "language", "");
    n(this, "expression", "");
    n(this, "data", "");
  }
}
class J extends p {
  constructor() {
    super(...arguments);
    n(this, "type", "evaluate");
    n(this, "config", new I());
  }
}
class O {
  constructor() {
    n(this, "items", "");
    n(this, "itemVariable", "");
    n(this, "indexVariable", "");
    n(this, "loopBlock", "");
    n(this, "maxIterations");
  }
}
class _ extends p {
  constructor() {
    super(...arguments);
    n(this, "type", "loop");
    n(this, "config", new O());
  }
}
class F {
  constructor() {
    n(this, "fromLoop", "");
    n(this, "collectExpression", "");
    n(this, "outputVariable", "");
  }
}
class z extends p {
  constructor() {
    super(...arguments);
    n(this, "type", "collect");
    n(this, "config", new F());
  }
}
class A {
  constructor() {
    n(this, "tryBlock", "");
    n(this, "catchBlock", "");
    n(this, "finallyBlock", "");
    n(this, "retries");
    n(this, "retryDelay");
  }
}
class X extends p {
  constructor() {
    super(...arguments);
    n(this, "type", "try-catch");
    n(this, "config", new A());
  }
}
class H {
  constructor() {
    n(this, "workflowId", "");
    n(this, "inputs");
    n(this, "outputMapping");
  }
}
class G extends p {
  constructor() {
    super(...arguments);
    n(this, "type", "workflow");
    n(this, "config", new H());
  }
}
class v {
  constructor() {
    n(this, "workflow");
    n(this, "blocks");
    this.workflow = {
      name: "New Workflow",
      description: "",
      version: "1.0",
      blocks: []
    }, this.blocks = /* @__PURE__ */ new Map();
  }
  /**
   * Load workflow from JSON
   */
  loadWorkflow(o) {
    try {
      const t = JSON.parse(o);
      this.workflow = this.deserializeWorkflow(t), this.indexBlocks();
    } catch (t) {
      throw new Error(`Failed to load workflow: ${t}`);
    }
  }
  /**
   * Save workflow to JSON
   */
  saveWorkflow() {
    return JSON.stringify(this.workflow, null, 2);
  }
  /**
   * Get the current workflow definition
   */
  getWorkflow() {
    return this.workflow;
  }
  /**
   * Add a new block to the workflow
   */
  addBlock(o) {
    o.id || (o.id = this.generateBlockId(o.type)), this.workflow.blocks || (this.workflow.blocks = []), this.workflow.blocks.push(o), this.blocks.set(o.id, o);
  }
  /**
   * Remove a block from the workflow
   */
  removeBlock(o) {
    var e, s;
    const t = (e = this.workflow.blocks) == null ? void 0 : e.findIndex((i) => i.id === o);
    t !== void 0 && t >= 0 && ((s = this.workflow.blocks) == null || s.splice(t, 1), this.blocks.delete(o));
  }
  /**
   * Update a block in the workflow
   */
  updateBlock(o, t) {
    const e = this.blocks.get(o);
    e && Object.assign(e, t);
  }
  /**
   * Get a block by ID
   */
  getBlock(o) {
    return this.blocks.get(o);
  }
  /**
   * Get all blocks
   */
  getBlocks() {
    return Array.from(this.blocks.values());
  }
  /**
   * Validate the workflow
   */
  validate() {
    var i, l, c;
    const o = [], t = [], e = (i = this.workflow.blocks) == null ? void 0 : i.some((d) => d.type === a.Start), s = (l = this.workflow.blocks) == null ? void 0 : l.some((d) => d.type === a.End);
    return e || o.push("Workflow must have a Start block"), s || o.push("Workflow must have an End block"), (c = this.workflow.blocks) == null || c.forEach((d) => {
      d.type !== a.End && !d.onSuccess && !d.onFailure && !d.onComplete && t.push(`Block '${d.name || d.id}' has no outgoing connections`);
    }), {
      isValid: o.length === 0,
      errors: o,
      warnings: t
    };
  }
  /**
   * Create a new block instance by type
   */
  createBlock(o) {
    switch (o) {
      case a.Start:
        return new b();
      case a.End:
        return new C();
      case a.HttpRequest:
        return new x();
      case a.Variable:
        return new $();
      case a.Condition:
        return new L();
      case a.Delay:
        return new M();
      case a.Log:
        return new W();
      default:
        throw new Error(`Unknown block type: ${o}`);
    }
  }
  /**
   * Generate a unique block ID
   */
  generateBlockId(o) {
    const t = o.toLowerCase().replace("-", "_"), e = Date.now(), s = Math.random().toString(36).substring(2, 5);
    return `${t}_${e}_${s}`;
  }
  /**
   * Index all blocks for quick lookup
   */
  indexBlocks() {
    var o;
    this.blocks.clear(), (o = this.workflow.blocks) == null || o.forEach((t) => {
      this.blocks.set(t.id, t);
    });
  }
  /**
   * Deserialize workflow JSON to proper class instances
   */
  deserializeWorkflow(o) {
    const t = {
      name: o.name || "",
      description: o.description || "",
      version: o.version || "1.0",
      metadata: o.metadata,
      inputs: o.inputs,
      outputs: o.outputs,
      blocks: []
    };
    return o.blocks && Array.isArray(o.blocks) && (t.blocks = o.blocks.map((e) => {
      const s = this.createBlock(this.parseBlockType(e.type));
      return Object.assign(s, e), s;
    })), t;
  }
  /**
   * Parse block type from string
   */
  parseBlockType(o) {
    const t = o.split("-").map(
      (e, s) => e.charAt(0).toUpperCase() + e.slice(1)
    ).join("");
    return a[t] || a.Start;
  }
}
class g {
  constructor() {
    n(this, "events", /* @__PURE__ */ new Map());
  }
  on(o, t) {
    this.events.has(o) || this.events.set(o, []), this.events.get(o).push(t);
  }
  off(o, t) {
    const e = this.events.get(o);
    if (e) {
      const s = e.indexOf(t);
      s !== -1 && e.splice(s, 1);
    }
  }
  emit(o, ...t) {
    const e = this.events.get(o);
    e && e.forEach((s) => s(...t));
  }
}
const q = [
  {
    type: a.Start,
    name: "Start",
    icon: "🟢",
    category: "Control",
    description: "Entry point of the workflow",
    color: "#4CAF50"
  },
  {
    type: a.End,
    name: "End",
    icon: "🔴",
    category: "Control",
    description: "Exit point of the workflow",
    color: "#f44336"
  },
  {
    type: a.HttpRequest,
    name: "HTTP Request",
    icon: "🌐",
    category: "Action",
    description: "Make an HTTP API call",
    color: "#2196F3"
  },
  {
    type: a.Variable,
    name: "Variable",
    icon: "📦",
    category: "Data",
    description: "Set, get, or delete variables",
    color: "#FF9800"
  },
  {
    type: a.Condition,
    name: "Condition",
    icon: "❓",
    category: "Control",
    description: "Branch based on a condition",
    color: "#9C27B0"
  },
  {
    type: a.Delay,
    name: "Delay",
    icon: "⏰",
    category: "Action",
    description: "Wait for specified time",
    color: "#00BCD4"
  },
  {
    type: a.Log,
    name: "Log",
    icon: "📝",
    category: "Debug",
    description: "Log a message",
    color: "#607D8B"
  },
  {
    type: a.Evaluate,
    name: "Evaluate",
    icon: "🧮",
    category: "Data",
    description: "Evaluate an expression",
    color: "#795548"
  },
  {
    type: a.Loop,
    name: "Loop",
    icon: "🔄",
    category: "Control",
    description: "Iterate over items",
    color: "#E91E63"
  },
  {
    type: a.TryCatch,
    name: "Try/Catch",
    icon: "⚠️",
    category: "Control",
    description: "Error handling",
    color: "#FFC107"
  }
];
class N extends g {
  constructor(t) {
    super();
    n(this, "container");
    n(this, "svg");
    n(this, "blocks", /* @__PURE__ */ new Map());
    n(this, "connections", /* @__PURE__ */ new Map());
    n(this, "blockDataMap", /* @__PURE__ */ new Map());
    n(this, "isDragging", !1);
    n(this, "draggedBlockId", null);
    n(this, "dragOffset", { x: 0, y: 0 });
    n(this, "isConnecting", !1);
    n(this, "connectionStart", null);
    n(this, "mousePosition", { x: 0, y: 0 });
    const e = document.getElementById(t);
    if (!e)
      throw new Error(`Container element '${t}' not found`);
    this.container = e, this.setupCanvas();
  }
  /**
   * Setup the canvas and SVG elements
   */
  setupCanvas() {
    this.container.innerHTML = `
            <div class="canvas-wrapper" style="position: relative; width: 100%; height: 100%; overflow: auto;">
                <svg class="connections-svg" style="position: absolute; top: 0; left: 0; width: 2000px; height: 2000px; pointer-events: none;">
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#30363d" />
                        </marker>
                    </defs>
                </svg>
                <div class="blocks-layer" style="position: relative; width: 2000px; height: 2000px;"></div>
            </div>
        `, this.svg = this.container.querySelector(".connections-svg");
    const t = this.container.querySelector(".canvas-wrapper");
    t.addEventListener("dragover", (e) => this.onDragOver(e)), t.addEventListener("drop", (e) => this.onDrop(e)), t.addEventListener("click", (e) => this.onCanvasClick(e)), t.addEventListener("mousemove", (e) => this.onMouseMove(e)), t.addEventListener("mouseup", (e) => this.onMouseUp(e));
  }
  /**
   * Render the workflow
   */
  render(t, e) {
    this.blocks = t, this.connections = e, this.renderBlocks(), this.renderConnections();
  }
  /**
   * Set block data for rich display
   */
  setBlockData(t) {
    this.blockDataMap = t, this.blocks.size > 0 && this.renderBlocks();
  }
  /**
   * Render all blocks
   */
  renderBlocks() {
    const t = this.container.querySelector(".blocks-layer");
    t && (t.innerHTML = "", this.blocks.forEach((e) => {
      const s = this.createBlockElement(e);
      t.appendChild(s);
    }));
  }
  /**
   * Create a block DOM element
   */
  createBlockElement(t) {
    const e = this.getBlockInfo(t.type), s = document.createElement("div");
    s.className = `workflow-block block-type-${t.type} ${t.selected ? "selected" : ""}`, s.id = `block-${t.id}`, s.style.left = `${t.position.x}px`, s.style.top = `${t.position.y}px`, s.style.width = `${t.width}px`, s.style.minHeight = `${t.height}px`, s.style.borderColor = e.color;
    const i = this.getBlockData(t.id), l = (i == null ? void 0 : i.name) || t.id, c = this.getBlockDescription(i);
    return s.innerHTML = `
            <div class="block-header">
                <span class="block-icon">${e.icon}</span>
                <div class="block-info">
                    <span class="block-name">${l}</span>
                    <span class="block-type">${t.type}</span>
                </div>
            </div>
            ${c ? `<div class="block-description">${c}</div>` : ""}
            <div class="block-ports">
                <div class="port port-in" data-block="${t.id}" data-type="in"></div>
                <div class="port port-out" data-block="${t.id}" data-type="out"></div>
            </div>
        `, s.addEventListener("mousedown", (u) => this.onBlockMouseDown(u, t.id)), s.addEventListener("click", (u) => this.onBlockClick(u, t.id)), s.querySelectorAll(".port").forEach((u) => {
      u.addEventListener("mousedown", (h) => this.onPortMouseDown(h));
    }), s;
  }
  /**
   * Render all connections
   */
  renderConnections() {
    if (this.svg.querySelectorAll("path.connection").forEach((e) => e.remove()), this.connections.forEach((e) => {
      const s = this.createConnectionPath(e);
      s && this.svg.appendChild(s);
    }), this.isConnecting && this.connectionStart) {
      const e = this.createTempConnectionPath();
      e && this.svg.appendChild(e);
    }
  }
  /**
   * Create a connection path element
   */
  createConnectionPath(t) {
    const e = this.blocks.get(t.source), s = this.blocks.get(t.target);
    if (!e || !s) return null;
    const i = {
      x: e.position.x + e.width,
      y: e.position.y + e.height / 2
    }, l = {
      x: s.position.x,
      y: s.position.y + s.height / 2
    }, c = document.createElementNS("http://www.w3.org/2000/svg", "path");
    return c.setAttribute("class", `connection connection-line ${t.type}`), c.setAttribute("d", this.getPathData(i, l)), c.setAttribute("marker-end", "url(#arrowhead)"), c;
  }
  /**
   * Create temporary connection path while dragging
   */
  createTempConnectionPath() {
    if (!this.connectionStart) return null;
    const t = document.createElementNS("http://www.w3.org/2000/svg", "path");
    return t.setAttribute("class", "connection temp-connection"), t.setAttribute("d", this.getPathData(this.connectionStart.position, this.mousePosition)), t.setAttribute("stroke-dasharray", "5,5"), t;
  }
  /**
   * Get SVG path data for a curved connection
   */
  getPathData(t, e) {
    const s = (t.x + e.x) / 2;
    return `M ${t.x} ${t.y} C ${s} ${t.y}, ${s} ${e.y}, ${e.x} ${e.y}`;
  }
  /**
   * Get block info from type
   */
  getBlockInfo(t) {
    return {
      start: { icon: "🟢", color: "#4CAF50" },
      end: { icon: "🔴", color: "#f44336" },
      "http-request": { icon: "🌐", color: "#2196F3" },
      variable: { icon: "📦", color: "#FF9800" },
      condition: { icon: "❓", color: "#9C27B0" },
      delay: { icon: "⏰", color: "#00BCD4" },
      log: { icon: "📝", color: "#607D8B" },
      evaluate: { icon: "🧮", color: "#795548" },
      loop: { icon: "🔄", color: "#E91E63" },
      "try-catch": { icon: "⚠️", color: "#FFC107" }
    }[t] || { icon: "📄", color: "#666" };
  }
  /**
   * Get block data by ID
   */
  getBlockData(t) {
    return this.blockDataMap.get(t);
  }
  /**
   * Get block description based on configuration
   */
  getBlockDescription(t) {
    if (!t) return "";
    const e = t.config;
    switch (t.type) {
      case "http-request":
        return e != null && e.url ? `${e.method || "GET"} ${e.url}` : "";
      case "variable":
        const s = e != null && e.variables ? Object.keys(e.variables).length : 0;
        return e != null && e.operation ? `${e.operation} ${s} variable(s)` : "";
      case "condition":
        return (e == null ? void 0 : e.expression) || "";
      case "delay":
        return e != null && e.milliseconds ? `${e.milliseconds}ms` : "";
      case "log":
        return e != null && e.message ? e.message.substring(0, 50) : "";
      case "start":
        return t.description || "Workflow entry point";
      case "end":
        return t.description || "Workflow exit point";
      default:
        return t.description || "";
    }
  }
  // Event Handlers
  onDragOver(t) {
    t.preventDefault();
  }
  onDrop(t) {
    t.preventDefault();
    const e = this.container.getBoundingClientRect(), s = {
      x: t.clientX - e.left,
      y: t.clientY - e.top
    };
    this.emit("drop", s);
  }
  onBlockMouseDown(t, e) {
    if (t.target.classList.contains("port"))
      return;
    t.preventDefault(), this.isDragging = !0, this.draggedBlockId = e;
    const s = this.blocks.get(e);
    s && (this.dragOffset = {
      x: t.clientX - s.position.x,
      y: t.clientY - s.position.y
    });
  }
  onBlockClick(t, e) {
    t.target.classList.contains("port") || (t.stopPropagation(), this.emit("blockSelect", e));
  }
  onCanvasClick(t) {
    t.target.classList.contains("canvas-wrapper") && this.emit("blockSelect", null);
  }
  onMouseMove(t) {
    const e = this.container.getBoundingClientRect();
    if (this.mousePosition = {
      x: t.clientX - e.left,
      y: t.clientY - e.top
    }, this.isDragging && this.draggedBlockId) {
      const s = {
        x: t.clientX - this.dragOffset.x,
        y: t.clientY - this.dragOffset.y
      };
      this.emit("blockMove", {
        blockId: this.draggedBlockId,
        position: s
      });
    }
    this.isConnecting && this.renderConnections();
  }
  onMouseUp(t) {
    if (this.isDragging && (this.isDragging = !1, this.draggedBlockId = null), this.isConnecting) {
      const e = t.target;
      if (e.classList.contains("port") && e.dataset.type === "in") {
        const s = e.dataset.block;
        s && this.connectionStart && this.emit("connectionCreate", {
          source: this.connectionStart.blockId,
          target: s,
          type: "success"
        });
      }
      this.isConnecting = !1, this.connectionStart = null, this.renderConnections();
    }
  }
  onPortMouseDown(t) {
    t.stopPropagation(), t.preventDefault();
    const e = t.target;
    if (e.dataset.type === "out") {
      const s = e.dataset.block;
      if (s) {
        const i = this.blocks.get(s);
        i && (this.isConnecting = !0, this.connectionStart = {
          blockId: s,
          position: {
            x: i.position.x + i.width,
            y: i.position.y + i.height / 2
          }
        });
      }
    }
  }
}
class V extends g {
  constructor(t) {
    super();
    n(this, "container");
    n(this, "currentBlock", null);
    const e = document.getElementById(t);
    if (!e)
      throw new Error(`Container element '${t}' not found`);
    this.container = e, this.setupPanel();
  }
  /**
   * Setup the property panel
   */
  setupPanel() {
    this.container.innerHTML = `
            <div class="property-panel-content">
                <h3>Properties</h3>
                <div class="property-form"></div>
            </div>
        `;
  }
  /**
   * Show properties for a block
   */
  showBlock(t) {
    this.currentBlock = t, this.renderProperties();
  }
  /**
   * Clear the property panel
   */
  clear() {
    this.currentBlock = null;
    const t = this.container.querySelector(".property-form");
    t && (t.innerHTML = '<p class="no-selection">Select a block to view properties</p>');
  }
  /**
   * Render block properties
   */
  renderProperties() {
    const t = this.container.querySelector(".property-form");
    if (!t || !this.currentBlock) return;
    let e = "";
    e += `
            <div class="property-group">
                <label>ID</label>
                <input type="text" value="${this.currentBlock.id}" readonly class="readonly">
            </div>
            
            <div class="property-group">
                <label>Type</label>
                <input type="text" value="${this.currentBlock.type}" readonly class="readonly">
            </div>
            
            <div class="property-group">
                <label>Name</label>
                <input type="text" id="prop-name" value="${this.currentBlock.name || ""}" 
                       data-property="name">
            </div>
            
            <div class="property-group">
                <label>Description</label>
                <textarea id="prop-description" rows="3" 
                          data-property="description">${this.currentBlock.description || ""}</textarea>
            </div>
        `, e += this.renderBlockSpecificProperties(), t.innerHTML = e, this.setupPropertyHandlers();
  }
  /**
   * Render block-specific properties based on type
   */
  renderBlockSpecificProperties() {
    if (!this.currentBlock) return "";
    let t = "<h4>Configuration</h4>";
    const e = this.currentBlock.config;
    switch (this.currentBlock.type) {
      case a.HttpRequest:
        t += `
                    <div class="property-group">
                        <label>URL</label>
                        <input type="text" data-property="config.url" 
                               value="${(e == null ? void 0 : e.url) || ""}">
                    </div>
                    
                    <div class="property-group">
                        <label>Method</label>
                        <select data-property="config.method">
                            <option value="GET" ${(e == null ? void 0 : e.method) === "GET" ? "selected" : ""}>GET</option>
                            <option value="POST" ${(e == null ? void 0 : e.method) === "POST" ? "selected" : ""}>POST</option>
                            <option value="PUT" ${(e == null ? void 0 : e.method) === "PUT" ? "selected" : ""}>PUT</option>
                            <option value="DELETE" ${(e == null ? void 0 : e.method) === "DELETE" ? "selected" : ""}>DELETE</option>
                            <option value="PATCH" ${(e == null ? void 0 : e.method) === "PATCH" ? "selected" : ""}>PATCH</option>
                        </select>
                    </div>
                    
                    <div class="property-group">
                        <label>Headers (JSON)</label>
                        <textarea rows="3" data-property="config.headers" 
                                  data-type="json">${JSON.stringify((e == null ? void 0 : e.headers) || {}, null, 2)}</textarea>
                    </div>
                    
                    <div class="property-group">
                        <label>Body (JSON)</label>
                        <textarea rows="5" data-property="config.body" 
                                  data-type="json">${e != null && e.body ? JSON.stringify(e.body, null, 2) : ""}</textarea>
                    </div>
                `;
        break;
      case a.Variable:
        t += `
                    <div class="property-group">
                        <label>Operation</label>
                        <select data-property="config.operation">
                            <option value="set" ${(e == null ? void 0 : e.operation) === "set" ? "selected" : ""}>Set</option>
                            <option value="get" ${(e == null ? void 0 : e.operation) === "get" ? "selected" : ""}>Get</option>
                            <option value="delete" ${(e == null ? void 0 : e.operation) === "delete" ? "selected" : ""}>Delete</option>
                        </select>
                    </div>
                    
                    <div class="property-group">
                        <label>Variables (JSON)</label>
                        <textarea rows="5" data-property="config.variables" 
                                  data-type="json">${JSON.stringify((e == null ? void 0 : e.variables) || {}, null, 2)}</textarea>
                    </div>
                `;
        break;
      case a.Condition:
        t += `
                    <div class="property-group">
                        <label>Expression</label>
                        <input type="text" data-property="config.expression" 
                               value="${(e == null ? void 0 : e.expression) || ""}">
                    </div>
                    
                    <div class="property-group">
                        <label>On True (Block ID)</label>
                        <input type="text" data-property="config.onTrue" 
                               value="${(e == null ? void 0 : e.onTrue) || ""}">
                    </div>
                    
                    <div class="property-group">
                        <label>On False (Block ID)</label>
                        <input type="text" data-property="config.onFalse" 
                               value="${(e == null ? void 0 : e.onFalse) || ""}">
                    </div>
                `;
        break;
      case a.Delay:
        t += `
                    <div class="property-group">
                        <label>Delay (milliseconds)</label>
                        <input type="number" data-property="config.milliseconds" 
                               value="${(e == null ? void 0 : e.milliseconds) || 1e3}">
                    </div>
                `;
        break;
      case a.Log:
        t += `
                    <div class="property-group">
                        <label>Message</label>
                        <textarea rows="3" data-property="config.message">${(e == null ? void 0 : e.message) || ""}</textarea>
                    </div>
                    
                    <div class="property-group">
                        <label>Level</label>
                        <select data-property="config.level">
                            <option value="info" ${(e == null ? void 0 : e.level) === "info" ? "selected" : ""}>Info</option>
                            <option value="warning" ${(e == null ? void 0 : e.level) === "warning" ? "selected" : ""}>Warning</option>
                            <option value="error" ${(e == null ? void 0 : e.level) === "error" ? "selected" : ""}>Error</option>
                            <option value="debug" ${(e == null ? void 0 : e.level) === "debug" ? "selected" : ""}>Debug</option>
                        </select>
                    </div>
                `;
        break;
      case a.End:
        t += `
                    <div class="property-group">
                        <label>Outputs (JSON)</label>
                        <textarea rows="5" data-property="config.outputs" 
                                  data-type="json">${JSON.stringify((e == null ? void 0 : e.outputs) || {}, null, 2)}</textarea>
                    </div>
                `;
        break;
    }
    return t += `
            <h4>Connections</h4>
            <div class="property-group">
                <label>On Success</label>
                <input type="text" data-property="onSuccess" 
                       value="${this.currentBlock.onSuccess || ""}">
            </div>
            
            <div class="property-group">
                <label>On Failure</label>
                <input type="text" data-property="onFailure" 
                       value="${this.currentBlock.onFailure || ""}">
            </div>
        `, t;
  }
  /**
   * Setup event handlers for property inputs
   */
  setupPropertyHandlers() {
    this.container.querySelectorAll("input[data-property], textarea[data-property], select[data-property]").forEach((e) => {
      e.addEventListener("change", (s) => this.onPropertyChange(s)), (e.tagName === "INPUT" || e.tagName === "TEXTAREA") && e.addEventListener("input", (s) => this.onPropertyChange(s));
    });
  }
  /**
   * Handle property change
   */
  onPropertyChange(t) {
    if (!this.currentBlock) return;
    const e = t.target, s = e.dataset.property;
    if (!s) return;
    let i = e.value;
    if (e.dataset.type === "json")
      try {
        i = JSON.parse(i);
      } catch {
        console.warn("Invalid JSON:", i);
        return;
      }
    e.type === "number" && (i = parseInt(i, 10)), this.emit("propertyChange", {
      blockId: this.currentBlock.id,
      property: s,
      value: i
    });
  }
}
class j extends g {
  constructor(t) {
    super();
    n(this, "container");
    n(this, "templates", q);
    const e = document.getElementById(t);
    if (!e)
      throw new Error(`Container element '${t}' not found`);
    this.container = e, this.setupPalette();
  }
  /**
   * Setup the block palette
   */
  setupPalette() {
    this.container.innerHTML = `
            <div class="palette-content">
                <h3>Blocks</h3>
                <div class="block-categories"></div>
            </div>
        `, this.renderBlocks();
  }
  /**
   * Render block templates grouped by category
   */
  renderBlocks() {
    const t = this.container.querySelector(".block-categories");
    if (!t) return;
    const e = /* @__PURE__ */ new Map();
    this.templates.forEach((i) => {
      e.has(i.category) || e.set(i.category, []), e.get(i.category).push(i);
    });
    let s = "";
    e.forEach((i, l) => {
      s += `
                <div class="category">
                    <h4 class="category-title">${l}</h4>
                    <div class="category-blocks">
            `, i.forEach((c) => {
        s += `
                    <div class="block-template" 
                         draggable="true" 
                         data-block-type="${c.type}"
                         style="border-color: ${c.color}">
                        <span class="icon">${c.icon}</span>
                        <div class="block-info">
                            <span class="name">${c.name}</span>
                            <span class="description">${c.description}</span>
                        </div>
                    </div>
                `;
      }), s += `
                    </div>
                </div>
            `;
    }), t.innerHTML = s, this.setupDragHandlers();
  }
  /**
   * Setup drag event handlers
   */
  setupDragHandlers() {
    this.container.querySelectorAll(".block-template").forEach((e) => {
      e.addEventListener("dragstart", (s) => this.onDragStart(s)), e.addEventListener("dragend", (s) => this.onDragEnd(s));
    });
  }
  /**
   * Handle drag start
   */
  onDragStart(t) {
    var i;
    const e = t.target, s = (i = e.closest(".block-template")) == null ? void 0 : i.getAttribute("data-block-type");
    s && t.dataTransfer && (t.dataTransfer.effectAllowed = "copy", t.dataTransfer.setData("text/plain", s), e.classList.add("dragging"), this.emit("blockDragStart", s));
  }
  /**
   * Handle drag end
   */
  onDragEnd(t) {
    t.target.classList.remove("dragging");
  }
  /**
   * Filter blocks by search term
   */
  filterBlocks(t) {
    const e = t.toLowerCase();
    this.container.querySelectorAll(".block-template").forEach((i) => {
      var u, h, k, y;
      const l = i, c = ((h = (u = l.querySelector(".name")) == null ? void 0 : u.textContent) == null ? void 0 : h.toLowerCase()) || "", d = ((y = (k = l.querySelector(".description")) == null ? void 0 : k.textContent) == null ? void 0 : y.toLowerCase()) || "";
      c.includes(e) || d.includes(e) ? l.style.display = "flex" : l.style.display = "none";
    });
  }
  /**
   * Add a search input to the palette
   */
  addSearchInput() {
    const t = this.container.querySelector(".palette-content");
    if (!t) return;
    const e = document.createElement("div");
    e.className = "search-container", e.innerHTML = `
            <input type="text" class="search-input" placeholder="Search blocks...">
        `;
    const s = t.querySelector("h3");
    s && s.nextSibling && t.insertBefore(e, s.nextSibling), e.querySelector(".search-input").addEventListener("input", (l) => {
      this.filterBlocks(l.target.value);
    });
  }
}
class U {
  constructor(o) {
    n(this, "container");
    n(this, "engine");
    n(this, "canvas");
    n(this, "propertyPanel");
    n(this, "blockPalette");
    n(this, "visualBlocks");
    n(this, "visualConnections");
    n(this, "selectedBlockId", null);
    const t = document.getElementById(o);
    if (!t)
      throw new Error(`Container element '${o}' not found`);
    this.container = t, this.engine = new v(), this.visualBlocks = /* @__PURE__ */ new Map(), this.visualConnections = /* @__PURE__ */ new Map(), this.setupUI(), this.initializeDefaultWorkflow();
  }
  /**
   * Get the currently selected block ID
   */
  getSelectedBlockId() {
    return this.selectedBlockId;
  }
  /**
   * Setup the UI components
   */
  setupUI() {
    this.container.innerHTML = `
            <div class="siye-flow-designer">
                <div class="designer-header">
                    <h2>SiyeFlow Designer</h2>
                    <div class="toolbar">
                        <button id="import-btn">Import</button>
                        <button id="export-btn">Export</button>
                        <button id="validate-btn">Validate</button>
                        <button id="clear-btn">Clear</button>
                    </div>
                </div>
                <div class="designer-body">
                    <div id="block-palette" class="block-palette"></div>
                    <div id="canvas-container" class="canvas-container"></div>
                    <div id="property-panel" class="property-panel"></div>
                </div>
            </div>
        `, this.blockPalette = new j("block-palette"), this.canvas = new N("canvas-container"), this.propertyPanel = new V("property-panel"), this.setupEventHandlers();
  }
  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    var o, t, e, s;
    (o = document.getElementById("import-btn")) == null || o.addEventListener("click", () => this.importWorkflow()), (t = document.getElementById("export-btn")) == null || t.addEventListener("click", () => this.exportWorkflow()), (e = document.getElementById("validate-btn")) == null || e.addEventListener("click", () => this.validateWorkflow()), (s = document.getElementById("clear-btn")) == null || s.addEventListener("click", () => this.clearWorkflow()), this.blockPalette.on("blockDragStart", (i) => {
      window.__draggedBlockType = i;
    }), this.canvas.on("drop", (i) => {
      const l = window.__draggedBlockType;
      l && (this.addBlock(l, i), delete window.__draggedBlockType);
    }), this.canvas.on("blockSelect", (i) => {
      this.selectBlock(i);
    }), this.canvas.on("blockMove", (i) => {
      this.moveBlock(i.blockId, i.position);
    }), this.canvas.on("connectionCreate", (i) => {
      this.createConnection(i.source, i.target, i.type);
    }), this.propertyPanel.on("propertyChange", (i) => {
      this.updateBlockProperty(i.blockId, i.property, i.value);
    });
  }
  /**
   * Initialize with a default workflow
   */
  initializeDefaultWorkflow() {
    const o = this.engine.createBlock(a.Start);
    o.name = "Start", this.engine.addBlock(o), this.addVisualBlock(o, { x: 100, y: 200 });
    const t = this.engine.createBlock(a.End);
    t.name = "End", this.engine.addBlock(t), this.addVisualBlock(t, { x: 500, y: 200 }), this.renderWorkflow();
  }
  /**
   * Add a new block to the workflow
   */
  addBlock(o, t) {
    const e = this.engine.createBlock(o);
    e.name = this.getDefaultBlockName(o), this.engine.addBlock(e), this.addVisualBlock(e, t), this.renderWorkflow(), this.selectBlock(e.id);
  }
  /**
   * Add visual representation of a block
   */
  addVisualBlock(o, t) {
    const e = {
      id: o.id,
      type: o.type,
      position: t,
      width: 250,
      height: 100,
      selected: !1
    };
    this.visualBlocks.set(o.id, e);
  }
  /**
   * Move a block to a new position
   */
  moveBlock(o, t) {
    const e = this.visualBlocks.get(o);
    e && (e.position = t, this.renderWorkflow());
  }
  /**
   * Select a block
   */
  selectBlock(o) {
    if (this.visualBlocks.forEach((t) => t.selected = !1), o) {
      const t = this.visualBlocks.get(o);
      if (t) {
        t.selected = !0, this.selectedBlockId = o;
        const e = this.engine.getBlock(o);
        e && this.propertyPanel.showBlock(e);
      }
    } else
      this.selectedBlockId = null, this.propertyPanel.clear();
    this.renderWorkflow();
  }
  /**
   * Create a connection between blocks
   */
  createConnection(o, t, e) {
    const s = this.engine.getBlock(o);
    if (s) {
      e === "success" ? s.onSuccess = t : e === "failure" ? s.onFailure = t : s.onComplete = t;
      const i = `${o}-${t}-${e}`, l = {
        id: i,
        source: o,
        target: t,
        type: e
      };
      this.visualConnections.set(i, l), this.renderWorkflow();
    }
  }
  /**
   * Update a block property
   */
  updateBlockProperty(o, t, e) {
    const s = this.engine.getBlock(o);
    if (s) {
      if (t.startsWith("config.")) {
        const i = t.substring(7);
        s.config[i] = e;
      } else
        s[t] = e;
      this.renderWorkflow();
    }
  }
  /**
   * Import workflow from file
   */
  importWorkflow() {
    const o = document.createElement("input");
    o.type = "file", o.accept = ".json", o.onchange = async (t) => {
      var s;
      const e = (s = t.target.files) == null ? void 0 : s[0];
      if (e) {
        const i = await e.text();
        try {
          this.engine.loadWorkflow(i), this.visualBlocks.clear(), this.visualConnections.clear(), this.positionBlocks(), this.createVisualConnections(), this.renderWorkflow(), alert("Workflow imported successfully");
        } catch (l) {
          alert(`Failed to import workflow: ${l}`);
        }
      }
    }, o.click();
  }
  /**
   * Export workflow to file
   */
  exportWorkflow() {
    const o = this.engine.saveWorkflow(), t = new Blob([o], { type: "application/json" }), e = URL.createObjectURL(t), s = document.createElement("a");
    s.href = e, s.download = `${this.engine.getWorkflow().name || "workflow"}.json`, s.click(), URL.revokeObjectURL(e);
  }
  /**
   * Validate the workflow
   */
  validateWorkflow() {
    const o = this.engine.validate();
    if (o.isValid)
      alert("Workflow is valid!");
    else {
      const t = `Validation failed:

Errors:
${o.errors.join(`
`)}

Warnings:
${o.warnings.join(`
`)}`;
      alert(t);
    }
  }
  /**
   * Clear the workflow
   */
  clearWorkflow() {
    confirm("Are you sure you want to clear the workflow?") && (this.engine = new v(), this.visualBlocks.clear(), this.visualConnections.clear(), this.selectedBlockId = null, this.initializeDefaultWorkflow());
  }
  /**
   * Render the workflow
   */
  renderWorkflow() {
    const o = /* @__PURE__ */ new Map();
    this.engine.getBlocks().forEach((t) => {
      o.set(t.id, t);
    }), this.canvas.setBlockData(o), this.canvas.render(this.visualBlocks, this.visualConnections);
  }
  /**
   * Position blocks when importing
   */
  positionBlocks() {
    const o = this.engine.getBlocks(), t = 150;
    let e = 100, s = 100;
    o.forEach((i) => {
      this.addVisualBlock(i, { x: e, y: s }), e += t, e > 800 && (e = 100, s += t);
    });
  }
  /**
   * Create visual connections from block data
   */
  createVisualConnections() {
    this.engine.getBlocks().forEach((t) => {
      if (t.onSuccess) {
        const e = `${t.id}-${t.onSuccess}-success`;
        this.visualConnections.set(e, {
          id: e,
          source: t.id,
          target: t.onSuccess,
          type: "success"
        });
      }
      if (t.onFailure) {
        const e = `${t.id}-${t.onFailure}-failure`;
        this.visualConnections.set(e, {
          id: e,
          source: t.id,
          target: t.onFailure,
          type: "failure"
        });
      }
      if (t.onComplete) {
        const e = `${t.id}-${t.onComplete}-complete`;
        this.visualConnections.set(e, {
          id: e,
          source: t.id,
          target: t.onComplete,
          type: "complete"
        });
      }
    });
  }
  /**
   * Get default block name based on type
   */
  getDefaultBlockName(o) {
    const t = o.toString();
    return t.charAt(0).toUpperCase() + t.slice(1).replace("-", " ");
  }
}
typeof document < "u" && document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("designer-container"))
    try {
      const o = new U("designer-container");
      console.log("SiyeFlow Designer initialized"), window.siyeFlowDesigner = o;
    } catch (o) {
      console.error("Failed to initialize SiyeFlow Designer:", o);
    }
});
export {
  a as BlockType,
  z as CollectBlock,
  F as CollectConfig,
  L as ConditionBlock,
  D as ConditionConfig,
  M as DelayBlock,
  P as DelayConfig,
  C as EndBlock,
  B as EndConfig,
  J as EvaluateBlock,
  I as EvaluateConfig,
  x as HttpRequestBlock,
  E as HttpRequestConfig,
  W as LogBlock,
  T as LogConfig,
  _ as LoopBlock,
  O as LoopConfig,
  b as StartBlock,
  m as StartConfig,
  G as SubWorkflowBlock,
  H as SubWorkflowConfig,
  X as TryCatchBlock,
  A as TryCatchConfig,
  $ as VariableBlock,
  S as VariableConfig,
  p as WorkflowBlock,
  U as WorkflowDesigner,
  v as WorkflowEngine
};
