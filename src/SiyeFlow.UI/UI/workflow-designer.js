// SiyeFlow Workflow Designer
const config = window.SiyeFlowConfig || {
    routePrefix: 'siyeflow',
    theme: 'light'
};

// State
let endpoints = [];
let workflow = {
    name: '',
    description: '',
    variables: {},
    steps: []
};
let selectedBlock = null;
let connecting = false;
let connectionStart = null;
let blocks = new Map();
let connections = [];
let nextStepNumber = 1;
let zoom = 1;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('SiyeFlow Designer loaded with config:', config);
    loadApiEndpoints();
    setupEventListeners();
    initializeCanvas();
});

// Load API endpoints from OpenAPI/Swagger
async function loadApiEndpoints() {
    try {
        // Try to load from swagger endpoint - go up from workflows path
        const basePath = window.location.pathname.includes(config.routePrefix) 
            ? window.location.pathname.substring(0, window.location.pathname.indexOf(config.routePrefix) - 1)
            : '';
        const swaggerUrl = `${basePath}/swagger/v1/swagger.json`;
        
        console.log('Loading endpoints from:', swaggerUrl);
        const response = await fetch(swaggerUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const openApiDoc = await response.json();
        console.log('OpenAPI document loaded:', openApiDoc);
        
        endpoints = parseOpenApiEndpoints(openApiDoc);
        renderEndpoints(endpoints);
    } catch (error) {
        console.error('Failed to load API endpoints:', error);
        document.getElementById('endpointsList').innerHTML = 
            '<div class="error">Failed to load API endpoints</div>';
    }
}

// Parse OpenAPI document to extract endpoints
function parseOpenApiEndpoints(doc) {
    const endpointList = [];
    const servers = doc.servers || [{ url: '' }];
    const baseUrl = servers[0].url;
    
    for (const [path, pathItem] of Object.entries(doc.paths || {})) {
        for (const [method, operation] of Object.entries(pathItem)) {
            if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
                endpointList.push({
                    path,
                    method: method.toUpperCase(),
                    operationId: operation.operationId,
                    summary: operation.summary || `${method.toUpperCase()} ${path}`,
                    description: operation.description,
                    parameters: operation.parameters || [],
                    requestBody: operation.requestBody,
                    responses: operation.responses,
                    tags: operation.tags || []
                });
            }
        }
    }
    
    return endpointList;
}

// Render endpoints in sidebar
function renderEndpoints(endpointList) {
    const container = document.getElementById('endpointsList');
    container.innerHTML = '';
    
    if (endpointList.length === 0) {
        container.innerHTML = '<div class="empty-state">No endpoints found. Make sure Swagger is configured in your API.</div>';
        // Add some default endpoints for testing
        addDefaultEndpoints();
        return;
    }
    
    // Group by tags or paths
    const grouped = groupEndpointsByTag(endpointList);
    
    for (const [tag, endpoints] of Object.entries(grouped)) {
        const group = document.createElement('div');
        group.className = 'endpoint-group';
        
        const header = document.createElement('h3');
        header.textContent = tag;
        group.appendChild(header);
        
        endpoints.forEach(endpoint => {
            const item = createEndpointItem(endpoint);
            group.appendChild(item);
        });
        
        container.appendChild(group);
    }
}

// Add default endpoints for testing
function addDefaultEndpoints() {
    // Define some sample endpoints to show UI functionality
    const sampleEndpoints = [
        {
            path: '/api/projects',
            method: 'GET',
            operationId: 'listProjects',
            summary: 'List all projects',
            tags: ['Projects']
        },
        {
            path: '/api/projects/{id}',
            method: 'GET',
            operationId: 'getProject',
            summary: 'Get project by ID',
            tags: ['Projects'],
            parameters: [{
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string', format: 'uuid' }
            }]
        },
        {
            path: '/api/projects',
            method: 'POST',
            operationId: 'createProject',
            summary: 'Create a new project',
            tags: ['Projects'],
            requestBody: true
        },
        {
            path: '/api/projects/{id}',
            method: 'PUT',
            operationId: 'updateProject',
            summary: 'Update project',
            tags: ['Projects'],
            parameters: [{
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string', format: 'uuid' }
            }]
        },
        {
            path: '/api/projects/{id}',
            method: 'DELETE',
            operationId: 'deleteProject',
            summary: 'Delete project',
            tags: ['Projects'],
            parameters: [{
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string', format: 'uuid' }
            }]
        },
        {
            path: '/api/projects/{projectId}/jobs',
            method: 'GET',
            operationId: 'listJobs',
            summary: 'List all jobs for a project',
            tags: ['Jobs'],
            parameters: [{
                name: 'projectId',
                in: 'path',
                required: true,
                schema: { type: 'string', format: 'uuid' }
            }]
        },
        {
            path: '/api/projects/{projectId}/jobs',
            method: 'POST',
            operationId: 'createJob',
            summary: 'Create a new job',
            tags: ['Jobs'],
            parameters: [{
                name: 'projectId',
                in: 'path',
                required: true,
                schema: { type: 'string', format: 'uuid' }
            }],
            requestBody: true
        },
        {
            path: '/api/projects/{projectId}/jobs/{jobId}',
            method: 'PUT',
            operationId: 'updateJob',
            summary: 'Update job',
            tags: ['Jobs'],
            parameters: [{
                name: 'projectId',
                in: 'path',
                required: true,
                schema: { type: 'string', format: 'uuid' }
            }, {
                name: 'jobId',
                in: 'path',
                required: true,
                schema: { type: 'string', format: 'uuid' }
            }]
        }
    ];
    
    endpoints = sampleEndpoints;
    renderEndpoints(endpoints);
}

