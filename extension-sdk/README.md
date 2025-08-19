# Web Agent Memory Protocol (WAMP) Extension SDK (Development)

[![Work In Progress](https://img.shields.io/badge/Status-Work%20In%20Progress-yellow.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

> ⚠️ **Work In Progress**: This is experimental development code for the WAMP specification. Not published on NPM.

**Reference implementation for building Web Agent Memory Protocol (WAMP) browser extensions.**

The Extension SDK provides a reference implementation for building WAMP providers. This is development code used to validate the specification - use it to experiment with building extensions and provide feedback on the protocol design.

## 🚀 Quick Start

### Development Setup

```bash
# Clone the repository and build locally
git clone https://github.com/web-agent-memory/web-agent-memory-protocol.git
cd web-agent-memory-protocol
pnpm install
pnpm build
```

### Simple Extension (20 lines total!)

```typescript
// Import from built packages (adjust path as needed)
import { initializeExtension } from '../extension-sdk';

// That's it! Just implement your data logic:
initializeExtension({
  providerId: 'my-memory-extension',
  providerName: 'My Memory Extension',
  version: '1.0.0',
  description: 'Provides personalized context from user behavior',
  
  async getContextData(options) {
    // Your custom logic here
    const userMemories = await analyzeUserBehavior(options);
    
    return {
      memories: userMemories.map(memory => ({
        text: memory.description,
        relevance: memory.score,
        timestamp: memory.timestamp,
        source: memory.source
      }))
    };
  },
  
  debug: true // Enable debug logging
});
```

That's it! The SDK handles everything else:
- ✅ Registry injection and management
- ✅ Provider registration and lifecycle
- ✅ Permission handling and storage
- ✅ Context formatting and validation
- ✅ Error handling and recovery
- ✅ Token counting and limits
- ✅ Event dispatching

## 📊 Impact

| Aspect               | Manual Implementation | With Extension SDK |
| -------------------- | --------------------- | ------------------ |
| **Lines of Code**    | 600+ lines            | ~50 lines          |
| **Development Time** | 2-3 days              | 1-2 hours          |
| **Boilerplate**      | ~90% boilerplate      | ~10% boilerplate   |
| **Error Handling**   | Manual implementation | Built-in           |
| **Type Safety**      | Manual types          | Full TypeScript    |
| **Best Practices**   | Self-implemented      | Built-in           |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                Your Extension                    │
├─────────────────────────────────────────────────┤
│  getContextData() ← Only method you implement   │
├─────────────────────────────────────────────────┤
│              Extension SDK                      │
│  ┌─────────────┐ ┌─────────────┐ ┌────────────┐│
│  │createProvider│ │PermissionMgr│ │Context Utils││
│  └─────────────┘ └─────────────┘ └────────────┘│
│  ┌─────────────┐ ┌─────────────┐ ┌────────────┐│
│  │BrowserAPI   │ │RegistryMgr  │ │Event System││
│  └─────────────┘ └─────────────┘ └────────────┘│
├─────────────────────────────────────────────────┤
│          WAMP Registry               │
│              window.agentMemory              │
└─────────────────────────────────────────────────┘
```

## 📖 API Reference

### Functional API

For basic extensions, use the functional API:

```typescript
// Import from built packages (adjust path as needed)
import { initializeExtension, ContextData } from '../extension-sdk';

await initializeExtension({
  providerId: string;           // Unique identifier
  providerName: string;         // Display name
  version: string;              // Version string
  getContextData: (options?) => Promise<ContextData>; // Your logic
  
  // Optional configuration
  description?: string;         // Provider description
  debug?: boolean;             // Enable debug logging
});
```

### Context Data Structure

Your `getContextData` method should return a simple structure:

```typescript
interface ContextData {
  memories: Array<{
    text: string;        // Memory content
    relevance: number;   // 0-1 relevance score
    timestamp: number;   // When the memory was created
    source: string;      // Source of the memory (browsing, search, etc.)
    metadata?: Record<string, unknown>; // Optional extra data
  }>;
}
```

### Helper Functions

The SDK provides utilities to create mock data for testing:

```typescript
// Import from built packages (adjust path as needed)
import { createMockContextData, validateContextData } from '../extension-sdk';

// Generate realistic mock data
const mockData = createMockContextData();

// Validate your data structure
const isValid = validateContextData(myContextData);
if (!isValid) {
  console.error('Invalid context data structure');
}
```

## 🔧 Browser API Access

The SDK provides simplified access to Chrome Extension APIs:

```typescript
// Import from built packages (adjust path as needed)
import { initializeExtension } from '../extension-sdk';

await initializeExtension({
  providerId: 'my-provider',
  providerName: 'My Provider',
  version: '1.0.0',
  
  async getContextData(options) {
    // Use Chrome Extension APIs directly
    const history = await chrome.history.search({
      text: '',
      maxResults: 100,
      startTime: Date.now() - 7 * 24 * 60 * 60 * 1000
    });
    
    const tabs = await chrome.tabs.query({});
    const activeTab = tabs.find(tab => tab.active);
    
    // Use chrome.storage directly
    const settings = await chrome.storage.local.get('mySettings');
    await chrome.storage.local.set({ lastUpdate: Date.now() });
    
    // Process history into memories
    return {
      memories: history.map(item => ({
        text: `Visited: ${item.title}`,
        relevance: calculateRelevance(item),
        timestamp: item.lastVisitTime,
        source: 'browsing'
      }))
    };
  }
});
```

## 🛡️ Permission Management

The SDK handles all permission complexity:

```typescript
// Import from built packages (adjust path as needed)
import { initializeExtension } from '../extension-sdk';

await initializeExtension({
  providerId: 'my-provider',
  providerName: 'My Provider', 
  version: '1.0.0',
  
  async getContextData(options) {
    // SDK automatically checks permissions before calling this method
    // If user hasn't granted permission, they'll see a permission dialog
    
    const data = await getPrivateData();
    return processData(data);
  }
});

// The SDK handles all permission management automatically
// Users will be prompted for permission when needed
```

## 🧰 Helper Utilities

The SDK provides utilities to create mock data for testing:

```typescript
// Import from built packages (adjust path as needed)
import { createMockContextData, validateContextData } from '../extension-sdk';

// Generate realistic mock data
const mockData = createMockContextData();

// Validate your data structure
const isValid = validateContextData(myContextData);
if (!isValid) {
  console.error('Invalid context data structure');
}
```

## 🔍 Examples

### Basic Website Analytics Extension

```typescript
// Import from built packages (adjust path as needed)
import { initializeExtension } from '../extension-sdk';

initializeExtension({
  providerId: 'website-analytics',
  providerName: 'Website Analytics Provider',
  version: '1.0.0',
  
  async getContextData(options) {
    // Get browsing data (in a real extension, you would use browser APIs)
    const history = await getBrowsingHistory(options.timeRange || { start: Date.now() - 7 * 24 * 60 * 60 * 1000, end: Date.now() });
    
    // Analyze website categories
    const userMemories = analyzeUserBehavior(history);
    
    return {
      memories: userMemories.map(memory => ({
        text: memory.description,
        relevance: memory.score,
        timestamp: memory.timestamp,
        source: memory.source,
        metadata: memory.metadata
      }))
    };
  }
});
```

### AI Assistant Context Extension

```typescript
// Import from built packages (adjust path as needed)
import { initializeExtension } from '../extension-sdk';

initializeExtension({
  providerId: 'ai-assistant-context',
  providerName: 'AI Assistant Context',
  version: '1.0.0',
  description: 'Provides context for AI conversations',
  
  async getContextData(options) {
    // Get current tab and recent history (in a real extension, you would use browser APIs)
    const activeTab = await getActiveTab();
    const recentHistory = await getHistory('1h');
    
    // Filter based on relevance query
    const relevantContent = options.relevanceQuery
      ? filterByRelevance(recentHistory, options.relevanceQuery)
      : recentHistory;
    
    return {
      memories: [
        {
          text: `User is currently on ${activeTab.title}`,
          relevance: 0.9,
          timestamp: Date.now(),
          source: 'browsing'
        },
        ...relevantContent.slice(0, 10).map(item => ({
          text: `Visited: ${item.title}`,
          relevance: calculateRelevance(item, options.relevanceQuery),
          timestamp: item.lastVisitTime,
          source: 'browsing',
          metadata: {
            url: item.url
          }
        }))
      ]
    };
  }
});
```

## 🧪 Testing & Development

### Mock Data for Development

```typescript
// Import from built packages (adjust path as needed)
import { createMockContextData, validateContextData } from '../extension-sdk';

// Generate realistic mock data
const mockData = createMockContextData();

// Validate your data structure
const isValid = validateContextData(myContextData);
if (!isValid) {
  console.error('Invalid context data structure');
}
```

### Debug Mode

Enable debug logging during development:

```typescript
initializeExtension({
  // ... your config
  debug: true // Enables detailed logging
});
```

## 📦 Building & Bundling

### With Rollup/Webpack

```javascript
// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/content-script.ts',
  output: {
    file: 'dist/content-script.js',
    format: 'iife'
  },
  plugins: [
    resolve({ browser: true }),
    typescript()
  ]
};
```

### Manifest Configuration

```json
{
  "manifest_version": 3,
  "permissions": ["storage", "activeTab"],
  "optional_permissions": ["history", "tabs"],
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content-script.js"],
    "run_at": "document_start"
  }]
}
```

## 🔧 Advanced Configuration

### Custom Permission Management

Permission management is handled automatically by the SDK. If you need custom behavior, you can implement it in your `getContextData` method:

```typescript
// Import from built packages (adjust path as needed)
import { initializeExtension } from '../extension-sdk';

