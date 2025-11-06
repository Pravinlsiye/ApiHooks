var L = Object.defineProperty;
var A = (i, o, t) => o in i ? L(i, o, { enumerable: !0, configurable: !0, writable: !0, value: t }) : i[o] = t;
var r = (i, o, t) => A(i, typeof o != "symbol" ? o + "" : o, t);
var l = /* @__PURE__ */ ((i) => (i.Start = "start", i.End = "end", i.HttpRequest = "http-request", i.Evaluate = "evaluate", i.Condition = "condition", i.Loop = "loop", i.Delay = "delay", i.Variable = "variable", i.Log = "log", i.Collect = "collect", i.TryCatch = "try-catch", i.Workflow = "workflow", i))(l || {});
class h {
  constructor() {
    r(this, "id", "");
    r(this, "name", "");
    r(this, "description");
    r(this, "inputs");
    r(this, "outputs");
    r(this, "onSuccess");
    r(this, "onFailure");
    r(this, "onComplete");
    r(this, "inputPorts");
    r(this, "outputPorts");
    r(this, "connections");
  }
}
class T {
  constructor() {
    r(this, "inputs");
    r(this, "profiles");
    r(this, "selectedProfile", "");
    r(this, "overrides");
  }
}
class M extends h {
  constructor() {
    super(...arguments);
    r(this, "type", "start");
    r(this, "config", new T());
  }
}
class W {
  constructor() {
    r(this, "outputs");
  }
}
class O extends h {
  constructor() {
    super(...arguments);
    r(this, "type", "end");
    r(this, "config", new W());
  }
}
class N {
  constructor() {
    r(this, "method", "");
    r(this, "url", "");
    r(this, "headers");
    r(this, "body");
    r(this, "timeout");
    r(this, "retries");
    r(this, "successCodes");
  }
}
class F extends h {
  constructor() {
    super(...arguments);
    r(this, "type", "http-request");
    r(this, "config", new N());
  }
}
class q {
  constructor() {
    r(this, "operation", "");
    r(this, "variables");
  }
}
class H extends h {
  constructor() {
    super(...arguments);
    r(this, "type", "variable");
    r(this, "config", new q());
  }
}
class R {
  constructor() {
    r(this, "expression", "");
    r(this, "onTrue", "");
    r(this, "onFalse", "");
  }
}
class j extends h {
  constructor() {
    super(...arguments);
    r(this, "type", "condition");
    r(this, "config", new R());
  }
}
class V {
  constructor() {
    r(this, "milliseconds", 0);
    r(this, "message", "");
  }
}
class U extends h {
  constructor() {
    super(...arguments);
    r(this, "type", "delay");
    r(this, "config", new V());
  }
}
class J {
  constructor() {
    r(this, "message", "");
    r(this, "level", "");
  }
}
class _ extends h {
  constructor() {
    super(...arguments);
    r(this, "type", "log");
    r(this, "config", new J());
  }
}
class z {
  constructor() {
    r(this, "language", "");
    r(this, "expression", "");
    r(this, "data", "");
  }
}
class it extends h {
  constructor() {
    super(...arguments);
    r(this, "type", "evaluate");
    r(this, "config", new z());
  }
}
class X {
  constructor() {
    r(this, "items", "");
    r(this, "itemVariable", "");
    r(this, "indexVariable", "");
    r(this, "loopBlock", "");
    r(this, "maxIterations");
  }
}
class at extends h {
  constructor() {
    super(...arguments);
    r(this, "type", "loop");
    r(this, "config", new X());
  }
}
class Y {
  constructor() {
    r(this, "fromLoop", "");
    r(this, "collectExpression", "");
    r(this, "outputVariable", "");
  }
}
class lt extends h {
  constructor() {
    super(...arguments);
    r(this, "type", "collect");
    r(this, "config", new Y());
  }
}
class G {
  constructor() {
    r(this, "tryBlock", "");
    r(this, "catchBlock", "");
    r(this, "finallyBlock", "");
    r(this, "retries");
    r(this, "retryDelay");
  }
}
class ct extends h {
  constructor() {
    super(...arguments);
    r(this, "type", "try-catch");
    r(this, "config", new G());
  }
}
class K {
  constructor() {
    r(this, "workflowId", "");
    r(this, "inputs");
    r(this, "outputMapping");
  }
}
class pt extends h {
  constructor() {
    super(...arguments);
    r(this, "type", "workflow");
    r(this, "config", new K());
  }
}
class E {
  constructor() {
    r(this, "workflow");
    r(this, "blocks");
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
    const t = (e = this.workflow.blocks) == null ? void 0 : e.findIndex((n) => n.id === o);
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
    var n, a, p;
    const o = [], t = [], e = (n = this.workflow.blocks) == null ? void 0 : n.some((c) => c.type === l.Start), s = (a = this.workflow.blocks) == null ? void 0 : a.some((c) => c.type === l.End);
    return e || o.push("Workflow must have a Start block"), s || o.push("Workflow must have an End block"), (p = this.workflow.blocks) == null || p.forEach((c) => {
      c.type !== l.End && !c.onSuccess && !c.onFailure && !c.onComplete && t.push(`Block '${c.name || c.id}' has no outgoing connections`);
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
      case l.Start:
        return new M();
      case l.End:
        return new O();
      case l.HttpRequest:
        return new F();
      case l.Variable:
        return new H();
      case l.Condition:
        return new j();
      case l.Delay:
        return new U();
      case l.Log:
        return new _();
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
    return l[t] || l.Start;
  }
}
class C {
  constructor() {
    r(this, "events", /* @__PURE__ */ new Map());
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
const Q = [
  {
    type: l.Start,
    name: "Start",
    icon: "🟢",
    category: "Control",
    description: "Entry point of the workflow",
    color: "#4CAF50"
  },
  {
    type: l.End,
    name: "End",
    icon: "🔴",
    category: "Control",
    description: "Exit point of the workflow",
    color: "#f44336"
  },
  {
    type: l.HttpRequest,
    name: "HTTP Request",
    icon: "🌐",
    category: "Action",
    description: "Make an HTTP API call",
    color: "#2196F3"
  },
  {
    type: l.Variable,
    name: "Variable",
    icon: "📦",
    category: "Data",
    description: "Set, get, or delete variables",
    color: "#FF9800"
  },
  {
    type: l.Condition,
    name: "Condition",
    icon: "❓",
    category: "Control",
    description: "Branch based on a condition",
    color: "#9C27B0"
  },
  {
    type: l.Delay,
    name: "Delay",
    icon: "⏰",
    category: "Action",
    description: "Wait for specified time",
    color: "#00BCD4"
  },
  {
    type: l.Log,
    name: "Log",
    icon: "📝",
    category: "Debug",
    description: "Log a message",
    color: "#607D8B"
  },
  {
    type: l.Evaluate,
    name: "Evaluate",
    icon: "🧮",
    category: "Data",
    description: "Evaluate an expression",
    color: "#795548"
  },
  {
    type: l.Loop,
    name: "Loop",
    icon: "🔄",
    category: "Control",
    description: "Iterate over items",
    color: "#E91E63"
  },
  {
    type: l.TryCatch,
    name: "Try/Catch",
    icon: "⚠️",
    category: "Control",
    description: "Error handling",
    color: "#FFC107"
  }
];
class S {
  constructor(o, t) {
    r(this, "block");
    r(this, "blockData");
    this.block = o, this.blockData = t;
  }
  /**
   * Get block description
   */
  getDescription() {
    var o;
    return ((o = this.blockData) == null ? void 0 : o.description) || "";
  }
  /**
   * Render custom content (override in subclasses)
   */
  renderCustomContent() {
    return "";
  }
  /**
   * Update block ports (override in subclasses)
   */
  updatePorts() {
  }
  /**
   * Render a single port
   */
  renderPort(o, t) {
    return t === "input" ? `
                <div class="port-row port-input" 
                     data-block="${this.block.id}" 
                     data-port="${o.name}"
                     data-port-type="${t}"
                     data-value-type="${o.type}">
                    <span class="port-tab"></span>
                    <span class="port-name">${o.name}</span>
                </div>
            ` : `
                <div class="port-row port-output" 
                     data-block="${this.block.id}" 
                     data-port="${o.name}"
                     data-port-type="${t}"
                     data-value-type="${o.type}">
                    <span class="port-name">${o.name}</span>
                    <span class="port-tab"></span>
                </div>
            `;
  }
  /**
   * Render input ports
   */
  renderInputPorts() {
    return !this.block.inputPorts || this.block.inputPorts.length === 0 ? "" : this.block.inputPorts.map((o) => this.renderPort(o, "input")).join("");
  }
  /**
   * Render output ports
   */
  renderOutputPorts() {
    return !this.block.outputPorts || this.block.outputPorts.length === 0 ? "" : this.block.outputPorts.map((o) => this.renderPort(o, "output")).join("");
  }
  /**
   * Render the complete block
   */
  render() {
    var e;
    const o = ((e = this.blockData) == null ? void 0 : e.name) || this.block.id, t = this.getDescription();
    return `
            <div class="block-header">
                <span class="block-icon">${this.getIcon()}</span>
                <div class="block-info">
                    <span class="block-name">${o}</span>
                    <span class="block-type">${this.block.type}</span>
                </div>
            </div>
            ${t ? `<div class="block-description">${t}</div>` : ""}
            ${this.renderCustomContent()}
            <div class="block-ports-area">
                ${this.renderInputPorts()}
                ${this.renderOutputPorts()}
            </div>
        `;
  }
}
class Z extends S {
  constructor(o, t) {
    super(o, t);
  }
  getIcon() {
    return "🟢";
  }
  getColor() {
    return "#4CAF50";
  }
  getDescription() {
    var o;
    return ((o = this.blockData) == null ? void 0 : o.description) || "Workflow entry point";
  }
  /**
   * Update ports based on profile configuration
   */
  updatePorts() {
    const o = this.blockData;
    if (!o || !o.config) return;
    const t = this.getEffectiveInputs(o), e = o.config.profiles && o.config.profiles.length > 0;
    this.block.inputPorts = [], this.block.outputPorts = [];
    let s = e ? 40 : 0;
    Object.keys(t).forEach((n) => {
      const a = t[n];
      this.block.inputPorts.push({
        name: n,
        type: a.type || "any",
        position: { x: 0, y: s },
        connected: !1
      }), this.block.outputPorts.push({
        name: n,
        type: a.type || "any",
        position: { x: this.block.width, y: s },
        connected: !1
      }), s += 32;
    });
  }
  /**
   * Override port rendering for Start block - combine input/output in single row
   */
  renderInputPorts() {
    return "";
  }
  renderOutputPorts() {
    return "";
  }
  /**
   * Render combined ports for Start block
   */
  renderPorts() {
    return !this.block.inputPorts || this.block.inputPorts.length === 0 ? "" : this.block.inputPorts.map((o, t) => {
      const e = this.block.outputPorts[t], s = this.getTypeIcon(o.type);
      return `
                <div class="port-dual-row">
                    <div class="port-input-tab" 
                         data-block="${this.block.id}" 
                         data-port="${o.name}"
                         data-port-type="input"
                         data-value-type="${o.type}">
                        <span class="port-tab"></span>
                    </div>
                    <div class="port-center">
                        <span class="port-name">${o.name}</span>
                        <span class="port-type">${s}</span>
                    </div>
                    <div class="port-output-tab" 
                         data-block="${this.block.id}" 
                         data-port="${e.name}"
                         data-port-type="output"
                         data-value-type="${e.type}">
                        <span class="port-tab"></span>
                    </div>
                </div>
            `;
    }).join("");
  }
  /**
   * Get type icon for display
   */
  getTypeIcon(o) {
    return {
      string: "Aa",
      number: "#",
      boolean: "0/1",
      object: "{}",
      array: "[]",
      any: "*"
    }[o] || "Aa";
  }
  /**
   * Get effective inputs from profile configuration
   */
  getEffectiveInputs(o) {
    const t = o.config;
    return t.profiles && t.profiles.length > 0 ? (t.profiles.find((s) => s.name === t.selectedProfile) || t.profiles.find((s) => s.default) || t.profiles[0]).inputs || {} : t.inputs || {};
  }
  /**
   * Render profile selector
   */
  renderCustomContent() {
    var s;
    const o = this.blockData;
    if (!o || !o.config) return "";
    const t = o.config.profiles;
    if (!t || t.length === 0) return "";
    const e = o.config.selectedProfile || ((s = t.find((n) => n.default)) == null ? void 0 : s.name) || t[0].name;
    return `
            <div class="profile-selector">
                <select class="profile-dropdown" data-block="${this.block.id}">
                    ${t.map((n) => `
                        <option value="${n.name}" ${n.name === e ? "selected" : ""}>
                            ${n.name}
                        </option>
                    `).join("")}
                </select>
            </div>
        `;
  }
  /**
   * Override render to use combined ports
   */
  render() {
    var e;
    const o = ((e = this.blockData) == null ? void 0 : e.name) || this.block.id, t = this.getDescription();
    return `
            <div class="block-header">
                <span class="block-icon">${this.getIcon()}</span>
                <div class="block-info">
                    <span class="block-name">${o}</span>
                    <span class="block-type">${this.block.type}</span>
                </div>
            </div>
            ${t ? `<div class="block-description">${t}</div>` : ""}
            ${this.renderCustomContent()}
            <div class="block-ports-area">
                ${this.renderPorts()}
            </div>
        `;
  }
}
class x extends S {
  constructor(o, t) {
    super(o, t);
  }
  getIcon() {
    return {
      end: "🔴",
      "http-request": "🌐",
      variable: "📦",
      condition: "❓",
      delay: "⏰",
      log: "📝",
      evaluate: "🧮",
      loop: "🔄",
      "try-catch": "⚠️"
    }[this.block.type] || "📄";
  }
  getColor() {
    return {
      end: "#f44336",
      "http-request": "#2196F3",
      variable: "#FF9800",
      condition: "#9C27B0",
      delay: "#00BCD4",
      log: "#607D8B",
      evaluate: "#795548",
      loop: "#E91E63",
      "try-catch": "#FFC107"
    }[this.block.type] || "#666";
  }
  getDescription() {
    if (!this.blockData) return "";
    const o = this.blockData.config;
    switch (this.blockData.type) {
      case l.HttpRequest:
        return o != null && o.url ? `${o.method || "GET"} ${o.url}` : "";
      case l.Variable:
        const t = o != null && o.variables ? Object.keys(o.variables).length : 0;
        return o != null && o.operation ? `${o.operation} ${t} variable(s)` : "";
      case l.Condition:
        return (o == null ? void 0 : o.expression) || "";
      case l.Delay:
        return o != null && o.milliseconds ? `${o.milliseconds}ms` : "";
      case l.Log:
        return o != null && o.message ? o.message.substring(0, 50) : "";
      case l.End:
        return "Workflow exit point";
      default:
        return this.blockData.description || "";
    }
  }
  /**
   * Update ports from block definition
   */
  updatePorts() {
    if (!this.blockData) return;
    const o = this.blockData;
    o.outputPorts && (this.block.outputPorts = o.outputPorts.map((t, e) => ({
      name: t.name,
      type: t.type,
      position: { x: this.block.width, y: e * 32 },
      connected: !1
    }))), o.inputPorts && (this.block.inputPorts = o.inputPorts.map((t, e) => ({
      name: t.name,
      type: t.type,
      position: { x: 0, y: e * 32 },
      connected: !1
    })));
  }
}
class tt {
  /**
   * Create appropriate renderer for block type
   */
  static createRenderer(o, t) {
    if (!t)
      return new x(o, t);
    switch (t.type) {
      case l.Start:
        return new Z(o, t);
      default:
        return new x(o, t);
    }
  }
}
class et extends C {
  constructor(t) {
    super();
    r(this, "container");
    r(this, "svg");
    r(this, "blocks", /* @__PURE__ */ new Map());
    r(this, "connections", /* @__PURE__ */ new Map());
    r(this, "blockDataMap", /* @__PURE__ */ new Map());
    r(this, "isDragging", !1);
    r(this, "draggedBlockId", null);
    r(this, "dragOffset", { x: 0, y: 0 });
    r(this, "isConnecting", !1);
    r(this, "connectionStart", null);
    r(this, "mousePosition", { x: 0, y: 0 });
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
                        <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="strokeWidth">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#58a6ff" />
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
    const e = document.createElement("div");
    e.className = `workflow-block block-type-${t.type} ${t.selected ? "selected" : ""}`, e.id = `block-${t.id}`, e.style.left = `${t.position.x}px`, e.style.top = `${t.position.y}px`, e.style.width = `${t.width}px`, e.style.minHeight = `${t.height}px`;
    const s = this.getBlockData(t.id), n = tt.createRenderer(t, s);
    n.updatePorts();
    const a = this.getBlockColor(t.type);
    e.style.borderColor = a, e.innerHTML = n.render(), e.addEventListener("mousedown", (d) => this.onBlockMouseDown(d, t.id)), e.addEventListener("click", (d) => this.onBlockClick(d, t.id)), e.querySelectorAll(".port-input-tab, .port-output-tab, .port-row").forEach((d) => {
      d.addEventListener("mousedown", (u) => this.onPortMouseDown(u));
    });
    const c = e.querySelector(".profile-dropdown");
    return c && c.addEventListener("change", (d) => {
      const k = d.target.value;
      this.emit("profileChange", { blockId: t.id, profile: k });
    }), e;
  }
  /**
   * Get block color
   */
  getBlockColor(t) {
    return {
      start: "#4CAF50",
      end: "#f44336",
      "http-request": "#2196F3",
      variable: "#FF9800",
      condition: "#9C27B0",
      delay: "#00BCD4",
      log: "#607D8B",
      evaluate: "#795548",
      loop: "#E91E63",
      "try-catch": "#FFC107"
    }[t] || "#666";
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
   * Create a connection path element with delete button
   */
  createConnectionPath(t) {
    var P, $;
    const e = this.blocks.get(t.sourceBlockId), s = this.blocks.get(t.targetBlockId);
    if (!e || !s) return null;
    const n = (P = e.outputPorts) == null ? void 0 : P.find((B) => B.name === t.sourcePortName), a = ($ = s.inputPorts) == null ? void 0 : $.find((B) => B.name === t.targetPortName), p = 80, c = 80, d = n ? p + n.position.y + 16 : e.height / 2, u = a ? c + a.position.y + 16 : s.height / 2, k = {
      x: e.position.x + e.width,
      y: e.position.y + d
    }, b = {
      x: s.position.x,
      y: s.position.y + u
    }, m = document.createElementNS("http://www.w3.org/2000/svg", "g");
    m.setAttribute("class", "connection-group"), m.setAttribute("data-connection-id", t.id);
    const g = document.createElementNS("http://www.w3.org/2000/svg", "path");
    g.setAttribute("class", "connection connection-line"), g.setAttribute("d", this.getPathData(k, b)), g.setAttribute("stroke", "#58a6ff"), g.setAttribute("stroke-width", "2"), g.setAttribute("fill", "none"), g.setAttribute("marker-end", "url(#arrowhead)");
    const D = (k.x + b.x) / 2, I = (k.y + b.y) / 2, f = document.createElementNS("http://www.w3.org/2000/svg", "g");
    f.setAttribute("class", "connection-delete-btn"), f.setAttribute("transform", `translate(${D}, ${I})`), f.style.cursor = "pointer";
    const w = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    w.setAttribute("r", "10"), w.setAttribute("fill", "#da3633"), w.setAttribute("stroke", "#f85149"), w.setAttribute("stroke-width", "2");
    const y = document.createElementNS("http://www.w3.org/2000/svg", "line");
    y.setAttribute("x1", "-4"), y.setAttribute("y1", "-4"), y.setAttribute("x2", "4"), y.setAttribute("y2", "4"), y.setAttribute("stroke", "white"), y.setAttribute("stroke-width", "2");
    const v = document.createElementNS("http://www.w3.org/2000/svg", "line");
    return v.setAttribute("x1", "4"), v.setAttribute("y1", "-4"), v.setAttribute("x2", "-4"), v.setAttribute("y2", "4"), v.setAttribute("stroke", "white"), v.setAttribute("stroke-width", "2"), f.appendChild(w), f.appendChild(y), f.appendChild(v), f.addEventListener("click", (B) => {
      B.stopPropagation(), this.emit("connectionDelete", { connectionId: t.id });
    }), m.appendChild(g), m.appendChild(f), m;
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
    const s = Math.abs(e.x - t.x), n = Math.min(s / 2, 100), a = t.x + n, p = e.x - n;
    return `M ${t.x} ${t.y} C ${a} ${t.y}, ${p} ${e.y}, ${e.x} ${e.y}`;
  }
  /**
   * Get block data by ID
   */
  getBlockData(t) {
    return this.blockDataMap.get(t);
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
    const s = t.target;
    if (s.classList.contains("port-row") || s.classList.contains("port-tab") || s.classList.contains("port-name"))
      return;
    t.preventDefault(), this.isDragging = !0, this.draggedBlockId = e;
    const n = this.blocks.get(e);
    n && (this.dragOffset = {
      x: t.clientX - n.position.x,
      y: t.clientY - n.position.y
    });
  }
  onBlockClick(t, e) {
    const s = t.target;
    s.classList.contains("port-row") || s.classList.contains("port-tab") || s.classList.contains("port-name") || (t.stopPropagation(), this.emit("blockSelect", e));
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
      const s = t.target.closest(".port-input-tab, .port-row");
      if (s && s.dataset.portType === "input") {
        const n = s.dataset.block, a = s.dataset.port;
        n && a && this.connectionStart && this.emit("connectionCreate", {
          sourceBlockId: this.connectionStart.blockId,
          sourcePortName: this.connectionStart.portName,
          targetBlockId: n,
          targetPortName: a
        });
      }
      this.isConnecting = !1, this.connectionStart = null, this.renderConnections();
    }
  }
  onPortMouseDown(t) {
    t.stopPropagation(), t.preventDefault();
    const e = t.currentTarget;
    if (e.dataset.portType === "output") {
      const n = e.dataset.block, a = e.dataset.port;
      if (n && a && this.blocks.get(n)) {
        this.isConnecting = !0;
        const d = (e.querySelector(".port-tab") || e).getBoundingClientRect(), u = this.container.querySelector(".canvas-wrapper");
        if (u) {
          const k = u.getBoundingClientRect();
          this.connectionStart = {
            blockId: n,
            portName: a,
            position: {
              x: d.left - k.left + d.width / 2,
              y: d.top - k.top + d.height / 2
            }
          };
        }
      }
    }
  }
}
class ot extends C {
  constructor(t) {
    super();
    r(this, "container");
    r(this, "currentBlock", null);
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
      case l.Start:
        t += `
                    <div class="property-group">
                        <label>Profiles</label>
                        ${this.renderProfileSelector()}
                    </div>
                    
                    <div class="property-group">
                        <label>Profile Details</label>
                        ${this.renderProfileDetails()}
                    </div>
                    
                    <div class="property-group">
                        <label>Overrides (JSON)</label>
                        <textarea rows="3" data-property="config.overrides" 
                                  data-type="json">${JSON.stringify((e == null ? void 0 : e.overrides) || {}, null, 2)}</textarea>
                    </div>
                `;
        break;
      case l.HttpRequest:
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
      case l.Variable:
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
      case l.Condition:
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
      case l.Delay:
        t += `
                    <div class="property-group">
                        <label>Delay (milliseconds)</label>
                        <input type="number" data-property="config.milliseconds" 
                               value="${(e == null ? void 0 : e.milliseconds) || 1e3}">
                    </div>
                `;
        break;
      case l.Log:
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
      case l.End:
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
   * Render profile selector dropdown for Start block
   */
  renderProfileSelector() {
    var a;
    const t = (a = this.currentBlock) == null ? void 0 : a.config, e = (t == null ? void 0 : t.profiles) || [], s = (t == null ? void 0 : t.selectedProfile) || "";
    if (e.length === 0)
      return '<p class="no-profiles">No profiles defined. Add profiles in JSON view.</p>';
    let n = '<select data-property="config.selectedProfile" class="profile-selector">';
    return n += '<option value="">-- Select Profile --</option>', e.forEach((p) => {
      const c = p.name === s ? "selected" : "", d = p.default ? " (default)" : "";
      n += `<option value="${p.name}" ${c}>${p.name}${d}</option>`;
    }), n += "</select>", n;
  }
  /**
   * Render profile details for the selected profile
   */
  renderProfileDetails() {
    var p;
    const t = (p = this.currentBlock) == null ? void 0 : p.config, e = (t == null ? void 0 : t.profiles) || [], s = (t == null ? void 0 : t.selectedProfile) || "", n = e.find((c) => c.name === s);
    if (!n)
      return '<p class="no-profile-selected">Select a profile to view its inputs</p>';
    let a = '<div class="profile-inputs">';
    if (a += `<h5>${n.name}</h5>`, n.description && (a += `<p class="profile-description">${n.description}</p>`), n.inputs && Object.keys(n.inputs).length > 0) {
      a += '<table class="profile-inputs-table">', a += "<thead><tr><th>Input</th><th>Type</th><th>Value</th><th>Required</th></tr></thead>", a += "<tbody>";
      for (const [c, d] of Object.entries(n.inputs)) {
        const u = d;
        a += "<tr>", a += `<td>${c}</td>`, a += `<td>${u.type || "string"}</td>`, a += `<td><code>${u.value || u.default || ""}</code></td>`, a += `<td>${u.required ? "✓" : ""}</td>`, a += "</tr>";
      }
      a += "</tbody></table>";
    } else
      a += "<p>No inputs defined for this profile</p>";
    return a += "</div>", a;
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
    let n = e.value;
    if (e.dataset.type === "json")
      try {
        n = JSON.parse(n);
      } catch {
        console.warn("Invalid JSON:", n);
        return;
      }
    if (s === "config.selectedProfile") {
      this.currentBlock && this.currentBlock.config && (this.currentBlock.config.selectedProfile = n), this.emit("blockUpdated", this.currentBlock.id, { ...this.currentBlock }), this.renderProperties();
      return;
    }
    e.type === "number" && (n = parseInt(n, 10)), this.emit("propertyChange", {
      blockId: this.currentBlock.id,
      property: s,
      value: n
    });
  }
}
class st extends C {
  constructor(t) {
    super();
    r(this, "container");
    r(this, "templates", Q);
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
    this.templates.forEach((n) => {
      e.has(n.category) || e.set(n.category, []), e.get(n.category).push(n);
    });
    let s = "";
    e.forEach((n, a) => {
      s += `
                <div class="category">
                    <h4 class="category-title">${a}</h4>
                    <div class="category-blocks">
            `, n.forEach((p) => {
        s += `
                    <div class="block-template" 
                         draggable="true" 
                         data-block-type="${p.type}"
                         style="border-color: ${p.color}">
                        <span class="icon">${p.icon}</span>
                        <div class="block-info">
                            <span class="name">${p.name}</span>
                            <span class="description">${p.description}</span>
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
    var n;
    const e = t.target, s = (n = e.closest(".block-template")) == null ? void 0 : n.getAttribute("data-block-type");
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
    this.container.querySelectorAll(".block-template").forEach((n) => {
      var d, u, k, b;
      const a = n, p = ((u = (d = a.querySelector(".name")) == null ? void 0 : d.textContent) == null ? void 0 : u.toLowerCase()) || "", c = ((b = (k = a.querySelector(".description")) == null ? void 0 : k.textContent) == null ? void 0 : b.toLowerCase()) || "";
      p.includes(e) || c.includes(e) ? a.style.display = "flex" : a.style.display = "none";
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
    s && s.nextSibling && t.insertBefore(e, s.nextSibling), e.querySelector(".search-input").addEventListener("input", (a) => {
      this.filterBlocks(a.target.value);
    });
  }
}
class nt {
  constructor(o) {
    r(this, "container");
    r(this, "engine");
    r(this, "canvas");
    r(this, "propertyPanel");
    r(this, "blockPalette");
    r(this, "visualBlocks");
    r(this, "visualConnections");
    r(this, "selectedBlockId", null);
    const t = document.getElementById(o);
    if (!t)
      throw new Error(`Container element '${o}' not found`);
    this.container = t, this.engine = new E(), this.visualBlocks = /* @__PURE__ */ new Map(), this.visualConnections = /* @__PURE__ */ new Map(), this.setupUI(), this.initializeDefaultWorkflow();
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
        `, this.blockPalette = new st("block-palette"), this.canvas = new et("canvas-container"), this.propertyPanel = new ot("property-panel"), this.setupEventHandlers();
  }
  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    var o, t, e, s;
    (o = document.getElementById("import-btn")) == null || o.addEventListener("click", () => this.importWorkflow()), (t = document.getElementById("export-btn")) == null || t.addEventListener("click", () => this.exportWorkflow()), (e = document.getElementById("validate-btn")) == null || e.addEventListener("click", () => this.validateWorkflow()), (s = document.getElementById("clear-btn")) == null || s.addEventListener("click", () => this.clearWorkflow()), this.blockPalette.on("blockDragStart", (n) => {
      window.__draggedBlockType = n;
    }), this.canvas.on("drop", (n) => {
      const a = window.__draggedBlockType;
      a && (this.addBlock(a, n), delete window.__draggedBlockType);
    }), this.canvas.on("blockSelect", (n) => {
      this.selectBlock(n);
    }), this.canvas.on("blockMove", (n) => {
      this.moveBlock(n.blockId, n.position);
    }), this.canvas.on("connectionCreate", (n) => {
      this.onConnectionCreated(n.sourceBlockId, n.targetBlockId, n.sourcePortName, n.targetPortName);
    }), this.canvas.on("profileChange", (n) => {
      this.onProfileChange(n.blockId, n.profile);
    }), this.canvas.on("connectionDelete", (n) => {
      this.onConnectionDeleted(n.connectionId);
    }), this.propertyPanel.on("propertyChange", (n) => {
      this.updateBlockProperty(n.blockId, n.property, n.value);
    });
  }
  /**
   * Initialize with a default workflow
   */
  initializeDefaultWorkflow() {
    const o = this.engine.createBlock(l.Start);
    o.name = "Start", this.engine.addBlock(o), this.addVisualBlock(o, { x: 100, y: 200 });
    const t = this.engine.createBlock(l.End);
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
  onConnectionCreated(o, t, e, s) {
    const n = this.engine.getBlock(o);
    if (n) {
      n.connections || (n.connections = []), n.connections = n.connections.filter(
        (c) => !(c.fromBlock === o && c.fromPort === e)
      ), n.connections.push({
        fromBlock: o,
        fromPort: e,
        toBlock: t,
        toPort: s
      });
      const a = `${o}-${e}-${t}-${s}`, p = {
        id: a,
        sourceBlockId: o,
        sourcePortName: e,
        targetBlockId: t,
        targetPortName: s,
        path: ""
      };
      this.visualConnections.set(a, p), this.renderWorkflow();
    }
  }
  /**
   * Handle profile change for Start blocks
   */
  onProfileChange(o, t) {
    const e = this.engine.getBlock(o);
    if (e && e.type === l.Start) {
      const s = e;
      s.config && (s.config.selectedProfile = t, this.renderWorkflow(), this.selectedBlockId === o && this.selectBlock(o));
    }
  }
  /**
   * Handle connection deletion
   */
  onConnectionDeleted(o) {
    this.visualConnections.delete(o);
    const t = Array.from(this.visualConnections.values()).find((e) => e.id === o);
    if (t) {
      const e = this.engine.getBlock(t.sourceBlockId);
      e && e.connections && (e.connections = e.connections.filter(
        (s) => !(s.fromBlock === t.sourceBlockId && s.fromPort === t.sourcePortName)
      ));
    }
    this.renderWorkflow();
  }
  /**
   * Update a block property
   */
  updateBlockProperty(o, t, e) {
    const s = this.engine.getBlock(o);
    if (s) {
      if (t.startsWith("config.")) {
        const n = t.substring(7);
        s.config[n] = e;
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
        const n = await e.text();
        try {
          this.engine.loadWorkflow(n), this.visualBlocks.clear(), this.visualConnections.clear(), this.positionBlocks(), this.createVisualConnections(), this.renderWorkflow(), alert("Workflow imported successfully");
        } catch (a) {
          alert(`Failed to import workflow: ${a}`);
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
    confirm("Are you sure you want to clear the workflow?") && (this.engine = new E(), this.visualBlocks.clear(), this.visualConnections.clear(), this.selectedBlockId = null, this.initializeDefaultWorkflow());
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
    o.forEach((n) => {
      this.addVisualBlock(n, { x: e, y: s }), e += t, e > 800 && (e = 100, s += t);
    });
  }
  /**
   * Create visual connections from block data
   */
  createVisualConnections() {
    this.engine.getBlocks().forEach((t) => {
      if (t.connections && t.connections.length > 0)
        t.connections.forEach((e) => {
          const s = `${e.fromBlock}-${e.fromPort}-${e.toBlock}-${e.toPort}`;
          this.visualConnections.set(s, {
            id: s,
            sourceBlockId: e.fromBlock,
            sourcePortName: e.fromPort,
            targetBlockId: e.toBlock,
            targetPortName: e.toPort,
            path: ""
            // Path will be calculated by renderer
          });
        });
      else {
        if (t.onSuccess) {
          const e = `${t.id}-${t.onSuccess}-success`;
          this.visualConnections.set(e, {
            id: e,
            sourceBlockId: t.id,
            sourcePortName: "onSuccess",
            targetBlockId: t.onSuccess,
            targetPortName: "in",
            path: ""
          });
        }
        if (t.onFailure) {
          const e = `${t.id}-${t.onFailure}-failure`;
          this.visualConnections.set(e, {
            id: e,
            sourceBlockId: t.id,
            sourcePortName: "onFailure",
            targetBlockId: t.onFailure,
            targetPortName: "in",
            path: ""
          });
        }
        if (t.onComplete) {
          const e = `${t.id}-${t.onComplete}-complete`;
          this.visualConnections.set(e, {
            id: e,
            sourceBlockId: t.id,
            sourcePortName: "onComplete",
            targetBlockId: t.onComplete,
            targetPortName: "in",
            path: ""
          });
        }
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
      const o = new nt("designer-container");
      console.log("SiyeFlow Designer initialized"), window.siyeFlowDesigner = o;
    } catch (o) {
      console.error("Failed to initialize SiyeFlow Designer:", o);
    }
});
export {
  l as BlockType,
  lt as CollectBlock,
  Y as CollectConfig,
  j as ConditionBlock,
  R as ConditionConfig,
  U as DelayBlock,
  V as DelayConfig,
  O as EndBlock,
  W as EndConfig,
  it as EvaluateBlock,
  z as EvaluateConfig,
  F as HttpRequestBlock,
  N as HttpRequestConfig,
  _ as LogBlock,
  J as LogConfig,
  at as LoopBlock,
  X as LoopConfig,
  M as StartBlock,
  T as StartConfig,
  pt as SubWorkflowBlock,
  K as SubWorkflowConfig,
  ct as TryCatchBlock,
  G as TryCatchConfig,
  H as VariableBlock,
  q as VariableConfig,
  h as WorkflowBlock,
  nt as WorkflowDesigner,
  E as WorkflowEngine
};