// Group endpoints by tag
function groupEndpointsByTag(endpointList) {
    const grouped = {};
    
    endpointList.forEach(endpoint => {
        const tag = endpoint.tags[0] || 'Other';
        if (!grouped[tag]) {
            grouped[tag] = [];
        }
        grouped[tag].push(endpoint);
    });
    
    return grouped;
}

// Create endpoint item element
function createEndpointItem(endpoint) {
    const item = document.createElement('div');
    item.className = 'endpoint-item';
    item.draggable = true;
    
    const method = document.createElement('span');
    method.className = `method ${endpoint.method.toLowerCase()}`;
    method.textContent = endpoint.method;
    
    const path = document.createElement('span');
    path.className = 'path';
    path.textContent = endpoint.path;
    
    const summary = document.createElement('div');
    summary.className = 'summary';
    summary.textContent = endpoint.summary;
    
    item.appendChild(method);
    item.appendChild(path);
    item.appendChild(summary);
    
    // Drag event handlers
    item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('endpoint', JSON.stringify(endpoint));
    });
    
    // Click to add
    item.addEventListener('click', () => {
        addEndpointToCanvas(endpoint);
    });
    
    return item;
}

// Setup event listeners
function setupEventListeners() {
    // Header buttons
    document.getElementById('newWorkflowBtn').addEventListener('click', newWorkflow);
    document.getElementById('saveWorkflowBtn').addEventListener('click', saveWorkflow);
    document.getElementById('loadWorkflowBtn').addEventListener('click', loadWorkflow);
    
    // Canvas
    const canvas = document.getElementById('canvasContent');
    canvas.addEventListener('dragover', handleDragOver);
    canvas.addEventListener('drop', handleDrop);
    
    // Zoom controls
    document.getElementById('zoomInBtn').addEventListener('click', () => setZoom(zoom + 0.1));
    document.getElementById('zoomOutBtn').addEventListener('click', () => setZoom(zoom - 0.1));
    document.getElementById('zoomResetBtn').addEventListener('click', () => setZoom(1));
    document.getElementById('autoLayoutBtn').addEventListener('click', autoLayout);
    
    // Properties
    document.getElementById('workflowName').addEventListener('input', updateWorkflowInfo);
    document.getElementById('workflowDescription').addEventListener('input', updateWorkflowInfo);
    document.getElementById('addVariableBtn').addEventListener('click', addVariable);
    
    // Search
    document.getElementById('endpointSearch').addEventListener('input', filterEndpoints);
    
    // File input
    document.getElementById('fileInput').addEventListener('change', handleFileSelect);
}

// Initialize canvas
function initializeCanvas() {
    // Add start and end nodes
    addSpecialBlock('start', 'START', 200, 100);
    addSpecialBlock('end', 'END', 200, 500);
    
    // Cancel connection on canvas click
    const canvas = document.getElementById('canvasContent');
    canvas.addEventListener('pointerdown', (e) => {
        if (e.target === canvas && connecting) {
            console.log('Canvas clicked, cancelling connection');
            cancelConnection();
        }
    });
}

