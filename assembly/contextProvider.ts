import {IHttpContextProvider, IHttpRequest, IHttpResponse} from "./sdk/HttpContextProvider";
import {Request, Fastly, Headers} from "@fastly/as-compute";
import {decodeURIComponent, encodeURIComponent} from "./sdk/helpers/Uri";

export function getHttpHandler(req: Request): FastlyHttpContextProvider {
    return new FastlyHttpContextProvider(req);
}

export class FastlyHttpContextProvider implements IHttpContextProvider {
    isError: bool = false;
    private readonly req: FastlyHttpRequest;
    // @ts-ignore
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
}

export class FastlyHttpRequest implements IHttpRequest {
    private parsedCookieDic: Map<string, string>
    private bodyFetched: bool = false;
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
        const rawBody: ArrayBuffer | null = null; // this.context.req.arrayBuffer();
        if (rawBody == null) {
            return;
        }
        if (rawBody!.byteLength == 0) {
            return;
        }

        this.body = ''; // this.context.req.text()
    }

    getAbsoluteUri(): string {
        return this.baseReq.url;
    }

    getCookieValue(cookieKey: string): string {
        if (this.parsedCookieDic.keys().length == 0) {
            this.parseCookies(this.getHeader('cookie'))
        }
        return this.parsedCookieDic.has(cookieKey) ? decodeURIComponent(this.parsedCookieDic.get(cookieKey)) : '';
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
        return Fastly.getClientIpAddressString();
    }
}

export class FastlyHttpResponse implements IHttpResponse {
    private readonly headers: Headers;

    constructor() {
        this.headers = new Headers();
    }

    setCookie(cookieName: string, cookieValue: string, domain: string, expiration: i64): void {
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