await initializeExtension({
  providerId: 'my-provider',
  providerName: 'My Provider',
  version: '1.0.0',
  
  async getContextData(options) {
    // Get current domain
    const domain = typeof window !== 'undefined' 
      ? window.location.hostname 
      : 'localhost';
    
    // Custom logic for specific domains
    if (domain.includes('company.com')) {
      // Provide extended context for company domains
      return await getExtendedCompanyContext(options);
    }
    
    // Standard context for other domains
    return await getStandardContext(options);
  }
});
```

### Advanced Provider Configuration

```typescript
// Import from built packages (adjust path as needed)
import { createProvider } from '../extension-sdk';

const provider = createProvider({
  providerId: 'my-provider',
  providerName: 'My Provider',
  version: '1.0.0',
  maxTopK: 100,              // Increase top-K results
  supportedFormats: ['structured', 'narrative'],
  supportedCategories: ['browsing', 'search', 'documents']
}, async (options) => {
  // Your context logic with increased limits
  const memories = await getMyContextData(options);
  return {
    memories: memories.slice(0, 100) // Respect maxTopK
  };
});
```

### Multiple Providers

You can create and register multiple providers from the same extension:

```typescript
// Import from built packages (adjust path as needed)
import { createProvider } from '../extension-sdk';

// Create first provider
const websiteProvider = createProvider({
  providerId: 'website-analytics',
  providerName: 'Website Analytics',
  version: '1.0.0'
}, async (options) => {
  return await getWebsiteAnalytics(options);
});

