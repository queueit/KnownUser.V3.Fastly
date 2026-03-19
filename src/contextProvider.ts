import { IConnectorContextProvider, IHttpRequest, IHttpResponse } from '@queue-it/connector-javascript';
import { FastlyCryptoProvider } from './fastlyCryptoProvider';

export function getHttpHandler(req: Request): FastlyHttpContextProvider {
    return new FastlyHttpContextProvider(req);
}

export class FastlyHttpContextProvider implements IConnectorContextProvider {
    isError: boolean = false;
    private readonly req: FastlyHttpRequest;
    private readonly res: FastlyHttpResponse;

    constructor(fReq: Request) {
        this.req = new FastlyHttpRequest(fReq);
        this.res = new FastlyHttpResponse();
    }

    getHttpRequest(): IHttpRequest {
        return this.req;
    }

    getHttpResponse(): IHttpResponse {
        return this.res;
    }

    getCryptoProvider(): FastlyCryptoProvider {
        return new FastlyCryptoProvider();
    }

    getEnqueueTokenProvider(): null {
        return null;
    }

    getResponseHeaders(): Headers {
        return (this.res as FastlyHttpResponse).getHeaders();
    }
}

export class FastlyHttpRequest implements IHttpRequest {
    private parsedCookieDic: Map<string, string>
    private bodyFetched: boolean = false;
    private body: string = '';

    constructor(private baseReq: Request) {
        this.parsedCookieDic = new Map();
        this.bodyFetched = false;
    }

    private parseCookies(cookieValue: string): void {
        const cookies = cookieValue.split(';');
        for (let i = 0; i < cookies.length; i++) {
            let cookieKV = cookies[i].split('=', 2);
            if (cookieKV.length >= 2) {
                this.parsedCookieDic.set(cookieKV[0].trim(), cookieKV[1].trim())
            }
        }
    }

    private handleBody(): void {
        if (this.baseReq.bodyUsed || this.bodyFetched) {
            return;
        }
        this.bodyFetched = true;
        this.body = ''; // this.context.req.text()
    }

    getAbsoluteUri(): string {
        return this.baseReq.url;
    }

    getCookieValue(cookieKey: string): string | undefined {
        if (this.parsedCookieDic.size == 0) {
            this.parseCookies(this.getHeader('cookie'))
        }
        if (!this.parsedCookieDic.has(cookieKey)) return undefined;
        const cookieVal = this.parsedCookieDic.get(cookieKey)!;
        try {
            return decodeURIComponent(cookieVal);
        } catch {
            return cookieVal;
        }
    }

    getHeader(name: string): string {
        if (name.length == 0) return "";
        if (!this.baseReq.headers.has(name)) {
            return '';
        }
        const value = this.baseReq.headers.get(name);
        if (value == null) return '';
        return value!;
    }

    getRequestBodyAsString(): string {
        if (!this.bodyFetched) {
            this.handleBody();
        }
        return this.body;
    }

    getUserAgent(): string {
        return this.baseReq.headers.has('user-agent') ? this.baseReq.headers.get('user-agent')! : '';
    }

    getUserHostAddress(): string {
        return this.baseReq.headers.get('Fastly-Client-IP') ?? '';
    }
}

export class FastlyHttpResponse implements IHttpResponse {
    private readonly headers: Headers;

    constructor() {
        this.headers = new Headers();
    }

    setCookie(cookieName: string, cookieValue: string, domain: string, expiration: number, _isHttpOnly: boolean, _isSecure: boolean): void {
        const expirationDate = new Date(expiration * 1000);
        let setCookieString = cookieName + "=" + encodeURIComponent(cookieValue) + "; expires=" + expirationDate.toUTCString() + ";";
        if (domain != "") {
            setCookieString += " domain=" + domain + ";";
        }
        setCookieString += " path=/;";
        this.headers.set('set-cookie', setCookieString);
    }

    getHeaders(): Headers {
        return this.headers;
    }
}
