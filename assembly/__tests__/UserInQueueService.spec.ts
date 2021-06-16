//@ts-ignore
import {RegExp} from 'assemblyscript-regex'

import {Utils} from "../sdk/QueueITHelpers";
import {UserInQueueService} from "../sdk/UserInQueueService";
import {StateInfo} from "../sdk/UserInQueueStateCookieRepository";
import {CancelEventConfig, QueueEventConfig} from "../sdk/Models";
import {UserInQueueStateCookieRepositoryMock} from "./Mocks";
import {hashString, hmacString} from '../sdk/helpers/crypto'

const SDK_VERSION = UserInQueueService.SDK_VERSION;


function generateHash(eventId: string,
                      queueId: string,
                      timestamp: i64,
                      extendableCookie: string,
                      cookieValidityMinutes: i64,
                      redirectType: string,
                      secretKey: string): string {
    let token = 'e_' + eventId + '~ts_' + timestamp.toString() + '~ce_' + extendableCookie + '~q_' + queueId;
    if (cookieValidityMinutes != 0)
        token = token + '~cv_' + cookieValidityMinutes.toString();
    if (redirectType != null)
        token = token + '~rt_' + redirectType;
    return token + '~h_' + Utils.generateSHA256Hash(secretKey, token);
}

const userInQueueStateCookieRepositoryMock = new UserInQueueStateCookieRepositoryMock();
const userInQueueService = new UserInQueueService(userInQueueStateCookieRepositoryMock);
Utils.generateSHA256Hash = hmacString;

function newConfig(): QueueEventConfig {
    return new QueueEventConfig("", "", "", "", false, 0, "", 13);
}

describe('Crypto', () => {
    it('should use hmac-sha256', () => {
        let hash = hmacString('4e1db821-a825-49da-acd0-5d376f2068db', 'e_e1~ts_1620389879~ce_True~q_queueId~rt_idle');
        let hash2 = hmacString('4e1db821-a825-49da-acd0-5d376f2068db', 'e_e1~ts_1620389879~ce_True~q_queueId~rt_idle');
        expect(hash).toBe("c76001c94ec53a3d46c0c9b5939914d1f0f834cdf14acdc224450a0fe9810fe6");
        expect(hash2).toBe("c76001c94ec53a3d46c0c9b5939914d1f0f834cdf14acdc224450a0fe9810fe6");
    })

    it('should use sha256', () => {
        let r = hashString('asdasdasd');
        expect(r).toBe('d8a928b2043db77e340b523547bf16cb4aa483f0645fe0a290ed1f20aab76257');
    })
});