// Add special block (start/end)
function addSpecialBlock(id, label, x, y) {
    const block = document.createElement('div');
    block.className = `workflow-block ${id}`;
    block.id = `block-${id}`;
    block.style.left = x + 'px';
    block.style.top = y + 'px';
    if (id === 'start') {
        block.innerHTML = `
            <div class="block-content">
                <div class="block-label">${label}</div>
            </div>
            <div class="connection-port port-out" data-block="${id}" data-port="output"></div>
        `;
    } else {
        block.innerHTML = `
            <div class="block-content">
                <div class="block-label">${label}</div>
            </div>
            <div class="connection-port port-in" data-block="${id}" data-port="input"></div>
        `;
    }
    
    document.getElementById('blocksContainer').appendChild(block);
    blocks.set(id, { element: block, type: id, x, y });
    makeBlockDraggable(block);
    
    // Setup connection events for special blocks
    const outPort = block.querySelector('.connection-port.port-out');
    const inPort = block.querySelector('.connection-port.port-in');
    
    if (outPort) {
        outPort.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const portType = outPort.getAttribute('data-port');
            console.log('Special block output port clicked:', id, 'Port:', portType);
            startConnection(id, portType);
        });
    }
    
    if (inPort) {
        inPort.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const portType = inPort.getAttribute('data-port');
            console.log('Special block input port clicked:', id, 'Port:', portType, 'Connecting:', connecting);
            if (connecting && connectionStart) {
                completeConnection(id, portType);
            }
        });
    }
}

// Get icon for HTTP method
function getMethodIcon(method) {
    const icons = {
        GET: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>',
        POST: '<path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>',
        PUT: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>',
        DELETE: '<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>',
        PATCH: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>'
    };
    return icons[method] || icons.GET;
}

// Switch between Input and Output tabs
window.switchTab = function(stepId, tab) {
    const block = document.getElementById(`block-${stepId}`);
    if (!block) return;
    
    // Update tab active state
    block.querySelectorAll('.block-tab').forEach(t => {
        t.classList.toggle('active', t.getAttribute('data-tab') === tab);
    });
    
    // TODO: Show/hide tab content when we implement it
}

