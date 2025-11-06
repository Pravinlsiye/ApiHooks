# Port-Based Execution Implementation Plan

## Goal
Update the CLI to execute workflows using the same port-based connection schema as the TypeScript designer.

## Current Status
✅ ExecutionContext updated with:
- `BlockOutputs` - Dictionary to track outputs by block/port
- `WorkflowInputs` - Dictionary for workflow input values

## Implementation Steps

### Step 1: Update Core Execution Loop (WorkflowExecutor.cs)

**Current:**
```csharp
while (!string.IsNullOrEmpty(currentBlockId))
{
    var block = GetBlock(currentBlockId);
    var result = await executor.ExecuteAsync(block, context);
    currentBlockId = result.Success ? block.OnSuccess : block.OnFailure;
}
```

**New:**
```csharp
var blocksToExecute = new Queue<string>();
blocksToExecute.Enqueue(startBlock.Id);

while (blocksToExecute.Any())
{
    var currentBlockId = blocksToExecute.Dequeue();
    if (executedBlocks.Contains(currentBlockId)) continue;
    
    var block = GetBlock(currentBlockId);
    
    // Prepare inputs from port connections
    var blockInputs = PrepareBlockInputs(block, context);
    
    // Execute block
    var result = await executor.ExecuteAsync(block, blockInputs, context);
    executedBlocks.Add(currentBlockId);
    
    // Store outputs by port
    StoreBlockOutputs(block, result.Outputs, context);
    
    // Queue next blocks from connections
    var nextBlocks = GetConnectedBlocks(block, workflow);
    foreach (var nextBlock in nextBlocks)
    {
        blocksToExecute.Enqueue(nextBlock);
    }
}
```

### Step 2: Add Helper Methods

**PrepareBlockInputs:**
```csharp
private Dictionary<string, object> PrepareBlockInputs(
    WorkflowBlock block,
    WorkflowDefinition workflow, 
    ExecutionContext context)
{
    var inputs = new Dictionary<string, object>();
    
    // Find all connections TO this block
    var incomingConnections = workflow.Blocks
        .SelectMany(b => (b.Connections ?? new()).Where(c => c.ToBlock == block.Id))
        .ToList();
    
    foreach (var connection in incomingConnections)
    {
        // Get value from source block's output port
        if (context.BlockOutputs.ContainsKey(connection.FromBlock))
        {
            var sourceOutputs = context.BlockOutputs[connection.FromBlock];
            if (sourceOutputs.ContainsKey(connection.FromPort))
            {
                // Map to target block's input port
                inputs[connection.ToPort] = sourceOutputs[connection.FromPort];
            }
        }
    }
    
    return inputs;
}
```

**StoreBlockOutputs:**
```csharp
private void StoreBlockOutputs(
    WorkflowBlock block,
    Dictionary<string, object> outputs,
    ExecutionContext context)
{
    if (!context.BlockOutputs.ContainsKey(block.Id))
    {
        context.BlockOutputs[block.Id] = new Dictionary<string, object>();
    }
    
    foreach (var output in outputs)
    {
        context.BlockOutputs[block.Id][output.Key] = output.Value;
        
        // Also store in global variables for compatibility
        context.Variables[output.Key] = output.Value;
    }
}
```

**GetConnectedBlocks:**
```csharp
private List<string> GetConnectedBlocks(
    WorkflowBlock block,
    WorkflowDefinition workflow)
{
    var nextBlocks = new List<string>();
    
    // Get blocks this block connects to via ports
    if (block.Connections != null)
    {
        nextBlocks.AddRange(block.Connections.Select(c => c.ToBlock).Distinct());
    }
    
    return nextBlocks;
}
```

### Step 3: Update Block Executors

**Each block executor needs to:**
1. Accept a `Dictionary<string, object> inputs` parameter
2. Return outputs keyed by port name
3. Handle port-mapped values

**Example - HttpRequestBlockExecutor:**
```csharp
// Current
var url = ReplaceVariables(config.Url, context);

// New
var url = inputs.ContainsKey("url") 
    ? inputs["url"].ToString() 
    : ReplaceVariables(config.Url, context);
```

### Step 4: Update Start Block

**StartBlockExecutor must:**
```csharp
// Return outputs keyed by profile input names
var outputs = new Dictionary<string, object>();

foreach (var input in effectiveInputs)
{
    outputs[input.Key] = input.Value; // Key matches port name
}

return new BlockExecutionResult
{
    Success = true,
    Outputs = outputs // Keyed by port names
};
```

### Step 5: Testing

**Test with:**
```bash
dotnet run -- execute -w test-start-block-ports.json
```

**Expected:**
- ✅ Workflow loads successfully
- ✅ Port connections are followed
- ✅ Blocks receive only connected port values
- ✅ Execution completes successfully

## Files to Modify

1. ✅ `Models/ExecutionModels.cs` - ExecutionContext updated
2. ⏳ `Services/WorkflowExecutor.cs` - Execution loop
3. ⏳ `Services/Blocks/StartBlockExecutor.cs` - Port-based outputs
4. ⏳ `Services/Blocks/HttpRequestBlockExecutor.cs` - Port-based inputs
5. ⏳ `Services/Blocks/VariableBlockExecutor.cs` - Port-based inputs/outputs
6. ⏳ `Services/Blocks/EndBlockExecutor.cs` - Port-based inputs
7. ⏳ Other block executors as needed

## Benefits

✅ **Unified Schema** - Same workflow file for CLI and designer
✅ **Data Isolation** - Blocks only see connected values
✅ **Type Safety** - Can validate port type compatibility
✅ **Visual Parity** - Execution matches visual flow
✅ **Cleaner** - No more global variable pollution

## Implementation Priority

**CRITICAL** - This is the foundation for:
- True data-flow execution
- Visual programming parity
- Type-safe workflows
- Better debugging

## Next Steps

1. Implement helper methods in WorkflowExecutor
2. Update main execution loop
3. Update StartBlockExecutor
4. Update HttpRequestBlockExecutor
5. Test with port-based workflows
6. Update remaining block executors
7. Remove onSuccess/onFailure reliance

Estimated Time: 2-4 hours of focused development

