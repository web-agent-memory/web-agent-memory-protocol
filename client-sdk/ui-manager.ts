/**
 * UI Manager for Memory Protocol SDK
 * Handles install prompts and other UI components
 */

import { STORAGE_KEYS, UI_ELEMENTS } from "@wamp/protocol";

export interface InstallPromptOptions {
	title?: string;
	message?: string;
	theme?: "light" | "dark" | "auto";
	position?: "top" | "bottom" | "center";
	provider?: {
		name: string;
		storeUrl: string;
	};
	showCloseButton?: boolean;
	autoHideDelay?: number; // in milliseconds, 0 = no auto hide
}

/**
 * UI Manager Class
 * Manages install prompts and other UI elements for the SDK
 */
export class UIManager {
	private promptElement: HTMLElement | null = null;
	private theme: "light" | "dark" | "auto";
	private dismissalKey = STORAGE_KEYS.UI_PROMPT_DISMISSED;

	constructor(theme: "light" | "dark" | "auto" = "auto") {
		this.theme = theme;
	}

	/**
	 * Show install prompt with customizable options
	 */
	showInstallPrompt(options: InstallPromptOptions = {}): void {
		// Don't show multiple prompts
		if (this.promptElement) {
			return;
		}

		// Check if user has dismissed prompt in this session
		if (this.isPromptDismissed() && !options.provider) {
			return;
		}

		const {
			title = "Enhance Your AI Experience",
			message,
			theme = this.theme,
			position = "bottom",
			provider,
			showCloseButton = true,
			autoHideDelay = 0,
		} = options;

		// Generate default message based on provider
		const defaultMessage = provider
			? `Install ${provider.name} to give AI assistants context about your work and interests`
			: "Install a memory extension to give AI assistants context about your work and interests";

		const finalMessage = message || defaultMessage;

		// Create prompt element
		const prompt = document.createElement("div");
		prompt.id = UI_ELEMENTS.INSTALL_PROMPT_ID;
		prompt.setAttribute("role", "dialog");
		prompt.setAttribute("aria-labelledby", "memory-prompt-title");
		prompt.setAttribute("aria-describedby", "memory-prompt-message");

		// Detect theme
		const isDark = this.resolveTheme(theme);

		const providerName = provider?.name || "Memory Extension";
		const buttonText = provider
			? `Install ${providerName}`
			: "Browse Extensions";

		prompt.innerHTML = this.generatePromptHTML({
			title,
			message: finalMessage,
			position,
			isDark,
			buttonText,
			showCloseButton,
		});

		// Add event listeners
		this.attachEventListeners(prompt, provider, autoHideDelay);

		// Add to page with animation
		document.body.appendChild(prompt);
		this.promptElement = prompt;

		// Trigger animation
		requestAnimationFrame(() => {
			prompt.classList.add("visible");
		});

		// Auto-hide if specified
		if (autoHideDelay > 0) {
			setTimeout(() => {
				this.hideInstallPrompt();
			}, autoHideDelay);
		}

		// Accessibility: focus management
		this.manageFocus(prompt);
	}

	/**
	 * Hide the install prompt
	 */
	hideInstallPrompt(): void {
		if (!this.promptElement) {
			return;
		}

		this.promptElement.classList.remove("visible");
		this.promptElement.classList.add("hiding");

		// Remove after animation
		setTimeout(() => {
			if (this.promptElement) {
				this.promptElement.remove();
				this.promptElement = null;
			}
		}, 300);
	}

	/**
	 * Check if prompt was dismissed in this session
	 */
	isPromptDismissed(): boolean {
		try {
			return sessionStorage.getItem(this.dismissalKey) === "true";
		} catch {
			return false; // Handle cases where sessionStorage is not available
		}
	}

	/**
	 * Mark prompt as dismissed for this session
	 */
	markPromptDismissed(): void {
		try {
			sessionStorage.setItem(this.dismissalKey, "true");
		} catch {
			// Ignore if sessionStorage is not available
		}
	}

	/**
	 * Clear dismissal state (for testing)
	 */
	clearDismissalState(): void {
		try {
			sessionStorage.removeItem(this.dismissalKey);
		} catch {
			// Ignore if sessionStorage is not available
		}
	}

