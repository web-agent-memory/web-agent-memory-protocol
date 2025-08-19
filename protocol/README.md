# Web Agent Memory Protocol (WAMP) Browser API

This directory contains the core browser API specification and type definitions for the Web Agent Memory Protocol (WAMP) - a standardized way for browser extensions to expose contextual browsing data to websites.

## 🎯 What is WAMP?

The Web Agent Memory Protocol (WAMP) is a standardized browser API that allows memory extensions (like Squash) to inject a consistent `window.agentMemory` interface that websites can use to access contextual browsing data with user permission.

## Architecture

```
Website → window.agentMemory → Multi-Provider Registry → Extensions
```

Extensions inject the protocol directly into web pages, eliminating the need for websites to install SDKs or dependencies.

## What's Included

This package provides the foundational building blocks for WAMP:
- **Complete TypeScript Types** - All interfaces and types for the protocol
- **Core Utilities** - Essential functions like `isProtocolAvailable()`
- **Time Utilities** - Helper functions for working with time ranges

*For advanced features like provider selection and permission management, see the [Client SDK](../client-sdk/README.md) or [Extension SDK](../extension-sdk/README.md).*

## Time Range Specification

WAMP uses flexible timestamp-based time ranges:

```javascript
// Common patterns:
timeRange: { start: Date.now() - (7 * 24 * 60 * 60 * 1000) }        // Last 7 days
timeRange: { start: Date.now() - (24 * 60 * 60 * 1000) }            // Last 24 hours
timeRange: { start: Date.now() - (60 * 60 * 1000) }                 // Last hour

// Specific date range:
timeRange: { 
  start: new Date('2024-01-01').getTime(),
  end: new Date('2024-01-31').getTime()
}

// All memories (omit timeRange or use):
timeRange: { start: 0, end: Date.now() }
```

## Basic Usage

### Check for Protocol Availability

```javascript
if (window.agentMemory) {
  console.log('Memory protocol is available!');
  const providers = window.agentMemory.getProviders();
  console.log(`Found ${providers.length} memory extension(s)`);
}
```

### Request Permission

```javascript
const permission = await window.agentMemory.requestPermission({
  appName: 'My AI Assistant',
  appId: 'my-ai-assistant',
  description: 'Access context to provide personalized responses'
});

if (permission.granted) {
  console.log('Permission granted!');
}
```

### Get Browsing Context

```javascript
const result = await window.agentMemory.getContext({
  relevanceQuery: 'web development, JavaScript',
  timeRange: { start: Date.now() - (7 * 24 * 60 * 60 * 1000) }, // Last 7 days
  topK: 20
});

if (result.success) {
  console.log('Summary:', result.data.summary);
  console.log('Topics:', result.data.topics);
  console.log('Recent activities:', result.data.recentActivities);
}
```

### Multi-Provider Aggregation

```javascript
// Get aggregated context from all available providers
const result = await window.agentMemory.getAggregatedContext({
  timeRange: { start: Date.now() - (24 * 60 * 60 * 1000) }, // Last 24 hours
  topK: 10
});

if (result.success) {
  console.log('Providers used:', result.providers);
  console.log('Combined context:', result.data);
  console.log('Individual results:', result.providerResults);
}
```

## Context Data Structure

The protocol returns structured browsing data:

```typescript
interface MemoryContext {
  summary: string;              // AI-generated profile summary
  patterns: Pattern[];          // Detected behavioral patterns  
  topics: Topic[];              // User interests and topics
  recentActivities: Activity[]; // Recent browsing activities
}

interface Pattern {
  name: string;                 // Pattern name (e.g. "Software Development")
  description: string;          // Human-readable description
  frequency: number;            // How often this pattern appears (0-1)
  lastSeen: number;            // Unix timestamp of last occurrence
}

interface Topic {
  topic: string;               // Topic name (e.g. "Machine Learning")
  relevance: number;           // Relevance score (0-1)
  keywords: string[];          // Related keywords
}
```

## Error Handling

The protocol uses a consistent error format:

```javascript
const result = await window.agentMemory.getContext(options);

if (!result.success) {
  switch (result.error.code) {
    case 'NOT_AVAILABLE':
      console.log('No memory extension available');
      break;
    case 'PERMISSION_DENIED':
      console.log('User denied permission');
      break;
    case 'NO_DATA':
      console.log('No context data available');
      break;
    case 'PROVIDER_ERROR':
      console.log('Extension error:', result.error.message);
      break;
  }
}
```

## Helper Functions

Use the included helper functions for robust integrations:

