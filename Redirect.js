
window.wa = window.wa || {};

wa.Redirect = class Redirect {
/**
 * Redirect utility to conditionally route users from a source URL to a target URL based on time windows, device type, and query string parameters.
 *
 * Features:
 * - Fluent, chainable configuration API (builder pattern)
 * - Time-based activation using ISO 8601 datetime strings
 * - Device targeting (all, desktop, mobile)
 * - Optional query string propagation to target URL
 * - Flexible parameter matching logic:
 *      - Each object represents a group of conditions evaluated in AND
 *      - Multiple objects are evaluated in OR
 *      - Supports both enabling (withParams) and blocking (unlessParams) rules
 *
 * Evaluation flow:
 * - Source URL match
 * - Time window validation
 * - Device type check
 * - Matching params (if defined)
 * - Blocking params exclusion
 *
 * Redirection occurs only if all conditions are satisfied.
 */
	#source; // Source URL to be redirected
	#target; // Destination URL of the redirection
	#startTime; // When the redirection must be effective, ISO 8601 date format
	#endTime; // When the redirection must stop, ISO 8601 date format
	#deviceType; // all|desktop|mobile
	#persistParams; // Boolean, true if params must be transferred to the target URL
	#matchingParams; // Array of params as object literals; params that trigger the redirection, if matched from the current query string
	#blockingParams; // Array of params as object literals; params preventing the redirection, when found in the current query string
	
	constructor() {
		// Set default values
		this.#source = '';
		this.#target = '';
		this.#startTime = -Infinity;
		this.#endTime = Infinity;
		this.#deviceType = 'all'; // all|desktop|mobile
		this.#persistParams = false;
		this.#matchingParams = [];
		this.#blockingParams = [];
	}
	// Interface methods, with chaining:
	from(source) {
		// Set the URL where the redirect occurs
		if (this.#isValidUrl(source)) {
			this.#source = source;
		}
		return this;
	}
	to(target) {
		// Set the destination of the redirection
		if (this.#isValidUrl(target)) {
			this.#target = target;
		}
		return this;
	}
	since(startTime) {
		// Set the start time of the redirection; discarded if not set (starts immediately)
		if (this.#isValidTime(startTime)) {
			this.#startTime = new Date(startTime).getTime();
		}
		return this;
	}
	until(endTime) {
		// Set the end time of the redirection; discarded if not set (will never stop)
		if (this.#isValidTime(endTime)) {
			this.#endTime = new Date(endTime).getTime();
		}
		return this;
	}
	keepParams() {
		// Transfer params from the source URL to the target URL
		this.#persistParams = true;
		return this;
	}
	keepNoParam() {
		// Do not trasfer source URL params to the target URL
		this.#persistParams = false;
		return this;
	}
	whenParams(params) {
		// Set the params that enable the redirection when matched against the current query string.
		// Evaluation logic:
		// - Each object represents a group of conditions evaluated in AND (all key/value pairs must match).
		// - Multiple objects in the array are evaluated in OR (at least one group must match).		this.#matchingParams = params;
		return this;
	}
	unlessParams(params) {
		// Set the params that prevent the redirection when matched against the current query string.
		// Evaluation logic:
		// - Each object represents a group of conditions evaluated in AND.
		// - Multiple objects in the array are evaluated in OR.
		// - If any group matches, the redirection is blocked.
		this.#blockingParams = params;
		return this;
	}
	forDeviceType(type) {
		// Set the device type for which the redirection must be enabled
		if (typeof type === 'string' && type.match(/^(all|desktop|mobile)$/)) {
			this.#deviceType = type;
		}
		return this;
	}
	run() {
		// Finally runs the evaluation of all conditions and redirection, if all conditions are met
		if (
			this.checkUrl() &&
			this.checkTime() &&
			this.checkDeviceType() &&
			this.checkParams(this.#matchingParams) &&
			!this.checkParams(this.#blockingParams)
		) {
			const fullDest = this.#target + (this.#persistParams ? location.search : '');
			
			console.log('Redirector: redirecting to', fullDest);
			window.location.href = fullDest;
		}
	}
	// Methods for internal operations, public to enable code conditions check
	checkUrl() {
		// Check if the current URL matches the source URL of the redirection
		const sourceUrl = new URL(this.#source);
        const sourceHostPath = sourceUrl.hostname + sourceUrl.pathname;
        
		return location.hostname + location.pathname === sourceHostPath;
	}
	checkTime() {
		// Check if the current time is between start and end time, if any is set
		const now = Date.now();
		
		const startDatePass = this.#startTime ? now > this.#startTime : true;
		const endDatePass = this.#endTime ? now < this.#endTime : true;
		
		return startDatePass && endDatePass;
	}
	checkDeviceType() {
		// Check if the current device type matches the device type set where the redirection must occur
		const isMobile = /Mobi/i.test(navigator.userAgent);
		
		if (this.#deviceType === 'all') {
			return true;
		} else if (this.#deviceType === 'mobile') {
			return isMobile;
		} else if (this.#deviceType === 'desktop') {
			return !isMobile;
		}
		
		return false;
	}
	checkParams(params) {
		// Check if the given params match the current URL query string.
		// Params can be:
		// - A single object: all key/value pairs must match (AND).
		// - An array of objects: each object is a group evaluated in AND, groups are evaluated in OR.
		// Returns true if at least one group matches.
		if (!params || (Array.isArray(params) && params.length === 0)) {
			return true;
		}
		
		const qs = new URLSearchParams(location.search);
		
		if (!this.#isPlainObject(params) && !Array.isArray(params)) {
			return false;
		}
		
		const list = Array.isArray(params) ? params : [params];
		
		return list.some(pair => {
			if (!this.#isPlainObject(pair)) {
				return false;
			}
			
			return Object.entries(pair).every(([key, value]) =>
				qs.get(key) === String(value)
			);
		});
	}
	// Helper methods
	#isValidUrl(urlString) {
		// Check if the given URL is valid
		try {
			new URL(urlString);
			return true;
		} catch {
			return false;
		}
	}
	#isValidTime(timeString) {
		// Validate ISO 8601 datetime
		const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/;
		if (!isoRegex.test(timeString)) {
			return false;
		}
		const d = new Date(timeString);
		return !isNaN(d.getTime());
	}
	#isPlainObject(value) {
		// CHeck if the given value is an object literal
		return value !== null && typeof value === 'object' && !Array.isArray(value);
	}
}

// Interface example:
const redirect = new wa.Redirect();
redirect
	.from('https://landing-page.example.com/new-campagin/')
	.to('https://eshop.example.com/products')
	.since('2026-04-17T09:00:00')
	.until('2026-06-30T23:59:00')
	.forDeviceType('mobile')
	.whenParams([{ utm_campaign: 'april2026' }, { utm_source: 'google' }, { utm_medium: 'cpc' }])
	.unlessParams({ 'wp': 'true' })
	.keepParams(); // transfer params in the target URL

// Execute the redirect, if conditions are met:
redirect.run();

// whenParams() and unlessParams() methods work in a DSL logic:
redirect.withParams([
	{ utm_source: 'google', utm_medium: 'cpc' } // grouped in AND
]);
redirect.withParams([
	{ utm_source: 'google' }, { utm_medium: 'cpc' } // evaluated in OR
]);


