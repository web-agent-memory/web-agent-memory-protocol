/**
 * Memory Protocol Demo Extension - Background Service Worker
 * Handles extension lifecycle and provides storage/API access for content scripts
 */

// Extension lifecycle
chrome.runtime.onInstalled.addListener((details) => {
	console.log("Memory Protocol Demo Extension installed:", details);

	if (details.reason === "install") {
		// First time installation
		chrome.storage.local.set({
			agentMemorySettings: {
				version: "1.0.0",
				installedAt: Date.now(),
				enabled: true,
			},
		});
	}
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
	console.log("Memory Protocol Demo Extension started");
});

// Message handling between content script and background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	console.log("Background received message:", message, "from:", sender);

	switch (message.action) {
		case "getStoredData":
			handleGetStoredData(message, sendResponse);
			return true; // Will respond asynchronously

		case "storeData":
			handleStoreData(message, sendResponse);
			return true;

		case "getBrowsingHistory":
			handleGetBrowsingHistory(message, sendResponse);
			return true;

		case "getTabInfo":
			handleGetTabInfo(message, sendResponse);
			return true;

		case "logAnalytics":
			handleLogAnalytics(message, sendResponse);
			return false; // Synchronous response

		default:
			console.warn("Unknown message action:", message.action);
			sendResponse({ error: "Unknown action" });
			return false;
	}
});

/**
 * Handle requests for stored data
 */
async function handleGetStoredData(message, sendResponse) {
	try {
		const { keys } = message;
		const data = await chrome.storage.local.get(keys);
		sendResponse({ success: true, data });
	} catch (error) {
		console.error("Error getting stored data:", error);
		sendResponse({ success: false, error: error.message });
	}
}

/**
 * Handle data storage requests
 */
async function handleStoreData(message, sendResponse) {
	try {
		const { data } = message;
		await chrome.storage.local.set(data);
		sendResponse({ success: true });
	} catch (error) {
		console.error("Error storing data:", error);
		sendResponse({ success: false, error: error.message });
	}
}

/**
 * Handle browsing history requests (for context generation)
 */
async function handleGetBrowsingHistory(message, sendResponse) {
	try {
		const {
			timeRange = { start: Date.now() - 7 * 24 * 60 * 60 * 1000 },
			maxResults = 100,
		} = message;

		// Query browsing history
		const historyItems = await chrome.history.search({
			text: "",
			startTime: timeRange.start,
			endTime: timeRange.end || Date.now(),
			maxResults,
		});

		// Process and anonymize history data
		const processedHistory = historyItems
			.filter((item) => item.visitCount > 0)
			.map((item) => ({
				title: item.title,
				url: anonymizeUrl(item.url),
				visitCount: item.visitCount,
				lastVisitTime: item.lastVisitTime,
				domain: new URL(item.url).hostname,
			}))
			.sort((a, b) => b.lastVisitTime - a.lastVisitTime);

		sendResponse({
			success: true,
			data: {
				items: processedHistory,
				timeRange,
				totalItems: processedHistory.length,
				generatedAt: Date.now(),
			},
		});
	} catch (error) {
		console.error("Error getting browsing history:", error);
		sendResponse({ success: false, error: error.message });
	}
}

/**
 * Handle tab information requests
 */
async function handleGetTabInfo(_message, sendResponse) {
	try {
		const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
		const activeTab = tabs[0];

		if (activeTab) {
			sendResponse({
				success: true,
				data: {
					url: activeTab.url,
					title: activeTab.title,
					domain: new URL(activeTab.url).hostname,
					id: activeTab.id,
				},
			});
		} else {
			sendResponse({ success: false, error: "No active tab found" });
		}
	} catch (error) {
		console.error("Error getting tab info:", error);
		sendResponse({ success: false, error: error.message });
	}
}

/**
 * Handle analytics logging
 */
function handleLogAnalytics(message, sendResponse) {
	const { event, data } = message;

	// For demo purposes, just log to console
	// In a real extension, this would send to an analytics service
	console.log("Analytics Event:", event, data);

	// Could store locally for debugging
	chrome.storage.local.get(["analyticsLog"]).then((result) => {
		const log = result.analyticsLog || [];
		log.push({
			event,
			data,
			timestamp: Date.now(),
			url: data.url,
		});

		// Keep only last 100 events
		if (log.length > 100) {
			log.splice(0, log.length - 100);
		}

		chrome.storage.local.set({ analyticsLog: log });
	});

	sendResponse({ success: true });
}

/**
 * Anonymize URLs for privacy
 */
function anonymizeUrl(url) {
	try {
		const urlObj = new URL(url);

		// Remove query parameters and fragments for privacy
		return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
	} catch (error) {
		console.error("Error anonymizing URL:", url, error);
		return "[invalid-url]";
	}
}