	/**
	 * Update theme
	 */
	setTheme(theme: "light" | "dark" | "auto"): void {
		this.theme = theme;
		// If prompt is currently shown, update its theme
		if (this.promptElement) {
			const isDark = this.resolveTheme(theme);
			this.promptElement.setAttribute("data-theme", isDark ? "dark" : "light");
		}
	}

	// Private helper methods

	private resolveTheme(theme: "light" | "dark" | "auto"): boolean {
		if (theme === "dark") return true;
		if (theme === "light") return false;

		// Auto mode - detect system preference
		try {
			return window.matchMedia("(prefers-color-scheme: dark)").matches;
		} catch {
			return false; // Default to light if matchMedia is not available
		}
	}

	private generatePromptHTML(config: {
		title: string;
		message: string;
		position: string;
		isDark: boolean;
		buttonText: string;
		showCloseButton: boolean;
	}): string {
		const { title, message, position, isDark, buttonText, showCloseButton } =
			config;

		return `
      <style>
        #agent-memory-install-prompt {
          position: fixed;
          ${this.getPositionStyles(position)}
          max-width: 380px;
          padding: 20px;
          background: ${isDark ? "#1e1e1e" : "#ffffff"};
          color: ${isDark ? "#ffffff" : "#1a1a1a"};
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, ${isDark ? "0.4" : "0.15"}), 
                      0 2px 8px rgba(0, 0, 0, ${isDark ? "0.2" : "0.1"});
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
                       'Helvetica Neue', Arial, sans-serif;
          font-size: 14px;
          line-height: 1.5;
          z-index: 999999;
          transform: translateX(100%);
          opacity: 0;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: ${isDark ? "1px solid #333" : "1px solid #e0e0e0"};
        }
        
        #agent-memory-install-prompt.visible {
          transform: translateX(0);
          opacity: 1;
        }

        #agent-memory-install-prompt.hiding {
          transform: translateX(100%);
          opacity: 0;
        }
        
        #agent-memory-install-prompt h3 {
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 600;
          color: inherit;
        }
        
        #agent-memory-install-prompt p {
          margin: 0 0 16px 0;
          color: ${isDark ? "#b0b0b0" : "#666666"};
          line-height: 1.4;
        }
        
        #agent-memory-install-prompt .buttons {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        
        #agent-memory-install-prompt button {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          outline: none;
          font-family: inherit;
        }
        
        #agent-memory-install-prompt button:focus {
          box-shadow: 0 0 0 2px ${isDark ? "#4285f4" : "#1a73e8"};
        }
        
        #agent-memory-install-prompt .install-btn {
          background: #1a73e8;
          color: white;
          flex: 1;
          min-width: 120px;
        }
        
        #agent-memory-install-prompt .install-btn:hover {
          background: #1557b0;
        }

        #agent-memory-install-prompt .install-btn:active {
          background: #1245a8;
        }
        
        #agent-memory-install-prompt .dismiss-btn {
          background: ${isDark ? "#333333" : "#f1f3f4"};
          color: ${isDark ? "#ffffff" : "#5f6368"};
          min-width: 80px;
        }
        
        #agent-memory-install-prompt .dismiss-btn:hover {
          background: ${isDark ? "#444444" : "#e8eaed"};
        }

        #agent-memory-install-prompt .dismiss-btn:active {
          background: ${isDark ? "#555555" : "#dadce0"};
        }
        
        ${
					showCloseButton
						? `
        #agent-memory-install-prompt .close-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 24px;
          height: 24px;
          padding: 0;
          background: none;
          border: none;
          cursor: pointer;
          opacity: 0.6;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
        }
        
        #agent-memory-install-prompt .close-btn:hover {
          opacity: 1;
          background: ${isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
        }
        