describe("UserInQueueService.validateQueueRequest", () => {

    it('ValidState_ExtendableCookie_NoCookieExtensionFromConfig_DoNotRedirectDoNotStoreCookieWithExtension', () => {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = new StateInfo(true, true, "queueId", 0, "idle");

        const eventConfig = new QueueEventConfig("", "", "", "", false, 0, "", 13, "");
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain";
        eventConfig.cookieDomain = "testDomain";
        eventConfig.cookieValidityMinute = 10;
        eventConfig.extendCookieValidity = false;

        const result = userInQueueService.validateQueueRequest("url", "token", eventConfig, "customerid", "key");
        expect(result.first!.doRedirect()).toBeFalsy();
        expect(result.first!.queueId).toBe('queueId');

        expect(userInQueueStateCookieRepositoryMock.storeCall.keys().length).toBe(0);
        expect(userInQueueStateCookieRepositoryMock.getStateCall.get("eventId")).toBe("e1");
        expect(userInQueueStateCookieRepositoryMock.getStateCall.get("cookieValidityMinutes")).toBe("10");
        expect(userInQueueStateCookieRepositoryMock.getStateCall.get("secretKey")).toBe("key");
        expect(userInQueueStateCookieRepositoryMock.getStateCall.get("validateTime")).toBe("true");
    });

    it('ValidState_ExtendableCookie_CookieExtensionFromConfig_DoNotRedirectDoStoreCookieWithExtension', () => {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = new StateInfo(true, true, "queueId", 0, "disabled");

        const eventConfig = newConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieDomain = "testDomain";
        eventConfig.cookieValidityMinute = 10;
        eventConfig.extendCookieValidity = true;

        const result = userInQueueService.validateQueueRequest("url", "token", eventConfig, "customerid", "key");

        expect(result.first!.doRedirect()).toBeFalsy();
        expect(result.first!.eventId).toBe('e1');
        expect(result.first!.queueId).toBe("queueId");

        expect(userInQueueStateCookieRepositoryMock.storeCall.get("eventId")).toBe("e1");
        expect(userInQueueStateCookieRepositoryMock.storeCall.get("queueId")).toBe("queueId");
        expect(userInQueueStateCookieRepositoryMock.storeCall.get("fixedCookieValidityMinutes")).toBe("0");
        expect(userInQueueStateCookieRepositoryMock.storeCall.get("cookieDomain")).toBe("testDomain");
        expect(userInQueueStateCookieRepositoryMock.storeCall.get("redirectType")).toBe("disabled");
        expect(userInQueueStateCookieRepositoryMock.storeCall.get("secretKey")).toBe("key");
    });

    it('ValidState_NoExtendableCookie_DoNotRedirectDoNotStoreCookieWithExtension', () => {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = new StateInfo(true, true, "queueId", 3, "idle");

        const eventConfig = newConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain";
        eventConfig.cookieValidityMinute = 10;
        eventConfig.extendCookieValidity = true;

        const result = userInQueueService.validateQueueRequest("url", "token", eventConfig, "customerid", "key");

        expect(result.first!.doRedirect()).toBeFalsy();
        expect(result.first!.eventId).toBe('e1');
        expect(result.first!.queueId).toBe("queueId");
        expect(userInQueueStateCookieRepositoryMock.storeCall.keys().length).toBe(0);
    });

    it('NoCookie_TampredToken_RedirectToErrorPageWithHashError_DoNotStoreCookie', () => {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = new StateInfo(false, false, "", 0, "");

        const key = "4e1db821-a825-49da-acd0-5d376f2068db";
        const eventConfig = newConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieValidityMinute = 10;
        eventConfig.extendCookieValidity = true;
        eventConfig.version = 11;
        eventConfig.actionName = "Queue Action (._~-) &!*|'\"";
        const url = "http://test.test.com?b=h";

        let token = generateHash('e1', 'queueId', Utils.getCurrentTime() + 3 * 60, 'False', 0, 'idle', key);
        token = token.replace("False", "True");

        const expectedErrorUrl = "https://testDomain.com/error/hash/?c=testCustomer&e=e1" +
            "&ver=" + SDK_VERSION
            + "&cver=11"
            + "&man=Queue%20Action%20%28._~-%29%20%26%21%2a%7C%27%22"
            + "&queueittoken=" + token
            + "&t=" + Utils.encodeUrl(url);

        const result = userInQueueService.validateQueueRequest(url, token, eventConfig, "testCustomer", key);
        const tsPartRx = new RegExp('&ts=[^&]*', 'g')
        expect(userInQueueStateCookieRepositoryMock.storeCall.keys().length).toBe(0);
        expect(result.first!.doRedirect()).toBeTruthy();
        expect(result.first!.eventId).toBe('e1');

        const tsMatch = tsPartRx.exec(result.first!.redirectUrl);
        expect(tsMatch).not.toBeNull()

        const tsPart = tsMatch!.matches[0];
        const timestamp = I64.parseInt(tsPart.replace("&ts=", ""));
        const urlWithoutTimeStamp = result.first!.redirectUrl.replace(tsPart, "");
        expect(Utils.getCurrentTime() - timestamp < 100 as bool).toBe(true);
        expect(urlWithoutTimeStamp).toBe(expectedErrorUrl, 'redirect url should be an error url');
    });

    it('NoCookie_ValidToken_ExtendableCookie_DoNotRedirect_StoreExtendableCookie', () => {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = new StateInfo(false, false, '', 0, '');

        const key = "4e1db821-a825-49da-acd0-5d376f2068db";
        const eventConfig = newConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieValidityMinute = 10;
        eventConfig.cookieDomain = "testDomain";
        eventConfig.extendCookieValidity = true;
        eventConfig.version = 11;
        const url = "http://test.test.com?b=h";

        const token = generateHash('e1', 'queueId', Utils.getCurrentTime() + 3 * 60, 'true', 0, 'queue', key);

        const result = userInQueueService.validateQueueRequest(url, token, eventConfig, "testCustomer", key);

        expect(result.first!.doRedirect()).toBeFalsy('should redirect');
        expect(result.first!.eventId).toBe('e1');
        expect(result.first!.queueId).toBe('queueId');
        expect(result.first!.redirectType).toBe('queue');

        expect(userInQueueStateCookieRepositoryMock.storeCall.get('eventId')).toBe('e1');
        expect(userInQueueStateCookieRepositoryMock.storeCall.get('queueId')).toBe('queueId');
        expect(userInQueueStateCookieRepositoryMock.storeCall.get('fixedCookieValidityMinutes')).toBe('0');
        expect(userInQueueStateCookieRepositoryMock.storeCall.get('cookieDomain')).toBe('testDomain');
        expect(userInQueueStateCookieRepositoryMock.storeCall.get('redirectType')).toBe('queue');
        expect(userInQueueStateCookieRepositoryMock.storeCall.get('secretKey')).toBe(key);
        expect(userInQueueStateCookieRepositoryMock.cancelQueueCookieCall.keys().length).toBe(0);
    });

    it('NoCookie_ValidToken_CookieValidityMinuteFromToken_DoNotRedirect_StoreNonExtendableCookie', () => {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = new StateInfo(false, false, '', 0, '');

        const key = "4e1db821-a825-49da-acd0-5d376f2068db";
        const eventConfig = newConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieValidityMinute = 30;
        eventConfig.cookieDomain = "testDomain";
        eventConfig.extendCookieValidity = true;
        const url = "http://test.test.com?b=h";

        const token = generateHash('e1', 'queueId', Utils.getCurrentTime() + 3 * 60, 'false', 3, 'DirectLink', key);
        const result = userInQueueService.validateQueueRequest(url, token, eventConfig, "testCustomer", key);

        expect(result.first!.doRedirect()).toBeFalsy('should not redirect');
        expect(result.first!.eventId).toBe('e1');
        expect(result.first!.queueId).toBe('queueId');
        expect(result.first!.redirectType).toBe('DirectLink');

        expect(userInQueueStateCookieRepositoryMock.storeCall.get('eventId')).toBe('e1');
        expect(userInQueueStateCookieRepositoryMock.storeCall.get('queueId')).toBe('queueId');
        expect(userInQueueStateCookieRepositoryMock.storeCall.get('fixedCookieValidityMinutes')).toBe('3');
        expect(userInQueueStateCookieRepositoryMock.storeCall.get('cookieDomain')).toBe('testDomain');
        expect(userInQueueStateCookieRepositoryMock.storeCall.get('redirectType')).toBe('DirectLink');
        expect(userInQueueStateCookieRepositoryMock.storeCall.get('secretKey')).toBe(key);
        expect(userInQueueStateCookieRepositoryMock.cancelQueueCookieCall.keys().length).toBe(0);
    });

    it('NoCookie_NoValidToken_WithoutToken_RedirectToQueue', () => {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = new StateInfo(false, false, '', 0, '');

        const key = "4e1db821-a825-49da-acd0-5d376f2068db";
        const eventConfig = newConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieValidityMinute = 10;
        eventConfig.extendCookieValidity = true;
        eventConfig.version = 11;
        eventConfig.culture = 'en-US';
        eventConfig.layoutName = 'testlayout';

        const url = "http://test.test.com?b=h";
        const token = '';

        const expectedRedirectUrl = 'https://testDomain.com/?c=testCustomer&e=e1' +
            "&ver=" + SDK_VERSION
            + "&cver=11"
            + "&man=unspecified"
            + "&cid=en-US"
            + "&l=testlayout"
            + "&t=" + Utils.encodeUrl(url);

        const result = userInQueueService.validateQueueRequest(url, token, eventConfig, "testCustomer", key);

        expect(userInQueueStateCookieRepositoryMock.storeCall.keys().length).toBe(0, 'store should not be called');
        expect(result.first!.doRedirect()).toBeTruthy('should redirect');
        expect(result.first!.eventId).toBe('e1', 'with WR ID');
        expect(result.first!.queueId).toBe('', 'queue id should not be used');
        expect(result.first!.redirectUrl).toBe(expectedRedirectUrl, 'should redirect to queue');
    });

    it('InValidCookie_WithoutToken_RedirectToQueue_CancelCookie', () => {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = new StateInfo(true, false, '', 0, '');

        const key = "4e1db821-a825-49da-acd0-5d376f2068db";
        const eventConfig = newConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieValidityMinute = 10;
        eventConfig.extendCookieValidity = true;
        eventConfig.version = 11;
        eventConfig.culture = 'en-US';
        eventConfig.layoutName = 'testlayout';

        const url = "http://test.test.com?b=h";
        const token = "";

        const expectedRedirectUrl = "https://testDomain.com/?c=testCustomer&e=e1" +
            "&ver=" + SDK_VERSION
            + "&cver=11"
            + "&man=unspecified"
            + "&cid=en-US"
            + "&l=testlayout"
            + "&t=" + Utils.encodeUrl(url);

        const result = userInQueueService.validateQueueRequest(url, token, eventConfig, "testCustomer", key);

        expect(userInQueueStateCookieRepositoryMock.storeCall.keys().length).toBe(0);
        expect(result.first!.doRedirect()).toBeTruthy();
        expect(result.first!.eventId).toBe('e1');
        expect(result.first!.queueId).toBe('');
        expect(result.first!.redirectUrl).toBe(expectedRedirectUrl);
        expect(userInQueueStateCookieRepositoryMock.cancelQueueCookieCall).toBeTruthy();
    });

    it('NoCookie_WithoutToken_RedirectToQueue_NotargetUrl', () => {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = new StateInfo(false, false, '', 0, '');

        const key = "4e1db821-a825-49da-acd0-5d376f2068db";
        const eventConfig = newConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieValidityMinute = 10;
        eventConfig.extendCookieValidity = false;
        eventConfig.version = 11;
        eventConfig.culture = '';
        eventConfig.layoutName = 'testlayout';
        const url = "http://test.test.com?b=h";
        const token = "";

        const expectedRedirectUrl = "https://testDomain.com/?c=testCustomer&e=e1" +
            "&ver=" + SDK_VERSION
            + "&cver=" + eventConfig.version.toString()
            + "&man=" + 'unspecified'
            + "&l=" + eventConfig.layoutName;

        const result = userInQueueService.validateQueueRequest('', token, eventConfig, "testCustomer", key);

        expect(userInQueueStateCookieRepositoryMock.storeCall.keys().length).toBe(0);
        expect(result.first!.doRedirect()).toBeTruthy();
        expect(result.first!.eventId).toBe('e1');
        expect(result.first!.queueId).toBe('');
        expect(result.first!.redirectUrl).toBe(expectedRedirectUrl);
    });

    it('NoCookie_InValidToken', () => {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = new StateInfo(false, false, '', 0, '');

        const key = "4e1db821-a825-49da-acd0-5d376f2068db";
        const eventConfig = newConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieValidityMinute = 10;
        eventConfig.extendCookieValidity = true;
        eventConfig.version = 11;
        eventConfig.culture = 'en-US';
        eventConfig.layoutName = 'testlayout';
        const url = "http://test.test.com?b=h";

        const result = userInQueueService.validateQueueRequest(url, "ts_sasa~cv_adsasa~ce_falwwwse~q_944c1f44-60dd-4e37-aabc-f3e4bb1c8895", eventConfig, "testCustomer", key);

        expect(userInQueueStateCookieRepositoryMock.storeCall.keys().length).toBe(0);
        expect(result.first!.doRedirect()).toBeTruthy('should redirect');
        expect(result.first!.eventId).toBe('e1');
        expect(result.first!.queueId).toBe('');
        expect(result.first!.redirectUrl.indexOf("https://testDomain.com/error/hash/?c=testCustomer&e=e1")).toBe(0);

        expect(userInQueueStateCookieRepositoryMock.cancelQueueCookieCall.keys().length).toBe(0);
    });

    it('InvalidCookie_InValidToken_CancelCookie', () => {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = new StateInfo(true, false, '', 0, '');

        const key = "4e1db821-a825-49da-acd0-5d376f2068db";
        const eventConfig = newConfig();
        eventConfig.eventId = 'e1';
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieValidityMinute = 10;
        eventConfig.extendCookieValidity = true;
        eventConfig.version = 11;
        eventConfig.culture = 'en-US';
        eventConfig.layoutName = 'testlayout';

        const url = "http://test.test.com?b=h";

        const resultPair = userInQueueService.validateQueueRequest(url, "ts_sasa~cv_adsasa~ce_falwwwse~q_944c1f44-60dd-4e37-aabc-f3e4bb1c8895", eventConfig, "testCustomer", key);
        const result = resultPair.first;

        expect(userInQueueStateCookieRepositoryMock.storeCall.keys().length).toBe(0, 'store should not be called');
        expect(result!.doRedirect()).toBeTruthy('should redirect');
        expect(result!.eventId).toBe('e1');
        expect(result!.queueId).toBe('');
        expect(result!.redirectUrl.indexOf("https://testDomain.com/error/hash/?c=testCustomer&e=e1")).toBe(0);

        expect(userInQueueStateCookieRepositoryMock.cancelQueueCookieCall.keys().length > 0).toBeTruthy('cancelQueueCookie should be called');
    });

    it('validateCancelRequest', () => {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = new StateInfo(true, true, "queueid", 3, "idle");

        const key = "4e1db821-a825-49da-acd0-5d376f2068db";
        const eventConfig = new CancelEventConfig('', '', '', 0);
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieDomain = "testdomain";
        eventConfig.version = 10;
        eventConfig.actionName = "Cancel";

        const url = "http://test.test.com?b=h";
        let expectedUrl = "https://testDomain.com/cancel/testCustomer/e1/?c=testCustomer&e=e1"
            + "&ver=" + SDK_VERSION
            + "&cver=" + eventConfig.version.toString()
            + "&man=" + eventConfig.actionName
            + "&r=" + "http%3A%2F%2Ftest.test.com%3Fb%3Dh";

        const result = userInQueueService.validateCancelRequest(url, eventConfig, "testCustomer", key);

        expect(userInQueueStateCookieRepositoryMock.cancelQueueCookieCall.keys().length).not.toBe(0, 'cancelQueueCookie should be called');
        expect(userInQueueStateCookieRepositoryMock.storeCall.keys().length).toBe(0, 'store shouldn`t be called');
        expect(result.first!.redirectUrl).toBe(expectedUrl, 'Url should be cancel url');
        expect(result.first!.doRedirect()).toBeTruthy('should redirect');
        expect(result.first!.eventId).toBe('e1', 'WR ID should match');
        expect(result.first!.queueId).toBe('queueid', 'QueueId should match');
        expect(result.first!.actionName).toBe('Cancel', 'Action name should be Cancel');
    });

});

describe('getIgnoreResult', () => {
    it('should not redirect with empty request', () => {
        userInQueueStateCookieRepositoryMock.reset();

        const result = userInQueueService.getIgnoreResult("");

        expect(result.doRedirect()).toBeFalsy();
        expect(result.eventId).toBe("");
        expect(result.queueId).toBe("");
        expect(result.redirectUrl).toBe("");
        expect(result.actionType).toBe("Ignore");
    });
});
