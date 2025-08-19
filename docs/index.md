# Web Agent Memory Protocol (WAMP): Building a Shared Memory Layer for the Web

<div align="center">

[![GitHub stars](https://img.shields.io/github/stars/web-agent-memory/web-agent-memory-protocol?style=social)](https://github.com/web-agent-memory/web-agent-memory-protocol/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/web-agent-memory/web-agent-memory-protocol?style=social)](https://github.com/web-agent-memory/web-agent-memory-protocol/fork)
[![GitHub](https://img.shields.io/github/license/web-agent-memory/web-agent-memory-protocol)](https://github.com/web-agent-memory/web-agent-memory-protocol/blob/main/LICENSE)

**[📖 View Repository](https://github.com/web-agent-memory/web-agent-memory-protocol)**

</div>

Over the past year, an interesting trend has emerged in the world of AI assistants.
A handful of browser extensions, like [OpenMemory](https://chromewebstore.google.com/detail/openmemory/onihkkbipkfeijkadecaafbgagkhglop), [MemSync](https://chromewebstore.google.com/detail/memsync/ekhglfoplnmigdhkifhegcdjmjkbljom), and [Squash](https://chromewebstore.google.com/detail/squash-browser-memory-for/cbemgpconhoibnbbgjbeengcojcoeimh), have begun experimenting with ways to give AI models "memory" across websites.
The idea is simple: instead of each app starting from scratch, your AI should be able to recall your preferences, your workflows, and even your style of writing.
In practice, however, every one of these projects has had to reinvent the wheel.

Today, most extensions hack their way into context-sharing.
They scrape chat logs from ChatGPT, Claude, or Perplexity.
They inject text directly into the page.
They build one-off integrations, site by site, with brittle assumptions about DOM structures.
It works, but only barely.
Each new app means another round of patchwork engineering.

That's where we started asking: what if memory was a first-class web primitive?
What if AI agents could talk to a shared memory layer as easily as they check for `navigator.geolocation`?
That question led to the creation of the **[Web Agent Memory Protocol (WAMP)](https://github.com/web-agent-memory/web-agent-memory-protocol)**.

---

## Why Now?

We’re at a turning point.
More and more apps are shipping with embedded AI agents, and users are beginning to expect them to feel personal.
But real personalization requires context.
Without it, every assistant is stuck playing the role of a clever but forgetful stranger.

The rise of these extensions shows that the demand is already here.
What’s missing is standardization.
Without it, we’re headed for a fragmented ecosystem of siloed memories, each trapped inside its own app.
The web works best when shared APIs make capabilities universal.
Memory should be no different.

---

## Introducing WAMP

The **[Web Agent Memory Protocol (WAMP)](https://github.com/web-agent-memory/web-agent-memory-protocol)** is a standardized browser API that lets extensions expose structured, contextual memory to any website or AI agent.
It defines a minimal surface area that both sides can rely on.

Instead of building brittle, app-specific integrations, sites can just ask: *what’s relevant for this user right now?* Extensions handle the details of how memory is stored, scored, and updated.

Think of it as a plug-and-play layer for contextual computing:

*   **Websites** can request and contribute memory in a structured way.
*   **Extensions** can decide what memory to expose and how to generate it.
*   **Users** stay in control of what's shared, with explicit permissions and revocable access.

---

## The WAMP Specification

[WAMP](https://github.com/web-agent-memory/web-agent-memory-protocol) defines a native browser API specification that extensions implement by injecting `window.agentMemory`.
The spec includes standardized methods for reading context, writing memories, and managing permissions.

### Core API Overview

```typescript
interface AgentMemoryRegistry {
  // Core properties
  ...
  
  // Provider management
  registerProvider(provider: MemoryProvider): void
  unregisterProvider(providerId: string): boolean
  getProviders(): MemoryProvider[]
  getProvider(providerId: string): MemoryProvider | undefined
  
  // Read operations
  getContext(options?: ContextOptions, providerId?: string): Promise<ContextResult>
  getAggregatedContext(options?: ContextOptions): Promise<AggregatedContextResult>
  
  // Write operations
  provideContext(context: WebAgentContext, options?: WebAgentContextOptions, providerId?: string): Promise<ContextProvisionResult>
  contributeMemory(memories: Memory[], source: string, providerId?: string): Promise<ContextProvisionResult>
  
  // Permissions & status
  requestPermission(appInfo: AppInfo, providerId?: string): Promise<PermissionResult>
  isPermissionGranted(providerId?: string, domain?: string): boolean
  getStatus(): ProtocolStatus
  getInstallationInfo(): InstallationInfo
}
```

For the examples below, we'll demonstrate the protocol using our reference implementation to give you a better feel for how the specification works in practice.
**Note: This is experimental code developed alongside the specification.**

### Reading from Memory

To request context from the user's memory, an application can use the `getContext` method.
This allows the application to retrieve relevant information within a specified time range.

```typescript
// Development/experimental code - not published on NPM
import { initMemoryClient, getContext } from '../client-sdk';

const client = await initMemoryClient({
  appName: 'My AI Assistant', 
  appId: 'my-ai-assistant'
});

const result = await getContext(client, {
  timeRange: { start: Date.now() - 7 * 24 * 60 * 60 * 1000 } // Last 7 days
});

if (result.success) {
  console.log('User context:', result.data.memories);
}
```

### Writing to Memory

The most exciting part is that [WAMP](https://github.com/web-agent-memory/web-agent-memory-protocol) isn't just about reading from memory.
It also supports writing back.
Through `provideContext`, apps can contribute new experiences or observations into the memory layer.

For demonstration purposes, we'll show examples using our reference implementation (though the native `window.agentMemory` API works identically):

```typescript
// Development/experimental code
import { initMemoryClient, provideContext, createConversationContext } from '../client-sdk';

const client = await initMemoryClient({
  appName: 'My AI Assistant',
  appId: 'my-ai-assistant'
});

const conversation = [
  { role: 'user', content: 'Tell me about memory protocol' },
  { role: 'assistant', content: 'It is a standard for web applications...' }
];

await provideContext(client, createConversationContext(conversation));
```

AI agents don’t just consume context; they enrich it.
Your assistant can log useful summaries, store preferences, or note corrections you’ve made.
Over time, your memory becomes a richer, more accurate reflection of you.

### The Core Data Model

At the heart of the protocol are **memories**: atomic, timestamped, relevance-scored observations.
This structure makes memory interoperable across apps.
One extension might just remember the last few things you read.
Another might build a full knowledge graph of your work.
As long as they speak the same protocol, any website can consume the context without knowing how it was generated.

```typescript
interface Memory {
  text: string;          // Natural language description
  relevance: number;     // 0–1 relevance score
  timestamp: number;     // Unix epoch
  source: string;        // e.g.
'browsing', 'ide', 'search'
  metadata?: Record<string, unknown>;
}
```

---

## Privacy and Permissions

From day one, privacy has to be built in.
[WAMP](https://github.com/web-agent-memory/web-agent-memory-protocol) follows a discrete permission model:

*   Apps request explicit consent per domain.
*   Users can grant, deny, or revoke at any time.
*   No central storage.
The protocol only defines an interface, not a backend.

That means your memory belongs to you, not to us.
The protocol ensures portability without centralizing control.

### Security Considerations

**⚠️ Current Limitations:** The current specification has several security vulnerabilities that we are actively working to address:

*   **Application Identity**: Apps currently self-declare their identity (`appName`, `appId`) without cryptographic verification, making impersonation attacks possible
*   **Domain-Based Permissions**: The current domain-based permission model is insufficient for preventing malicious websites from social engineering users
*   **No Origin Verification**: Extensions don't verify that requesting origins match expected legitimate applications

**Roadmap to Production Security:**
*   Application registry with verified identities
*   Cryptographic signatures for app authentication  
*   Enhanced user consent UI with clear trust indicators
*   Origin verification and allowlisting mechanisms

This initial specification prioritizes developer experience and protocol adoption.
As the ecosystem matures, we will implement robust security measures to make [WAMP](https://github.com/web-agent-memory/web-agent-memory-protocol) suitable for production deployments with sensitive user data.

---

## How This Helps Existing Projects

Returning to the projects that inspired this work:

*   **[OpenMemory](https://chromewebstore.google.com/detail/openmemory/onihkkbipkfeijkadecaafbgagkhglop)** could use the protocol to share its stored notes with any AI app, no scraping required.
*   **[MemSync](https://chromewebstore.google.com/detail/memsync/ekhglfoplnmigdhkifhegcdjmjkbljom)** could sync context between apps using the same data model, instead of custom glue.
*   **[Squash](https://chromewebstore.google.com/detail/squash-browser-memory-for/cbemgpconhoibnbbgjbeengcojcoeimh)** could export the browsing history it captures into a standardized interface, making it universally useful.

Instead of siloed experiments, these extensions could plug into a common ecosystem.

### Building Extensions

For extension developers, implementing [WAMP](https://github.com/web-agent-memory/web-agent-memory-protocol) is equally straightforward.
Here's how you'd create a basic memory provider:

```typescript
// Development/experimental code
import { initializeExtension } from '../extension-sdk';

// Initialize extension with provider configuration
await initializeExtension({
  providerId: 'my-extension',
  providerName: 'My Memory Extension',
  version: '1.0.0',
  
  // Implement the getContextData method
  async getContextData(options) {
    const memories = await getBrowsingHistory(options?.timeRange);
    
    return {
      memories: memories.map(item => ({
        text: `User visited ${item.title}`,
        relevance: 0.7,
        timestamp: item.lastVisitTime,
        source: 'browsing',
        metadata: { url: item.url, domain: item.domain }
      }))
    };
  }
});

// The extension automatically registers the provider and makes window.agentMemory available
```

---

## The Bigger Picture

Standardizing memory is about more than saving developers time.
It’s about giving users agency.
In a world full of AI agents, your personal memory layer is one of the most valuable digital assets you own.
You should be able to pick which provider builds it, which apps can read it, and what it contains.

By decoupling memory from apps themselves, we move toward a healthier ecosystem: one where assistants feel genuinely personal, but without locking you into a single vendor’s silo.

---

## What's Next: Building the Spec Together

This repository represents our active effort to develop a [Web Agent Memory Protocol (WAMP)](https://github.com/web-agent-memory/web-agent-memory-protocol) specification alongside working reference implementations.
We're theorizing about what this API should look like while building, testing, and iterating on it.

This is very much a work-in-progress. We're developing the specification and the code together, using the reference implementation to validate that the protocol works as intended.
The goal is to create something that developers will actually want to use, not just a theoretical specification.

### How to Contribute

**For App Developers**
*   **Experiment with the direct API**: Test `window.agentMemory` integration patterns
*   **Try the development SDK**: Clone the repo and experiment with our TypeScript utilities
*   **Provide feedback**: What API patterns feel natural?
What's missing?

**For Extension Builders**  
*   **Build prototype providers**: Use our extension SDK to create test implementations
*   **Test the specification**: Does the protocol cover your use cases?
*   **Share your findings**: What works?
What doesn't?

**For Everyone**
*   **Review the spec**: Read through our type definitions and API design
*   **Run the examples**: Clone and experiment with our reference implementations
*   **Open issues**: Found problems?
Have ideas?
We want to hear them
*   **Join the discussion**: Help us shape this protocol before it's "done"

The web didn't get powerful because every site reinvented location APIs.
It got powerful because they shared a standard.
Memory should be no different.

---

## Authors

**[Victor Huang](https://github.com/victorhuangwq)** and **[Kingston Kuan](https://github.com/kstonekuan)**

*August 19, 2025*

---

<div align="center">

[![GitHub stars](https://img.shields.io/github/stars/web-agent-memory/web-agent-memory-protocol?style=social)](https://github.com/web-agent-memory/web-agent-memory-protocol/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/web-agent-memory/web-agent-memory-protocol?style=social)](https://github.com/web-agent-memory/web-agent-memory-protocol/fork)
[![GitHub](https://img.shields.io/github/license/web-agent-memory/web-agent-memory-protocol)](https://github.com/web-agent-memory/web-agent-memory-protocol/blob/main/LICENSE)

**[📖 View Repository](https://github.com/web-agent-memory/web-agent-memory-protocol)**

</div>