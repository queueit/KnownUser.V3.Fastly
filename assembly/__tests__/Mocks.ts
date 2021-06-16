import {IDateTimeProvider, IHttpContextProvider, IHttpRequest, IHttpResponse} from "../sdk/HttpContextProvider";
import {StateInfo, UserInQueueStateCookieRepository} from "../sdk/UserInQueueStateCookieRepository";
import {UserInQueueService} from "../sdk/UserInQueueService";
import {
    CancelEventConfig,
    KnownUserException,
    QueueEventConfig,
    RequestValidationResult,
    ValidationResult
} from "../sdk/Models";
import {Headers} from "@fastly/as-compute";
import {encodeURIComponent} from "../sdk/helpers/Uri";

export class MockHttpRequest implements IHttpRequest {
    headers: Map<string, string> = new Map<string, string>();
    cookies: Map<string, MockCookie> = new Map<string, MockCookie>();
    private userHostAddress: string = "";
    private absoluteUri: string = "";
    private body: string = "";

    getAbsoluteUri(): string {
        return this.absoluteUri;
    }

    setAbsoluteUri(value: string): void {
        this.absoluteUri = value;
    }

    getCookieValue(cookieKey: string): string {
        if (!this.cookies.has(cookieKey)) {
            return ''
        }
        return this.cookies.get(cookieKey).value;
    }

    setCookieValue(name: string, value: string): MockHttpRequest {
        this.cookies.set(name, new MockCookie(value, '', 0));
        return this;
    }

    setCookie(name: string, cookie: MockCookie): MockHttpRequest {
        this.cookies.set(name, cookie);
        return this;
    }

    setHeader(name: string, value: string): MockHttpRequest {
        this.headers.set(name, value);
        return this;
    }

    getHeader(name: string): string {
        return this.headers.has(name.toLowerCase()) ? this.headers.get(name.toLowerCase()) : '';
    }

    setBody(body: string): void {
        this.body = body;
    }

    getRequestBodyAsString(): string {
        return this.body;
    }

    getUserAgent(): string {
        return this.headers.has('user-agent') ? this.headers.get('user-agent') : 'mocked-user-agent';
    }

    setUserAgent(value: string): MockHttpRequest {
        this.headers.set("user-agent", value);
        return this;
    }

    getUserHostAddress(): string {
        return this.userHostAddress;
    }

    setUserHostAddress(value: string): void {
        this.userHostAddress = value;
    }

    reset(): void {
        this.userHostAddress = "";
        this.absoluteUri = "";
        this.body = "";
        this.headers.clear();
        this.cookies.clear();
    }
}

export class MockCookie {
    constructor(public value: string, public domain: string, public expiration: i64) {

    }
}

export class MockHttpResponse implements IHttpResponse {
    cookies: Map<string, MockCookie> = new Map();
    private cookieHeader: string = '';

    setCookie(cookieName: string, cookieValue: string, domain: string, expiration: i64): void {
        const expirationDate = new Date(expiration * 1000);
        let setCookieString = cookieName + "=" + encodeURIComponent(cookieValue) + "; expires=" + expirationDate.toUTCString() + ";";
        if (domain != "") {
            setCookieString += " domain=" + domain + ";";
        }
        setCookieString += " path=/;";
        this.cookieHeader = setCookieString;
        this.cookies.set(cookieName, new MockCookie(cookieValue, domain, expiration))
    }

    reset(): void {
        this.cookies.clear();
        this.cookieHeader = '';
    }

    getHeaders(): Headers {
        let h = new Headers();
        h.set('set-cookie', this.cookieHeader);
        return h;
    }
}

export class MockDateTimeProvider implements IDateTimeProvider {
    public constructor(public date: Date = new Date(Date.now())) {
    }

    getCurrentTime(): Date {
        return this.date;
    }
}

export class MockHttpContextProvider implements IHttpContextProvider {
    constructor(public req: MockHttpRequest, public res: MockHttpResponse) {
    }

    getHttpRequest(): IHttpRequest {
        return this.req != null ? this.req : new MockHttpRequest();
    }

    getHttpResponse(): IHttpResponse {
        return this.res != null ? this.res : new MockHttpResponse();
    }

    reset(): void {
        this.req.reset();
        this.res.reset();
    }
}

export class ValidateQueueRequestCall {
    public constructor(
        public method: string,
        public targetUrl: string,
        public queueitToken: string,
        public queueConfig: QueueEventConfig,
        public customerId: string,
        public secretKey: string
    ) {
    }
}

export class ValidateCancelRequestCall {
    public constructor(
        public method: string,
        public targetUrl: string,
        public cancelConfig: CancelEventConfig,
        public customerId: string,
        public secretKey: string
    ) {
    }
}

export class RequestValidationResultRecording {
    public constructor(
        public method: string,
        public eventId: string,
        public queueId: string,
        public redirectUrl: string,
        public redirectType: string,
        public actionType: string,
        public actionName: string
    ) {
    }
}

export class ExtendQueueCookieCall {
    public constructor(
        public method: string,
        public eventId: string,
        public cookieValidityMinute: i64,
        public cookieDomain: string,
        public secretKey: string
    ) {
    }
}

