/**
 * Analytics Manager for Memory Protocol SDK
 * Handles event tracking and usage analytics
 */

export interface AnalyticsEvent {
	name: string;
	properties?: Record<string, unknown>;
	timestamp: number;
	sessionId?: string;
}

export interface AnalyticsConfig {
	enabled: boolean;
	endpoint?: string;
	apiKey?: string;
	sessionTimeout?: number; // in milliseconds
	bufferSize?: number; // number of events to buffer before sending
	debug?: boolean;
}

/**
 * Analytics Manager Class
 * Provides analytics tracking for SDK usage and performance
 */
export class AnalyticsManager {
	private enabled: boolean;
	private config: AnalyticsConfig;
	private sessionId: string;
	private eventBuffer: AnalyticsEvent[] = [];
	private sessionStartTime: number;
	private lastActivityTime: number;

	constructor(enabled = false, config: Partial<AnalyticsConfig> = {}) {
		this.enabled = enabled;
		this.config = {
			enabled,
			sessionTimeout: 30 * 60 * 1000, // 30 minutes
			bufferSize: 10,
			debug: false,
			...config,
		};

		this.sessionId = this.generateSessionId();
		this.sessionStartTime = Date.now();
		this.lastActivityTime = Date.now();

		if (this.enabled) {
			this.initializeAnalytics();
		}
	}

	/**
	 * Track an event
	 */
	track(eventName: string, properties: Record<string, unknown> = {}): void {
		if (!this.enabled) {
			return;
		}

		this.updateActivity();

		const event: AnalyticsEvent = {
			name: eventName,
			properties: {
				...properties,
				sdk_version: "2.0.0",
				session_id: this.sessionId,
				user_agent: this.getUserAgent(),
				url: this.getCurrentUrl(),
				referrer: document.referrer,
				timestamp: Date.now(),
			},
			timestamp: Date.now(),
			sessionId: this.sessionId,
		};

		this.eventBuffer.push(event);

		if (this.config.debug) {
			console.log("Memory Analytics:", eventName, properties);
		}

		// Send buffered events if buffer is full
		if (this.eventBuffer.length >= (this.config.bufferSize || 10)) {
			this.flush();
		}
	}

	/**
	 * Track timing event (duration in milliseconds)
	 */
	trackTiming(
		eventName: string,
		duration: number,
		properties: Record<string, unknown> = {},
	): void {
		this.track(eventName, {
			...properties,
			duration,
			duration_seconds: Math.round(duration / 1000),
			event_type: "timing",
		});
	}

	/**
	 * Track error event
	 */
	trackError(
		error: Error | string,
		context: Record<string, unknown> = {},
	): void {
		const errorMessage = error instanceof Error ? error.message : error;
		const errorStack = error instanceof Error ? error.stack : undefined;

		this.track("error", {
			...context,
			error_message: errorMessage,
			error_stack: errorStack,
			event_type: "error",
		});
	}

	/**
	 * Track page view or context change
	 */
	trackPageView(properties: Record<string, unknown> = {}): void {
		this.track("page_view", {
			...properties,
			page_url: this.getCurrentUrl(),
			page_title: document.title,
			event_type: "pageview",
		});
	}

	/**
	 * Start timing an operation
	 */
	startTiming(operationName: string): () => void {
		const startTime = Date.now();

		return (properties: Record<string, unknown> = {}) => {
			const duration = Date.now() - startTime;
			this.trackTiming(`${operationName}_completed`, duration, properties);
		};
	}

	/**
	 * Track user interaction
	 */
	trackInteraction(
		element: string,
		action: string,
		properties: Record<string, unknown> = {},
	): void {
		this.track("user_interaction", {
			...properties,
			element,
			action,
			event_type: "interaction",
		});
	}

	/**
	 * Track performance metric
	 */
	trackPerformance(
		metric: string,
		value: number,
		properties: Record<string, unknown> = {},
	): void {
		this.track("performance_metric", {
			...properties,
			metric,
			value,
			event_type: "performance",
		});
	}

	/**
	 * Manually flush buffered events
	 */
	flush(): Promise<void> {
		if (!this.enabled || this.eventBuffer.length === 0) {
			return Promise.resolve();
		}

		const events = [...this.eventBuffer];
		this.eventBuffer = [];

		return this.sendEvents(events);
	}

	/**
	 * Get current session information
	 */
	getSession(): {
		id: string;
		startTime: number;
		duration: number;
		lastActivity: number;
		eventCount: number;
	} {
		return {
			id: this.sessionId,
			startTime: this.sessionStartTime,
			duration: Date.now() - this.sessionStartTime,
			lastActivity: this.lastActivityTime,
			eventCount: this.eventBuffer.length,
		};
	}

	/**
	 * Enable or disable analytics
	 */
	setEnabled(enabled: boolean): void {
		this.enabled = enabled;
		this.config.enabled = enabled;

		if (enabled) {
			this.track("analytics_enabled");
		} else {
			this.flush(); // Send any remaining events before disabling
		}
	}

