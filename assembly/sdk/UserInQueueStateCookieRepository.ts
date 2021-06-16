import {IHttpContextProvider} from './HttpContextProvider'
import {Utils, CookieHelper} from './QueueITHelpers'
import {Date as WasiDate} from "as-wasi";
import {KeyValuePair} from "./Models";

export class UserInQueueStateCookieRepository {
    private static readonly _QueueITDataKey: string = "QueueITAccepted-SDFrts345E-V3";
    private static readonly _HashKey: string = "Hash";
    private static readonly _IssueTimeKey: string = "IssueTime";
    private static readonly _QueueIdKey: string = "QueueId";
    private static readonly _EventIdKey: string = "EventId";
    private static readonly _RedirectTypeKey: string = "RedirectType";
    private static readonly _FixedCookieValidityMinutesKey: string = "FixedValidityMins";

    constructor(private httpContextProvider: IHttpContextProvider) {
    }

    public static getCookieKey(eventId: string): string {
        return UserInQueueStateCookieRepository._QueueITDataKey + "_" + eventId;
    }

    public store(eventId: string, queueId: string, fixedCookieValidityMinutes: i64,
                 cookieDomain: string, redirectType: string, secretKey: string): void {
        this.createCookie(
            eventId, queueId,
            fixedCookieValidityMinutes > 0 ? fixedCookieValidityMinutes.toString() : "",
            redirectType, cookieDomain, secretKey);
    }

    private createCookie(
        eventId: string,
        queueId: string,
        fixedCookieValidityMinutes: string,
        redirectType: string,
        cookieDomain: string,
        secretKey: string): void {
        let cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);

        let issueTime = Utils.getCurrentTime().toString();

        let cookieValues = new Array<KeyValuePair>();
        cookieValues.push(new KeyValuePair(UserInQueueStateCookieRepository._EventIdKey, eventId));
        cookieValues.push(new KeyValuePair(UserInQueueStateCookieRepository._QueueIdKey, queueId));
        if (fixedCookieValidityMinutes != '') {
            cookieValues.push(new KeyValuePair(
                UserInQueueStateCookieRepository._FixedCookieValidityMinutesKey, fixedCookieValidityMinutes
            ));
        }
        cookieValues.push(new KeyValuePair(UserInQueueStateCookieRepository._RedirectTypeKey, redirectType.toLowerCase()));
        cookieValues.push(new KeyValuePair(UserInQueueStateCookieRepository._IssueTimeKey, issueTime));
        cookieValues.push(new KeyValuePair(
            UserInQueueStateCookieRepository._HashKey,
            this.generateHash(eventId.toLowerCase(), queueId, fixedCookieValidityMinutes, redirectType.toLowerCase(), issueTime, secretKey)
        ));
        const tomorrow: Date = new Date(i64(WasiDate.now()) + 1000 * 60 * 60 * 24);
        const expire: i32 = Math.floor((tomorrow.getTime() / 1000) as f64) as i32;
        let cookieValue = CookieHelper.toValueFromKeyValueCollection(cookieValues);