// Add endpoint to canvas
function addEndpointToCanvas(endpoint, x = 400, y = 250) {
    const stepId = `step-${nextStepNumber++}`;
    const block = document.createElement('div');
    block.className = 'workflow-block step';
    block.id = `block-${stepId}`;
    block.style.left = x + 'px';
    block.style.top = y + 'px';
    block.innerHTML = `
        <div class="block-header">
            <div class="block-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    ${getMethodIcon(endpoint.method)}
                </svg>
            </div>
            <div class="block-info">
                <div class="block-name" contenteditable="true">${endpoint.summary || `${endpoint.method} Request`}</div>
                <div class="block-subtitle">
                    <span class="method-badge ${endpoint.method.toLowerCase()}">${endpoint.method}</span>
                    <span class="block-path">${endpoint.path}</span>
                </div>
            </div>
            <button class="block-remove" onclick="removeBlock('${stepId}')">×</button>
        </div>
        <div class="block-tabs">
            <button class="block-tab active" data-tab="input" onclick="switchTab('${stepId}', 'input')">Input</button>
            <button class="block-tab" data-tab="output" onclick="switchTab('${stepId}', 'output')">Output</button>
        </div>
        <div class="connection-ports">
            <div class="connection-port port-in input" data-block="${stepId}" data-port="input"></div>
            <div class="connection-ports-out">
                <div class="connection-port port-out output success" data-block="${stepId}" data-port="success">
                    <span class="port-label">✓</span>
                </div>
                <div class="connection-port port-out output failure" data-block="${stepId}" data-port="failure">
                    <span class="port-label">✗</span>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('blocksContainer').appendChild(block);
    blocks.set(stepId, { 
        element: block, 
        type: 'step',
        endpoint: endpoint,
        x, y,
        data: {
            id: stepId,
            name: `Step ${nextStepNumber - 1}`,
            description: endpoint.summary,
            method: endpoint.method,
            path: endpoint.path,
            operationId: endpoint.operationId,
            headers: {},
            parameters: {},
            body: null,
            extractVariables: {}
        }
    });
    
    makeBlockDraggable(block);
    setupBlockEvents(block, stepId);
    
    // Enable save button
    document.getElementById('saveWorkflowBtn').disabled = false;
}

// Make block draggable
function makeBlockDraggable(block) {
    let isDragging = false;
    let startX, startY, initialX, initialY;
    let hasMoved = false;
    
    block.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('connection-port') || 
            e.target.classList.contains('block-remove') ||
            e.target.contentEditable === 'true') {
            return;
        }
        
        isDragging = true;
        hasMoved = false;
        startX = e.clientX;
        startY = e.clientY;
        initialX = parseInt(block.style.left);
        initialY = parseInt(block.style.top);
        block.style.zIndex = 1000;
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        hasMoved = true;
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        block.style.left = (initialX + deltaX / zoom) + 'px';
        block.style.top = (initialY + deltaY / zoom) + 'px';
        
        updateConnections();
    });
    
    document.addEventListener('mouseup', () => {
        isDragging = false;
        block.style.zIndex = '';
    });
}

// Setup block events
function setupBlockEvents(block, stepId) {
    // Click to select
    block.addEventListener('click', () => selectBlock(stepId));
    
    // Edit name
    const nameElement = block.querySelector('.block-name');
    nameElement.addEventListener('blur', () => {
        const blockData = blocks.get(stepId);
        if (blockData) {
            blockData.data.name = nameElement.textContent;
        }
    });
    
    // Connection ports
    const ports = block.querySelectorAll('.connection-port');
    
    ports.forEach(port => {
        port.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            const portType = port.getAttribute('data-port');
            
            if (port.classList.contains('input')) {
                // Input port - complete connection
                console.log('Input port clicked:', stepId, 'Connecting:', connecting);
                if (connecting && connectionStart) {
                    completeConnection(stepId, portType);
                }
            } else {
                // Output port - start connection
                console.log('Output port clicked:', stepId, 'Port:', portType);
                startConnection(stepId, portType);
            }
        });
    });
}

// Select block
function selectBlock(blockId) {
    // Update selection
    document.querySelectorAll('.workflow-block').forEach(b => b.classList.remove('selected'));
    const block = document.getElementById(`block-${blockId}`);
    block.classList.add('selected');
    selectedBlock = blockId;
    
    // Show properties
    showBlockProperties(blockId);
}

// Show block properties
function showBlockProperties(blockId) {
    const blockData = blocks.get(blockId);
    if (!blockData || blockData.type !== 'step') {
        document.getElementById('stepProperties').innerHTML = 
            '<p class="empty-state">Select a step to edit properties</p>';
        return;
    }
    
    const data = blockData.data;
    const endpoint = blockData.endpoint;
    
    const html = `
        <div class="property-group">
            <label>Step ID</label>
            <input type="text" value="${data.id}" readonly>
        </div>
        <div class="property-group">
            <label>Name</label>
            <input type="text" id="stepName" value="${data.name}" placeholder="Step name">
        </div>
        <div class="property-group">
            <label>Description</label>
            <textarea id="stepDescription" placeholder="Step description">${data.description || ''}</textarea>
        </div>
        
        <h3>Parameters</h3>
        ${renderParameters(endpoint.parameters || [])}
        
        ${endpoint.requestBody ? `
        <h3>Request Body</h3>
        <div class="property-group">
            <label>Body (JSON)</label>
            <textarea id="stepBody" placeholder='{"key": "value"}'>${data.body ? JSON.stringify(data.body, null, 2) : ''}</textarea>
        </div>
        ` : ''}
        
        <h3>Headers</h3>
        <div id="headersSection">
            <button class="btn btn-sm" onclick="addHeader()">+ Add Header</button>
            <div id="headersList"></div>
        </div>
        
        <h3>Extract Variables</h3>
        <div id="extractSection">
            <button class="btn btn-sm" onclick="addExtractVariable()">+ Extract Variable</button>
            <div id="extractList"></div>
        </div>
    `;
    
    document.getElementById('stepProperties').innerHTML = html;
    
    // Setup property listeners
    document.getElementById('stepName').addEventListener('input', (e) => {
        data.name = e.target.value;
        document.querySelector(`#block-${blockId} .block-name`).textContent = e.target.value;
    });
    
    document.getElementById('stepDescription').addEventListener('input', (e) => {
        data.description = e.target.value;
    });
    
    if (document.getElementById('stepBody')) {
        document.getElementById('stepBody').addEventListener('input', (e) => {
            try {
                data.body = JSON.parse(e.target.value);
            } catch (err) {
                // Invalid JSON, keep as string for now
            }
        });
    }
}

// Render parameters
function renderParameters(parameters) {
    if (parameters.length === 0) return '<p class="empty-state">No parameters</p>';
    
    return parameters.map(param => `
        <div class="property-group">
            <label>${param.name} ${param.required ? '*' : ''} (${param.in})</label>
            <input type="text" 
                   id="param-${param.name}" 
                   placeholder="${param.schema?.type || 'string'}"
                   data-param="${param.name}">
            <small>${param.description || ''}</small>
        </div>
    `).join('');
}

// Connection handling
function startConnection(blockId, port) {
    console.log('Starting connection from:', blockId, 'Port:', port);
    connecting = true;
    connectionStart = { blockId, port };
    document.getElementById('canvasContent').classList.add('connecting');
    
    // Add visual feedback
    document.querySelectorAll('.connection-port').forEach(p => {
        p.classList.remove('active', 'target');
    });
    
    // Find the specific port that was clicked
    const startPort = document.querySelector(`[data-block="${blockId}"][data-port="${port}"]`);
    if (startPort) {
        startPort.classList.add('active');
    }
}

