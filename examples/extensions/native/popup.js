/**
 * Memory Protocol Demo Extension - Popup Script
 * Provides UI for testing and debugging the Memory Protocol
 */

document.addEventListener("DOMContentLoaded", async () => {
	const log = document.getElementById("log");
	const statusElement = document.getElementById("status");
	const statusText = document.getElementById("statusText");

	// Initialize popup
	logMessage("Popup initialized", "info");
	await updateStatus();
	await updateProtocolInfo();

	// Event listeners
	document
		.getElementById("testApiBtn")
		.addEventListener("click", testProtocolAPI);
	document
		.getElementById("requestPermissionBtn")
		.addEventListener("click", requestPermission);
	document
		.getElementById("generateContextBtn")
		.addEventListener("click", generateContext);
	document.getElementById("clearLogBtn").addEventListener("click", clearLog);

	/**
	 * Update extension status
	 */
	async function updateStatus() {
		try {
			const tabs = await chrome.tabs.query({
				active: true,
				currentWindow: true,
			});
			const activeTab = tabs[0];

			if (activeTab) {
				document.getElementById("currentDomain").textContent = new URL(
					activeTab.url,
				).hostname;

				// Check if content script is injected by testing for protocol
				const results = await chrome.scripting.executeScript({
					target: { tabId: activeTab.id },
					func: () => typeof window.agentMemory !== "undefined",
				});

				if (results?.[0]) {
					statusElement.className = "status";
					statusText.textContent = "Protocol API successfully injected";
					logMessage("Protocol API is available on current tab", "success");
				} else {
					statusElement.className = "status error";
					statusText.textContent = "Protocol API not found. Refresh the page.";
					logMessage("Protocol API not found on current tab", "error");
				}
			} else {
				statusElement.className = "status error";
				statusText.textContent = "No active tab found";
			}
		} catch (error) {
			statusElement.className = "status error";
			statusText.textContent = `Error checking status: ${error.message}`;
			logMessage(`Error checking status: ${error.message}`, "error");
		}
	}

	/**
	 * Update protocol information
	 */
	async function updateProtocolInfo() {
		try {
			const tabs = await chrome.tabs.query({
				active: true,
				currentWindow: true,
			});
			const activeTab = tabs[0];

			if (activeTab) {
				const results = await chrome.scripting.executeScript({
					target: { tabId: activeTab.id },
					func: () => {
						if (window.agentMemory) {
							const status = window.agentMemory.getStatus();
							const provider = window.agentMemory.getProvider("demo-extension");
							return {
								protocolVersion: window.agentMemory.version,
								permissionGranted: provider
									? provider.isPermissionGranted()
									: false,
								providerCount: status.providerCount,
							};
						} else {
							return null;
						}
					},
				});

				if (results?.[0]) {
					const info = results[0];
					document.getElementById("protocolVersion").textContent =
						info.protocolVersion || "Unknown";
					document.getElementById("permissionStatus").textContent =
						info.permissionGranted ? "Granted" : "Not Granted";
				}
			}
		} catch (error) {
			logMessage(`Error updating protocol info: ${error.message}`, "error");
		}
	}

	/**
	 * Test the Protocol API
	 */
	async function testProtocolAPI() {
		logMessage("Testing Protocol API...", "info");

		try {
			const tabs = await chrome.tabs.query({
				active: true,
				currentWindow: true,
			});
			const activeTab = tabs[0];

			const results = await chrome.scripting.executeScript({
				target: { tabId: activeTab.id },
				func: async () => {
					if (!window.agentMemory) {
						return { error: "Protocol not available" };
					}

					try {
						// Test basic API methods
						const status = window.agentMemory.getStatus();
						const providers = window.agentMemory.getProviders();
						const installInfo = window.agentMemory.getInstallationInfo();

						return {
							success: true,
							status,
							providerCount: providers.length,
							providerId: providers[0]?.providerId,
							installInfo: installInfo.available,
						};
					} catch (error) {
						return { error: error.message };
					}
				},
			});

			if (results?.[0]) {
				const result = results[0];

				if (result.error) {
					logMessage(`API Test Failed: ${result.error}`, "error");
				} else {
					logMessage("API Test Successful:", "success");
					logMessage(
						`- Protocol Available: ${result.status.available}`,
						"info",
					);
					logMessage(`- Provider Count: ${result.providerCount}`, "info");
					logMessage(`- Provider ID: ${result.providerId}`, "info");
					logMessage(`- Installation Info: ${result.installInfo}`, "info");
				}
			}
		} catch (error) {
			logMessage(`Test failed: ${error.message}`, "error");
		}
	}

	/**
	 * Request permission from the protocol
	 */
	async function requestPermission() {
		logMessage("Requesting permission...", "info");

		try {
			const tabs = await chrome.tabs.query({
				active: true,
				currentWindow: true,
			});
			const activeTab = tabs[0];

			const results = await chrome.scripting.executeScript({
				target: { tabId: activeTab.id },
				func: async () => {
					if (!window.agentMemory) {
						return { error: "Protocol not available" };
					}

					try {
						const result = await window.agentMemory.requestPermission({
							appName: "Memory Protocol Demo Popup",
							appId: "demo-popup",
							description: "Testing permission flow from extension popup",
						});

						return { success: true, result };
					} catch (error) {
						return { error: error.message };
					}
				},
			});

			if (results?.[0]) {
				const response = results[0];

				if (response.error) {
					logMessage(`Permission request failed: ${response.error}`, "error");
				} else {
					const granted = response.result.granted;
					logMessage(
						`Permission ${granted ? "granted" : "denied"}`,
						granted ? "success" : "error",
					);

					if (granted) {
						logMessage(`- First time: ${response.result.isFirstTime}`, "info");
						logMessage(
							`- Permissions: ${response.result.permissions.join(", ")}`,
							"info",
						);
						await updateProtocolInfo(); // Refresh permission status
					}
				}
			}
		} catch (error) {
			logMessage(`Permission request error: ${error.message}`, "error");
		}
	}

	/**
	 * Generate and display context
	 */
	async function generateContext() {
		logMessage("Generating context...", "info");

		try {
			const tabs = await chrome.tabs.query({
				active: true,
				currentWindow: true,
			});
			const activeTab = tabs[0];

			const results = await chrome.scripting.executeScript({
				target: { tabId: activeTab.id },
				func: async () => {
					if (!window.agentMemory) {
						return { error: "Protocol not available" };
					}

					try {
						const result = await window.agentMemory.getContext({
							topK: 10,
							timeRange: {
								start: Date.now() - 24 * 60 * 60 * 1000,
								end: Date.now(),
							},
							format: "structured",
						});

						return { success: true, result };
					} catch (error) {
						return { error: error.message };
					}
				},
			});

			if (results?.[0]) {
				const response = results[0];

				if (response.error) {
					logMessage(`Context generation failed: ${response.error}`, "error");
				} else if (response.result.success) {
					const context = response.result.data;
					const metadata = response.result.metadata;

					logMessage("Context generated successfully:", "success");
					logMessage(
						`- Summary: ${context.summary.substring(0, 100)}...`,
						"info",
					);
					logMessage(`- Topics: ${context.topics.length}`, "info");
					logMessage(`- Patterns: ${context.patterns.length}`, "info");
					logMessage(
						`- Activities: ${context.recentActivities.length}`,
						"info",
					);
					logMessage(`- Provider: ${metadata.provider.name}`, "info");
				} else {
					logMessage(
						"Context generation failed: " +
							(response.result.error?.message || "Unknown error"),
						"error",
					);
				}
			}
		} catch (error) {
			logMessage(`Context generation error: ${error.message}`, "error");
		}
	}

	/**
	 * Clear the activity log
	 */
	function clearLog() {
		log.innerHTML = '<div class="log-entry">Log cleared</div>';
	}

	/**
	 * Log a message to the activity log
	 */
	function logMessage(message, type = "info") {
		const entry = document.createElement("div");
		entry.className = `log-entry ${type}`;
		entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;

		log.appendChild(entry);
		log.scrollTop = log.scrollHeight;

		// Limit log entries
		const entries = log.querySelectorAll(".log-entry");
		if (entries.length > 50) {
			entries[0].remove();
		}
	}

	// Refresh status when tab changes
	chrome.tabs.onActivated.addListener(updateStatus);
	chrome.tabs.onUpdated.addListener(updateStatus);
});