        this.httpContextProvider.getHttpResponse().setCookie(cookieKey,
            cookieValue,
            cookieDomain, expire);
    }

    public getState(eventId: string, cookieValidityMinutes: i64, secretKey: string, validateTime: bool): StateInfo {
        const cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
        const cookie = this.httpContextProvider.getHttpRequest().getCookieValue(cookieKey);

        if (cookie == "") {
            return new StateInfo(false, false, "", 0, "");
        }
        const cookieValues = CookieHelper.toMapFromValue(cookie);

        if (!this.isCookieValid(secretKey, cookieValues, eventId, cookieValidityMinutes, validateTime)) {
            return new StateInfo(true, false, "", 0, "");
        }

        const fixedCookieValidity: i64 = cookieValues.has(UserInQueueStateCookieRepository._FixedCookieValidityMinutesKey)
            ? I64.parseInt(cookieValues.get(UserInQueueStateCookieRepository._FixedCookieValidityMinutesKey))
            : 0;

        return new StateInfo(
            true,
            true,
            cookieValues.get(UserInQueueStateCookieRepository._QueueIdKey),
            fixedCookieValidity,
            cookieValues.get(UserInQueueStateCookieRepository._RedirectTypeKey));
    }

    private isCookieValid(
        secretKey: string,
        cookieValueMap: Map<string, string>,
        eventId: string,
        cookieValidityMinutes: i64,
        validateTime: bool): bool {

        const storedHash = cookieValueMap.has(UserInQueueStateCookieRepository._HashKey) ?
            cookieValueMap.get(UserInQueueStateCookieRepository._HashKey) : "";
        const issueTimeString = cookieValueMap.has(UserInQueueStateCookieRepository._IssueTimeKey) ?
            cookieValueMap.get(UserInQueueStateCookieRepository._IssueTimeKey) : "";
        const queueId = cookieValueMap.has(UserInQueueStateCookieRepository._QueueIdKey) ?
            cookieValueMap.get(UserInQueueStateCookieRepository._QueueIdKey) : "";
        const eventIdFromCookie = cookieValueMap.has(UserInQueueStateCookieRepository._EventIdKey) ?
            cookieValueMap.get(UserInQueueStateCookieRepository._EventIdKey) : "";
        const redirectType = cookieValueMap.has(UserInQueueStateCookieRepository._RedirectTypeKey) ?
            cookieValueMap.get(UserInQueueStateCookieRepository._RedirectTypeKey) : "";
        let fixedCookieValidityMinutes = cookieValueMap.has(UserInQueueStateCookieRepository._FixedCookieValidityMinutesKey) ?
            cookieValueMap.get(UserInQueueStateCookieRepository._FixedCookieValidityMinutesKey) : "";

        const expectedHash = this.generateHash(
            eventIdFromCookie,
            queueId,
            fixedCookieValidityMinutes,
            redirectType,
            issueTimeString,
            secretKey);
        if (expectedHash.length == 0) {
            return false
        }

        if (expectedHash != storedHash)
            return false;

        if (eventId.toLowerCase() != eventIdFromCookie.toLowerCase())
            return false;

        if (validateTime) {
            let validity: i64 = fixedCookieValidityMinutes.length > 0 ? I64.parseInt(fixedCookieValidityMinutes) : cookieValidityMinutes;
            let expirationTime: i64 = I64.parseInt(issueTimeString) + validity * 60;

            if (expirationTime < Utils.getCurrentTime())
                return false;
        }
        return true;
    }

    public cancelQueueCookie(eventId: string, cookieDomain: string): void {
        const cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
        this.httpContextProvider.getHttpResponse().setCookie(cookieKey, "", cookieDomain, 0);
    }

    public reissueQueueCookie(eventId: string, cookieValidityMinutes: i64, cookieDomain: string, secretKey: string): void {
        const cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
        const cookie = this.httpContextProvider.getHttpRequest().getCookieValue(cookieKey);

        if (cookie == '')
            return;

        const cookieValues = CookieHelper.toMapFromValue(cookie);

        if (!this.isCookieValid(secretKey, cookieValues, eventId, cookieValidityMinutes, true))
            return;

        let fixedCookieValidityMinutes = "";
        if (cookieValues.has(UserInQueueStateCookieRepository._FixedCookieValidityMinutesKey)) {
            fixedCookieValidityMinutes = cookieValues.get(UserInQueueStateCookieRepository._FixedCookieValidityMinutesKey).toString();
        }

        this.createCookie(
            eventId,
            cookieValues.get(UserInQueueStateCookieRepository._QueueIdKey),
            fixedCookieValidityMinutes,
            cookieValues.get(UserInQueueStateCookieRepository._RedirectTypeKey),
            cookieDomain, secretKey);
    }

    private generateHash(
        eventId: string,
        queueId: string,
        fixedCookieValidityMinutes: string,
        redirectType: string,
        issueTime: string,
        secretKey: string): string {
        let valueToHash = eventId + queueId + fixedCookieValidityMinutes + redirectType + issueTime;
        return Utils.generateSHA256Hash(secretKey, valueToHash);
    }
}

export class StateInfo {
    constructor(public isFound: bool,
                public isValid: bool,
                public queueId: string,
                public fixedCookieValidityMinutes: i64,
                public redirectType: string) {
    }

    isStateExtendable(): bool {
        return this.isValid && !this.fixedCookieValidityMinutes;
    }
}