```javascript
import { isProtocolAvailable } from '@wamp/protocol';

// Check availability
if (isProtocolAvailable()) {
  // Protocol is immediately available
  const result = await window.agentMemory.getContext({
    relevanceQuery: 'coding',
    timeRange: { start: Date.now() - (7 * 24 * 60 * 60 * 1000) } // Last 7 days
  });
}

// For advanced features like waitForProtocol and getContextSafely,
// use the Client SDK:
import { waitForProtocol, getContextSafely } from '@wamp/client-sdk';
```

## Browser Extension Implementation

> **Note:** While this section describes the manual implementation of the Memory Protocol, we strongly recommend using the **[`@wamp/extension-sdk`](../extension-sdk/README.md)** to build your extension. The SDK handles all the boilerplate code for you, so you can focus on your core logic.

### Extension Integration Pattern

Extensions inject the protocol using this pattern in their content script:

```javascript
// content-script.js - Extension implementation
(function() {
  // Initialize protocol registry if it doesn't exist
  if (!window.agentMemory) {
    window.agentMemory = {
      version: '1.0.0',
      spec: '1.0',
      providers: new Map(),
      
      // Registry methods
      registerProvider(provider) {
        this.providers.set(provider.providerId, provider);
        this.dispatchEvent('providerRegistered', { providerId: provider.providerId });
      },
      
      getProviders() {
        return Array.from(this.providers.values());
      },
      
      getProvider(providerId) {
        return this.providers.get(providerId);
      },
      
      // Convenience methods
      async getContext(options, providerId) {
        const provider = providerId ? this.getProvider(providerId) : this.getProviders()[0];
        if (!provider) throw new Error('No memory provider available');
        return provider.getContext(options);
      },
      
      async getAggregatedContext(options) {
        const providers = this.getProviders();
        if (providers.length === 0) {
          return { success: false, error: { code: 'NOT_AVAILABLE', message: 'No providers' } };
        }
        
        const results = await Promise.allSettled(
          providers.map(p => p.getContext(options))
        );
        
        // Aggregate successful results
        // Implementation depends on aggregation strategy
        return aggregateResults(results, providers);
      },
      
      // Status and discovery
      getStatus() {
        const providers = this.getProviders();
        return {
          available: providers.length > 0,
          providerCount: providers.length,
          providers: providers.map(p => ({
            providerId: p.providerId,
            providerName: p.providerName,
            version: p.version,
            available: true,
            permissionGranted: p.isPermissionGranted?.() || false,
            capabilities: p.getCapabilities?.()?.supportedOptions || []
          })),
          protocolVersion: this.version,
          features: ['context', 'permissions', 'multi-provider']
        };
      },
      
      getInstallationInfo() {
        return {
          available: this.getProviders().length > 0,
          recommendedProviders: [
            {
              providerId: 'squash',
              providerName: 'Squash Browser Memory',
              description: 'Advanced browser memory and context tracking',
              storeUrl: 'https://chromewebstore.google.com/detail/squash-browser-memory-for/cbemgpconhoibnbbgjbeengcojcoeimh',
              features: ['context', 'patterns', 'topics', 'activities']
            }
          ]
        };
      },
      
      // Permission management
      isPermissionGranted(providerId, domain) {
        if (providerId) {
          const provider = this.getProvider(providerId);
          return provider?.isPermissionGranted?.(domain) || false;
        }
        // Check if any provider has permission
        return this.getProviders().some(p => p.isPermissionGranted?.(domain));
      },
      
      async requestPermission(appInfo, providerId) {
        const provider = providerId ? this.getProvider(providerId) : this.getProviders()[0];
        if (!provider) {
          return { granted: false, isFirstTime: true, permissions: [] };
        }
        return provider.requestPermission(appInfo);
      },
      
      // Event handling
      _listeners: new Map(),
      addEventListener(event, callback) {
        if (!this._listeners.has(event)) this._listeners.set(event, new Set());
        this._listeners.get(event).add(callback);
      },
      
      removeEventListener(event, callback) {
        this._listeners.get(event)?.delete(callback);
      },
      
      dispatchEvent(event, data) {
        this._listeners.get(event)?.forEach(callback => callback({ type: event, detail: data }));
        // Also dispatch as window event
        window.dispatchEvent(new CustomEvent(`memoryProtocol:${event}`, { detail: data }));
      }
    };
  }
  
  // Register this extension's provider
  const myProvider = {
    providerId: 'my-extension',
    providerName: 'My Memory Extension',
    version: '1.0.0',
    
    getCapabilities() {
      return {
        supportedOptions: {
          relevanceQuery: true,
          timeRange: true,
          topK: true,
          format: true,
          categories: true
        },
        topK: 100,
        formats: ['raw', 'structured', 'narrative'],
        categories: ['browsing', 'search', 'documents']
      };
    },
    
    getProviderInfo() {
      return {
        providerId: this.providerId,
        providerName: this.providerName,
        version: this.version,
        description: 'Advanced browser memory and context tracking',
        author: 'My Extension Team',
        website: 'https://myextension.com',
        features: ['context', 'patterns', 'topics', 'activities'],
        permissions: ['context', 'history']
      };
    },
    
    async getContext(options = {}) {
      // Check permissions
      if (!this.isPermissionGranted()) {
        return {
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: 'Permission required to access browsing context',
            recoverable: true,
            suggestedAction: 'Request permission'
          },
          metadata: {
            generatedAt: Date.now(),
            provider: { id: this.providerId, name: this.providerName, version: this.version },
            dataSource: { timeRange: { start: 0, end: 0 }, categories: [] }
          }
        };
      }
      
      try {
        // Extension-specific context generation
        const contextData = await this.generateContext(options);
        
        return {
          success: true,
          data: contextData,
          metadata: {
            generatedAt: Date.now(),
            provider: {
              id: this.providerId,
              name: this.providerName,
              version: this.version
            },
            dataSource: {
              timeRange: options.timeRange || { start: Date.now() - (7 * 24 * 60 * 60 * 1000), end: Date.now() },
              categories: options.categories || ['browsing'],
            }
          }
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'PROVIDER_ERROR',
            message: error.message,
            recoverable: false
          },
          metadata: {
            generatedAt: Date.now(),
            provider: { id: this.providerId, name: this.providerName, version: this.version },
            dataSource: { timeRange: { start: 0, end: 0 }, categories: [] }
          }
        };
      }
    },
    
    isPermissionGranted(domain = window.location.hostname) {
      // Check extension's permission storage
      return chrome.storage.sync.get([`permission_${domain}`])
        .then(result => result[`permission_${domain}`] === true);
    },
    
    async requestPermission(appInfo) {
      // Show extension's permission dialog
      const granted = await this.showPermissionDialog(appInfo);
      
      if (granted) {
        // Store permission
        const domain = appInfo.domain || window.location.hostname;
        await chrome.storage.sync.set({ [`permission_${domain}`]: true });
        
        // Dispatch event
        window.agentMemory.dispatchEvent('permissionGranted', {
          providerId: this.providerId,
          domain,
          appInfo
        });
      }
      
      return {
        granted,
        isFirstTime: !(await this.hasSeenPermissionDialog(appInfo)),
        permissions: granted ? ['context'] : [],
        domain: appInfo.domain || window.location.hostname
      };
    },
    
    async generateContext(options) {
      // Implementation depends on extension's data sources
      return {
        summary: "User shows interest in web development and AI",
        patterns: [
          {
            name: "Software Development",
            description: "Regular visits to coding resources",
            frequency: 0.8,
            lastSeen: Date.now(),
            confidence: 0.9
          }
        ],
        topics: [
          {
            topic: "Web Development",
            relevance: 0.9,
            keywords: ["javascript", "react", "typescript"],
            category: "technology"
          }
        ],
        recentActivities: [
          {
            activity: "Visited GitHub repository",
            timestamp: Date.now() - 3600000,
            relevance: 0.8,
            category: "development",
            url: "https://github.com/example/repo"
          }
        ]
      };
    }
  };
  
  window.agentMemory.registerProvider(myProvider);
  
  // Notify that provider is ready
  window.dispatchEvent(new CustomEvent('agentMemoryReady', {
    detail: { providerId: 'my-extension' }
  }));
})();
```

