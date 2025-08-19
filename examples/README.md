# Web Agent Memory Protocol (WAMP) Examples (Development)

> ⚠️ **Work In Progress**: These are experimental examples for the WAMP specification development.

This directory contains working examples demonstrating how to use the Web Agent Memory Protocol (WAMP) in different scenarios. Use these to understand the protocol design and experiment with implementations.

## 🌐 Client-Side Integration

Choose your integration approach:

### Native Implementation (Zero Dependencies)
- **[Native Client Example](./client/native/index.html)** - Direct `window.agentMemory` API usage
- **Use when**: You want zero dependencies and full control

### SDK Implementation (Enhanced Features)  
- **[SDK Client Example](./client/sdk/index.html)** - Full SDK integration with interactive demo
- **Use when**: You want additional features like mock mode, analytics, and UI helpers

## 🔧 Browser Extension Development

Choose your development approach:

### Native Implementation (Full Control)
- **[Native Extension Example](./extensions/native/)** - Manual implementation (~1,625 lines)
- Complete Chrome extension with background script and popup UI
- Demonstrates full WAMP specification from scratch
- **Use when**: Learning protocol internals or need maximum control

### SDK Implementation (Rapid Development)
- **[SDK Extension Example](./extensions/sdk/)** - Extension SDK implementation (~380 lines)
- Shows 10x code reduction using Extension SDK
- Focus on business logic, minimal boilerplate
- **Use when**: Quick development with built-in best practices

## Quick Examples

### 1. Zero-Dependency Integration

```javascript
// Check if any memory extension is available
if (window.agentMemory) {
  const result = await window.agentMemory.getContext({
    relevanceQuery: 'AI development',
    timeRange: { start: Date.now() - (7 * 24 * 60 * 60 * 1000) }
  });
  
  if (result.success) {
    console.log('User interests:', result.data.topics);
    console.log('Summary:', result.data.summary);
  }
}
```

### 2. SDK Integration

```javascript
import { initMemoryClient, getContext } from '@wamp/client-sdk';

const client = await initMemoryClient({
  appName: 'My AI App',
  appId: 'my-ai-app',
  mockMode: process.env.NODE_ENV === 'development'
});

if (client.permissionGranted) {
  const result = await getContext(client, {
    timeRange: { start: Date.now() - (24 * 60 * 60 * 1000) } // Last 24 hours
  });
  // Use context data...
}
```

### Time Range Examples

```javascript
import { TimeUtils } from '@wamp/protocol';

// Using TimeUtils (recommended - clean and readable)
timeRange: TimeUtils.lastDays(7)     // Last 7 days
timeRange: TimeUtils.lastHours(24)   // Last 24 hours  
timeRange: TimeUtils.lastHours(1)    // Last hour
timeRange: TimeUtils.lastWeeks(2)    // Last 2 weeks

// Common presets
timeRange: CommonTimeRanges.LAST_WEEK
timeRange: CommonTimeRanges.LAST_DAY
timeRange: CommonTimeRanges.TODAY
timeRange: CommonTimeRanges.YESTERDAY

// Custom ranges
timeRange: TimeUtils.between(
  new Date('2024-01-01').getTime(),
  new Date('2024-01-31').getTime()
)

// Raw timestamps (still supported)
timeRange: { start: Date.now() - (7 * 24 * 60 * 60 * 1000) }
timeRange: { 
  start: new Date('2024-01-01').getTime(),
  end: new Date('2024-01-31').getTime()
}

// All memories (no time filter)
// Just omit timeRange parameter
```

## Extension Development

Choose your development approach:

### Native Implementation ([native extension](./extensions/native/))
Learn the full WAMP specification by building from scratch.

### SDK Implementation ([SDK extension](./extensions/sdk/))  
Use the Extension SDK for rapid development with minimal boilerplate.

Both examples show how to implement the WAMP in Chrome extensions:

### Key Implementation Steps

1. **Inject Protocol Registry** - Create `window.agentMemory` if it doesn't exist
2. **Register Provider** - Add your extension as a memory provider
3. **Handle Permissions** - Implement per-domain permission checking
4. **Generate Context** - Process browsing data and return structured context
5. **Dispatch Events** - Notify when your provider is ready

### Content Script Pattern

```javascript
// Initialize protocol registry
if (!window.agentMemory) {
  window.agentMemory = createProtocolRegistry();
}

// Register your extension's provider
const myProvider = {
  providerId: 'my-extension',
  providerName: 'My Memory Extension',
  version: '1.0.0',
  
  async getContext(options) {
    // Your implementation here
    return { success: true, data: contextData };
  },
  
  isPermissionGranted(domain) {
    // Check permissions
    return true;
  },
  
  async requestPermission(appInfo) {
    // Handle permission request
    return { granted: true, isFirstTime: false, permissions: ['context'] };
  }
};

window.agentMemory.registerProvider(myProvider);
```

## Running the Examples

### Website Examples

1. Clone and build the repository:
   ```bash
   git clone https://github.com/web-agent-memory/web-agent-memory-protocol.git
   cd web-agent-memory-protocol
   pnpm install
   pnpm build
   ```
2. Open any `.html` file in a browser
3. For SDK examples, they'll import from the locally built packages
4. For mock mode, no extension installation required

### Extension Example

1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `examples/extensions/demo-extension/` directory
5. The extension will inject the protocol into all websites

## Testing Without Extensions

All SDK examples include mock mode for development:

```javascript
const client = await MemoryClientSDK.init({
  appName: 'My App',
  appId: 'my-app',
  mockMode: true  // Returns realistic test data
});
```

This allows you to develop and test your integration without requiring users to install memory extensions.

## Framework Integration

- **Any Framework**: See [client/sdk/](./client/sdk/) for clean SDK integration patterns
- **TypeScript**: SDK provides full type definitions  
- **Framework-Agnostic**: The WAMP works with any JavaScript framework

## Best Practices

1. **Progressive Enhancement** - Always check if `window.agentMemory` exists
2. **Handle All States** - Check `result.success` and handle errors gracefully  
3. **Respect Privacy** - Only request context when needed for functionality
4. **Cache Context** - Store results to minimize API calls
5. **Development Mode** - Use mock mode during development and testing

For detailed implementation guides, see:
- [Protocol Specification](../protocol/README.md) - Technical specification
- [SDK Documentation](../client-sdk/README.md) - Enhanced features and configuration