function completeConnection(blockId, port) {
    if (!connecting || !connectionStart) return;
    
    // Can't connect to self
    if (connectionStart.blockId === blockId) {
        cancelConnection();
        return;
    }
    
    // Add connection with port information
    connections.push({
        from: connectionStart.blockId,
        fromPort: connectionStart.port,
        to: blockId,
        toPort: port
    });
    
    console.log('Connection created:', {
        from: connectionStart.blockId,
        fromPort: connectionStart.port,
        to: blockId,
        toPort: port
    });
    
    drawConnections();
    cancelConnection();
}

function cancelConnection() {
    connecting = false;
    connectionStart = null;
    document.getElementById('canvasContent').classList.remove('connecting');
}

// Draw connections
function drawConnections() {
    const svg = document.getElementById('connectionsSvg');
    const canvas = document.getElementById('canvasContent');
    svg.innerHTML = '';
    
    console.log('Drawing connections:', connections.length);
    
    // Set SVG dimensions to match canvas
    svg.setAttribute('width', canvas.scrollWidth);
    svg.setAttribute('height', canvas.scrollHeight);
    svg.setAttribute('viewBox', `0 0 ${canvas.scrollWidth} ${canvas.scrollHeight}`);
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    
    connections.forEach(conn => {
        const fromBlock = blocks.get(conn.from);
        const toBlock = blocks.get(conn.to);
        
        if (!fromBlock || !toBlock) {
            console.warn('Block not found:', conn);
            return;
        }
        
        const fromEl = fromBlock.element;
        const toEl = toBlock.element;
        
        // Find the specific ports
        const fromPort = fromEl.querySelector(`[data-port="${conn.fromPort || 'out'}"]`);
        const toPort = toEl.querySelector(`[data-port="${conn.toPort || 'input'}"]`);
        
        if (!fromPort || !toPort) {
            console.warn('Port not found:', conn);
            return;
        }
        
        // Calculate port positions relative to canvas
        const fromRect = fromPort.getBoundingClientRect();
        const toRect = toPort.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        
        const x1 = fromRect.left - canvasRect.left + fromRect.width / 2 + canvas.scrollLeft;
        const y1 = fromRect.top - canvasRect.top + fromRect.height / 2 + canvas.scrollTop;
        const x2 = toRect.left - canvasRect.left + toRect.width / 2 + canvas.scrollLeft;
        const y2 = toRect.top - canvasRect.top + toRect.height / 2 + canvas.scrollTop;
        
        console.log(`Connection from ${conn.from} (${conn.fromPort}) to ${conn.to} (${conn.toPort}):`, {x1, y1, x2, y2});
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const d = `M ${x1} ${y1} C ${x1} ${y1 + 50}, ${x2} ${y2 - 50}, ${x2} ${y2}`;
        path.setAttribute('d', d);
        
        // Add classes based on connection type
        let pathClass = 'connection-path';
        if (conn.type === 'success' || conn.fromPort === 'success') {
            pathClass += ' success-path';
        } else if (conn.type === 'failure' || conn.fromPort === 'failure') {
            pathClass += ' failure-path';
        }
        
        path.setAttribute('class', pathClass);
        path.setAttribute('data-from', conn.from);
        path.setAttribute('data-to', conn.to);
        path.setAttribute('data-from-port', conn.fromPort || 'out');
        path.setAttribute('data-to-port', conn.toPort || 'input');
        
        svg.appendChild(path);
    });
}

// Update connections when blocks move
function updateConnections() {
    drawConnections();
}

// Remove block
window.removeBlock = function(blockId) {
    const block = document.getElementById(`block-${blockId}`);
    if (block) {
        block.remove();
        blocks.delete(blockId);
        
        // Remove connections
        connections = connections.filter(conn => 
            conn.from !== blockId && conn.to !== blockId
        );
        
        drawConnections();
        
        if (selectedBlock === blockId) {
            selectedBlock = null;
            document.getElementById('stepProperties').innerHTML = 
                '<p class="empty-state">Select a step to edit properties</p>';
        }
    }
}

// Workflow management
function newWorkflow() {
    if (confirm('Create a new workflow? Unsaved changes will be lost.')) {
        location.reload();
    }
}