### Implementation Steps

1. **Create Protocol Registry**: Initialize `window.agentMemory` if it doesn't exist
2. **Register Provider**: Implement the `MemoryProvider` interface for your extension
3. **Handle Permissions**: Implement permission checking and requesting
4. **Generate Context**: Process user data and return structured context
5. **Dispatch Events**: Notify when your provider is ready

### Key Interface Requirements

```typescript
interface MemoryProvider {
  readonly providerId: string;           // Unique identifier
  readonly providerName: string;         // Display name
  readonly version: string;              // Provider version
  
  getCapabilities(): ProviderCapabilities;
  getProviderInfo(): ProviderInfo;
  isPermissionGranted(domain?: string): boolean;
  requestPermission(appInfo: AppInfo): Promise<PermissionResult>;
  getContext(options?: ContextOptions): Promise<ProviderContextResult>;
}
```

See [Reference Extension](../examples/extensions/demo-extension/) for a complete working implementation.

## Browser Compatibility

The protocol works in all modern browsers that support:
- `window` object injection
- ES2017+ async/await
- CustomEvent API

This includes Chrome, Firefox, Safari, Edge, and most mobile browsers.

## Security & Privacy

- Extensions control all data access and filtering
- Users must explicitly grant permission per domain
- No sensitive data is included in context by default
- Permissions can be revoked at any time
- All data processing happens locally in the browser