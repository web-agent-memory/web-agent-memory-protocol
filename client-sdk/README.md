# Web Agent Memory Protocol (WAMP) Client SDK (Development)

> ⚠️ **Work In Progress**: This is experimental development code for the WAMP specification. Not published on NPM.

This directory contains the reference TypeScript Client SDK that provides enhanced features on top of the standardized Web Agent Memory Protocol (WAMP) browser API with a simplified functional API.

## 🎯 Why Use the SDK?

While you can use `window.agentMemory` directly with zero dependencies, the Client SDK provides:

- **🛡️ TypeScript Support** - Full type safety and IntelliSense
- **🎭 Mock Mode** - Realistic test data for development  
- **⚡ Simpler API** - Functional approach instead of classes
- **📦 Lightweight** - Smaller bundle size with better tree shaking

## Architecture

```
Your Website → Client SDK (Optional) → window.agentMemory → Extensions
```

The Client SDK is a thin wrapper that enhances the direct API without replacing it.

## Key Features

- **🛡️ TypeScript Support** - Full type safety and IntelliSense
- **🎭 Mock Mode** - Realistic test data for development  
- **⚡ Simple Functional API** - Easy-to-use functions instead of classes
- **📦 Lightweight** - Small bundle with tree shaking support
- **🔄 Helper Utilities** - Provider selection, safe context retrieval, and permission management

## Quick Start

### Development Setup

```bash
# Clone the repository and build locally
git clone https://github.com/web-agent-memory/web-agent-memory-protocol.git
cd web-agent-memory-protocol
pnpm install
pnpm build
```

### Basic Usage (New Simplified API)

```typescript
// Import from the built packages (adjust paths as needed)
import { initMemoryClient, getContext } from '../client-sdk';
import { TimeUtils } from '../protocol';

// Initialize the SDK
const client = await initMemoryClient({
  appName: 'My AI Assistant',
  appId: 'my-ai-assistant'
});

// Get context (using TimeUtils for cleaner syntax)
const result = await getContext(client, {
  relevanceQuery: 'artificial intelligence',
  timeRange: TimeUtils.lastDays(7)
});

if (result.success) {
  console.log('User memories:', result.data.memories);
}
```

### Development Mode

```typescript
const client = await initMemoryClient({
  appName: 'My App',
  appId: 'my-app',
  mockMode: process.env.NODE_ENV === 'development' // Realistic mock data
});
```

### Advanced Configuration

```typescript
const client = await initMemoryClient({
  appName: 'My AI Assistant',
  appId: 'my-ai-assistant',
  
  // Development options
  mockMode: false,                  // Use mock data
  debug: false,                     // Enable debug logging
  
  // Provider preferences
  preferredProvider: 'squash'       // Prefer specific extension
});
```

## SDK Functions (Simplified API)

### Context Retrieval

```typescript
import { getContext } from '../client-sdk';
import { TimeUtils } from '../protocol';

// Get context
const result = await getContext(client, {
  relevanceQuery: 'machine learning',
  timeRange: TimeUtils.lastHours(24),
  topK: 20,
  format: 'structured'
});
```

### Permission Management

```typescript
import { requestPermission } from '../client-sdk';

// Request permission
const permission = await requestPermission(client);
if (permission.granted) {
  console.log('Permission granted!');
}
```

### Context Sharing

Share context from your application back to the user's memory extensions.

**`provideContext(client, context, options?)`**

Provide a full context object to the extension.

```typescript
import { provideContext, createConversationContext } from '../client-sdk';

const conversation = [
  { role: 'user', content: 'Tell me about memory protocol' },
  { role: 'assistant', content: 'It is a standard for web applications...' }
];

const context = createConversationContext(conversation);

await provideContext(client, context);
```

**`contributeMemory(client, memories, source?)`**

Contribute individual memories to the extension.

```typescript
import { contributeMemory, createMemories } from '../client-sdk';

const memories = createMemories('User showed interest in React development');

await contributeMemory(client, memories, 'My-AI-Assistant');
```

### Utility Functions

```typescript
import { isAvailable, getProtocolStatus } from '../client-sdk';

// Check if protocol is available
if (isAvailable()) {
  console.log('Web Agent Memory is available');
}

// Get protocol status
const status = await getProtocolStatus();
if (status) {
  console.log('Available providers:', status.providerCount);
}
```

## Mock Mode

Perfect for development without requiring extensions:

```typescript
const client = await initMemoryClient({
  appName: 'My App',
  appId: 'my-app',
  mockMode: true
});

// Returns realistic mock data
const result = await getContext(client, {});
console.log(result.data.memories); // Array of mock memories
```

Mock data includes:
- Realistic user interests and topics
- Browsing patterns and activities  
- Proper metadata and timestamps
- Consistent data structure

## Error Handling

The SDK provides enhanced error handling:

```typescript
try {
  const result = await getContext(client, {});
  
  if (result.success) {
    // Use context data
    console.log(result.data);
  } else {
    // Handle specific errors
    switch (result.error?.code) {
      case 'NOT_AVAILABLE':
        console.log('Agent Memory not available');
        break;
      case 'PERMISSION_DENIED':
        console.log('User denied permission');
        break;
      default:
        console.error('Unexpected error:', result.error);
    }
  }
} catch (error) {
  // Handle SDK errors
  console.error('SDK error:', error);
}
```

## TypeScript Support

Full type definitions are included:

```typescript
import { 
  initMemoryClient,
  getContext,
  MemoryClient,
  MemorySDKConfig,
  MemoryContext,
  ContextOptions,
  ContextResult
} from '../client-sdk';
```

## Performance Benefits

The simplified SDK includes several performance improvements:

- **Smaller Bundle Size** - Reduced from ~12KB to ~8KB
- **Better Tree Shaking** - Only imported functions are included
- **Simpler Runtime** - Less complex object instantiation
- **Clearer API** - Easier to optimize by JavaScript engines