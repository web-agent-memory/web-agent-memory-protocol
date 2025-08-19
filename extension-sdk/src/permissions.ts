/**
 * PermissionManager - Handles user permissions for Memory Protocol providers
 *
 * Manages:
 * - Per-domain permission storage in chrome.storage.local
 * - Permission request UI and flow
 * - Permission checking and validation
 * - Permission revocation and management
 */

import type { PermissionType } from "@wamp/protocol";
import { STORAGE_KEYS } from "@wamp/protocol";
import type { AgentMemoryRegistry, AppInfo, PermissionResult } from "./types";

export interface PermissionStorage {
	[domain: string]: {
		granted: boolean;
		grantedAt: number;
		permissions: PermissionType[];
		appInfo?: AppInfo;
		revokedAt?: number;
	};
}

export interface PermissionManagerConfig {
	storageKey?: string;
	autoShowUI?: boolean;
	defaultPermissions?: PermissionType[];
}

export class PermissionManager {
	private storageKey: string;
	private autoShowUI: boolean;
	private defaultPermissions: PermissionType[];

	constructor(config: PermissionManagerConfig = {}) {
		this.storageKey = config.storageKey ?? STORAGE_KEYS.PERMISSIONS_BASE;
		this.autoShowUI = config.autoShowUI ?? true;
		this.defaultPermissions = config.defaultPermissions ?? ["context"];
	}

	/**
	 * Check if permission is granted for a domain
	 */
	isPermissionGranted(domain: string): boolean {
		// For now, we'll use localStorage as fallback for non-extension environments
		// In actual extension, this would use chrome.storage.local
		const permissions = this.getStoredPermissions();
		const domainPermission = permissions[domain];
		return domainPermission?.granted === true && !domainPermission.revokedAt;
	}

	/**
	 * Request permission from the user
	 */
	async requestPermission(appInfo: AppInfo): Promise<PermissionResult> {
		const domain = appInfo.domain || this.getCurrentDomain();

		// Check if already granted
		if (this.isPermissionGranted(domain)) {
			return {
				granted: true,
				isFirstTime: false,
				permissions: this.defaultPermissions,
				domain,
			};
		}

		// Check if this is first time for this domain
		const permissions = this.getStoredPermissions();
		const existingPermission = permissions[domain];
		const isFirstTime = !existingPermission;

		// Show permission UI if enabled
		if (this.autoShowUI) {
			const userGranted = await this.showPermissionDialog(appInfo, isFirstTime);

			if (userGranted) {
				// Store the permission
				await this.grantPermission(domain, appInfo);
				return {
					granted: true,
					isFirstTime,
					permissions: this.defaultPermissions,
					domain,
				};
			} else {
				// User denied permission
				await this.denyPermission(domain, appInfo);
				return {
					granted: false,
					isFirstTime,
					permissions: [],
					domain,
				};
			}
		}

		// If no UI, default to denied for security
		return {
			granted: false,
			isFirstTime,
			permissions: [],
			domain,
		};
	}

	/**
	 * Grant permission for a domain
	 */
	async grantPermission(domain: string, appInfo: AppInfo): Promise<void> {
		const permissions = this.getStoredPermissions();
		permissions[domain] = {
			granted: true,
			grantedAt: Date.now(),
			permissions: this.defaultPermissions,
			appInfo,
		};

		await this.storePermissions(permissions);

		// Dispatch permission granted event
		this.dispatchPermissionEvent("granted", domain, appInfo);
	}

	/**
	 * Deny permission for a domain
	 */
	async denyPermission(domain: string, appInfo: AppInfo): Promise<void> {
		const permissions = this.getStoredPermissions();
		permissions[domain] = {
			granted: false,
			grantedAt: Date.now(),
			permissions: [],
			appInfo,
		};

		await this.storePermissions(permissions);

		// Dispatch permission denied event
		this.dispatchPermissionEvent("denied", domain, appInfo);
	}