	/**
	 * Update analytics configuration
	 */
	updateConfig(config: Partial<AnalyticsConfig>): void {
		this.config = { ...this.config, ...config };
		this.enabled = this.config.enabled;
	}

	/**
	 * Destroy analytics manager and clean up
	 */
	destroy(): void {
		this.flush();
		this.enabled = false;
		this.eventBuffer = [];
	}

	// Private methods

	private initializeAnalytics(): void {
		// Track session start
		this.track("session_start", {
			session_id: this.sessionId,
			sdk_version: "2.0.0",
		});

		// Set up automatic flushing
		setInterval(() => {
			if (this.eventBuffer.length > 0) {
				this.flush();
			}
		}, 30000); // Flush every 30 seconds

		// Set up session timeout detection
		setInterval(() => {
			this.checkSessionTimeout();
		}, 60000); // Check every minute

		// Track page unload
		window.addEventListener("beforeunload", () => {
			this.track("session_end", {
				session_duration: Date.now() - this.sessionStartTime,
			});
			this.flush();
		});

		// Track visibility changes
		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "hidden") {
				this.track("page_hidden");
				this.flush();
			} else {
				this.track("page_visible");
				this.updateActivity();
			}
		});
	}

	private generateSessionId(): string {
		return `session_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
	}

	private updateActivity(): void {
		this.lastActivityTime = Date.now();
	}

	private checkSessionTimeout(): void {
		const timeSinceActivity = Date.now() - this.lastActivityTime;

		if (timeSinceActivity > (this.config.sessionTimeout || 30 * 60 * 1000)) {
			// Session timed out - start new session
			this.track("session_timeout", {
				previous_session_id: this.sessionId,
				inactive_time: timeSinceActivity,
			});

			this.sessionId = this.generateSessionId();
			this.sessionStartTime = Date.now();
			this.updateActivity();

			this.track("session_start", {
				session_id: this.sessionId,
				reason: "timeout_recovery",
			});
		}
	}

	private async sendEvents(events: AnalyticsEvent[]): Promise<void> {
		if (!this.config.endpoint) {
			// No endpoint configured - use console logging for development
			if (this.config.debug) {
				console.group("Analytics Events");
				events.forEach((event) => {
					console.log(event.name, event.properties);
				});
				console.groupEnd();
			}
			return;
		}

		try {
			const response = await fetch(this.config.endpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(this.config.apiKey && {
						Authorization: `Bearer ${this.config.apiKey}`,
					}),
				},
				body: JSON.stringify({
					events,
					session_id: this.sessionId,
					timestamp: Date.now(),
				}),
			});

			if (!response.ok) {
				throw new Error(`Analytics request failed: ${response.status}`);
			}

			if (this.config.debug) {
				console.log(`Sent ${events.length} analytics events`);
			}
		} catch (error) {
			if (this.config.debug) {
				console.error("Failed to send analytics events:", error);
			}

			// Re-add events to buffer for retry (with limit to prevent memory issues)
			if (this.eventBuffer.length < 100) {
				this.eventBuffer.unshift(...events);
			}
		}
	}

	private getUserAgent(): string {
		return navigator.userAgent;
	}

	private getCurrentUrl(): string {
		try {
			// Remove sensitive query parameters
			const url = new URL(window.location.href);
			const sensitiveParams = ["token", "key", "password", "secret", "auth"];

			sensitiveParams.forEach((param) => {
				url.searchParams.delete(param);
			});

			return url.toString();
		} catch {
			return window.location.href;
		}
	}
}

// Google Analytics gtag type
declare global {
	interface Window {
		gtag?: (...args: unknown[]) => void;
		dataLayer?: unknown[];
	}
}

/**
 * Google Analytics integration helper
 */
export class GoogleAnalyticsManager extends AnalyticsManager {
	private gtag?: (...args: unknown[]) => void;

	constructor(
		enabled = false,
		config: Partial<AnalyticsConfig> & { measurementId?: string } = {},
	) {
		super(enabled, config);

		if (enabled && config.measurementId) {
			this.initializeGoogleAnalytics(config.measurementId);
		}
	}

	track(eventName: string, properties: Record<string, unknown> = {}): void {
		super.track(eventName, properties);

		// Also send to Google Analytics if available
		if (this.gtag) {
			this.gtag("event", eventName, {
				custom_map: properties,
				...properties,
			});
		}
	}

	private initializeGoogleAnalytics(measurementId: string): void {
		// Check if gtag already exists
		if (window.gtag) {
			this.gtag = window.gtag;
			return;
		}

		// Load Google Analytics script
		const script = document.createElement("script");
		script.async = true;
		script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
		document.head.appendChild(script);

		// Initialize gtag
		window.dataLayer = window.dataLayer || [];
		this.gtag = (...args: unknown[]) => {
			window.dataLayer?.push(args);
		};

		window.gtag = this.gtag;

		this.gtag("js", new Date());
		this.gtag("config", measurementId, {
			send_page_view: false, // We'll handle page views manually
		});
	}
}
