import {Utils} from "../sdk/QueueITHelpers";
import {hmacString} from "../sdk/helpers/crypto";
import {
    MockHttpContextProvider,
    MockHttpRequest,
    MockHttpResponse
} from "./Mocks";
import {UserInQueueStateCookieRepository} from "../sdk/UserInQueueStateCookieRepository";

Utils.generateSHA256Hash = hmacString;


function generateHash(eventId: string, queueId: string, fixedCookieValidityMinutes: string, redirectType: string, issueTime: string, secretKey: string): string {
    return Utils.generateSHA256Hash(secretKey, eventId + queueId + fixedCookieValidityMinutes + redirectType + issueTime);
}

const httpContextProvider = new MockHttpContextProvider(new MockHttpRequest(), new MockHttpResponse());
const userInQueueStateCookieRepository = new UserInQueueStateCookieRepository(httpContextProvider);

function resetMocks(): void {
    httpContextProvider.reset();
}

describe('userInQueueStateCookieRepository', () => {
    it('should store_hasValidState_ExtendableCookie_CookieIsSaved', () => {
        resetMocks();
        const eventId = "event1";
        const secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        const cookieDomain = ".test.com";
        const queueId = "queueId";
        const cookieValidity = 10;

        userInQueueStateCookieRepository.store(eventId, queueId, 0, cookieDomain, "queue", secretKey);
        httpContextProvider.req.setCookie('QueueITAccepted-SDFrts345E-V3_event1', httpContextProvider.res.cookies.get('QueueITAccepted-SDFrts345E-V3_event1'));
        const state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);

        expect(state.isValid).toBeTruthy('should be valid');
        expect(state.queueId).toBe(queueId, 'should have expected queue id');
        expect(state.isStateExtendable()).toBeTruthy('should be extendable');
        expect(state.redirectType).toBe('queue', 'should redirect to queue');

        const cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);

        let cookie = httpContextProvider.res.cookies.get(cookieKey);
        let timeDiff = cookie.expiration - Utils.getCurrentTime() - (24 * 60 * 60);
        expect(cookie).not.toBeNull('eventId cookie should be present');
        expect(timeDiff < 1000).toBeTruthy();
        expect(cookie.domain).toBe(cookieDomain);
    });

    it('should store_hasValidState_nonExtendableCookie_CookieIsSaved', () => {
        resetMocks();
        const eventId = "event1";
        const secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        const cookieDomain = ".test.com";
        const queueId = "queueId";
        const cookieValidity = 3;

        userInQueueStateCookieRepository.store(eventId, queueId, cookieValidity, cookieDomain, "idle", secretKey);
        httpContextProvider.req.setCookie('QueueITAccepted-SDFrts345E-V3_event1', httpContextProvider.res.cookies.get('QueueITAccepted-SDFrts345E-V3_event1'));
        const state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);

        expect(state.isValid).toBeTruthy();
        expect(state.queueId).toBe(queueId);
        expect(state.isStateExtendable()).toBeFalsy();
        expect(state.redirectType).toBe('idle');
        expect(state.fixedCookieValidityMinutes).toBe(3);

        const cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
        expect(httpContextProvider.res.cookies.get(cookieKey)).not.toBeNull();
        const timeDiff = httpContextProvider.res.cookies.get(cookieKey).expiration - Utils.getCurrentTime() - (24 * 60 * 60);
        expect(timeDiff < 100).toBeTruthy();
        expect(httpContextProvider.res.cookies.get(cookieKey).domain).toBe(cookieDomain);
    });

    it('should store_hasValidState_tamperedCookie_stateIsNotValid_isCookieExtendable', () => {
        resetMocks();
        const eventId = "event1";
        const secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        const cookieDomain = ".test.com";
        const queueId = "queueId";
        const cookieValidity = 10;

        userInQueueStateCookieRepository.store(eventId, queueId, 3, cookieDomain, "Idle", secretKey);
        httpContextProvider.req.setCookie('QueueITAccepted-SDFrts345E-V3_event1', httpContextProvider.res.cookies.get('QueueITAccepted-SDFrts345E-V3_event1'));
        const state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);
        expect(state.isValid).toBeTruthy();

        const cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
        const oldCookieValue = httpContextProvider.res.cookies.get(cookieKey).value;

        httpContextProvider.res.cookies.get(cookieKey).value = oldCookieValue.replace("FixedValidityMins=3", "FixedValidityMins=10");
        const state2 = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);
        expect(state2.isValid).toBeFalsy();
        expect(state.isStateExtendable()).toBeFalsy();
    });

    it('should store_hasValidState_tamperedCookie_stateIsNotValid_eventId', () => {
        resetMocks();
        const eventId = "event1";
        const secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        const cookieDomain = ".test.com";
        const queueId = "queueId";
        const cookieValidity = 10;

        userInQueueStateCookieRepository.store(eventId, queueId, 3, cookieDomain, "Idle", secretKey);
        httpContextProvider.req.setCookie('QueueITAccepted-SDFrts345E-V3_event1', httpContextProvider.res.cookies.get('QueueITAccepted-SDFrts345E-V3_event1'));
        const state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);
        expect(state.isValid).toBeTruthy();

        const cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
        const oldCookieValue = httpContextProvider.res.cookies.get(cookieKey).value;
        httpContextProvider.res.cookies.get(cookieKey).value = oldCookieValue.replace("EventId=event1", "EventId=event2");

        const state2 = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);
        expect(state2.isValid).toBeFalsy();
        expect(state.isStateExtendable()).toBeFalsy();
    });

    it('should store_hasValidState_expiredCookie_stateIsNotValid', () => {
        resetMocks();
        const eventId = "event1";
        const secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        const cookieDomain = ".test.com";
        const queueId = "queueId";
        const cookieValidity = -1;

        userInQueueStateCookieRepository.store(eventId, queueId, 0, cookieDomain, "idle", secretKey);
        httpContextProvider.req.setCookie('QueueITAccepted-SDFrts345E-V3_event1', httpContextProvider.res.cookies.get('QueueITAccepted-SDFrts345E-V3_event1'));
        const state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);

        expect(state.isValid).toBeFalsy();
    });

    it('should store_hasValidState_differentEventId_stateIsNotValid', () => {
        resetMocks();
        const eventId = "event1";
        const secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        const cookieDomain = ".test.com";
        const queueId = "queueId";
        const cookieValidity = 10;

        userInQueueStateCookieRepository.store(eventId, queueId, 0, cookieDomain, "Queue", secretKey);
        httpContextProvider.req.setCookie('QueueITAccepted-SDFrts345E-V3_event1', httpContextProvider.res.cookies.get('QueueITAccepted-SDFrts345E-V3_event1'));
        const state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);
        expect(state.isValid).toBeTruthy();

        const state2 = userInQueueStateCookieRepository.getState("event2", cookieValidity, secretKey, true);
        expect(state2.isValid).toBeFalsy();
    });

    it('should hasValidState_noCookie_stateIsNotValid', () => {
        resetMocks();
        const eventId = "event1";
        const secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        const cookieValidity = 10;

        const state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);
        expect(state.isValid).toBeFalsy();
    });

    it('should hasValidState_invalidCookie_stateIsNotValid', () => {
        resetMocks();
        const eventId = "event1";
        const secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        const cookieDomain = ".test.com";
        const queueId = "queueId";
        const cookieValidity = 10;

        userInQueueStateCookieRepository.store(eventId, queueId, 20, cookieDomain, "Queue", secretKey);
        httpContextProvider.req.setCookie('QueueITAccepted-SDFrts345E-V3_event1', httpContextProvider.res.cookies.get('QueueITAccepted-SDFrts345E-V3_event1'));
        const state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);
        expect(state.isValid).toBeTruthy();

        const cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
        httpContextProvider.res.cookies.get(cookieKey).value = "IsCookieExtendable=ooOOO&Expires=|||&QueueId=000&Hash=23232";
        const state2 = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);
        expect(state2.isValid).toBeFalsy();
    });

    it('should cancelQueueCookie', () => {
        resetMocks();
        const eventId = "event1";
        const secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        const cookieDomain = ".test.com";
        const queueId = "queueId";
        const cookieValidity = 20;

        userInQueueStateCookieRepository.store(eventId, queueId, 20, cookieDomain, "Queue", secretKey);
        httpContextProvider.req.setCookie('QueueITAccepted-SDFrts345E-V3_event1', httpContextProvider.res.cookies.get('QueueITAccepted-SDFrts345E-V3_event1'));
        const state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);
        expect(state.isValid).toBeTruthy('should be valid');

        userInQueueStateCookieRepository.cancelQueueCookie(eventId, cookieDomain);
        httpContextProvider.req.setCookie('QueueITAccepted-SDFrts345E-V3_event1', httpContextProvider.res.cookies.get('QueueITAccepted-SDFrts345E-V3_event1'));
        const state2 = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);
        expect(state2.isValid).toBeFalsy('shouldn`t be valid');

        const cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
        expect(httpContextProvider.res.cookies.get(cookieKey)).not.toBeNull('event cookie should not be null');
        expect(httpContextProvider.res.cookies.get(cookieKey).expiration).toBe(0);
        expect(httpContextProvider.res.cookies.get(cookieKey).domain).toBe(cookieDomain);
        expect(httpContextProvider.res.cookies.get(cookieKey).value).toBe('');
    });

    it('should extendQueueCookie_cookieExist', () => {
        resetMocks();
        const eventId = "event1";
        const secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        const cookieDomain = ".test.com";
        const queueId = "queueId";
        const cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);

        userInQueueStateCookieRepository.store(eventId, queueId, 0, cookieDomain, "Queue", secretKey);
        httpContextProvider.req.setCookie('QueueITAccepted-SDFrts345E-V3_event1', httpContextProvider.res.cookies.get('QueueITAccepted-SDFrts345E-V3_event1'));
        userInQueueStateCookieRepository.reissueQueueCookie(eventId, 12, cookieDomain, secretKey);

        const state = userInQueueStateCookieRepository.getState(eventId, 5, secretKey, true);
        expect(state.isValid).toBeTruthy();
        expect(state.queueId).toBe(queueId);
        expect(state.isStateExtendable()).toBeTruthy();
        expect(httpContextProvider.res.cookies.get(cookieKey).expiration - Utils.getCurrentTime() - 24 * 60 * 60 < 100).toBeTruthy();
        expect(httpContextProvider.res.cookies.get(cookieKey).domain).toBe(cookieDomain);
    });

    it('should extendQueueCookie_cookieDoesNotExist', () => {
        resetMocks();
        const eventId = "event1";
        const secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        const cookieDomain = ".test.com";
        const queueId = "queueId";

        userInQueueStateCookieRepository.store("event2", queueId, 20, cookieDomain, "Queue", secretKey);
        userInQueueStateCookieRepository.reissueQueueCookie(eventId, 12, cookieDomain, secretKey);

        const cookieKey = UserInQueueStateCookieRepository.getCookieKey("event2");
        expect(httpContextProvider.res.cookies.has(cookieKey)).toBeTruthy()
        expect(httpContextProvider.res.cookies.get(cookieKey)).not.toBeNull();
    });

    it('should getState_validCookieFormat_extendable', () => {
        resetMocks();
        const eventId = "event1";
        const secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        const cookieDomain = ".test.com";
        const queueId = "queueId";
        const issueTime = Utils.getCurrentTime();
        const hash = generateHash(eventId, queueId, '', "queue", issueTime.toString(), secretKey);

        const cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
        httpContextProvider.getHttpResponse().setCookie(cookieKey,
            "EventId=" + eventId + "&QueueId=" + queueId + "&RedirectType=queue&IssueTime=" + issueTime.toString() + "&Hash=" + hash,
            cookieDomain, Utils.getCurrentTime() + (24 * 60 * 60));
        httpContextProvider.req.setCookie(cookieKey, httpContextProvider.res.cookies.get(cookieKey));
        const state = userInQueueStateCookieRepository.getState(eventId, 10, secretKey, true);

        expect(state.isStateExtendable()).toBeTruthy('should be extendable');
        expect(state.isValid).toBeTruthy('should be valid');
        expect(state.isFound).toBeTruthy('should be found');
        expect(state.queueId).toBe(queueId);
        expect(state.redirectType).toBe('queue');
    });

    it('should getState_oldCookie_invalid_expiredCookie_extendable', () => {
        resetMocks();
        const eventId = "event1";
        const secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        const cookieDomain = ".test.com";
        const queueId = "queueId";
        const cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
        const issueTime = Utils.getCurrentTime() - 11 * 60;
        const hash = generateHash(eventId, queueId, '', "queue", issueTime.toString(), secretKey);

        httpContextProvider.getHttpResponse().setCookie(cookieKey,
            "EventId=" + eventId + "&QueueId=" + queueId + "&RedirectType=queue&IssueTime=" + issueTime.toString() + "&Hash=" + hash,
            cookieDomain, Utils.getCurrentTime() + 24 * 60 * 60);
        httpContextProvider.req.setCookie(cookieKey, httpContextProvider.res.cookies.get(cookieKey));
        const state = userInQueueStateCookieRepository.getState(eventId, 10, secretKey, true);

        expect(state.isValid).toBeFalsy();
        expect(state.isFound).toBeTruthy();
    });

    it('should getState_oldCookie_invalid_expiredCookie_nonExtendable', () => {
        resetMocks();
        const eventId = "event1";
        const secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        const cookieDomain = ".test.com";
        const queueId = "queueId";
        const issueTime = Utils.getCurrentTime() - 4 * 60;
        const hash = generateHash(eventId, queueId, '3', "idle", issueTime.toString(), secretKey);

        const cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
        httpContextProvider.getHttpResponse().setCookie(cookieKey,
            "EventId=" + eventId + "&QueueId=" + queueId + "&FixedValidityMins=3&RedirectType=idle&IssueTime=" + issueTime.toString() + "&Hash=" + hash,
            cookieDomain, Utils.getCurrentTime() + (24 * 60 * 60));
        httpContextProvider.req.setCookie(cookieKey, httpContextProvider.res.cookies.get(cookieKey));
        const state = userInQueueStateCookieRepository.getState(eventId, 10, secretKey, true);

        expect(state.isValid).toBeFalsy();
        expect(state.isFound).toBeTruthy();
    });

    it('should getState_validCookieFormat_nonExtendable', () => {
        resetMocks();
        const eventId = "event1";
        const secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        const cookieDomain = ".test.com";
        const queueId = "queueId";
        const issueTime = Utils.getCurrentTime();
        const hash = generateHash(eventId, queueId, '3', "idle", issueTime.toString(), secretKey);

        const cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
        httpContextProvider.getHttpResponse()
            .setCookie(cookieKey, "EventId=" + eventId + "&QueueId=" + queueId + "&FixedValidityMins=3&RedirectType=idle&IssueTime=" + issueTime.toString() + "&Hash=" + hash,
                cookieDomain, Utils.getCurrentTime() + (24 * 60 * 60));
        httpContextProvider.req.setCookie(cookieKey, httpContextProvider.res.cookies.get(cookieKey));
        const state = userInQueueStateCookieRepository.getState(eventId, 10, secretKey, true);

        expect(state.isStateExtendable()).toBeFalsy();
        expect(state.isValid).toBeTruthy();
        expect(state.isFound).toBeTruthy();
        expect(state.queueId).toBe(queueId);
        expect(state.redirectType).toBe('idle');
    });

    it('should getState_NoCookie', () => {
        resetMocks();
        const eventId = "event1";
        const secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";

        const state = userInQueueStateCookieRepository.getState(eventId, 10, secretKey, true);

        expect(state.isFound).toBeFalsy();
        expect(state.isValid).toBeFalsy();
    });
});