	/**
	 * Revoke permission for a domain
	 */
	async revokePermission(domain: string): Promise<void> {
		const permissions = this.getStoredPermissions();
		const existingPermission = permissions[domain];

		if (existingPermission) {
			existingPermission.granted = false;
			existingPermission.revokedAt = Date.now();
			await this.storePermissions(permissions);

			// Dispatch permission revoked event
			this.dispatchPermissionEvent(
				"revoked",
				domain,
				existingPermission.appInfo,
			);
		}
	}

	/**
	 * Get all stored permissions
	 */
	getAllPermissions(): PermissionStorage {
		return this.getStoredPermissions();
	}

	/**
	 * Clear all permissions (for testing/reset)
	 */
	async clearAllPermissions(): Promise<void> {
		await this.storePermissions({});
	}

	/**
	 * Show permission dialog to user
	 * In a real extension, this would show a native dialog or custom UI
	 */
	private async showPermissionDialog(
		appInfo: AppInfo,
		isFirstTime: boolean,
	): Promise<boolean> {
		// In extension context, this would show a proper dialog
		// For now, we'll simulate with console and auto-grant for development

		if (typeof window === "undefined") {
			// Node/test environment - auto grant for testing
			console.log(
				`[PermissionManager] Auto-granting permission for ${appInfo.appName}`,
			);
			return true;
		}

		// In browser context, show confirm dialog (temporary implementation)
		const message = isFirstTime
			? `${appInfo.appName} wants to access your browsing context to provide personalized AI responses. Allow?`
			: `${appInfo.appName} is requesting permission again. Allow?`;

		// In a real extension, this would be a proper UI dialog
		return window.confirm(message);
	}

	/**
	 * Get stored permissions from storage
	 */
	private getStoredPermissions(): PermissionStorage {
		if (typeof window === "undefined" || typeof localStorage === "undefined") {
			// Node/test environment - return empty
			return {};
		}

		try {
			const stored = localStorage.getItem(this.storageKey);
			return stored ? JSON.parse(stored) : {};
		} catch (error) {
			console.error("[PermissionManager] Error reading permissions:", error);
			return {};
		}
	}

	/**
	 * Store permissions to storage
	 */
	private async storePermissions(
		permissions: PermissionStorage,
	): Promise<void> {
		if (typeof chrome !== "undefined" && chrome.storage?.local) {
			// Chrome extension environment
			try {
				await chrome.storage.local.set({ [this.storageKey]: permissions });
			} catch (error) {
				console.error("[PermissionManager] Error storing permissions:", error);
			}
		} else if (typeof localStorage !== "undefined") {
			// Browser environment - use localStorage as fallback
			try {
				localStorage.setItem(this.storageKey, JSON.stringify(permissions));
			} catch (error) {
				console.error("[PermissionManager] Error storing permissions:", error);
			}
		}
		// In Node/test environment, do nothing
	}

	/**
	 * Get current domain
	 */
	private getCurrentDomain(): string {
		if (typeof window !== "undefined" && window.location) {
			return window.location.hostname;
		}
		return "localhost"; // Default fallback
	}

	/**
	 * Dispatch permission events
	 */
	private dispatchPermissionEvent(
		type: "granted" | "denied" | "revoked",
		domain: string,
		appInfo?: AppInfo,
	): void {
		try {
			if (typeof window !== "undefined") {
				const event = new CustomEvent(
					`agentMemory:permission${type.charAt(0).toUpperCase() + type.slice(1)}`,
					{
						detail: { domain, appInfo, timestamp: Date.now() },
					},
				);
				window.dispatchEvent(event);
			}

			// Also dispatch to the protocol registry if available
			if (
				typeof window !== "undefined" &&
				(window as { agentMemory?: AgentMemoryRegistry }).agentMemory
			) {
				const protocolEvent = new CustomEvent(`permission-${type}`, {
					detail: { domain, appInfo, timestamp: Date.now() },
				});
				(
					window as { agentMemory?: AgentMemoryRegistry }
				).agentMemory?.dispatchEvent(protocolEvent);
			}
		} catch (error) {
			console.error("[PermissionManager] Error dispatching event:", error);
		}
	}
}
