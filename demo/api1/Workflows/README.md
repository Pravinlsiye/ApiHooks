# SiyeFlow Test Workflows - Port-Based Schema

**All workflows in this directory use the latest port-based connection schema.**

## Current Workflows (6 files)

### 🌟 Full Feature Demonstrations

**1. test-start-block-ports.json** ⭐ RECOMMENDED
- Complete demonstration of all features
- Profile system (Development/Production)
- Full port definitions on all blocks
- Port-based connections
- Multiple block types (Start, HTTP, Log, End)
- Shows one-to-many connections
- **Use for**: Full feature showcase

**2. test-port-connections.json**
- Pure port-based architecture
- Demonstrates connection patterns
- Type-specific ports
- **Use for**: Architecture reference

### 📋 Profile System Tests

**3. test-start-profiles.json**
- Multiple profiles (Development/Production/Testing)
- Profile selection and override system
- Port-based connections
- HTTP Request and Log blocks
- **Use for**: Profile feature testing

**4. test-profiles-real-api.json**
- External API (JSONPlaceholder)
- No local server needed
- Profile-based configuration
- **Use for**: Real API testing

### 📚 Educational Examples

**5. test-start-end-blocks.json**
- Basic workflow structure
- Start → Variable → End
- Simple port connections
- **Use for**: Learning basics

**6. api-local.json**
- OpenAPI specification reference
- Optional for local API testing
- **Use for**: API documentation

## Schema Features

All workflows include:
- ✅ **Profile Support** (Start blocks)
- ✅ **Input Port Definitions** (inputPorts array)
- ✅ **Output Port Definitions** (outputPorts array)
- ✅ **Port-Based Connections** (connections array)
- ✅ **Legacy onSuccess** (for current CLI compatibility)

## Running in Designer

```bash
cd src/siye-flow-designer
npm run dev
```

Then:
1. Open http://localhost:3000
2. Click **Import**
3. Select any workflow file
4. See port-based visualization

**Features You'll See:**
- Profile dropdown (Start blocks)
- Blue port tabs on blocks
- Smooth connection curves
- Type indicators (Aa, #, 0/1, etc.)
- Connection deletion (double-click input tab)

## Running in CLI

```bash
cd src/SiyeFlow.CLI

# Basic execution
dotnet run -- execute -w ../../demo/api1/Workflows/test-start-profiles.json

# With profile selection
dotnet run -- execute -w ../../demo/api1/Workflows/test-start-profiles.json --profile Production

# With value overrides
dotnet run -- execute -w ../../demo/api1/Workflows/test-start-profiles.json -p Development -i '{"timeout": 1000}'
```

**Note**: Current CLI uses `onSuccess/onFailure` for execution. Port-based execution coming in next milestone.

## Port-Based Schema Example

```json
{
  "blocks": [
    {
      "id": "start1",
      "type": "start",
      "config": {
        "profiles": [
          {
            "name": "Development",
            "inputs": {
              "apiUrl": { "type": "string", "value": "..." }
            }
          }
        ]
      },
      "connections": [
        {
          "fromBlock": "start1",
          "fromPort": "apiUrl",
          "toBlock": "http1",
          "toPort": "url"
        }
      ],
      "onSuccess": "http1"
    },
    {
      "id": "http1",
      "type": "http-request",
      "inputPorts": [
        { "name": "url", "type": "string", "required": true }
      ],
      "outputPorts": [
        { "name": "response", "type": "object" }
      ],
      "connections": [...]
    }
  ]
}
```

## Block Types with Ports

- ✅ **start** - Dual ports (input/output for each profile value)
- ✅ **http-request** - Input ports for config, output for response
- ✅ **variable** - Input/output ports for values
- ✅ **log** - Input ports for data
- ✅ **end** - Input ports for final values

## Architecture

**C# Models** (Single Source of Truth)
- Profile system
- PortDefinition class
- PortConnection class

**TypeScript** (Auto-Generated)
- Generated from C# via TypeGen
- Synchronized types

**Designer** (DOM-Based Positioning)
- Uses actual rendered tab positions
- Works with any block layout
- Scalable and flexible

## Migration Notes

**What Changed:**
- ❌ Removed 3 legacy workflows
- ✅ Updated 3 key workflows
- ✅ All remaining workflows use port schema
- ✅ Backward compatible (onSuccess kept)

**Benefits:**
- Unified schema across designer and CLI
- Clear data flow visualization
- Type-safe connections
- Future-proof architecture