        #agent-memory-install-prompt .close-btn svg {
          width: 16px;
          height: 16px;
          fill: ${isDark ? "#ffffff" : "#5f6368"};
        }
        `
						: ""
				}

        /* Responsive adjustments */
        @media (max-width: 480px) {
          #agent-memory-install-prompt {
            max-width: calc(100vw - 40px);
            right: 20px !important;
            left: 20px !important;
          }
          
          #agent-memory-install-prompt .buttons {
            flex-direction: column;
          }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          #agent-memory-install-prompt {
            transition: opacity 0.2s ease;
          }
        }
      </style>
      
      ${
				showCloseButton
					? `
      <button class="close-btn" aria-label="Close" title="Close">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
      `
					: ""
			}
      
      <h3 id="memory-prompt-title">${this.escapeHtml(title)}</h3>
      <p id="memory-prompt-message">${this.escapeHtml(message)}</p>
      
      <div class="buttons">
        <button class="install-btn">${this.escapeHtml(buttonText)}</button>
        <button class="dismiss-btn">Not Now</button>
      </div>
    `;
	}

	private getPositionStyles(position: string): string {
		switch (position) {
			case "top":
				return "top: 20px; right: 20px;";
			case "center":
				return "top: 50%; right: 20px; transform: translateY(-50%) translateX(100%);";
			default:
				return "bottom: 20px; right: 20px;";
		}
	}

	private attachEventListeners(
		prompt: HTMLElement,
		provider?: { name: string; storeUrl: string },
		autoHideDelay?: number,
	): void {
		const installBtn = prompt.querySelector(
			".install-btn",
		) as HTMLButtonElement;
		const dismissBtn = prompt.querySelector(
			".dismiss-btn",
		) as HTMLButtonElement;
		const closeBtn = prompt.querySelector(".close-btn") as HTMLButtonElement;

		// Install button
		installBtn?.addEventListener("click", (e) => {
			e.preventDefault();
			this.handleInstallClick(provider);
		});

		// Dismiss button
		dismissBtn?.addEventListener("click", (e) => {
			e.preventDefault();
			this.handleDismissClick();
		});

		// Close button
		closeBtn?.addEventListener("click", (e) => {
			e.preventDefault();
			this.hideInstallPrompt();
		});

		// Keyboard navigation
		prompt.addEventListener("keydown", (e) => {
			if (e.key === "Escape") {
				this.hideInstallPrompt();
			}
		});

		// Click outside to close (optional)
		document.addEventListener(
			"click",
			(e) => {
				if (!prompt.contains(e.target as Node)) {
					// Only auto-close if no auto-hide delay is set
					if (!autoHideDelay) {
						this.hideInstallPrompt();
					}
				}
			},
			{ once: true },
		);
	}

	private handleInstallClick(provider?: {
		name: string;
		storeUrl: string;
	}): void {
		const installUrl =
			provider?.storeUrl ||
			"https://chromewebstore.google.com/category/extensions";

		// Open in new tab
		try {
			window.open(installUrl, "_blank", "noopener,noreferrer");
		} catch (error) {
			console.warn("Failed to open install URL:", error);
			// Fallback: navigate in same tab
			window.location.href = installUrl;
		}

		this.hideInstallPrompt();

		// Track install click (could be used for analytics)
		this.dispatchEvent("install-clicked", {
			provider: provider?.name || "unknown",
			url: installUrl,
		});
	}

	private handleDismissClick(): void {
		this.hideInstallPrompt();
		this.markPromptDismissed();

		// Track dismissal
		this.dispatchEvent("prompt-dismissed", {});
	}

	private manageFocus(prompt: HTMLElement): void {
		// Store the currently focused element
		const previouslyFocused = document.activeElement as HTMLElement;

		// Focus the first button
		const firstButton = prompt.querySelector("button") as HTMLButtonElement;
		if (firstButton) {
			firstButton.focus();
		}

		// Restore focus when prompt is closed
		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (
					mutation.type === "childList" &&
					typeof document !== "undefined" &&
					!document.contains(prompt)
				) {
					if (
						previouslyFocused &&
						typeof previouslyFocused.focus === "function"
					) {
						previouslyFocused.focus();
					}
					observer.disconnect();
				}
			});
		});

		observer.observe(document.body, { childList: true, subtree: true });
	}

	private dispatchEvent(eventName: string, data: unknown): void {
		try {
			window.dispatchEvent(
				new CustomEvent(`agentMemory:${eventName}`, {
					detail: data,
				}),
			);
		} catch (_error) {
			// Ignore event dispatch errors
		}
	}

	private escapeHtml(text: string): string {
		const div = document.createElement("div");
		div.textContent = text;
		return div.innerHTML;
	}
}