/**
 * Generate context data based on browsing history
 * This is called by the content script when needed
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
	if (message.action === "generateContext") {
		generateContextFromHistory(message.options)
			.then((context) => sendResponse({ success: true, context }))
			.catch((error) => sendResponse({ success: false, error: error.message }));
		return true;
	}
});

async function generateContextFromHistory(options = {}) {
	const {
		timeRange = {
			start: Date.now() - 7 * 24 * 60 * 60 * 1000,
			end: Date.now(),
		},
		relevanceQuery,
	} = options;

	try {
		// Get browsing history
		const historyResponse = await new Promise((resolve) => {
			handleGetBrowsingHistory({ timeRange }, resolve);
		});

		if (!historyResponse.success) {
			throw new Error("Failed to get browsing history");
		}

		const historyItems = historyResponse.data.items;

		// Analyze browsing patterns
		const patterns = analyzeBrowsingPatterns(historyItems);
		const topics = extractTopics(historyItems, relevanceQuery);
		const activities = generateActivities(historyItems);

		// Generate summary
		const topTopics = topics
			.slice(0, 3)
			.map((t) => t.topic)
			.join(", ");
		const summary =
			`User shows interest in ${topTopics}. ` +
			`Browsing patterns indicate ${patterns.length > 0 ? patterns[0].name : "varied activity"}.`;

		return {
			summary,
			patterns,
			topics,
			recentActivities: activities,
		};
	} catch (error) {
		console.error("Error generating context:", error);
		throw error;
	}
}

function analyzeBrowsingPatterns(historyItems) {
	// Simple pattern analysis based on domains and visit frequency
	const domainStats = {};

	historyItems.forEach((item) => {
		if (!domainStats[item.domain]) {
			domainStats[item.domain] = { count: 0, lastVisit: 0 };
		}
		domainStats[item.domain].count += item.visitCount;
		domainStats[item.domain].lastVisit = Math.max(
			domainStats[item.domain].lastVisit,
			item.lastVisitTime,
		);
	});

	const patterns = [];

	// Identify development pattern
	const devDomains = [
		"github.com",
		"stackoverflow.com",
		"developer.mozilla.org",
		"docs.google.com",
	];
	const devVisits = devDomains.reduce(
		(sum, domain) => sum + (domainStats[domain]?.count || 0),
		0,
	);

	if (devVisits > 10) {
		patterns.push({
			name: "Software Development",
			description: "Regular visits to development resources and documentation",
			frequency: Math.min(devVisits / 100, 1),
			lastSeen: Math.max(
				...devDomains.map((d) => domainStats[d]?.lastVisit || 0),
			),
		});
	}

	return patterns;
}

function extractTopics(historyItems, relevanceQuery) {
	// Simple topic extraction based on domains and titles
	const topics = new Map();

	historyItems.forEach((item) => {
		const domain = item.domain.toLowerCase();

		// Map domains to topics
		if (domain.includes("github") || domain.includes("git")) {
			addTopic(
				topics,
				"Software Development",
				["git", "github", "code", "development"],
				0.9,
			);
		} else if (
			domain.includes("stackoverflow") ||
			domain.includes("stackexchange")
		) {
			addTopic(
				topics,
				"Programming Q&A",
				["programming", "debugging", "solutions"],
				0.8,
			);
		} else if (domain.includes("developer") || domain.includes("docs")) {
			addTopic(
				topics,
				"Technical Documentation",
				["documentation", "api", "reference"],
				0.7,
			);
		} else if (
			domain.includes("youtube") &&
			item.title?.toLowerCase().includes("tutorial")
		) {
			addTopic(
				topics,
				"Learning Resources",
				["tutorial", "learning", "education"],
				0.6,
			);
		}
	});

	let topicArray = Array.from(topics.values());

	// Filter by relevance query if provided
	if (relevanceQuery) {
		const query = relevanceQuery.toLowerCase();
		topicArray = topicArray.filter(
			(topic) =>
				topic.keywords.some((keyword) => keyword.includes(query)) ||
				topic.topic.toLowerCase().includes(query),
		);
	}

	return topicArray.sort((a, b) => b.relevance - a.relevance);
}

function addTopic(topics, name, keywords, relevance) {
	if (topics.has(name)) {
		const existing = topics.get(name);
		existing.relevance = Math.max(existing.relevance, relevance);
		existing.keywords = [...new Set([...existing.keywords, ...keywords])];
	} else {
		topics.set(name, {
			topic: name,
			relevance,
			keywords,
		});
	}
}

function generateActivities(historyItems) {
	return historyItems
		.slice(0, 10)
		.map((item) => ({
			activity: `Visited ${item.domain}: ${item.title?.substring(0, 50) || "Untitled"}`,
			timestamp: item.lastVisitTime,
			relevance: Math.min(item.visitCount / 10, 1),
			category: categorizeActivity(item.domain),
			url: item.url,
		}))
		.sort((a, b) => b.timestamp - a.timestamp);
}

function categorizeActivity(domain) {
	if (domain.includes("github") || domain.includes("git")) return "development";
	if (domain.includes("stackoverflow") || domain.includes("stackexchange"))
		return "problem-solving";
	if (domain.includes("developer") || domain.includes("docs"))
		return "documentation";
	if (domain.includes("youtube") || domain.includes("tutorial"))
		return "learning";
	if (domain.includes("news") || domain.includes("blog")) return "reading";
	return "browsing";
}