// Create second provider  
const searchProvider = createProvider({
  providerId: 'search-history',
  providerName: 'Search History',
  version: '1.0.0'
}, async (options) => {
  return await getSearchHistory(options);
});

// Both providers are automatically registered with the global registry
```

## 🐛 Troubleshooting

### Common Issues

**Extension not detected:**
```javascript
// Check if SDK initialized
if (window.agentMemory) {
  console.log('✅ Extension loaded');
} else {
  console.log('❌ Extension not loaded');
}
```

**Permission errors:**
```javascript
// Check permissions manually
const granted = await window.agentMemory.isPermissionGranted();
if (!granted) {
  await window.agentMemory.requestPermission({
    appId: 'test-app',
    appName: 'Test App'
  });
}
```

**Context data validation:**
```javascript
// Import from built packages (adjust path as needed)
import { validateContextData } from '../extension-sdk';

const data = await myProvider.getContextData();
if (!validateContextData(data)) {
  console.error('Invalid context data structure');
}
```

## 🏆 Best Practices

1. **Keep `getContextData` fast** - Use caching for expensive operations
2. **Respect token limits** - SDK will trim, but better to pre-filter
3. **Handle edge cases** - Return empty memories array rather than null
4. **Use mock data** - For testing and development
5. **Enable debug mode** - During development
6. **Validate data** - Use `validateContextData()` in tests
7. **Cache results** - Store processed data to avoid recalculation
8. **Use the new functional API** - Simpler and more maintainable

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

## 🔗 Links

- [Protocol Spec](../protocol/README.md)  
- [Examples](./examples/)
- [GitHub](https://github.com/web-agent-memory/web-agent-memory-protocol)

## ⭐ Support

If this SDK helps you build better extensions, please star the repo and share it with other developers!