function saveWorkflow() {
    // Update workflow info
    workflow.name = document.getElementById('workflowName').value || 'Untitled Workflow';
    workflow.description = document.getElementById('workflowDescription').value || '';
    
    // Build steps from blocks
    workflow.steps = [];
    const stepBlocks = Array.from(blocks.entries())
        .filter(([id, data]) => data.type === 'step')
        .sort((a, b) => {
            // Sort by Y position to maintain visual order
            return a[1].element.style.top - b[1].element.style.top;
        });
    
    stepBlocks.forEach(([id, blockData]) => {
        const step = { ...blockData.data };
        
        // Add connection info
        const nextConnection = connections.find(c => c.from === id);
        if (nextConnection && nextConnection.to !== 'end') {
            step.next = nextConnection.to;
        }
        
        workflow.steps.push(step);
    });
    
    // Download as JSON
    const json = JSON.stringify(workflow, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflow.name.replace(/\s+/g, '-').toLowerCase()}.flow.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function loadWorkflow() {
    document.getElementById('fileInput').click();
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const json = JSON.parse(event.target.result);
            loadWorkflowData(json);
        } catch (err) {
            alert('Invalid workflow file');
        }
    };
    reader.readAsText(file);
}

function loadWorkflowData(data) {
    // Clear current workflow
    document.getElementById('blocksContainer').innerHTML = '';
    blocks.clear();
    connections = [];
    
    // Load workflow info
    workflow = data;
    document.getElementById('workflowName').value = data.name || '';
    document.getElementById('workflowDescription').value = data.description || '';
    
    // Detect schema version (V1 has 'steps', new schema has 'blocks')
    if (data.blocks && Array.isArray(data.blocks)) {
        // New block-based schema
        loadBlockBasedWorkflow(data);
    } else if (data.steps && Array.isArray(data.steps)) {
        // Legacy V1 schema
        loadLegacyWorkflow(data);
    } else {
        alert('Invalid workflow format. Expected either "blocks" or "steps" array.');
    }
    
    drawConnections();
}

function loadBlockBasedWorkflow(data) {
    // Initialize canvas with start/end blocks
    initializeCanvas();
    
    // Keep track of block positions
    let currentY = 150;
    const blockSpacing = 120;
    const blockMap = {};
    
    // Process each block
    data.blocks.forEach((block, index) => {
        let visualBlock = null;
        const x = 400;
        const y = currentY + (index * blockSpacing);
        
        switch (block.type) {
            case 'start':
                // Start block is already created by initializeCanvas
                blockMap[block.id] = 'start';
                // Update start block position if needed
                const startBlock = document.getElementById('block-start');
                if (startBlock && index === 0) {
                    startBlock.style.top = y + 'px';
                }
                break;
                
            case 'end':
                // End block is already created by initializeCanvas
                blockMap[block.id] = 'end';
                // Update end block position if needed
                const endBlock = document.getElementById('block-end');
                if (endBlock) {
                    endBlock.style.top = (currentY + ((data.blocks.length - 1) * blockSpacing)) + 'px';
                }
                break;
                
            case 'http-request':
                // Create HTTP request block
                const endpoint = {
                    method: block.config?.method || 'GET',
                    path: block.config?.url || block.config?.path || '',
                    summary: block.description || block.name || 'HTTP Request',
                    operationId: block.id
                };
                // Store the current step number before it gets incremented
                const currentStepNum = nextStepNumber;
                addEndpointToCanvas(endpoint, x, y);
                const httpBlockId = `step-${currentStepNum}`;
                blockMap[block.id] = httpBlockId;
                
                // Update the block data with the original block info
                const blockData = blocks.get(httpBlockId);
                if (blockData) {
                    blockData.data = { ...blockData.data, ...block };
                }
                
                console.log('Created HTTP block:', block.id, '->', httpBlockId);
                break;
                
            default:
                // Create generic block for other types
                createGenericBlock(block, x, y);
                blockMap[block.id] = `block-${block.id}`;
                break;
        }
    });
    
    // Create connections based on onSuccess/onFailure
    console.log('Block map:', blockMap);
    data.blocks.forEach(block => {
        const fromId = blockMap[block.id];
        if (!fromId) {
            console.log('No fromId for block:', block.id);
            return;
        }
        
        // Handle onSuccess
        if (block.onSuccess) {
            const toId = blockMap[block.onSuccess];
            if (toId) {
                const connection = {
                    from: fromId,
                    to: toId,
                    fromPort: block.type === 'start' ? 'output' : 'success',
                    toPort: 'input',
                    type: 'success'
                };
                connections.push(connection);
                console.log('Created connection:', connection);
            } else {
                console.log('No toId for onSuccess:', block.onSuccess);
            }
        }
        
        // Handle onFailure
        if (block.onFailure) {
            const toId = blockMap[block.onFailure];
            if (toId) {
                const connection = {
                    from: fromId,
                    to: toId,
                    fromPort: 'failure',
                    toPort: 'input',
                    type: 'failure'
                };
                connections.push(connection);
                console.log('Created failure connection:', connection);
            } else {
                console.log('No toId for onFailure:', block.onFailure);
            }
        }
    });
}

