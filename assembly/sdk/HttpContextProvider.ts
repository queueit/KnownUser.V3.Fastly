import { Headers } from "@fastly/as-compute";

export interface IHttpRequest {
    getUserAgent(): string;
    getHeader(name: string): string;
    getAbsoluteUri(): string;
    getUserHostAddress(): string;
    getCookieValue(cookieKey: string): string;
    getRequestBodyAsString(): string;
}

export interface IHttpResponse {
    setCookie(cookieName: string, cookieValue: string, domain: string, expiration: i64): void;
    getHeaders(): Headers;
}

export interface IHttpContextProvider {
    getHttpRequest(): IHttpRequest;
    getHttpResponse(): IHttpResponse;
}

export interface IDateTimeProvider {
    getCurrentTime(): Date
}
