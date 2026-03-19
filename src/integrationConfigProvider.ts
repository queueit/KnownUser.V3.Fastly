import { ConfigStore } from "fastly:config-store";
import { RequestLogger } from "./helper";

export async function getIntegrationConfig(
  details: IntegrationDetails,
  endpointProvider: IntegrationEndpointProvider
): Promise<string> {
  const headers = new Headers();
  headers.set("api-key", details.apiKey);
  headers.set("host", endpointProvider.getHostname(details.customerId));
  const request = new Request(
    endpointProvider.getEndpoint(details.customerId),
    {
      method: "GET",
      body: null,
      headers: headers,
    }
  );
  const cacheConf = endpointProvider.getCacheConfig();
  const cacheInit: { ttl?: number; swr?: number } = {};
  if (cacheConf.maxAge !== -1) cacheInit.ttl = cacheConf.maxAge;
  if (cacheConf.staleWhileRevalidate !== -1) cacheInit.swr = cacheConf.staleWhileRevalidate;
  const cacheOverride = new CacheOverride("override", cacheInit);

  const beresp = await fetch(request, {
    backend: details.queueItOrigin,
    cacheOverride: cacheOverride,
  });

  if (!(details.logger instanceof MockLogger)) {
    let cacheState = beresp.headers.get("x-cache");
    let hits = beresp.headers.get("x-cache-hits");
    if (hits == null) hits = "-1";
    if (cacheState == null) cacheState = "n";
    details.logger.log("IgnFetch:" + cacheState! + ":" + hits!);
  }

  if (beresp.status != 200) {
    return "";
  }
  return await beresp.text();
}

const integrationCustomerId = "customerId",
  integrationApiKey = "apiKey",
  integrationSecret = "secret",
  integrationQueueItOrigin = "queueItOrigin",
  integrationDictionary = "IntegrationConfiguration",
  workerHost = "workerHost";

export function resolveIntegrationDetails(): IntegrationDetails | null {
  const dict = new ConfigStore(integrationDictionary);
  if (
    dict.get(integrationCustomerId) === null ||
    dict.get(integrationApiKey) === null ||
    dict.get(integrationSecret) === null ||
    dict.get(integrationQueueItOrigin) === null
  ) {
    return null;
  }

  let workerHostValue = "";
  const workerHostVal = dict.get(workerHost);
  if (workerHostVal !== null) {
    workerHostValue = workerHostVal;
  }

  return new IntegrationDetails(
    dict.get(integrationQueueItOrigin)!,
    dict.get(integrationCustomerId)!,
    dict.get(integrationSecret)!,
    dict.get(integrationApiKey)!,
    workerHostValue
  );
}

export class IntegrationEndpointCacheConfig {
  maxAge: number = -1;
  staleWhileRevalidate: number = -1;
}

export interface IntegrationEndpointProvider {
  getHostname(customerId: string): string;

  getEndpoint(customerId: string): string;

  getCacheConfig(): IntegrationEndpointCacheConfig;
}

export class QueueItIntegrationEndpointProvider
  implements IntegrationEndpointProvider
{
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
  log(message: string): void {}
}

export class IntegrationDetails {
  constructor(
    public queueItOrigin: string,
    public customerId: string,
    public secretKey: string,
    public apiKey: string,
    public workerHost: string,
    public provider: IntegrationEndpointProvider = new QueueItIntegrationEndpointProvider(),
    public logger: RequestLogger = new MockLogger()
  ) {}

  resolveWorkerRequestUrl(pureUrl: string): string {
    if (this.workerHost == "") {
      return pureUrl;
    }
    const protoEnding = pureUrl.indexOf("://") + 3;
    const protocol = pureUrl.substr(0, protoEnding);
    const urlWithoutProto = pureUrl.substr(protoEnding);
    const pathAndQuery =
      urlWithoutProto.indexOf("/") != -1
        ? urlWithoutProto.substr(urlWithoutProto.indexOf("/"))
        : "";
    const rewrittenUrl = protocol + this.workerHost + pathAndQuery;
    return rewrittenUrl;
  }
}