function createGenericBlock(block, x, y) {
    const blockElement = document.createElement('div');
    blockElement.className = 'workflow-block';
    blockElement.id = `block-${block.id}`;
    blockElement.style.left = `${x}px`;
    blockElement.style.top = `${y}px`;
    
    // Choose icon based on block type
    const icon = getBlockIcon(block.type);
    const color = getBlockColor(block.type);
    
    blockElement.innerHTML = `
        <div class="block-header" style="background: ${color}">
            <span class="block-icon">${icon}</span>
            <span class="block-title">${block.name || block.type}</span>
        </div>
        <div class="block-content">
            <div class="block-type">${block.type}</div>
            ${block.description ? `<div class="block-summary">${block.description}</div>` : ''}
        </div>
        <div class="connection-ports">
            <div class="connection-port input" data-block-id="block-${block.id}" data-port="input"></div>
            ${block.type !== 'end' ? `
                <div class="connection-port output success" data-block-id="block-${block.id}" data-port="success"></div>
                ${hasFailurePort(block.type) ? `
                    <div class="connection-port output failure" data-block-id="block-${block.id}" data-port="failure"></div>
                ` : ''}
            ` : ''}
        </div>
    `;
    
    document.getElementById('blocksContainer').appendChild(blockElement);
    makeBlockDraggable(blockElement);
    
    // Store block data
    blocks.set(`block-${block.id}`, {
        element: blockElement,
        data: block
    });
    
    // Add connection port event handlers
    const ports = blockElement.querySelectorAll('.connection-port');
    ports.forEach(port => {
        port.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            const blockId = port.getAttribute('data-block-id');
            const portType = port.getAttribute('data-port');
            
            if (port.classList.contains('input')) {
                // Input port - complete connection
                if (connecting && connectionStart) {
                    completeConnection(blockId, portType);
                }
            } else {
                // Output port - start connection
                startConnection(blockId, portType);
            }
        });
    });
}

function getBlockIcon(type) {
    const icons = {
        'variable': '📝',
        'log': '📋',
        'delay': '⏱️',
        'condition': '❓',
        'loop': '🔁',
        'evaluate': '🧮',
        'try-catch': '🛡️',
        'collect': '📦',
        'workflow': '📂'
    };
    return icons[type] || '📦';
}

function getBlockColor(type) {
    const colors = {
        'variable': '#9b59b6',
        'log': '#95a5a6',
        'delay': '#f39c12',
        'condition': '#e74c3c',
        'loop': '#3498db',
        'evaluate': '#16a085',
        'try-catch': '#e67e22',
        'collect': '#8e44ad',
        'workflow': '#2c3e50'
    };
    return colors[type] || '#7f8c8d';
}

function hasFailurePort(type) {
    return ['http-request', 'evaluate', 'condition', 'try-catch'].includes(type);
}

function loadLegacyWorkflow(data) {
    // Existing V1 loading logic
    initializeCanvas();
    
    // Load variables
    if (data.variables) {
        Object.entries(data.variables).forEach(([key, value]) => {
            addVariable(key, value);
        });
    }
    
    // Create a map to store step IDs to block IDs
    const stepToBlockMap = {};
    
    // Load steps
    data.steps.forEach((step, index) => {
        const y = 200 + (index * 120);
        
        // Find matching endpoint by operationId
        let endpoint = endpoints.find(e => e.operationId === step.operationId);
        
        // If not found by operationId, try by method and path
        if (!endpoint && step.method && step.path) {
            endpoint = endpoints.find(e => 
                e.method === step.method.toUpperCase() && e.path === step.path
            );
        }
        
        // Create a proper endpoint object with correct method
        if (!endpoint) {
            // If still not found, create from step data
            endpoint = {
                method: step.method || 'GET',
                path: step.path || '',
                summary: step.description || step.name || '',
                operationId: step.operationId || ''
            };
        }
        
        addEndpointToCanvas(endpoint, 400, y);
        
        // Update the block with step data
        const blockId = `step-${nextStepNumber - 1}`;
        stepToBlockMap[step.id] = blockId;
        
        const blockData = blocks.get(blockId);
        if (blockData) {
            blockData.data = { ...step, id: blockId, originalStepId: step.id };
            document.querySelector(`#block-${blockId} .block-name`).textContent = step.name || step.description || '';
        }
    });
    
    // Recreate connections based on workflow step logic
    connections = [];
    
    // Connect start to first step if exists
    if (data.steps.length > 0) {
        const firstStepId = stepToBlockMap[data.steps[0].id];
        connections.push({ 
            from: 'start', 
            to: firstStepId, 
            fromPort: 'output',
            toPort: 'input'
        });
    }
    
    // Create connections based on step onSuccess/onFailure
    data.steps.forEach(step => {
        const fromBlockId = stepToBlockMap[step.id];
        
        // Handle onSuccess
        if (step.onSuccess) {
            if (step.onSuccess.goto) {
                const toBlockId = stepToBlockMap[step.onSuccess.goto];
                if (toBlockId) {
                    connections.push({ 
                        from: fromBlockId, 
                        to: toBlockId,
                        fromPort: 'success',
                        toPort: 'input',
                        type: 'success'
                    });
                }
            } else if (step.onSuccess.stop) {
                connections.push({ 
                    from: fromBlockId, 
                    to: 'end',
                    fromPort: 'success',
                    toPort: 'input',
                    type: 'success'
                });
            }
        }
        
        // Handle onFailure
        if (step.onFailure) {
            if (step.onFailure.goto) {
                const toBlockId = stepToBlockMap[step.onFailure.goto];
                if (toBlockId) {
                    connections.push({ 
                        from: fromBlockId, 
                        to: toBlockId,
                        fromPort: 'failure',
                        toPort: 'input',
                        type: 'failure'
                    });
                }
            } else if (step.onFailure.stop) {
                connections.push({ 
                    from: fromBlockId, 
                    to: 'end',
                    fromPort: 'failure',
                    toPort: 'input',
                    type: 'failure'
                });
            }
        }
        
        // If no explicit success/failure, assume it goes to next step
        if (!step.onSuccess && !step.onFailure) {
            const currentIndex = data.steps.findIndex(s => s.id === step.id);
            if (currentIndex < data.steps.length - 1) {
                const nextStep = data.steps[currentIndex + 1];
                const toBlockId = stepToBlockMap[nextStep.id];
                connections.push({ 
                    from: fromBlockId, 
                    to: toBlockId,
                    fromPort: 'success',
                    toPort: 'input',
                    type: 'success'
                });
            } else {
                // Last step goes to end
                connections.push({ 
                    from: fromBlockId, 
                    to: 'end',
                    fromPort: 'success',
                    toPort: 'input',
                    type: 'success'
                });
            }
        }
    });
}

