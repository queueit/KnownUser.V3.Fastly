import {Utils} from './QueueITHelpers';

export class Tuple<T1, T2> {
    first: T1
    second: T2

    constructor(first: T1, second: T2) {
        this.first = first;
        this.second = second;
    }
}

export class ValidationResult extends Tuple<RequestValidationResult | null, KnownUserException | null> {

}

export class QueueEventConfig {
    constructor(
        public eventId: string,
        public layoutName: string,
        public culture: string,
        public queueDomain: string,
        public extendCookieValidity: bool,
        public cookieValidityMinute: i64,
        public cookieDomain: string,
        public version: i64,
        public actionName: string = 'unspecified') {
    }

    getString(): string {
        return "EventId:" + this.eventId +
            "&Version:" + this.version.toString() +
            "&ActionName:" + this.actionName +
            "&QueueDomain:" + this.queueDomain +
            "&CookieDomain:" + this.cookieDomain +
            "&ExtendCookieValidity:" + this.extendCookieValidity.toString() +
            "&CookieValidityMinute:" + this.cookieValidityMinute.toString() +
            "&LayoutName:" + this.layoutName +
            "&Culture:" + this.culture;
    }
}

export class CancelEventConfig {
    constructor(public eventId: string,
                public queueDomain: string,
                public cookieDomain: string,
                public version: i64,
                public actionName: string = 'unspecified') {
    }

    getString(): string {
        return "EventId:" + this.eventId +
            "&Version:" + this.version.toString() +
            "&QueueDomain:" + this.queueDomain +
            "&CookieDomain:" + this.cookieDomain +
            "&ActionName:" + this.actionName;
    }
}

export class RequestValidationResult {
    constructor(
        public actionType: string,
        public eventId: string,
        public queueId: string,
        public redirectUrl: string,
        public redirectType: string,
        public actionName: string = 'unspecified'
    ) {
    }

    public isAjaxResult: bool;

    public doRedirect(): bool {
        return this.redirectUrl.length > 0;
    }

    public getAjaxQueueRedirectHeaderKey(): string {
        return "x-queueit-redirect";
    }

    public getAjaxRedirectUrl(): string {
        if (this.redirectUrl.length > 0) {
            return Utils.encodeUrl(this.redirectUrl);
        }
        return "";
    }
}

export class KnownUserException {
    constructor(public message: string) {
    }
}

export class ActionTypes {
    public static readonly QueueAction: string = "Queue";
    public static readonly CancelAction: string = "Cancel";
    public static readonly IgnoreAction: string = "Ignore";
}


export class KeyValuePair {
    constructor(public key: string, public value: string) {
    }

}
