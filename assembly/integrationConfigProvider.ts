import {Fastly, Headers, Request} from "@fastly/as-compute";
import {RequestLogger} from "./helper";

export function getIntegrationConfig(details: IntegrationDetails, endpointProvider: IntegrationEndpointProvider): string {
    const headers = new Headers();
    headers.set('api-key', details.apiKey);
    headers.set('host', endpointProvider.getHostname(details.customerId));
    const request = new Request(endpointProvider.getEndpoint(details.customerId), {
        method: 'GET', body: null, headers: headers
    })
    let cacheOverride = new Fastly.CacheOverride();
    let cacheConf = endpointProvider.getCacheConfig();
    if (cacheConf.maxAge != -1) {
        cacheOverride.setTTL(cacheConf.maxAge);
    }
    if (cacheConf.staleWhileRevalidate != -1) {
        cacheOverride.setSWR(cacheConf.staleWhileRevalidate);
    }

    let beresp = Fastly.fetch(request, {
        backend: details.queueItOrigin,
        cacheOverride: cacheOverride
    }).wait();

    if (!(details.logger instanceof MockLogger)) {
        let cacheState = beresp.headers.get('x-cache');
        let hits = beresp.headers.get('x-cache-hits');
        if (hits == null) hits = '-1';
        if (cacheState == null) cacheState = 'n';
        details.logger.log("IgnFetch:" + cacheState! + ":" + hits!);
    }

    if (beresp.status != 200) {
        return '';
    }
    return beresp.text();
}

const integrationCustomerId = "customerId",
    integrationApiKey = 'apiKey',
    integrationSecret = 'secret',
    integrationQueueItOrigin = 'queueItOrigin',
    integrationDictionary = "IntegrationConfiguration";

export function resolveIntegrationDetails(): IntegrationDetails | null {
    const dict = new Fastly.Dictionary(integrationDictionary);
    if (!dict.contains(integrationCustomerId)
        || !dict.contains(integrationApiKey)
        || !dict.contains(integrationSecret)
        || !dict.contains(integrationQueueItOrigin)) {
        return null;
    }

    return new IntegrationDetails(
        dict.get(integrationQueueItOrigin)!,
        dict.get(integrationCustomerId)!,
        dict.get(integrationSecret)!,
        dict.get(integrationApiKey)!)
}

export class IntegrationEndpointCacheConfig {
    maxAge: i16 = -1;
    staleWhileRevalidate: i16 = -1;
}

export interface IntegrationEndpointProvider {
    getHostname(customerId: string): string;

    getEndpoint(customerId: string): string;

    getCacheConfig(): IntegrationEndpointCacheConfig;
}

export class QueueItIntegrationEndpointProvider implements IntegrationEndpointProvider {
    private readonly cacheConfig: IntegrationEndpointCacheConfig;

    constructor() {
        this.cacheConfig = new IntegrationEndpointCacheConfig();
        this.cacheConfig.maxAge = 60 * 5;
        this.cacheConfig.staleWhileRevalidate = 60 * 5;
    }

    getCacheConfig(): IntegrationEndpointCacheConfig {
        return this.cacheConfig;
    }

    getHostname(customerId: string): string {
        return customerId + ".queue-it.net";
    }

    getEndpoint(customerId: string): string {
        const host = this.getHostname(customerId);
        return "https://" + host + "/status/integrationconfig/secure/" + customerId;
    }
}

class MockLogger implements RequestLogger {
    log(message: string): void {
    }
}

export class IntegrationDetails {
    constructor(public queueItOrigin: string,
                public customerId: string,
                public secretKey: string,
                public apiKey: string,
                public provider: IntegrationEndpointProvider = new QueueItIntegrationEndpointProvider(),
                public logger: RequestLogger = new MockLogger()) {
    }
}
