(function(c,a){typeof exports=="object"&&typeof module<"u"?a(exports):typeof define=="function"&&define.amd?define(["exports"],a):(c=typeof globalThis<"u"?globalThis:c||self,a(c.SiyeFlowDesigner={}))})(this,function(c){"use strict";var ct=Object.defineProperty;var dt=(c,a,h)=>a in c?ct(c,a,{enumerable:!0,configurable:!0,writable:!0,value:h}):c[a]=h;var r=(c,a,h)=>dt(c,typeof a!="symbol"?a+"":a,h);var a=(l=>(l.Start="start",l.End="end",l.HttpRequest="http-request",l.Evaluate="evaluate",l.Condition="condition",l.Loop="loop",l.Delay="delay",l.Variable="variable",l.Log="log",l.Collect="collect",l.TryCatch="try-catch",l.Workflow="workflow",l))(a||{});class h{constructor(){r(this,"id","");r(this,"name","");r(this,"description");r(this,"inputs");r(this,"outputs");r(this,"onSuccess");r(this,"onFailure");r(this,"onComplete");r(this,"inputPorts");r(this,"outputPorts");r(this,"connections")}}class ${constructor(){r(this,"inputs");r(this,"profiles");r(this,"selectedProfile","");r(this,"overrides")}}class S extends h{constructor(){super(...arguments);r(this,"type","start");r(this,"config",new $)}}class D{constructor(){r(this,"outputs")}}class x extends h{constructor(){super(...arguments);r(this,"type","end");r(this,"config",new D)}}class L{constructor(){r(this,"method","");r(this,"url","");r(this,"headers");r(this,"body");r(this,"timeout");r(this,"retries");r(this,"successCodes")}}class I extends h{constructor(){super(...arguments);r(this,"type","http-request");r(this,"config",new L)}}class T{constructor(){r(this,"operation","");r(this,"variables")}}class A extends h{constructor(){super(...arguments);r(this,"type","variable");r(this,"config",new T)}}class W{constructor(){r(this,"expression","");r(this,"onTrue","");r(this,"onFalse","")}}class M extends h{constructor(){super(...arguments);r(this,"type","condition");r(this,"config",new W)}}class O{constructor(){r(this,"milliseconds",0);r(this,"message","")}}class N extends h{constructor(){super(...arguments);r(this,"type","delay");r(this,"config",new O)}}class F{constructor(){r(this,"message","");r(this,"level","")}}class q extends h{constructor(){super(...arguments);r(this,"type","log");r(this,"config",new F)}}class H{constructor(){r(this,"language","");r(this,"expression","");r(this,"data","")}}class G extends h{constructor(){super(...arguments);r(this,"type","evaluate");r(this,"config",new H)}}class R{constructor(){r(this,"items","");r(this,"itemVariable","");r(this,"indexVariable","");r(this,"loopBlock","");r(this,"maxIterations")}}class K extends h{constructor(){super(...arguments);r(this,"type","loop");r(this,"config",new R)}}class j{constructor(){r(this,"fromLoop","");r(this,"collectExpression","");r(this,"outputVariable","")}}class Q extends h{constructor(){super(...arguments);r(this,"type","collect");r(this,"config",new j)}}class V{constructor(){r(this,"tryBlock","");r(this,"catchBlock","");r(this,"finallyBlock","");r(this,"retries");r(this,"retryDelay")}}class Z extends h{constructor(){super(...arguments);r(this,"type","try-catch");r(this,"config",new V)}}class U{constructor(){r(this,"workflowId","");r(this,"inputs");r(this,"outputMapping")}}class tt extends h{constructor(){super(...arguments);r(this,"type","workflow");r(this,"config",new U)}}class P{constructor(){r(this,"workflow");r(this,"blocks");this.workflow={name:"New Workflow",description:"",version:"1.0",blocks:[]},this.blocks=new Map}loadWorkflow(o){try{const e=JSON.parse(o);this.workflow=this.deserializeWorkflow(e),this.indexBlocks()}catch(e){throw new Error(`Failed to load workflow: ${e}`)}}saveWorkflow(){return JSON.stringify(this.workflow,null,2)}getWorkflow(){return this.workflow}addBlock(o){o.id||(o.id=this.generateBlockId(o.type)),this.workflow.blocks||(this.workflow.blocks=[]),this.workflow.blocks.push(o),this.blocks.set(o.id,o)}removeBlock(o){var t,s;const e=(t=this.workflow.blocks)==null?void 0:t.findIndex(n=>n.id===o);e!==void 0&&e>=0&&((s=this.workflow.blocks)==null||s.splice(e,1),this.blocks.delete(o))}updateBlock(o,e){const t=this.blocks.get(o);t&&Object.assign(t,e)}getBlock(o){return this.blocks.get(o)}getBlocks(){return Array.from(this.blocks.values())}validate(){var n,i,p;const o=[],e=[],t=(n=this.workflow.blocks)==null?void 0:n.some(d=>d.type===a.Start),s=(i=this.workflow.blocks)==null?void 0:i.some(d=>d.type===a.End);return t||o.push("Workflow must have a Start block"),s||o.push("Workflow must have an End block"),(p=this.workflow.blocks)==null||p.forEach(d=>{d.type!==a.End&&!d.onSuccess&&!d.onFailure&&!d.onComplete&&e.push(`Block '${d.name||d.id}' has no outgoing connections`)}),{isValid:o.length===0,errors:o,warnings:e}}createBlock(o){switch(o){case a.Start:return new S;case a.End:return new x;case a.HttpRequest:return new I;case a.Variable:return new A;case a.Condition:return new M;case a.Delay:return new N;case a.Log:return new q;default:throw new Error(`Unknown block type: ${o}`)}}generateBlockId(o){const e=o.toLowerCase().replace("-","_"),t=Date.now(),s=Math.random().toString(36).substring(2,5);return`${e}_${t}_${s}`}indexBlocks(){var o;this.blocks.clear(),(o=this.workflow.blocks)==null||o.forEach(e=>{this.blocks.set(e.id,e)})}deserializeWorkflow(o){const e={name:o.name||"",description:o.description||"",version:o.version||"1.0",metadata:o.metadata,inputs:o.inputs,outputs:o.outputs,blocks:[]};return o.blocks&&Array.isArray(o.blocks)&&(e.blocks=o.blocks.map(t=>{const s=this.createBlock(this.parseBlockType(t.type));return Object.assign(s,t),s})),e}parseBlockType(o){const e=o.split("-").map((t,s)=>t.charAt(0).toUpperCase()+t.slice(1)).join("");return a[e]||a.Start}}class E{constructor(){r(this,"events",new Map)}on(o,e){this.events.has(o)||this.events.set(o,[]),this.events.get(o).push(e)}off(o,e){const t=this.events.get(o);if(t){const s=t.indexOf(e);s!==-1&&t.splice(s,1)}}emit(o,...e){const t=this.events.get(o);t&&t.forEach(s=>s(...e))}}const et=[{type:a.Start,name:"Start",icon:"🟢",category:"Control",description:"Entry point of the workflow",color:"#4CAF50"},{type:a.End,name:"End",icon:"🔴",category:"Control",description:"Exit point of the workflow",color:"#f44336"},{type:a.HttpRequest,name:"HTTP Request",icon:"🌐",category:"Action",description:"Make an HTTP API call",color:"#2196F3"},{type:a.Variable,name:"Variable",icon:"📦",category:"Data",description:"Set, get, or delete variables",color:"#FF9800"},{type:a.Condition,name:"Condition",icon:"❓",category:"Control",description:"Branch based on a condition",color:"#9C27B0"},{type:a.Delay,name:"Delay",icon:"⏰",category:"Action",description:"Wait for specified time",color:"#00BCD4"},{type:a.Log,name:"Log",icon:"📝",category:"Debug",description:"Log a message",color:"#607D8B"},{type:a.Evaluate,name:"Evaluate",icon:"🧮",category:"Data",description:"Evaluate an expression",color:"#795548"},{type:a.Loop,name:"Loop",icon:"🔄",category:"Control",description:"Iterate over items",color:"#E91E63"},{type:a.TryCatch,name:"Try/Catch",icon:"⚠️",category:"Control",description:"Error handling",color:"#FFC107"}];class J{constructor(o,e){r(this,"block");r(this,"blockData");this.block=o,this.blockData=e}getDescription(){var o;return((o=this.blockData)==null?void 0:o.description)||""}renderCustomContent(){return""}updatePorts(){}renderPort(o,e){return e==="input"?`
                <div class="port-row port-input" 
                     data-block="${this.block.id}" 
                     data-port="${o.name}"
                     data-port-type="${e}"
                     data-value-type="${o.type}">
                    <span class="port-tab"></span>
                    <span class="port-name">${o.name}</span>
                </div>
            `:`
                <div class="port-row port-output" 
                     data-block="${this.block.id}" 
                     data-port="${o.name}"
                     data-port-type="${e}"
                     data-value-type="${o.type}">
                    <span class="port-name">${o.name}</span>
                    <span class="port-tab"></span>
                </div>
            `}renderInputPorts(){return!this.block.inputPorts||this.block.inputPorts.length===0?"":this.block.inputPorts.map(o=>this.renderPort(o,"input")).join("")}renderOutputPorts(){return!this.block.outputPorts||this.block.outputPorts.length===0?"":this.block.outputPorts.map(o=>this.renderPort(o,"output")).join("")}render(){var t;const o=((t=this.blockData)==null?void 0:t.name)||this.block.id,e=this.getDescription();return`
            <div class="block-header">
                <span class="block-icon">${this.getIcon()}</span>
                <div class="block-info">
                    <span class="block-name">${o}</span>
                    <span class="block-type">${this.block.type}</span>
                </div>
            </div>
            ${e?`<div class="block-description">${e}</div>`:""}
            ${this.renderCustomContent()}
            <div class="block-ports-area">
                ${this.renderInputPorts()}
                ${this.renderOutputPorts()}
            </div>
        `}}class ot extends J{constructor(o,e){super(o,e)}getIcon(){return"🟢"}getColor(){return"#4CAF50"}getDescription(){var o;return((o=this.blockData)==null?void 0:o.description)||"Workflow entry point"}updatePorts(){const o=this.blockData;if(!o||!o.config)return;const e=this.getEffectiveInputs(o),t=o.config.profiles&&o.config.profiles.length>0;this.block.inputPorts=[],this.block.outputPorts=[];let s=t?40:0;Object.keys(e).forEach(n=>{const i=e[n];this.block.inputPorts.push({name:n,type:i.type||"any",position:{x:0,y:s},connected:!1}),this.block.outputPorts.push({name:n,type:i.type||"any",position:{x:this.block.width,y:s},connected:!1}),s+=32})}renderInputPorts(){return""}renderOutputPorts(){return""}renderPorts(){return!this.block.inputPorts||this.block.inputPorts.length===0?"":this.block.inputPorts.map((o,e)=>{const t=this.block.outputPorts[e],s=this.getTypeIcon(o.type);return`
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
                         data-port="${t.name}"
                         data-port-type="output"
                         data-value-type="${t.type}">
                        <span class="port-tab"></span>
                    </div>
                </div>
            `}).join("")}getTypeIcon(o){return{string:"Aa",number:"#",boolean:"0/1",object:"{}",array:"[]",any:"*"}[o]||"Aa"}getEffectiveInputs(o){const e=o.config;return e.profiles&&e.profiles.length>0?(e.profiles.find(s=>s.name===e.selectedProfile)||e.profiles.find(s=>s.default)||e.profiles[0]).inputs||{}:e.inputs||{}}renderCustomContent(){var s;const o=this.blockData;if(!o||!o.config)return"";const e=o.config.profiles;if(!e||e.length===0)return"";const t=o.config.selectedProfile||((s=e.find(n=>n.default))==null?void 0:s.name)||e[0].name;return`
            <div class="profile-selector">
                <select class="profile-dropdown" data-block="${this.block.id}">
                    ${e.map(n=>`
                        <option value="${n.name}" ${n.name===t?"selected":""}>
                            ${n.name}
                        </option>
                    `).join("")}
                </select>
            </div>
        `}render(){var t;const o=((t=this.blockData)==null?void 0:t.name)||this.block.id,e=this.getDescription();return`
            <div class="block-header">
                <span class="block-icon">${this.getIcon()}</span>
                <div class="block-info">
                    <span class="block-name">${o}</span>
                    <span class="block-type">${this.block.type}</span>
                </div>
            </div>
            ${e?`<div class="block-description">${e}</div>`:""}
            ${this.renderCustomContent()}
            <div class="block-ports-area">
                ${this.renderPorts()}
            </div>
        `}}class _ extends J{constructor(o,e){super(o,e)}getIcon(){return{end:"🔴","http-request":"🌐",variable:"📦",condition:"❓",delay:"⏰",log:"📝",evaluate:"🧮",loop:"🔄","try-catch":"⚠️"}[this.block.type]||"📄"}getColor(){return{end:"#f44336","http-request":"#2196F3",variable:"#FF9800",condition:"#9C27B0",delay:"#00BCD4",log:"#607D8B",evaluate:"#795548",loop:"#E91E63","try-catch":"#FFC107"}[this.block.type]||"#666"}getDescription(){if(!this.blockData)return"";const o=this.blockData.config;switch(this.blockData.type){case a.HttpRequest:return o!=null&&o.url?`${o.method||"GET"} ${o.url}`:"";case a.Variable:const e=o!=null&&o.variables?Object.keys(o.variables).length:0;return o!=null&&o.operation?`${o.operation} ${e} variable(s)`:"";case a.Condition:return(o==null?void 0:o.expression)||"";case a.Delay:return o!=null&&o.milliseconds?`${o.milliseconds}ms`:"";case a.Log:return o!=null&&o.message?o.message.substring(0,50):"";case a.End:return"Workflow exit point";default:return this.blockData.description||""}}updatePorts(){if(!this.blockData)return;const o=this.blockData;o.outputPorts&&(this.block.outputPorts=o.outputPorts.map((e,t)=>({name:e.name,type:e.type,position:{x:this.block.width,y:t*32},connected:!1}))),o.inputPorts&&(this.block.inputPorts=o.inputPorts.map((e,t)=>({name:e.name,type:e.type,position:{x:0,y:t*32},connected:!1})))}}class st{static createRenderer(o,e){if(!e)return new _(o,e);switch(e.type){case a.Start:return new ot(o,e);default:return new _(o,e)}}}class nt extends E{constructor(e){super();r(this,"container");r(this,"svg");r(this,"blocks",new Map);r(this,"connections",new Map);r(this,"blockDataMap",new Map);r(this,"isDragging",!1);r(this,"draggedBlockId",null);r(this,"dragOffset",{x:0,y:0});r(this,"isConnecting",!1);r(this,"connectionStart",null);r(this,"mousePosition",{x:0,y:0});const t=document.getElementById(e);if(!t)throw new Error(`Container element '${e}' not found`);this.container=t,this.setupCanvas()}setupCanvas(){this.container.innerHTML=`
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
        `,this.svg=this.container.querySelector(".connections-svg");const e=this.container.querySelector(".canvas-wrapper");e.addEventListener("dragover",t=>this.onDragOver(t)),e.addEventListener("drop",t=>this.onDrop(t)),e.addEventListener("click",t=>this.onCanvasClick(t)),e.addEventListener("mousemove",t=>this.onMouseMove(t)),e.addEventListener("mouseup",t=>this.onMouseUp(t))}render(e,t){this.blocks=e,this.connections=t,this.renderBlocks(),this.renderConnections()}setBlockData(e){this.blockDataMap=e,this.blocks.size>0&&this.renderBlocks()}renderBlocks(){const e=this.container.querySelector(".blocks-layer");e&&(e.innerHTML="",this.blocks.forEach(t=>{const s=this.createBlockElement(t);e.appendChild(s)}))}createBlockElement(e){const t=document.createElement("div");t.className=`workflow-block block-type-${e.type} ${e.selected?"selected":""}`,t.id=`block-${e.id}`,t.style.left=`${e.position.x}px`,t.style.top=`${e.position.y}px`,t.style.width=`${e.width}px`,t.style.minHeight=`${e.height}px`;const s=this.getBlockData(e.id),n=st.createRenderer(e,s);n.updatePorts();const i=this.getBlockColor(e.type);t.style.borderColor=i,t.innerHTML=n.render(),t.addEventListener("mousedown",u=>this.onBlockMouseDown(u,e.id)),t.addEventListener("click",u=>this.onBlockClick(u,e.id)),t.querySelectorAll(".port-input-tab, .port-output-tab, .port-row").forEach(u=>{u.addEventListener("mousedown",f=>this.onPortMouseDown(f))});const d=t.querySelector(".profile-dropdown");return d&&d.addEventListener("change",u=>{const k=u.target.value;this.emit("profileChange",{blockId:e.id,profile:k})}),t}getBlockColor(e){return{start:"#4CAF50",end:"#f44336","http-request":"#2196F3",variable:"#FF9800",condition:"#9C27B0",delay:"#00BCD4",log:"#607D8B",evaluate:"#795548",loop:"#E91E63","try-catch":"#FFC107"}[e]||"#666"}renderConnections(){if(this.svg.querySelectorAll("path.connection").forEach(t=>t.remove()),this.connections.forEach(t=>{const s=this.createConnectionPath(t);s&&this.svg.appendChild(s)}),this.isConnecting&&this.connectionStart){const t=this.createTempConnectionPath();t&&this.svg.appendChild(t)}}createConnectionPath(e){var X,Y;const t=this.blocks.get(e.sourceBlockId),s=this.blocks.get(e.targetBlockId);if(!t||!s)return null;const n=(X=t.outputPorts)==null?void 0:X.find(C=>C.name===e.sourcePortName),i=(Y=s.inputPorts)==null?void 0:Y.find(C=>C.name===e.targetPortName),p=80,d=80,u=n?p+n.position.y+16:t.height/2,f=i?d+i.position.y+16:s.height/2,k={x:t.position.x+t.width,y:t.position.y+u},m={x:s.position.x,y:s.position.y+f},w=document.createElementNS("http://www.w3.org/2000/svg","g");w.setAttribute("class","connection-group"),w.setAttribute("data-connection-id",e.id);const y=document.createElementNS("http://www.w3.org/2000/svg","path");y.setAttribute("class","connection connection-line"),y.setAttribute("d",this.getPathData(k,m)),y.setAttribute("stroke","#58a6ff"),y.setAttribute("stroke-width","2"),y.setAttribute("fill","none"),y.setAttribute("marker-end","url(#arrowhead)");const at=(k.x+m.x)/2,lt=(k.y+m.y)/2,g=document.createElementNS("http://www.w3.org/2000/svg","g");g.setAttribute("class","connection-delete-btn"),g.setAttribute("transform",`translate(${at}, ${lt})`),g.style.cursor="pointer";const B=document.createElementNS("http://www.w3.org/2000/svg","circle");B.setAttribute("r","10"),B.setAttribute("fill","#da3633"),B.setAttribute("stroke","#f85149"),B.setAttribute("stroke-width","2");const v=document.createElementNS("http://www.w3.org/2000/svg","line");v.setAttribute("x1","-4"),v.setAttribute("y1","-4"),v.setAttribute("x2","4"),v.setAttribute("y2","4"),v.setAttribute("stroke","white"),v.setAttribute("stroke-width","2");const b=document.createElementNS("http://www.w3.org/2000/svg","line");return b.setAttribute("x1","4"),b.setAttribute("y1","-4"),b.setAttribute("x2","-4"),b.setAttribute("y2","4"),b.setAttribute("stroke","white"),b.setAttribute("stroke-width","2"),g.appendChild(B),g.appendChild(v),g.appendChild(b),g.addEventListener("click",C=>{C.stopPropagation(),this.emit("connectionDelete",{connectionId:e.id})}),w.appendChild(y),w.appendChild(g),w}createTempConnectionPath(){if(!this.connectionStart)return null;const e=document.createElementNS("http://www.w3.org/2000/svg","path");return e.setAttribute("class","connection temp-connection"),e.setAttribute("d",this.getPathData(this.connectionStart.position,this.mousePosition)),e.setAttribute("stroke-dasharray","5,5"),e}getPathData(e,t){const s=Math.abs(t.x-e.x),n=Math.min(s/2,100),i=e.x+n,p=t.x-n;return`M ${e.x} ${e.y} C ${i} ${e.y}, ${p} ${t.y}, ${t.x} ${t.y}`}getBlockData(e){return this.blockDataMap.get(e)}onDragOver(e){e.preventDefault()}onDrop(e){e.preventDefault();const t=this.container.getBoundingClientRect(),s={x:e.clientX-t.left,y:e.clientY-t.top};this.emit("drop",s)}onBlockMouseDown(e,t){const s=e.target;if(s.classList.contains("port-row")||s.classList.contains("port-tab")||s.classList.contains("port-name"))return;e.preventDefault(),this.isDragging=!0,this.draggedBlockId=t;const n=this.blocks.get(t);n&&(this.dragOffset={x:e.clientX-n.position.x,y:e.clientY-n.position.y})}onBlockClick(e,t){const s=e.target;s.classList.contains("port-row")||s.classList.contains("port-tab")||s.classList.contains("port-name")||(e.stopPropagation(),this.emit("blockSelect",t))}onCanvasClick(e){e.target.classList.contains("canvas-wrapper")&&this.emit("blockSelect",null)}onMouseMove(e){const t=this.container.getBoundingClientRect();if(this.mousePosition={x:e.clientX-t.left,y:e.clientY-t.top},this.isDragging&&this.draggedBlockId){const s={x:e.clientX-this.dragOffset.x,y:e.clientY-this.dragOffset.y};this.emit("blockMove",{blockId:this.draggedBlockId,position:s})}this.isConnecting&&this.renderConnections()}onMouseUp(e){if(this.isDragging&&(this.isDragging=!1,this.draggedBlockId=null),this.isConnecting){const s=e.target.closest(".port-input-tab, .port-row");if(s&&s.dataset.portType==="input"){const n=s.dataset.block,i=s.dataset.port;n&&i&&this.connectionStart&&this.emit("connectionCreate",{sourceBlockId:this.connectionStart.blockId,sourcePortName:this.connectionStart.portName,targetBlockId:n,targetPortName:i})}this.isConnecting=!1,this.connectionStart=null,this.renderConnections()}}onPortMouseDown(e){e.stopPropagation(),e.preventDefault();const t=e.currentTarget;if(t.dataset.portType==="output"){const n=t.dataset.block,i=t.dataset.port;if(n&&i&&this.blocks.get(n)){this.isConnecting=!0;const u=(t.querySelector(".port-tab")||t).getBoundingClientRect(),f=this.container.querySelector(".canvas-wrapper");if(f){const k=f.getBoundingClientRect();this.connectionStart={blockId:n,portName:i,position:{x:u.left-k.left+u.width/2,y:u.top-k.top+u.height/2}}}}}}}class rt extends E{constructor(e){super();r(this,"container");r(this,"currentBlock",null);const t=document.getElementById(e);if(!t)throw new Error(`Container element '${e}' not found`);this.container=t,this.setupPanel()}setupPanel(){this.container.innerHTML=`
            <div class="property-panel-content">
                <h3>Properties</h3>
                <div class="property-form"></div>
            </div>
        `}showBlock(e){this.currentBlock=e,this.renderProperties()}clear(){this.currentBlock=null;const e=this.container.querySelector(".property-form");e&&(e.innerHTML='<p class="no-selection">Select a block to view properties</p>')}renderProperties(){const e=this.container.querySelector(".property-form");if(!e||!this.currentBlock)return;let t="";t+=`
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
                <input type="text" id="prop-name" value="${this.currentBlock.name||""}" 
                       data-property="name">
            </div>
            
            <div class="property-group">
                <label>Description</label>
                <textarea id="prop-description" rows="3" 
                          data-property="description">${this.currentBlock.description||""}</textarea>
            </div>
        `,t+=this.renderBlockSpecificProperties(),e.innerHTML=t,this.setupPropertyHandlers()}renderBlockSpecificProperties(){if(!this.currentBlock)return"";let e="<h4>Configuration</h4>";const t=this.currentBlock.config;switch(this.currentBlock.type){case a.Start:e+=`
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
                                  data-type="json">${JSON.stringify((t==null?void 0:t.overrides)||{},null,2)}</textarea>
                    </div>
                `;break;case a.HttpRequest:e+=`
                    <div class="property-group">
                        <label>URL</label>
                        <input type="text" data-property="config.url" 
                               value="${(t==null?void 0:t.url)||""}">
                    </div>
                    
                    <div class="property-group">
                        <label>Method</label>
                        <select data-property="config.method">
                            <option value="GET" ${(t==null?void 0:t.method)==="GET"?"selected":""}>GET</option>
                            <option value="POST" ${(t==null?void 0:t.method)==="POST"?"selected":""}>POST</option>
                            <option value="PUT" ${(t==null?void 0:t.method)==="PUT"?"selected":""}>PUT</option>
                            <option value="DELETE" ${(t==null?void 0:t.method)==="DELETE"?"selected":""}>DELETE</option>
                            <option value="PATCH" ${(t==null?void 0:t.method)==="PATCH"?"selected":""}>PATCH</option>
                        </select>
                    </div>
                    
                    <div class="property-group">
                        <label>Headers (JSON)</label>
                        <textarea rows="3" data-property="config.headers" 
                                  data-type="json">${JSON.stringify((t==null?void 0:t.headers)||{},null,2)}</textarea>
                    </div>
                    
                    <div class="property-group">
                        <label>Body (JSON)</label>
                        <textarea rows="5" data-property="config.body" 
                                  data-type="json">${t!=null&&t.body?JSON.stringify(t.body,null,2):""}</textarea>
                    </div>
                `;break;case a.Variable:e+=`
                    <div class="property-group">
                        <label>Operation</label>
                        <select data-property="config.operation">
                            <option value="set" ${(t==null?void 0:t.operation)==="set"?"selected":""}>Set</option>
                            <option value="get" ${(t==null?void 0:t.operation)==="get"?"selected":""}>Get</option>
                            <option value="delete" ${(t==null?void 0:t.operation)==="delete"?"selected":""}>Delete</option>
                        </select>
                    </div>
                    
                    <div class="property-group">
                        <label>Variables (JSON)</label>
                        <textarea rows="5" data-property="config.variables" 
                                  data-type="json">${JSON.stringify((t==null?void 0:t.variables)||{},null,2)}</textarea>
                    </div>
                `;break;case a.Condition:e+=`
                    <div class="property-group">
                        <label>Expression</label>
                        <input type="text" data-property="config.expression" 
                               value="${(t==null?void 0:t.expression)||""}">
                    </div>
                    
                    <div class="property-group">
                        <label>On True (Block ID)</label>
                        <input type="text" data-property="config.onTrue" 
                               value="${(t==null?void 0:t.onTrue)||""}">
                    </div>
                    
                    <div class="property-group">
                        <label>On False (Block ID)</label>
                        <input type="text" data-property="config.onFalse" 
                               value="${(t==null?void 0:t.onFalse)||""}">
                    </div>
                `;break;case a.Delay:e+=`
                    <div class="property-group">
                        <label>Delay (milliseconds)</label>
                        <input type="number" data-property="config.milliseconds" 
                               value="${(t==null?void 0:t.milliseconds)||1e3}">
                    </div>
                `;break;case a.Log:e+=`
                    <div class="property-group">
                        <label>Message</label>
                        <textarea rows="3" data-property="config.message">${(t==null?void 0:t.message)||""}</textarea>
                    </div>
                    
                    <div class="property-group">
                        <label>Level</label>
                        <select data-property="config.level">
                            <option value="info" ${(t==null?void 0:t.level)==="info"?"selected":""}>Info</option>
                            <option value="warning" ${(t==null?void 0:t.level)==="warning"?"selected":""}>Warning</option>
                            <option value="error" ${(t==null?void 0:t.level)==="error"?"selected":""}>Error</option>
                            <option value="debug" ${(t==null?void 0:t.level)==="debug"?"selected":""}>Debug</option>
                        </select>
                    </div>
                `;break;case a.End:e+=`
                    <div class="property-group">
                        <label>Outputs (JSON)</label>
                        <textarea rows="5" data-property="config.outputs" 
                                  data-type="json">${JSON.stringify((t==null?void 0:t.outputs)||{},null,2)}</textarea>
                    </div>
                `;break}return e+=`
            <h4>Connections</h4>
            <div class="property-group">
                <label>On Success</label>
                <input type="text" data-property="onSuccess" 
                       value="${this.currentBlock.onSuccess||""}">
            </div>
            
            <div class="property-group">
                <label>On Failure</label>
                <input type="text" data-property="onFailure" 
                       value="${this.currentBlock.onFailure||""}">
            </div>
        `,e}renderProfileSelector(){var i;const e=(i=this.currentBlock)==null?void 0:i.config,t=(e==null?void 0:e.profiles)||[],s=(e==null?void 0:e.selectedProfile)||"";if(t.length===0)return'<p class="no-profiles">No profiles defined. Add profiles in JSON view.</p>';let n='<select data-property="config.selectedProfile" class="profile-selector">';return n+='<option value="">-- Select Profile --</option>',t.forEach(p=>{const d=p.name===s?"selected":"",u=p.default?" (default)":"";n+=`<option value="${p.name}" ${d}>${p.name}${u}</option>`}),n+="</select>",n}renderProfileDetails(){var p;const e=(p=this.currentBlock)==null?void 0:p.config,t=(e==null?void 0:e.profiles)||[],s=(e==null?void 0:e.selectedProfile)||"",n=t.find(d=>d.name===s);if(!n)return'<p class="no-profile-selected">Select a profile to view its inputs</p>';let i='<div class="profile-inputs">';if(i+=`<h5>${n.name}</h5>`,n.description&&(i+=`<p class="profile-description">${n.description}</p>`),n.inputs&&Object.keys(n.inputs).length>0){i+='<table class="profile-inputs-table">',i+="<thead><tr><th>Input</th><th>Type</th><th>Value</th><th>Required</th></tr></thead>",i+="<tbody>";for(const[d,u]of Object.entries(n.inputs)){const f=u;i+="<tr>",i+=`<td>${d}</td>`,i+=`<td>${f.type||"string"}</td>`,i+=`<td><code>${f.value||f.default||""}</code></td>`,i+=`<td>${f.required?"✓":""}</td>`,i+="</tr>"}i+="</tbody></table>"}else i+="<p>No inputs defined for this profile</p>";return i+="</div>",i}setupPropertyHandlers(){this.container.querySelectorAll("input[data-property], textarea[data-property], select[data-property]").forEach(t=>{t.addEventListener("change",s=>this.onPropertyChange(s)),(t.tagName==="INPUT"||t.tagName==="TEXTAREA")&&t.addEventListener("input",s=>this.onPropertyChange(s))})}onPropertyChange(e){if(!this.currentBlock)return;const t=e.target,s=t.dataset.property;if(!s)return;let n=t.value;if(t.dataset.type==="json")try{n=JSON.parse(n)}catch{console.warn("Invalid JSON:",n);return}if(s==="config.selectedProfile"){this.currentBlock&&this.currentBlock.config&&(this.currentBlock.config.selectedProfile=n),this.emit("blockUpdated",this.currentBlock.id,{...this.currentBlock}),this.renderProperties();return}t.type==="number"&&(n=parseInt(n,10)),this.emit("propertyChange",{blockId:this.currentBlock.id,property:s,value:n})}}class it extends E{constructor(e){super();r(this,"container");r(this,"templates",et);const t=document.getElementById(e);if(!t)throw new Error(`Container element '${e}' not found`);this.container=t,this.setupPalette()}setupPalette(){this.container.innerHTML=`
            <div class="palette-content">
                <h3>Blocks</h3>
                <div class="block-categories"></div>
            </div>
        `,this.renderBlocks()}renderBlocks(){const e=this.container.querySelector(".block-categories");if(!e)return;const t=new Map;this.templates.forEach(n=>{t.has(n.category)||t.set(n.category,[]),t.get(n.category).push(n)});let s="";t.forEach((n,i)=>{s+=`
                <div class="category">
                    <h4 class="category-title">${i}</h4>
                    <div class="category-blocks">
            `,n.forEach(p=>{s+=`
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
                `}),s+=`
                    </div>
                </div>
            `}),e.innerHTML=s,this.setupDragHandlers()}setupDragHandlers(){this.container.querySelectorAll(".block-template").forEach(t=>{t.addEventListener("dragstart",s=>this.onDragStart(s)),t.addEventListener("dragend",s=>this.onDragEnd(s))})}onDragStart(e){var n;const t=e.target,s=(n=t.closest(".block-template"))==null?void 0:n.getAttribute("data-block-type");s&&e.dataTransfer&&(e.dataTransfer.effectAllowed="copy",e.dataTransfer.setData("text/plain",s),t.classList.add("dragging"),this.emit("blockDragStart",s))}onDragEnd(e){e.target.classList.remove("dragging")}filterBlocks(e){const t=e.toLowerCase();this.container.querySelectorAll(".block-template").forEach(n=>{var u,f,k,m;const i=n,p=((f=(u=i.querySelector(".name"))==null?void 0:u.textContent)==null?void 0:f.toLowerCase())||"",d=((m=(k=i.querySelector(".description"))==null?void 0:k.textContent)==null?void 0:m.toLowerCase())||"";p.includes(t)||d.includes(t)?i.style.display="flex":i.style.display="none"})}addSearchInput(){const e=this.container.querySelector(".palette-content");if(!e)return;const t=document.createElement("div");t.className="search-container",t.innerHTML=`
            <input type="text" class="search-input" placeholder="Search blocks...">
        `;const s=e.querySelector("h3");s&&s.nextSibling&&e.insertBefore(t,s.nextSibling),t.querySelector(".search-input").addEventListener("input",i=>{this.filterBlocks(i.target.value)})}}class z{constructor(o){r(this,"container");r(this,"engine");r(this,"canvas");r(this,"propertyPanel");r(this,"blockPalette");r(this,"visualBlocks");r(this,"visualConnections");r(this,"selectedBlockId",null);const e=document.getElementById(o);if(!e)throw new Error(`Container element '${o}' not found`);this.container=e,this.engine=new P,this.visualBlocks=new Map,this.visualConnections=new Map,this.setupUI(),this.initializeDefaultWorkflow()}getSelectedBlockId(){return this.selectedBlockId}setupUI(){this.container.innerHTML=`
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
        `,this.blockPalette=new it("block-palette"),this.canvas=new nt("canvas-container"),this.propertyPanel=new rt("property-panel"),this.setupEventHandlers()}setupEventHandlers(){var o,e,t,s;(o=document.getElementById("import-btn"))==null||o.addEventListener("click",()=>this.importWorkflow()),(e=document.getElementById("export-btn"))==null||e.addEventListener("click",()=>this.exportWorkflow()),(t=document.getElementById("validate-btn"))==null||t.addEventListener("click",()=>this.validateWorkflow()),(s=document.getElementById("clear-btn"))==null||s.addEventListener("click",()=>this.clearWorkflow()),this.blockPalette.on("blockDragStart",n=>{window.__draggedBlockType=n}),this.canvas.on("drop",n=>{const i=window.__draggedBlockType;i&&(this.addBlock(i,n),delete window.__draggedBlockType)}),this.canvas.on("blockSelect",n=>{this.selectBlock(n)}),this.canvas.on("blockMove",n=>{this.moveBlock(n.blockId,n.position)}),this.canvas.on("connectionCreate",n=>{this.onConnectionCreated(n.sourceBlockId,n.targetBlockId,n.sourcePortName,n.targetPortName)}),this.canvas.on("profileChange",n=>{this.onProfileChange(n.blockId,n.profile)}),this.canvas.on("connectionDelete",n=>{this.onConnectionDeleted(n.connectionId)}),this.propertyPanel.on("propertyChange",n=>{this.updateBlockProperty(n.blockId,n.property,n.value)})}initializeDefaultWorkflow(){const o=this.engine.createBlock(a.Start);o.name="Start",this.engine.addBlock(o),this.addVisualBlock(o,{x:100,y:200});const e=this.engine.createBlock(a.End);e.name="End",this.engine.addBlock(e),this.addVisualBlock(e,{x:500,y:200}),this.renderWorkflow()}addBlock(o,e){const t=this.engine.createBlock(o);t.name=this.getDefaultBlockName(o),this.engine.addBlock(t),this.addVisualBlock(t,e),this.renderWorkflow(),this.selectBlock(t.id)}addVisualBlock(o,e){const t={id:o.id,type:o.type,position:e,width:250,height:100,selected:!1};this.visualBlocks.set(o.id,t)}moveBlock(o,e){const t=this.visualBlocks.get(o);t&&(t.position=e,this.renderWorkflow())}selectBlock(o){if(this.visualBlocks.forEach(e=>e.selected=!1),o){const e=this.visualBlocks.get(o);if(e){e.selected=!0,this.selectedBlockId=o;const t=this.engine.getBlock(o);t&&this.propertyPanel.showBlock(t)}}else this.selectedBlockId=null,this.propertyPanel.clear();this.renderWorkflow()}onConnectionCreated(o,e,t,s){const n=this.engine.getBlock(o);if(n){n.connections||(n.connections=[]),n.connections=n.connections.filter(d=>!(d.fromBlock===o&&d.fromPort===t)),n.connections.push({fromBlock:o,fromPort:t,toBlock:e,toPort:s});const i=`${o}-${t}-${e}-${s}`,p={id:i,sourceBlockId:o,sourcePortName:t,targetBlockId:e,targetPortName:s,path:""};this.visualConnections.set(i,p),this.renderWorkflow()}}onProfileChange(o,e){const t=this.engine.getBlock(o);if(t&&t.type===a.Start){const s=t;s.config&&(s.config.selectedProfile=e,this.renderWorkflow(),this.selectedBlockId===o&&this.selectBlock(o))}}onConnectionDeleted(o){this.visualConnections.delete(o);const e=Array.from(this.visualConnections.values()).find(t=>t.id===o);if(e){const t=this.engine.getBlock(e.sourceBlockId);t&&t.connections&&(t.connections=t.connections.filter(s=>!(s.fromBlock===e.sourceBlockId&&s.fromPort===e.sourcePortName)))}this.renderWorkflow()}updateBlockProperty(o,e,t){const s=this.engine.getBlock(o);if(s){if(e.startsWith("config.")){const n=e.substring(7);s.config[n]=t}else s[e]=t;this.renderWorkflow()}}importWorkflow(){const o=document.createElement("input");o.type="file",o.accept=".json",o.onchange=async e=>{var s;const t=(s=e.target.files)==null?void 0:s[0];if(t){const n=await t.text();try{this.engine.loadWorkflow(n),this.visualBlocks.clear(),this.visualConnections.clear(),this.positionBlocks(),this.createVisualConnections(),this.renderWorkflow(),alert("Workflow imported successfully")}catch(i){alert(`Failed to import workflow: ${i}`)}}},o.click()}exportWorkflow(){const o=this.engine.saveWorkflow(),e=new Blob([o],{type:"application/json"}),t=URL.createObjectURL(e),s=document.createElement("a");s.href=t,s.download=`${this.engine.getWorkflow().name||"workflow"}.json`,s.click(),URL.revokeObjectURL(t)}validateWorkflow(){const o=this.engine.validate();if(o.isValid)alert("Workflow is valid!");else{const e=`Validation failed:

Errors:
${o.errors.join(`
`)}

Warnings:
${o.warnings.join(`
`)}`;alert(e)}}clearWorkflow(){confirm("Are you sure you want to clear the workflow?")&&(this.engine=new P,this.visualBlocks.clear(),this.visualConnections.clear(),this.selectedBlockId=null,this.initializeDefaultWorkflow())}renderWorkflow(){const o=new Map;this.engine.getBlocks().forEach(e=>{o.set(e.id,e)}),this.canvas.setBlockData(o),this.canvas.render(this.visualBlocks,this.visualConnections)}positionBlocks(){const o=this.engine.getBlocks(),e=150;let t=100,s=100;o.forEach(n=>{this.addVisualBlock(n,{x:t,y:s}),t+=e,t>800&&(t=100,s+=e)})}createVisualConnections(){this.engine.getBlocks().forEach(e=>{if(e.connections&&e.connections.length>0)e.connections.forEach(t=>{const s=`${t.fromBlock}-${t.fromPort}-${t.toBlock}-${t.toPort}`;this.visualConnections.set(s,{id:s,sourceBlockId:t.fromBlock,sourcePortName:t.fromPort,targetBlockId:t.toBlock,targetPortName:t.toPort,path:""})});else{if(e.onSuccess){const t=`${e.id}-${e.onSuccess}-success`;this.visualConnections.set(t,{id:t,sourceBlockId:e.id,sourcePortName:"onSuccess",targetBlockId:e.onSuccess,targetPortName:"in",path:""})}if(e.onFailure){const t=`${e.id}-${e.onFailure}-failure`;this.visualConnections.set(t,{id:t,sourceBlockId:e.id,sourcePortName:"onFailure",targetBlockId:e.onFailure,targetPortName:"in",path:""})}if(e.onComplete){const t=`${e.id}-${e.onComplete}-complete`;this.visualConnections.set(t,{id:t,sourceBlockId:e.id,sourcePortName:"onComplete",targetBlockId:e.onComplete,targetPortName:"in",path:""})}}})}getDefaultBlockName(o){const e=o.toString();return e.charAt(0).toUpperCase()+e.slice(1).replace("-"," ")}}typeof document<"u"&&document.addEventListener("DOMContentLoaded",()=>{if(document.getElementById("designer-container"))try{const o=new z("designer-container");console.log("SiyeFlow Designer initialized"),window.siyeFlowDesigner=o}catch(o){console.error("Failed to initialize SiyeFlow Designer:",o)}}),c.BlockType=a,c.CollectBlock=Q,c.CollectConfig=j,c.ConditionBlock=M,c.ConditionConfig=W,c.DelayBlock=N,c.DelayConfig=O,c.EndBlock=x,c.EndConfig=D,c.EvaluateBlock=G,c.EvaluateConfig=H,c.HttpRequestBlock=I,c.HttpRequestConfig=L,c.LogBlock=q,c.LogConfig=F,c.LoopBlock=K,c.LoopConfig=R,c.StartBlock=S,c.StartConfig=$,c.SubWorkflowBlock=tt,c.SubWorkflowConfig=U,c.TryCatchBlock=Z,c.TryCatchConfig=V,c.VariableBlock=A,c.VariableConfig=T,c.WorkflowBlock=h,c.WorkflowDesigner=z,c.WorkflowEngine=P,Object.defineProperty(c,Symbol.toStringTag,{value:"Module"})});
