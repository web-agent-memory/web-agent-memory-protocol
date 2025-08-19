# Web Agent Memory Protocol (WAMP) (Work In Progress)

[![Work In Progress](https://img.shields.io/badge/Status-Work%20In%20Progress-yellow.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

> ⚠️ **This is an experimental specification under active development.** We're building the spec and reference implementation together. Not ready for production use.

A standardized browser API specification called Web Agent Memory Protocol (WAMP)
for web extensions to provide contextual browsing data to web applications, with
reference implementation and development SDKs.

## 🚀 Key Features

WAMP introduces a **protocol-first design** that revolutionizes how AI applications access contextual data:

- **📋 Standardized Browser API**: Extensions inject `window.agentMemory` directly
- **🔧 Zero Dependencies**: Websites can use memory extensions without installing any SDK  
- **⚡ Multi-Provider Support**: Multiple extensions work simultaneously
- **🛡️ Type Safety**: Optional Client SDK provides full TypeScript support
- **🎯 Developer Choice**: Use direct API or SDK based on your needs

## Architecture Overview

WAMP provides two integration approaches:

```
Website Option 1: Direct API (Zero Dependencies)
┌─────────────────┐
│   Your Website  │ ──────────┐
└─────────────────┘           │
                               ▼
                    ┌─────────────────────┐
                    │ window.agentMemory  │ ◄─── Browser Extensions
                    │ (Standardized API)  │      (Squash, etc.)
                    └─────────────────────┘

Website Option 2: With Client SDK (Enhanced Features)  
┌─────────────────┐    ┌─────────────────┐
│   Your Website  │───►│ WAMP Client     │
└─────────────────┘    │ SDK (Type       │
                       │ Safety +        │ ◄─── window.agentMemory
                       │ Advanced        │
                       │ Features)       │
                       └─────────────────┘
```

## 📖 Documentation

- **[Protocol Specification](./protocol/README.md)** - Core types and browser API specification
- **[Client SDK Documentation](./client-sdk/README.md)** - Website integration SDK with TypeScript support
- **[Extension SDK Documentation](./extension-sdk/README.md)** - Browser extension development toolkit
- **[Examples](./examples/README.md)** - Working examples for websites and browser extensions

## Development Setup

This repository contains the Memory Protocol specification along with reference implementations. To experiment with the code:

### Clone and Setup
```bash
git clone https://github.com/web-agent-memory/web-agent-memory-protocol.git
cd web-agent-memory-protocol
pnpm install
pnpm build
```

### What's Included

| Package            | Purpose                       | Status        |
| ------------------ | ----------------------------- | ------------- |
| **protocol/**      | Core types and specification  | ✅ Functional  |
| **client-sdk/**    | Website integration utilities | 🔄 Development |
| **extension-sdk/** | Extension development toolkit | 🔄 Development |
| **examples/**      | Working examples and demos    | 📝 Reference   |

### Testing Locally
```bash
# Run tests across all packages
pnpm test

# Build all packages
pnpm build

# Type check everything
pnpm typecheck
```

## Quick Start

### Option 1: Direct API Usage (Recommended)

Zero dependencies - just check for the protocol and use it:

```javascript
// Simple context retrieval - just 5 lines!
if (window.agentMemory) {
  const result = await window.agentMemory.getContext({
    relevanceQuery: 'AI development',
    timeRange: { start: Date.now() - 7 * 24 * 60 * 60 * 1000 } // Last 7 days
  });
  
  if (result.success) {
    console.log('User interests:', result.data.topics);
  }
}
```

### Option 2: Development SDK Usage (Local Build)

For TypeScript support and mock mode during development:

```bash
# After building the repository locally
cd web-agent-memory-protocol
pnpm build
```

```typescript
// Import from local build (adjust path as needed)
import { initMemoryClient, getContext } from './client-sdk';

const client = await initMemoryClient({
  appName: 'My AI Assistant',
  appId: 'my-ai-assistant',
  mockMode: process.env.NODE_ENV === 'development' // Mock data for development
});

const result = await getContext(client, {
  relevanceQuery: 'AI development',
  timeRange: { start: Date.now() - 7 * 24 * 60 * 60 * 1000 } // Last 7 days
});
```

## Features

- 🚀 **Simple Integration** - Just two function calls to get started
- 🔒 **Privacy-First** - Users control their data with granular permissions
- 🎭 **Mock Mode** - Built-in mock data for development
- 📦 **TypeScript Support** - Full type definitions included  
- 🎨 **UI Components** - Beautiful install prompts and permission dialogs
- 📊 **Analytics Ready** - Track usage and adoption

## Core Concepts

### User Context Structure

The protocol provides structured data about user browsing patterns:

```typescript
interface MemoryContext {
  memories: Memory[];           // Array of user memories
}

interface Memory {
  text: string;                 // Natural language description
  relevance: number;            // Relevance score (0-1)
  timestamp: number;            // When memory was created/observed
  source: string;               // Origin (browsing, ide, search, etc.)
  metadata?: Record<string, unknown>; // Optional provider-specific data
}
```

### Permission Model

- Users must explicitly grant permission to each domain
- Permissions are stored per-domain and can be revoked anytime
- The SDK handles the permission flow automatically
- First-time users see a permission dialog with your app name

## API Reference

### Direct API (Zero Dependencies)

#### `window.agentMemory.getContext(options?)`

Retrieve browsing context directly from any memory extension:

```javascript
const result = await window.agentMemory.getContext({
  relevanceQuery: 'project management, agile',  // Filter by topics
  timeRange: { start: Date.now() - 7 * 24 * 60 * 60 * 1000 }, // Last 7 days
  topK: 40,                                       // Limit to top 40 memories
  format: 'structured'                           // Response format
});
```

Returns:
```typescript
{
  success: boolean;
  data?: MemoryContext;
  error?: ProtocolError;
  metadata: {
    generatedAt: number;
    provider: { id: string; name: string; version: string };
    dataSource: { timeRange: { start?: number; end?: number }; categories: string[] };
  };
}
```

#### Other Direct API Methods

```javascript
// Check if protocol is available
if (window.agentMemory) {
  // Get status and providers
  const status = window.agentMemory.getStatus();
  const providers = window.agentMemory.getProviders();
  
  // Request permission
  const permission = await window.agentMemory.requestPermission({
    appName: 'My App',
    appId: 'my-app',
    description: 'Access context for personalized AI responses'
  });
  
  // Check permission
  const granted = window.agentMemory.isPermissionGranted();

  // Provide context back to extensions
  const contextResult = await window.agentMemory.provideContext({
    agentId: 'my-app',
    agentName: 'My App',
    memories: [
      { text: 'User is interested in React', relevance: 0.9, timestamp: Date.now(), source: 'conversation' }
    ],
    contextType: 'conversation'
  });

  // Contribute individual memories
  const memoryResult = await window.agentMemory.contributeMemory([
    { text: 'User showed interest in TypeScript', relevance: 0.8, timestamp: Date.now(), source: 'my-app' }
  ], 'My App');
}
```

### Client SDK API (Advanced Features)

#### `initMemoryClient(config)`

Initialize the Client SDK with advanced features:

```typescript
import { initMemoryClient } from '@wamp/client-sdk';

const client = await initMemoryClient({
  appName: 'My App',        // Required: Your app's display name
  appId: 'my-app',          // Required: Unique identifier
  mockMode: false,          // Use mock data in development
  analytics: true,          // Enable usage analytics
  theme: 'auto',            // UI theme: 'light', 'dark', 'auto'
  showInstallPrompt: true,  // Show install prompt if extension missing
  debug: false              // Enable debug logging
});
```

Returns a client object:
```typescript
{
  available: boolean;
  providersInstalled: boolean;
  permissionGranted: boolean;
  provider: MemoryProvider | null;
  config: MemorySDKConfig;
}
```

#### `getContext(client, options?)`

```typescript
import { getContext } from '@wamp/client-sdk';

const result = await getContext(client, {
  relevanceQuery: 'AI development',
  timeRange: { start: Date.now() - 7 * 24 * 60 * 60 * 1000 } // Last 7 days
});
```

#### `provideContext(client, context, options?)`

Share context from your application back to the user's memory extensions:

```typescript
import { provideContext, createConversationContext } from '@wamp/client-sdk';

const conversation = [
  { role: 'user', content: 'Tell me about memory protocol' },
  { role: 'assistant', content: 'It is a standard for web applications...' }
];

const context = createConversationContext(conversation);
await provideContext(client, context);
```

#### `contributeMemory(client, memories, source?)`

Contribute individual memories to the extension:

```typescript
import { contributeMemory, createMemories } from '@wamp/client-sdk';

const memories = createMemories('User showed interest in React development');
await contributeMemory(client, memories, 'My-AI-Assistant');
```

#### Helper Utilities

```typescript
import { 
  isAvailable, 
  waitForProtocol, 
} from '@wamp/client-sdk';

// Check if protocol is available
const isAvailable = isAvailable();

// Wait for protocol with timeout
const protocol = await waitForProtocol(2000); // 2 second timeout
```


## Examples

### Basic Direct API Integration

```javascript
async function enhanceAIPrompt(userInput) {
  // Check if any memory extension is available
  if (!window.agentMemory) {
    return userInput; // Fallback to regular prompt
  }
  
  // Get context
  const result = await window.agentMemory.getContext({
    relevanceQuery: userInput,
    timeRange: { start: Date.now() - 7 * 24 * 60 * 60 * 1000 }, // Last 7 days
    topK: 10
  });
  
  if (result.success) {
    // Enhance the prompt with user context
    const memories = result.data.memories;
    const recentMemories = memories
      .filter(m => m.timestamp > Date.now() - 86400000) // Last 24h
      .sort((a, b) => b.relevance - a.relevance);

    console.log('Most relevant recent memory:', recentMemories[0]?.text);

    return `Context: ${JSON.stringify(recentMemories.slice(0, 5))}

User: ${userInput}`;
  }
  
  return userInput; // Fallback if no context available
}
```

### Development with Mock Data

```javascript
import { initMemoryClient, getContext } from '@wamp/client-sdk';

// Enable mock mode in development
const client = await initMemoryClient({
  appName: 'My App',
  appId: 'my-app',
  mockMode: process.env.NODE_ENV === 'development'
});

// Use normally - will return realistic mock data if mockMode is true
const result = await getContext(client);
console.log(result.data); // Mock data that looks real
```

### Multi-Provider Support

```javascript
// Direct API automatically aggregates from all providers
if (window.agentMemory) {
  // Get aggregated context from all available providers
  const result = await window.agentMemory.getAggregatedContext({
    timeRange: { start: Date.now() - 7 * 24 * 60 * 60 * 1000 }, // Last 7 days
    topK: 20
  });
  
  if (result.success) {
    console.log('Providers used:', result.providers);
    console.log('Combined context:', result.data);
    console.log('Individual results:', result.providerResults);
  }
}
```

## AI Agent Integration

The Memory Protocol includes built-in tool schemas for popular AI frameworks:

```typescript
import { memoryToolSchema } from '@wamp/client-sdk/tool-schema';

// OpenAI function calling
const openai = new OpenAI({
  tools: [memoryToolSchema.openai]
});

// Anthropic tool use
const anthropic = new Anthropic({
  tools: [memoryToolSchema.anthropic]
});

// LangChain integration
const langchainTool = memoryToolSchema.langchain;
```

## Best Practices

1. **Use Direct API First**: Start with `window.agentMemory` for simplicity
2. **Progressive Enhancement**: Your app should work without memory extensions
3. **Handle All States**: Always check `result.success` and handle errors
4. **Cache Context**: Store context data to minimize API calls
5. **Respect Privacy**: Only request context when needed for functionality
6. **Development Mode**: Use mock mode during development

## Getting Started Guide

Choose the approach that best fits your needs:

### Direct API (Zero Dependencies)
```javascript
// No imports needed!
if (window.agentMemory) {
  const result = await window.agentMemory.getContext();
}
```

### Client SDK (Enhanced Features)
```javascript
import { initMemoryClient, getContext } from '@wamp/client-sdk';

const client = await initMemoryClient({ appName: 'My App', appId: 'my-app' });
const result = await getContext(client);
```

## TypeScript Support

The SDK includes full TypeScript definitions:

```typescript
import { 
  initMemoryClient,
  getContext,
  MemoryClient,
  MemoryContext, 
  Memory,
  ContextOptions,
  ContextResult,
  AgentMemoryRegistry
} from '@wamp/client-sdk';

// Direct API types are also available globally
declare global {
  interface Window {
    agentMemory?: AgentMemoryRegistry;
  }
}
```

## Error Handling

### Direct API
```javascript
const result = await window.agentMemory.getContext();

if (result.success) {
  // Use result.data
  console.log(result.data.summary);
} else {
  // Handle error
  console.error(result.error.message);
  
  switch (result.error.code) {
    case 'NOT_AVAILABLE':
      // Protocol not available
      break;
    case 'PERMISSION_DENIED':
      // User denied permission
      break;
    case 'NO_DATA':
      // No context data available
      break;
  }
}
```

### SDK
```javascript
import { initMemoryClient, getContext } from '@wamp/client-sdk';

try {
  const client = await initMemoryClient({ appName: 'My App', appId: 'my-app' });
  const result = await getContext(client);
  if (result.success) {
    // Use context
  } else {
    // Handle specific errors
  }
} catch (error) {
  console.error('Unexpected error:', error);
}
```

## Troubleshooting

### Extension Not Detected

**Direct API:**
```javascript
if (!window.agentMemory) {
  console.log('No memory extension detected');
  // Fallback behavior or show install instructions
}
```

**SDK:**
```javascript
import { initMemoryClient } from '@wamp/client-sdk';

const client = await initMemoryClient({ /* config */ });
if (!client.available) {
  // await client.showInstallPrompt(); // showInstallPrompt is part of the config now
}
```

### Permission Denied

Users may deny permission on first request. Handle gracefully:

```javascript
if (!result.success && result.error.code === 'PERMISSION_DENIED') {
  // Use fallback behavior
  // Can retry permission request later if needed
}
```

### Development Mode

Use mock mode during development to avoid requiring extensions:

```javascript
import { initMemoryClient } from '@wamp/client-sdk';

const client = await initMemoryClient({
  appName: 'My App',
  appId: 'my-app',
  mockMode: process.env.NODE_ENV === 'development'
});
```

## Browser Extension Development

To create a memory extension that implements this protocol:
- **[Extension SDK](./extension-sdk/README.md)** - Complete toolkit for building Memory Protocol extensions
- **[Protocol Implementation Guide](./protocol/README.md)** - Technical specification and API details
- **[Reference Extension](./examples/extensions/demo-extension/)** - Working implementation example

## Privacy & Security

- All data access is controlled by the memory extension providers
- Users must explicitly grant permission per domain
- No data is stored by the SDK
- Context is filtered to remove sensitive information
- Extensions implement their own privacy controls

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/web-agent-memory/web-agent-memory-protocol/issues)
- **Discussions**: [GitHub Discussions](https://github.com/web-agent-memory/web-agent-memory-protocol/discussions)