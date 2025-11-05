(function(l,a){typeof exports=="object"&&typeof module<"u"?a(exports):typeof define=="function"&&define.amd?define(["exports"],a):(l=typeof globalThis<"u"?globalThis:l||self,a(l.SiyeFlowDesigner={}))})(this,function(l){"use strict";var X=Object.defineProperty;var G=(l,a,d)=>a in l?X(l,a,{enumerable:!0,configurable:!0,writable:!0,value:d}):l[a]=d;var s=(l,a,d)=>G(l,typeof a!="symbol"?a+"":a,d);var a=(r=>(r.Start="start",r.End="end",r.HttpRequest="http-request",r.Evaluate="evaluate",r.Condition="condition",r.Loop="loop",r.Delay="delay",r.Variable="variable",r.Log="log",r.Collect="collect",r.TryCatch="try-catch",r.Workflow="workflow",r))(a||{});class d{constructor(){s(this,"id","");s(this,"name","");s(this,"description");s(this,"inputs");s(this,"outputs");s(this,"onSuccess");s(this,"onFailure");s(this,"onComplete")}}class f{constructor(){s(this,"inputs")}}class v extends d{constructor(){super(...arguments);s(this,"type","start");s(this,"config",new f)}}class w{constructor(){s(this,"outputs")}}class m extends d{constructor(){super(...arguments);s(this,"type","end");s(this,"config",new w)}}class b{constructor(){s(this,"method","");s(this,"url","");s(this,"headers");s(this,"body");s(this,"timeout");s(this,"retries");s(this,"successCodes")}}class B extends d{constructor(){super(...arguments);s(this,"type","http-request");s(this,"config",new b)}}class C{constructor(){s(this,"operation","");s(this,"variables")}}class E extends d{constructor(){super(...arguments);s(this,"type","variable");s(this,"config",new C)}}class S{constructor(){s(this,"expression","");s(this,"onTrue","");s(this,"onFalse","")}}class $ extends d{constructor(){super(...arguments);s(this,"type","condition");s(this,"config",new S)}}class D{constructor(){s(this,"milliseconds",0)}}class x extends d{constructor(){super(...arguments);s(this,"type","delay");s(this,"config",new D)}}class L{constructor(){s(this,"message","");s(this,"level","")}}class P extends d{constructor(){super(...arguments);s(this,"type","log");s(this,"config",new L)}}class T{constructor(){s(this,"language","");s(this,"expression","");s(this,"data","")}}class q extends d{constructor(){super(...arguments);s(this,"type","evaluate");s(this,"config",new T)}}class W{constructor(){s(this,"items","");s(this,"itemVariable","");s(this,"indexVariable","");s(this,"loopBlock","");s(this,"maxIterations")}}class N extends d{constructor(){super(...arguments);s(this,"type","loop");s(this,"config",new W)}}class M{constructor(){s(this,"fromLoop","");s(this,"collectExpression","");s(this,"outputVariable","")}}class V extends d{constructor(){super(...arguments);s(this,"type","collect");s(this,"config",new M)}}class I{constructor(){s(this,"tryBlock","");s(this,"catchBlock","");s(this,"finallyBlock","");s(this,"retries");s(this,"retryDelay")}}class j extends d{constructor(){super(...arguments);s(this,"type","try-catch");s(this,"config",new I)}}class O{constructor(){s(this,"workflowId","");s(this,"inputs");s(this,"outputMapping")}}class R extends d{constructor(){super(...arguments);s(this,"type","workflow");s(this,"config",new O)}}class k{constructor(){s(this,"workflow");s(this,"blocks");this.workflow={name:"New Workflow",description:"",version:"1.0",blocks:[]},this.blocks=new Map}loadWorkflow(o){try{const t=JSON.parse(o);this.workflow=this.deserializeWorkflow(t),this.indexBlocks()}catch(t){throw new Error(`Failed to load workflow: ${t}`)}}saveWorkflow(){return JSON.stringify(this.workflow,null,2)}getWorkflow(){return this.workflow}addBlock(o){o.id||(o.id=this.generateBlockId(o.type)),this.workflow.blocks||(this.workflow.blocks=[]),this.workflow.blocks.push(o),this.blocks.set(o.id,o)}removeBlock(o){var e,n;const t=(e=this.workflow.blocks)==null?void 0:e.findIndex(i=>i.id===o);t!==void 0&&t>=0&&((n=this.workflow.blocks)==null||n.splice(t,1),this.blocks.delete(o))}updateBlock(o,t){const e=this.blocks.get(o);e&&Object.assign(e,t)}getBlock(o){return this.blocks.get(o)}getBlocks(){return Array.from(this.blocks.values())}validate(){var i,c,p;const o=[],t=[],e=(i=this.workflow.blocks)==null?void 0:i.some(u=>u.type===a.Start),n=(c=this.workflow.blocks)==null?void 0:c.some(u=>u.type===a.End);return e||o.push("Workflow must have a Start block"),n||o.push("Workflow must have an End block"),(p=this.workflow.blocks)==null||p.forEach(u=>{u.type!==a.End&&!u.onSuccess&&!u.onFailure&&!u.onComplete&&t.push(`Block '${u.name||u.id}' has no outgoing connections`)}),{isValid:o.length===0,errors:o,warnings:t}}createBlock(o){switch(o){case a.Start:return new v;case a.End:return new m;case a.HttpRequest:return new B;case a.Variable:return new E;case a.Condition:return new $;case a.Delay:return new x;case a.Log:return new P;default:throw new Error(`Unknown block type: ${o}`)}}generateBlockId(o){const t=o.toLowerCase().replace("-","_"),e=Date.now(),n=Math.random().toString(36).substring(2,5);return`${t}_${e}_${n}`}indexBlocks(){var o;this.blocks.clear(),(o=this.workflow.blocks)==null||o.forEach(t=>{this.blocks.set(t.id,t)})}deserializeWorkflow(o){const t={name:o.name||"",description:o.description||"",version:o.version||"1.0",metadata:o.metadata,inputs:o.inputs,outputs:o.outputs,blocks:[]};return o.blocks&&Array.isArray(o.blocks)&&(t.blocks=o.blocks.map(e=>{const n=this.createBlock(this.parseBlockType(e.type));return Object.assign(n,e),n})),t}parseBlockType(o){const t=o.split("-").map((e,n)=>e.charAt(0).toUpperCase()+e.slice(1)).join("");return a[t]||a.Start}}class y{constructor(){s(this,"events",new Map)}on(o,t){this.events.has(o)||this.events.set(o,[]),this.events.get(o).push(t)}off(o,t){const e=this.events.get(o);if(e){const n=e.indexOf(t);n!==-1&&e.splice(n,1)}}emit(o,...t){const e=this.events.get(o);e&&e.forEach(n=>n(...t))}}const U=[{type:a.Start,name:"Start",icon:"🟢",category:"Control",description:"Entry point of the workflow",color:"#4CAF50"},{type:a.End,name:"End",icon:"🔴",category:"Control",description:"Exit point of the workflow",color:"#f44336"},{type:a.HttpRequest,name:"HTTP Request",icon:"🌐",category:"Action",description:"Make an HTTP API call",color:"#2196F3"},{type:a.Variable,name:"Variable",icon:"📦",category:"Data",description:"Set, get, or delete variables",color:"#FF9800"},{type:a.Condition,name:"Condition",icon:"❓",category:"Control",description:"Branch based on a condition",color:"#9C27B0"},{type:a.Delay,name:"Delay",icon:"⏰",category:"Action",description:"Wait for specified time",color:"#00BCD4"},{type:a.Log,name:"Log",icon:"📝",category:"Debug",description:"Log a message",color:"#607D8B"},{type:a.Evaluate,name:"Evaluate",icon:"🧮",category:"Data",description:"Evaluate an expression",color:"#795548"},{type:a.Loop,name:"Loop",icon:"🔄",category:"Control",description:"Iterate over items",color:"#E91E63"},{type:a.TryCatch,name:"Try/Catch",icon:"⚠️",category:"Control",description:"Error handling",color:"#FFC107"}];class J extends y{constructor(t){super();s(this,"container");s(this,"svg");s(this,"blocks",new Map);s(this,"connections",new Map);s(this,"blockDataMap",new Map);s(this,"isDragging",!1);s(this,"draggedBlockId",null);s(this,"dragOffset",{x:0,y:0});s(this,"isConnecting",!1);s(this,"connectionStart",null);s(this,"mousePosition",{x:0,y:0});const e=document.getElementById(t);if(!e)throw new Error(`Container element '${t}' not found`);this.container=e,this.setupCanvas()}setupCanvas(){this.container.innerHTML=`
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
        `,this.svg=this.container.querySelector(".connections-svg");const t=this.container.querySelector(".canvas-wrapper");t.addEventListener("dragover",e=>this.onDragOver(e)),t.addEventListener("drop",e=>this.onDrop(e)),t.addEventListener("click",e=>this.onCanvasClick(e)),t.addEventListener("mousemove",e=>this.onMouseMove(e)),t.addEventListener("mouseup",e=>this.onMouseUp(e))}render(t,e){this.blocks=t,this.connections=e,this.renderBlocks(),this.renderConnections()}setBlockData(t){this.blockDataMap=t,this.blocks.size>0&&this.renderBlocks()}renderBlocks(){const t=this.container.querySelector(".blocks-layer");t&&(t.innerHTML="",this.blocks.forEach(e=>{const n=this.createBlockElement(e);t.appendChild(n)}))}createBlockElement(t){const e=this.getBlockInfo(t.type),n=document.createElement("div");n.className=`workflow-block block-type-${t.type} ${t.selected?"selected":""}`,n.id=`block-${t.id}`,n.style.left=`${t.position.x}px`,n.style.top=`${t.position.y}px`,n.style.width=`${t.width}px`,n.style.minHeight=`${t.height}px`,n.style.borderColor=e.color;const i=this.getBlockData(t.id),c=(i==null?void 0:i.name)||t.id,p=this.getBlockDescription(i);return n.innerHTML=`
            <div class="block-header">
                <span class="block-icon">${e.icon}</span>
                <div class="block-info">
                    <span class="block-name">${c}</span>
                    <span class="block-type">${t.type}</span>
                </div>
            </div>
            ${p?`<div class="block-description">${p}</div>`:""}
            <div class="block-ports">
                <div class="port port-in" data-block="${t.id}" data-type="in"></div>
                <div class="port port-out" data-block="${t.id}" data-type="out"></div>
            </div>
        `,n.addEventListener("mousedown",h=>this.onBlockMouseDown(h,t.id)),n.addEventListener("click",h=>this.onBlockClick(h,t.id)),n.querySelectorAll(".port").forEach(h=>{h.addEventListener("mousedown",g=>this.onPortMouseDown(g))}),n}renderConnections(){if(this.svg.querySelectorAll("path.connection").forEach(e=>e.remove()),this.connections.forEach(e=>{const n=this.createConnectionPath(e);n&&this.svg.appendChild(n)}),this.isConnecting&&this.connectionStart){const e=this.createTempConnectionPath();e&&this.svg.appendChild(e)}}createConnectionPath(t){const e=this.blocks.get(t.source),n=this.blocks.get(t.target);if(!e||!n)return null;const i={x:e.position.x+e.width,y:e.position.y+e.height/2},c={x:n.position.x,y:n.position.y+n.height/2},p=document.createElementNS("http://www.w3.org/2000/svg","path");return p.setAttribute("class",`connection connection-line ${t.type}`),p.setAttribute("d",this.getPathData(i,c)),p.setAttribute("marker-end","url(#arrowhead)"),p}createTempConnectionPath(){if(!this.connectionStart)return null;const t=document.createElementNS("http://www.w3.org/2000/svg","path");return t.setAttribute("class","connection temp-connection"),t.setAttribute("d",this.getPathData(this.connectionStart.position,this.mousePosition)),t.setAttribute("stroke-dasharray","5,5"),t}getPathData(t,e){const n=(t.x+e.x)/2;return`M ${t.x} ${t.y} C ${n} ${t.y}, ${n} ${e.y}, ${e.x} ${e.y}`}getBlockInfo(t){return{start:{icon:"🟢",color:"#4CAF50"},end:{icon:"🔴",color:"#f44336"},"http-request":{icon:"🌐",color:"#2196F3"},variable:{icon:"📦",color:"#FF9800"},condition:{icon:"❓",color:"#9C27B0"},delay:{icon:"⏰",color:"#00BCD4"},log:{icon:"📝",color:"#607D8B"},evaluate:{icon:"🧮",color:"#795548"},loop:{icon:"🔄",color:"#E91E63"},"try-catch":{icon:"⚠️",color:"#FFC107"}}[t]||{icon:"📄",color:"#666"}}getBlockData(t){return this.blockDataMap.get(t)}getBlockDescription(t){if(!t)return"";const e=t.config;switch(t.type){case"http-request":return e!=null&&e.url?`${e.method||"GET"} ${e.url}`:"";case"variable":const n=e!=null&&e.variables?Object.keys(e.variables).length:0;return e!=null&&e.operation?`${e.operation} ${n} variable(s)`:"";case"condition":return(e==null?void 0:e.expression)||"";case"delay":return e!=null&&e.milliseconds?`${e.milliseconds}ms`:"";case"log":return e!=null&&e.message?e.message.substring(0,50):"";case"start":return t.description||"Workflow entry point";case"end":return t.description||"Workflow exit point";default:return t.description||""}}onDragOver(t){t.preventDefault()}onDrop(t){t.preventDefault();const e=this.container.getBoundingClientRect(),n={x:t.clientX-e.left,y:t.clientY-e.top};this.emit("drop",n)}onBlockMouseDown(t,e){if(t.target.classList.contains("port"))return;t.preventDefault(),this.isDragging=!0,this.draggedBlockId=e;const n=this.blocks.get(e);n&&(this.dragOffset={x:t.clientX-n.position.x,y:t.clientY-n.position.y})}onBlockClick(t,e){t.target.classList.contains("port")||(t.stopPropagation(),this.emit("blockSelect",e))}onCanvasClick(t){t.target.classList.contains("canvas-wrapper")&&this.emit("blockSelect",null)}onMouseMove(t){const e=this.container.getBoundingClientRect();if(this.mousePosition={x:t.clientX-e.left,y:t.clientY-e.top},this.isDragging&&this.draggedBlockId){const n={x:t.clientX-this.dragOffset.x,y:t.clientY-this.dragOffset.y};this.emit("blockMove",{blockId:this.draggedBlockId,position:n})}this.isConnecting&&this.renderConnections()}onMouseUp(t){if(this.isDragging&&(this.isDragging=!1,this.draggedBlockId=null),this.isConnecting){const e=t.target;if(e.classList.contains("port")&&e.dataset.type==="in"){const n=e.dataset.block;n&&this.connectionStart&&this.emit("connectionCreate",{source:this.connectionStart.blockId,target:n,type:"success"})}this.isConnecting=!1,this.connectionStart=null,this.renderConnections()}}onPortMouseDown(t){t.stopPropagation(),t.preventDefault();const e=t.target;if(e.dataset.type==="out"){const n=e.dataset.block;if(n){const i=this.blocks.get(n);i&&(this.isConnecting=!0,this.connectionStart={blockId:n,position:{x:i.position.x+i.width,y:i.position.y+i.height/2}})}}}}class _ extends y{constructor(t){super();s(this,"container");s(this,"currentBlock",null);const e=document.getElementById(t);if(!e)throw new Error(`Container element '${t}' not found`);this.container=e,this.setupPanel()}setupPanel(){this.container.innerHTML=`
            <div class="property-panel-content">
                <h3>Properties</h3>
                <div class="property-form"></div>
            </div>
        `}showBlock(t){this.currentBlock=t,this.renderProperties()}clear(){this.currentBlock=null;const t=this.container.querySelector(".property-form");t&&(t.innerHTML='<p class="no-selection">Select a block to view properties</p>')}renderProperties(){const t=this.container.querySelector(".property-form");if(!t||!this.currentBlock)return;let e="";e+=`
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
        `,e+=this.renderBlockSpecificProperties(),t.innerHTML=e,this.setupPropertyHandlers()}renderBlockSpecificProperties(){if(!this.currentBlock)return"";let t="<h4>Configuration</h4>";const e=this.currentBlock.config;switch(this.currentBlock.type){case a.HttpRequest:t+=`
                    <div class="property-group">
                        <label>URL</label>
                        <input type="text" data-property="config.url" 
                               value="${(e==null?void 0:e.url)||""}">
                    </div>
                    
                    <div class="property-group">
                        <label>Method</label>
                        <select data-property="config.method">
                            <option value="GET" ${(e==null?void 0:e.method)==="GET"?"selected":""}>GET</option>
                            <option value="POST" ${(e==null?void 0:e.method)==="POST"?"selected":""}>POST</option>
                            <option value="PUT" ${(e==null?void 0:e.method)==="PUT"?"selected":""}>PUT</option>
                            <option value="DELETE" ${(e==null?void 0:e.method)==="DELETE"?"selected":""}>DELETE</option>
                            <option value="PATCH" ${(e==null?void 0:e.method)==="PATCH"?"selected":""}>PATCH</option>
                        </select>
                    </div>
                    
                    <div class="property-group">
                        <label>Headers (JSON)</label>
                        <textarea rows="3" data-property="config.headers" 
                                  data-type="json">${JSON.stringify((e==null?void 0:e.headers)||{},null,2)}</textarea>
                    </div>
                    
                    <div class="property-group">
                        <label>Body (JSON)</label>
                        <textarea rows="5" data-property="config.body" 
                                  data-type="json">${e!=null&&e.body?JSON.stringify(e.body,null,2):""}</textarea>
                    </div>
                `;break;case a.Variable:t+=`
                    <div class="property-group">
                        <label>Operation</label>
                        <select data-property="config.operation">
                            <option value="set" ${(e==null?void 0:e.operation)==="set"?"selected":""}>Set</option>
                            <option value="get" ${(e==null?void 0:e.operation)==="get"?"selected":""}>Get</option>
                            <option value="delete" ${(e==null?void 0:e.operation)==="delete"?"selected":""}>Delete</option>
                        </select>
                    </div>
                    
                    <div class="property-group">
                        <label>Variables (JSON)</label>
                        <textarea rows="5" data-property="config.variables" 
                                  data-type="json">${JSON.stringify((e==null?void 0:e.variables)||{},null,2)}</textarea>
                    </div>
                `;break;case a.Condition:t+=`
                    <div class="property-group">
                        <label>Expression</label>
                        <input type="text" data-property="config.expression" 
                               value="${(e==null?void 0:e.expression)||""}">
                    </div>
                    
                    <div class="property-group">
                        <label>On True (Block ID)</label>
                        <input type="text" data-property="config.onTrue" 
                               value="${(e==null?void 0:e.onTrue)||""}">
                    </div>
                    
                    <div class="property-group">
                        <label>On False (Block ID)</label>
                        <input type="text" data-property="config.onFalse" 
                               value="${(e==null?void 0:e.onFalse)||""}">
                    </div>
                `;break;case a.Delay:t+=`
                    <div class="property-group">
                        <label>Delay (milliseconds)</label>
                        <input type="number" data-property="config.milliseconds" 
                               value="${(e==null?void 0:e.milliseconds)||1e3}">
                    </div>
                `;break;case a.Log:t+=`
                    <div class="property-group">
                        <label>Message</label>
                        <textarea rows="3" data-property="config.message">${(e==null?void 0:e.message)||""}</textarea>
                    </div>
                    
                    <div class="property-group">
                        <label>Level</label>
                        <select data-property="config.level">
                            <option value="info" ${(e==null?void 0:e.level)==="info"?"selected":""}>Info</option>
                            <option value="warning" ${(e==null?void 0:e.level)==="warning"?"selected":""}>Warning</option>
                            <option value="error" ${(e==null?void 0:e.level)==="error"?"selected":""}>Error</option>
                            <option value="debug" ${(e==null?void 0:e.level)==="debug"?"selected":""}>Debug</option>
                        </select>
                    </div>
                `;break;case a.End:t+=`
                    <div class="property-group">
                        <label>Outputs (JSON)</label>
                        <textarea rows="5" data-property="config.outputs" 
                                  data-type="json">${JSON.stringify((e==null?void 0:e.outputs)||{},null,2)}</textarea>
                    </div>
                `;break}return t+=`
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
        `,t}setupPropertyHandlers(){this.container.querySelectorAll("input[data-property], textarea[data-property], select[data-property]").forEach(e=>{e.addEventListener("change",n=>this.onPropertyChange(n)),(e.tagName==="INPUT"||e.tagName==="TEXTAREA")&&e.addEventListener("input",n=>this.onPropertyChange(n))})}onPropertyChange(t){if(!this.currentBlock)return;const e=t.target,n=e.dataset.property;if(!n)return;let i=e.value;if(e.dataset.type==="json")try{i=JSON.parse(i)}catch{console.warn("Invalid JSON:",i);return}e.type==="number"&&(i=parseInt(i,10)),this.emit("propertyChange",{blockId:this.currentBlock.id,property:n,value:i})}}class z extends y{constructor(t){super();s(this,"container");s(this,"templates",U);const e=document.getElementById(t);if(!e)throw new Error(`Container element '${t}' not found`);this.container=e,this.setupPalette()}setupPalette(){this.container.innerHTML=`
            <div class="palette-content">
                <h3>Blocks</h3>
                <div class="block-categories"></div>
            </div>
        `,this.renderBlocks()}renderBlocks(){const t=this.container.querySelector(".block-categories");if(!t)return;const e=new Map;this.templates.forEach(i=>{e.has(i.category)||e.set(i.category,[]),e.get(i.category).push(i)});let n="";e.forEach((i,c)=>{n+=`
                <div class="category">
                    <h4 class="category-title">${c}</h4>
                    <div class="category-blocks">
            `,i.forEach(p=>{n+=`
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
                `}),n+=`
                    </div>
                </div>
            `}),t.innerHTML=n,this.setupDragHandlers()}setupDragHandlers(){this.container.querySelectorAll(".block-template").forEach(e=>{e.addEventListener("dragstart",n=>this.onDragStart(n)),e.addEventListener("dragend",n=>this.onDragEnd(n))})}onDragStart(t){var i;const e=t.target,n=(i=e.closest(".block-template"))==null?void 0:i.getAttribute("data-block-type");n&&t.dataTransfer&&(t.dataTransfer.effectAllowed="copy",t.dataTransfer.setData("text/plain",n),e.classList.add("dragging"),this.emit("blockDragStart",n))}onDragEnd(t){t.target.classList.remove("dragging")}filterBlocks(t){const e=t.toLowerCase();this.container.querySelectorAll(".block-template").forEach(i=>{var h,g,H,A;const c=i,p=((g=(h=c.querySelector(".name"))==null?void 0:h.textContent)==null?void 0:g.toLowerCase())||"",u=((A=(H=c.querySelector(".description"))==null?void 0:H.textContent)==null?void 0:A.toLowerCase())||"";p.includes(e)||u.includes(e)?c.style.display="flex":c.style.display="none"})}addSearchInput(){const t=this.container.querySelector(".palette-content");if(!t)return;const e=document.createElement("div");e.className="search-container",e.innerHTML=`
            <input type="text" class="search-input" placeholder="Search blocks...">
        `;const n=t.querySelector("h3");n&&n.nextSibling&&t.insertBefore(e,n.nextSibling),e.querySelector(".search-input").addEventListener("input",c=>{this.filterBlocks(c.target.value)})}}class F{constructor(o){s(this,"container");s(this,"engine");s(this,"canvas");s(this,"propertyPanel");s(this,"blockPalette");s(this,"visualBlocks");s(this,"visualConnections");s(this,"selectedBlockId",null);const t=document.getElementById(o);if(!t)throw new Error(`Container element '${o}' not found`);this.container=t,this.engine=new k,this.visualBlocks=new Map,this.visualConnections=new Map,this.setupUI(),this.initializeDefaultWorkflow()}getSelectedBlockId(){return this.selectedBlockId}setupUI(){this.container.innerHTML=`
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
        `,this.blockPalette=new z("block-palette"),this.canvas=new J("canvas-container"),this.propertyPanel=new _("property-panel"),this.setupEventHandlers()}setupEventHandlers(){var o,t,e,n;(o=document.getElementById("import-btn"))==null||o.addEventListener("click",()=>this.importWorkflow()),(t=document.getElementById("export-btn"))==null||t.addEventListener("click",()=>this.exportWorkflow()),(e=document.getElementById("validate-btn"))==null||e.addEventListener("click",()=>this.validateWorkflow()),(n=document.getElementById("clear-btn"))==null||n.addEventListener("click",()=>this.clearWorkflow()),this.blockPalette.on("blockDragStart",i=>{window.__draggedBlockType=i}),this.canvas.on("drop",i=>{const c=window.__draggedBlockType;c&&(this.addBlock(c,i),delete window.__draggedBlockType)}),this.canvas.on("blockSelect",i=>{this.selectBlock(i)}),this.canvas.on("blockMove",i=>{this.moveBlock(i.blockId,i.position)}),this.canvas.on("connectionCreate",i=>{this.createConnection(i.source,i.target,i.type)}),this.propertyPanel.on("propertyChange",i=>{this.updateBlockProperty(i.blockId,i.property,i.value)})}initializeDefaultWorkflow(){const o=this.engine.createBlock(a.Start);o.name="Start",this.engine.addBlock(o),this.addVisualBlock(o,{x:100,y:200});const t=this.engine.createBlock(a.End);t.name="End",this.engine.addBlock(t),this.addVisualBlock(t,{x:500,y:200}),this.renderWorkflow()}addBlock(o,t){const e=this.engine.createBlock(o);e.name=this.getDefaultBlockName(o),this.engine.addBlock(e),this.addVisualBlock(e,t),this.renderWorkflow(),this.selectBlock(e.id)}addVisualBlock(o,t){const e={id:o.id,type:o.type,position:t,width:250,height:100,selected:!1};this.visualBlocks.set(o.id,e)}moveBlock(o,t){const e=this.visualBlocks.get(o);e&&(e.position=t,this.renderWorkflow())}selectBlock(o){if(this.visualBlocks.forEach(t=>t.selected=!1),o){const t=this.visualBlocks.get(o);if(t){t.selected=!0,this.selectedBlockId=o;const e=this.engine.getBlock(o);e&&this.propertyPanel.showBlock(e)}}else this.selectedBlockId=null,this.propertyPanel.clear();this.renderWorkflow()}createConnection(o,t,e){const n=this.engine.getBlock(o);if(n){e==="success"?n.onSuccess=t:e==="failure"?n.onFailure=t:n.onComplete=t;const i=`${o}-${t}-${e}`,c={id:i,source:o,target:t,type:e};this.visualConnections.set(i,c),this.renderWorkflow()}}updateBlockProperty(o,t,e){const n=this.engine.getBlock(o);if(n){if(t.startsWith("config.")){const i=t.substring(7);n.config[i]=e}else n[t]=e;this.renderWorkflow()}}importWorkflow(){const o=document.createElement("input");o.type="file",o.accept=".json",o.onchange=async t=>{var n;const e=(n=t.target.files)==null?void 0:n[0];if(e){const i=await e.text();try{this.engine.loadWorkflow(i),this.visualBlocks.clear(),this.visualConnections.clear(),this.positionBlocks(),this.createVisualConnections(),this.renderWorkflow(),alert("Workflow imported successfully")}catch(c){alert(`Failed to import workflow: ${c}`)}}},o.click()}exportWorkflow(){const o=this.engine.saveWorkflow(),t=new Blob([o],{type:"application/json"}),e=URL.createObjectURL(t),n=document.createElement("a");n.href=e,n.download=`${this.engine.getWorkflow().name||"workflow"}.json`,n.click(),URL.revokeObjectURL(e)}validateWorkflow(){const o=this.engine.validate();if(o.isValid)alert("Workflow is valid!");else{const t=`Validation failed:

Errors:
${o.errors.join(`
`)}

Warnings:
${o.warnings.join(`
`)}`;alert(t)}}clearWorkflow(){confirm("Are you sure you want to clear the workflow?")&&(this.engine=new k,this.visualBlocks.clear(),this.visualConnections.clear(),this.selectedBlockId=null,this.initializeDefaultWorkflow())}renderWorkflow(){const o=new Map;this.engine.getBlocks().forEach(t=>{o.set(t.id,t)}),this.canvas.setBlockData(o),this.canvas.render(this.visualBlocks,this.visualConnections)}positionBlocks(){const o=this.engine.getBlocks(),t=150;let e=100,n=100;o.forEach(i=>{this.addVisualBlock(i,{x:e,y:n}),e+=t,e>800&&(e=100,n+=t)})}createVisualConnections(){this.engine.getBlocks().forEach(t=>{if(t.onSuccess){const e=`${t.id}-${t.onSuccess}-success`;this.visualConnections.set(e,{id:e,source:t.id,target:t.onSuccess,type:"success"})}if(t.onFailure){const e=`${t.id}-${t.onFailure}-failure`;this.visualConnections.set(e,{id:e,source:t.id,target:t.onFailure,type:"failure"})}if(t.onComplete){const e=`${t.id}-${t.onComplete}-complete`;this.visualConnections.set(e,{id:e,source:t.id,target:t.onComplete,type:"complete"})}})}getDefaultBlockName(o){const t=o.toString();return t.charAt(0).toUpperCase()+t.slice(1).replace("-"," ")}}typeof document<"u"&&document.addEventListener("DOMContentLoaded",()=>{if(document.getElementById("designer-container"))try{const o=new F("designer-container");console.log("SiyeFlow Designer initialized"),window.siyeFlowDesigner=o}catch(o){console.error("Failed to initialize SiyeFlow Designer:",o)}}),l.BlockType=a,l.CollectBlock=V,l.CollectConfig=M,l.ConditionBlock=$,l.ConditionConfig=S,l.DelayBlock=x,l.DelayConfig=D,l.EndBlock=m,l.EndConfig=w,l.EvaluateBlock=q,l.EvaluateConfig=T,l.HttpRequestBlock=B,l.HttpRequestConfig=b,l.LogBlock=P,l.LogConfig=L,l.LoopBlock=N,l.LoopConfig=W,l.StartBlock=v,l.StartConfig=f,l.SubWorkflowBlock=R,l.SubWorkflowConfig=O,l.TryCatchBlock=j,l.TryCatchConfig=I,l.VariableBlock=E,l.VariableConfig=C,l.WorkflowBlock=d,l.WorkflowDesigner=F,l.WorkflowEngine=k,Object.defineProperty(l,Symbol.toStringTag,{value:"Module"})});