// Variable management
function addVariable(name = '', value = '') {
    const varId = `var-${Date.now()}`;
    const varDiv = document.createElement('div');
    varDiv.className = 'variable-item';
    varDiv.innerHTML = `
        <input type="text" placeholder="Variable name" value="${name}">
        <input type="text" placeholder="Value" value="${value}">
        <button onclick="removeVariable('${varId}')">×</button>
    `;
    varDiv.id = varId;
    
    document.getElementById('variablesList').appendChild(varDiv);
}

window.removeVariable = function(varId) {
    document.getElementById(varId).remove();
}

window.addHeader = function() {
    // TODO: Implement header addition
    alert('Header addition - coming soon!');
}

window.addExtractVariable = function() {
    // TODO: Implement variable extraction
    alert('Variable extraction - coming soon!');
}

// Utility functions
function updateWorkflowInfo() {
    workflow.name = document.getElementById('workflowName').value;
    workflow.description = document.getElementById('workflowDescription').value;
}

function filterEndpoints(e) {
    const searchTerm = e.target.value.toLowerCase();
    const items = document.querySelectorAll('.endpoint-item');
    
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function setZoom(newZoom) {
    zoom = Math.max(0.5, Math.min(2, newZoom));
    const canvas = document.getElementById('canvasContent');
    canvas.style.transform = `scale(${zoom})`;
    canvas.style.transformOrigin = 'center center';
    document.getElementById('zoomResetBtn').textContent = `${Math.round(zoom * 100)}%`;
}

function autoLayout() {
    // Simple vertical layout
    let y = 100;
    const x = 400;
    const spacing = 120;
    
    // Position start
    const startBlock = blocks.get('start');
    if (startBlock) {
        startBlock.element.style.left = x + 'px';
        startBlock.element.style.top = y + 'px';
        y += spacing;
    }
    
    // Position steps
    Array.from(blocks.entries())
        .filter(([id, data]) => data.type === 'step')
        .forEach(([id, data]) => {
            data.element.style.left = x + 'px';
            data.element.style.top = y + 'px';
            y += spacing;
        });
    
    // Position end
    const endBlock = blocks.get('end');
    if (endBlock) {
        endBlock.element.style.left = x + 'px';
        endBlock.element.style.top = y + 'px';
    }
    
    updateConnections();
}

// Drag and drop handlers
function handleDragOver(e) {
    e.preventDefault();
}

function handleDrop(e) {
    e.preventDefault();
    
    const endpointData = e.dataTransfer.getData('endpoint');
    if (endpointData) {
        const endpoint = JSON.parse(endpointData);
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / zoom;
        const y = (e.clientY - rect.top) / zoom;
        
        addEndpointToCanvas(endpoint, x, y);
    }
}