export class UserInQueueServiceMock extends UserInQueueService {
    validateQueueRequestResult: RequestValidationResult;
    cancelRequestCalls: Map<string, string>;
    extendQueueCookieCalls: Map<string, string>;
    validateQueueRequestCall: ValidateQueueRequestCall | null;
    validateCancelRequestCall: ValidateCancelRequestCall | null;
    extendQueueCookieCall: ExtendQueueCookieCall | null;
    getIgnoreResultIsCalled: bool;
    validateCancelRequestrRaiseException: bool;
    validateQueueRequestResultRaiseException: bool;
    requestValidationResult: RequestValidationResultRecording | null;

    constructor(private repo: UserInQueueStateCookieRepository) {
        super(repo);
        this.validateQueueRequestResult = new RequestValidationResult("", "", "", "", "");
        this.cancelRequestCalls = new Map<string, string>();
        this.extendQueueCookieCalls = new Map<string, string>();
        this.getIgnoreResultIsCalled = false;
        this.validateCancelRequestrRaiseException = false;
        this.validateQueueRequestResultRaiseException = false;
    }

    getIgnoreResult(actionName: string): RequestValidationResult {
        this.getIgnoreResultIsCalled = true;

        const r = new RequestValidationResultRecording("getIgnoreResult", '', '', '', '', 'Ignore', actionName);
        this.requestValidationResult = r;
        const result = new RequestValidationResult(r.actionType, r.eventId, r.queueId, r.redirectUrl, r.redirectType, r.actionName);
        return result;
    }

    validateQueueRequest(targetUrl: string, queueitToken: string, queueConfig: QueueEventConfig,
                         customerId: string, secretKey: string): ValidationResult {
        this.validateQueueRequestCall = new ValidateQueueRequestCall(
            "validateQueueRequest",
            targetUrl,
            queueitToken,
            queueConfig,
            customerId,
            secretKey);

        if (this.validateQueueRequestResultRaiseException) {
            return new ValidationResult(null, new KnownUserException("mocked exception"))
        } else {
            return new ValidationResult(this.validateQueueRequestResult, null);
        }
    }

    validateCancelRequest(targetUrl: string,
                          cancelConfig: CancelEventConfig,
                          customerId: string,
                          secretKey: string): ValidationResult {
        this.validateCancelRequestCall = new ValidateCancelRequestCall('validateCancelRequest', targetUrl, cancelConfig, customerId, secretKey);

        if (this.validateCancelRequestrRaiseException) {
            return new ValidationResult(null, new KnownUserException("mocked exception"));
        } else {
            return new ValidationResult(new RequestValidationResult('Cancel', '', '', '', ''), null);
        }
    };

    extendQueueCookie(
        eventId: string,
        cookieValidityMinutes: i64,
        cookieDomain: string,
        secretKey: string): void {
        this.extendQueueCookieCall = new ExtendQueueCookieCall('extendQueueCookie', eventId, cookieValidityMinutes, cookieDomain, secretKey);
        //return this.extendQueueCookieCalls;
    };

    reset(): void {
        //this.validateQueueRequestResult = null;
        this.validateQueueRequestResult = new RequestValidationResult("", "", "", "", "");
        this.cancelRequestCalls.clear();
        this.extendQueueCookieCalls.clear();
        this.validateQueueRequestCall = null;
        this.validateCancelRequestCall = null;
        this.extendQueueCookieCall = null;
        this.validateCancelRequestrRaiseException = false;
        this.validateQueueRequestResultRaiseException = false;
    }
}

export class UserInQueueStateCookieRepositoryMock extends UserInQueueStateCookieRepository {
    returnThisState: StateInfo
    storeCall: Map<string, string>
    getStateCall: Map<string, string>
    cancelQueueCookieCall: Map<string, string>

    constructor() {
        super(new MockHttpContextProvider(new MockHttpRequest(), new MockHttpResponse()));
        this.returnThisState = new StateInfo(false, false, "", 0, "")
        this.storeCall = new Map<string, string>();
        this.getStateCall = new Map<string, string>();
        this.cancelQueueCookieCall = new Map<string, string>();
    }

    getState(eventId: string, cookieValidityMinutes: i64, secretKey: string, validateTime: bool): StateInfo {
        this.getStateCall.set("eventId", eventId);
        this.getStateCall.set("cookieValidityMinutes", cookieValidityMinutes.toString());
        this.getStateCall.set("secretKey", secretKey);
        this.getStateCall.set("validateTime", validateTime.toString());
        return this.returnThisState;
    };

    store(eventId: string, queueId: string, fixedCookieValidityMinutes: i64, cookieDomain: string, redirectType: string, secretKey: string): void {
        this.storeCall.set("eventId", eventId);
        this.storeCall.set("queueId", queueId);
        this.storeCall.set("fixedCookieValidityMinutes", fixedCookieValidityMinutes.toString());
        this.storeCall.set("cookieDomain", cookieDomain);
        this.storeCall.set("redirectType", redirectType);
        this.storeCall.set("secretKey", secretKey);
    }

    cancelQueueCookie(eventId: string, cookieDomain: string): void {
        this.cancelQueueCookieCall.set("eventId", eventId);
        this.cancelQueueCookieCall.set("cookieDomain", cookieDomain);
    };

    reset(): void {
        this.getStateCall.clear();
        this.storeCall.clear();
        this.cancelQueueCookieCall.clear();
    }
}
