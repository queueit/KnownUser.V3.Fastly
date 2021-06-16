import {QueueParameterHelper, Utils} from "../sdk/QueueITHelpers";
import {UserInQueueService} from "../sdk/UserInQueueService";
import {CancelEventConfig, QueueEventConfig, RequestValidationResult} from "../sdk/Models";
import {
    MockDateTimeProvider,
    MockHttpContextProvider,
    MockHttpRequest, MockHttpResponse,
    UserInQueueServiceMock,
    UserInQueueStateCookieRepositoryMock, ValidateQueueRequestCall
} from "./Mocks";
import {hmacString} from '../sdk/helpers/crypto'
import {KnownUser} from '../sdk/KnownUser';

Utils.generateSHA256Hash = hmacString;

const SDK_VERSION = UserInQueueService.SDK_VERSION;
const userInQueueServiceMock = new UserInQueueServiceMock(new UserInQueueStateCookieRepositoryMock());
const httpContextMock = new MockHttpContextProvider(new MockHttpRequest(), new MockHttpResponse());

function resetMocks(): void {
    userInQueueServiceMock.reset();
    httpContextMock.reset();
}

function generateDebugToken(eventId: string, secretKey: string, expiredToken: bool = false): string {
    let timeStamp = Utils.getCurrentTime() + 3 * 60;

    if (expiredToken) {
        timeStamp = timeStamp - 1000;
    }

    const tokenWithoutHash: string =
        QueueParameterHelper.EventIdKey +
        QueueParameterHelper.KeyValueSeparatorChar +
        eventId +
        QueueParameterHelper.KeyValueSeparatorGroupChar +
        QueueParameterHelper.RedirectTypeKey +
        QueueParameterHelper.KeyValueSeparatorChar +
        "debug" +
        QueueParameterHelper.KeyValueSeparatorGroupChar +
        QueueParameterHelper.TimeStampKey +
        QueueParameterHelper.KeyValueSeparatorChar +
        timeStamp.toString();

    const hashValue = Utils.generateSHA256Hash(secretKey, tokenWithoutHash);

    return tokenWithoutHash +
        QueueParameterHelper.KeyValueSeparatorGroupChar +
        QueueParameterHelper.HashKey +
        QueueParameterHelper.KeyValueSeparatorChar +
        hashValue;
}

function mockGoogleHeaders(): void {
    httpContextMock.req.headers.set('user-agent', 'googlebot');
    httpContextMock.req.headers.set('via', 'v');
    httpContextMock.req.headers.set('forwarded', 'f');
    httpContextMock.req.headers.set('x-forwarded-for', 'xff');
    httpContextMock.req.headers.set('x-forwarded-host', 'xfh');
    httpContextMock.req.headers.set('x-forwarded-proto', 'xfp');
}

describe('extendQueueCookie', () => {
    it('should handle NullEventId', () => {
        //Arrange
        resetMocks();

        //Act
        const err = KnownUser.extendQueueCookie("", 0, "", "", httpContextMock);
        const exceptionWasThrown = err != null && err.message == "eventId can not be null or empty.";

        //Assert
        expect(userInQueueServiceMock.extendQueueCookieCall).toBeNull();
        expect(exceptionWasThrown).toBeTruthy('error should be returned');
    });

    it('should handle InvalidCookieValidityMinutes', () => {
        //Arrange
        resetMocks();

        //Act
        const err = KnownUser.extendQueueCookie("eventId", -1, "cookiedomain", "secretkey", httpContextMock);
        const exceptionWasThrown = err != null && err.message == "cookieValidityMinute should be integer greater than 0.";

        //Assert
        expect(userInQueueServiceMock.extendQueueCookieCall).toBeNull();
        expect(exceptionWasThrown).toBeTruthy('error should be returned');
    });

    it('should handle NullSecretKey', () => {
        //Arrange
        resetMocks();

        //Act
        const err = KnownUser.extendQueueCookie("eventId", 20, "cookiedomain", '', httpContextMock);
        const exceptionWasThrown = err != null && err.message == "secretKey can not be null or empty.";

        //Assert
        expect(userInQueueServiceMock.extendQueueCookieCall).toBeNull();
        expect(exceptionWasThrown).toBeTruthy('error should be returned');
    });

    it('Should extend', () => {
        //Arrange
        resetMocks();

        //Act
        KnownUser.UserInQueueService = userInQueueServiceMock;
        const result = KnownUser.extendQueueCookie("eventId", 20, "cookiedomain", "secretKey", httpContextMock);

        //Assert
        expect(result).toBeNull();
        expect(userInQueueServiceMock.extendQueueCookieCall).not.toBeNull();
        expect(userInQueueServiceMock.extendQueueCookieCall!.method).toBe('extendQueueCookie');
        expect(userInQueueServiceMock.extendQueueCookieCall!.eventId).toBe('eventId');
        expect(userInQueueServiceMock.extendQueueCookieCall!.cookieValidityMinute).toBe(20);
        expect(userInQueueServiceMock.extendQueueCookieCall!.secretKey).toBe('secretKey');
    });
});

function getGoogleBotExampleIntegrationConfig(): string {
    const integrationConfigString = `{
            "Description": "test",
            "Integrations": [
                {
                    "Name": "event1action",
                    "ActionType": "Queue",
                    "EventId": "event1",
                    "CookieDomain": ".test.com",
                    "LayoutName": "Christmas Layout by Queue-it",
                    "Culture": "",
                    "ExtendCookieValidity": true,
                    "CookieValidityMinute": 20,
                    "Triggers": [
                        {
                            "TriggerParts": [
                                {
                                    "Operator": "Contains",
                                    "ValueToCompare": "event1",
                                    "UrlPart": "PageUrl",
                                    "ValidatorType": "UrlValidator",
                                    "IsNegative": false,
                                    "IsIgnoreCase": true
                                },
                                {
                                    "Operator": "Contains",
                                    "ValueToCompare": "googlebot",
                                    "ValidatorType": "UserAgentValidator",
                                    "IsNegative": false,
                                    "IsIgnoreCase": false
                                }
                            ],
                            "LogicalOperator": "And"
                        }
                    ],
                    "QueueDomain": "knownusertest.queue-it.net",
                    "RedirectLogic": "AllowTParameter",
                    "ForcedTargetUrl": ""
                }
            ],
            "CustomerId": "knownusertest",
            "AccountId": "knownusertest",
            "Version": 3,
            "PublishDate": "2017-05-15T21:39:12.0076806Z",
            "ConfigDataVersion": "1.0.0.1"
        }`;
    return integrationConfigString;
}

describe('validateRequestByIntegrationConfig', () => {

    it('should handle googlebot', () => {
        resetMocks();
        userInQueueServiceMock.validateQueueRequestResult = new RequestValidationResult("Queue", "eventidX", "", "http://q.qeuue-it.com", "");

        httpContextMock.req.headers.set('user-agent', 'googlebot');

        const result = KnownUser.validateRequestByIntegrationConfig("http://test.com?event1=true",
            "queueIttoken",
            getGoogleBotExampleIntegrationConfig(),
            "customerid",
            "secretkey",
            httpContextMock);

        expect(result.first).not.toBeNull();
        expect(result.first!.isAjaxResult).toBeFalsy('isAjaxResult should be false');
        expect(result.second).toBeNull();
        expect(result.first!.eventId).toBe("eventidX");
        expect(userInQueueServiceMock.validateQueueRequestCall).not.toBeNull()
        expect(userInQueueServiceMock.validateQueueRequestCall!.method).toBe("validateQueueRequest");
        expect(userInQueueServiceMock.validateQueueRequestCall!.targetUrl).toBe("http://test.com?event1=true");
        expect(userInQueueServiceMock.validateQueueRequestCall!.queueitToken).toBe("queueIttoken");
        expect(userInQueueServiceMock.validateQueueRequestCall!.queueConfig.queueDomain).toBe("knownusertest.queue-it.net");
        expect(userInQueueServiceMock.validateQueueRequestCall!.queueConfig.eventId).toBe("event1");
        expect(userInQueueServiceMock.validateQueueRequestCall!.queueConfig.culture).toBe("");
        expect(userInQueueServiceMock.validateQueueRequestCall!.queueConfig.layoutName).toBe("Christmas Layout by Queue-it");
        expect(userInQueueServiceMock.validateQueueRequestCall!.queueConfig.extendCookieValidity).toBeTruthy('cookie should be extended');
        expect(userInQueueServiceMock.validateQueueRequestCall!.queueConfig.cookieValidityMinute).toBe(20);
        expect(userInQueueServiceMock.validateQueueRequestCall!.queueConfig.cookieDomain).toBe(".test.com");
        expect(userInQueueServiceMock.validateQueueRequestCall!.queueConfig.version).toBe(3);
        expect(userInQueueServiceMock.validateQueueRequestCall!.customerId).toBe('customerid');
        expect(userInQueueServiceMock.validateQueueRequestCall!.secretKey).toBe('secretkey');
    });

    it('should handle AjaxCall', () => {
        resetMocks();
        userInQueueServiceMock.validateQueueRequestResult = new RequestValidationResult("Queue", "eventid", "", "http://q.qeuue-it.com", "");

        httpContextMock.req.headers.set('x-queueit-ajaxpageurl', 'http%3a%2f%2ftest.com%3fevent1%3dtrue');
        httpContextMock.req.headers.set('user-agent', 'googlebot');
        httpContextMock.req.headers.set('a', 'b');
        httpContextMock.req.headers.set('e', 'f');

        const integrationConfigString = `{
            "Description": "test",
            "Integrations": [
                {
                    "Name": "event1action",
                    "ActionType": "Queue",
                    "EventId": "event1",
                    "CookieDomain": ".test.com",
                    "LayoutName": "Christmas Layout by Queue-it",
                    "Culture": "",
                    "ExtendCookieValidity": true,
                    "CookieValidityMinute": 20,
                    "Triggers": [
                        {
                            "TriggerParts": [
                                {
                                    "Operator": "Contains",
                                    "ValueToCompare": "event1",
                                    "UrlPart": "PageUrl",
                                    "ValidatorType": "UrlValidator",
                                    "IsNegative": false,
                                    "IsIgnoreCase": true
                                },
                                {
                                    "Operator": "Contains",
                                    "ValueToCompare": "googlebot",
                                    "ValidatorType": "UserAgentValidator",
                                    "IsNegative": false,
                                    "IsIgnoreCase": false
                                }
                            ],
                            "LogicalOperator": "And"
                        }
                    ],
                    "QueueDomain": "knownusertest.queue-it.net",
                    "RedirectLogic": "AllowTParameter",
                    "ForcedTargetUrl": ""
                }
            ],
            "CustomerId": "knownusertest",
            "AccountId": "knownusertest",
            "Version": 3,
            "PublishDate": "2017-05-15T21:39:12.0076806Z",
            "ConfigDataVersion": "1.0.0.1"
        }`;

        const result = KnownUser.validateRequestByIntegrationConfig("http://test.com?event1=true", "queueIttoken", integrationConfigString, "customerid", "secretkey", httpContextMock);

        expect(userInQueueServiceMock.validateQueueRequestCall!.method).toBe('validateQueueRequest');
        expect(userInQueueServiceMock.validateQueueRequestCall!.targetUrl).toBe('http://test.com?event1=true');
        expect(userInQueueServiceMock.validateQueueRequestCall!.queueitToken).toBe('queueIttoken');
        expect(userInQueueServiceMock.validateQueueRequestCall!.queueConfig.queueDomain).toBe('knownusertest.queue-it.net');
        expect(userInQueueServiceMock.validateQueueRequestCall!.queueConfig.eventId).toBe('event1');
        expect(userInQueueServiceMock.validateQueueRequestCall!.queueConfig.culture).toBe('');
        expect(userInQueueServiceMock.validateQueueRequestCall!.queueConfig.layoutName).toBe('Christmas Layout by Queue-it');
        expect(userInQueueServiceMock.validateQueueRequestCall!.queueConfig.extendCookieValidity).toBeTruthy('cookie should be extended');
        expect(userInQueueServiceMock.validateQueueRequestCall!.queueConfig.cookieValidityMinute).toBe(20);
        expect(userInQueueServiceMock.validateQueueRequestCall!.queueConfig.cookieDomain).toBe('.test.com');
        expect(userInQueueServiceMock.validateQueueRequestCall!.queueConfig.version).toBe(3);
        expect(userInQueueServiceMock.validateQueueRequestCall!.customerId).toBe('customerid');
        expect(userInQueueServiceMock.validateQueueRequestCall!.secretKey).toBe('secretkey');
        expect(result.first!.isAjaxResult).toBeTruthy();
        expect(result.first!.getAjaxRedirectUrl().toLowerCase()).toBe("http%3a%2f%2fq.qeuue-it.com");
    });

    it('should handle NotMatch', () => {
        resetMocks();

        const integrationConfigString = `{
            "Description": "test",
            "Integrations": [
            ],
            "CustomerId": "knownusertest",
            "AccountId": "knownusertest",
            "Version": 3,
            "PublishDate": "2017-05-15T21:39:12.0076806Z",
            "ConfigDataVersion": "1.0.0.1"
        }`;

        const result = KnownUser.validateRequestByIntegrationConfig("http://test.com?event1=true", "queueIttoken", integrationConfigString, "customerid", "secretkey", httpContextMock);

        expect(userInQueueServiceMock.validateQueueRequestCall).toBeNull();
        expect(result.first!.doRedirect()).toBeFalsy('should not redirect');
    });

    it('should EmptyCurrentUrl', () => {
        //Arrange
        resetMocks();

        const integrationConfigString = `{
            "Description": "test",
            "Integrations": [
                {
                    "Name": "event1action",
                    "ActionType": "Queue",
                    "EventId": "event1",
                    "CookieDomain": ".test.com",
                    "LayoutName": "Christmas Layout by Queue-it",
                    "Culture": "",
                    "ExtendCookieValidity": true,
                    "CookieValidityMinute": 20,
                    "Triggers": [
                        {
                            "TriggerParts": [
                                {
                                    "Operator": "Contains",
                                    "ValueToCompare": "event1",
                                    "UrlPart": "PageUrl",
                                    "ValidatorType": "UrlValidator",
                                    "IsNegative": false,
                                    "IsIgnoreCase": true
                                },
                                {
                                    "Operator": "Contains",
                                    "ValueToCompare": "googlebot",
                                    "ValidatorType": "UserAgentValidator",
                                    "IsNegative": false,
                                    "IsIgnoreCase": false
                                }
                            ],
                            "LogicalOperator": "And"
                        }
                    ],
                    "QueueDomain": "knownusertest.queue-it.net",
                    "RedirectLogic": "AllowTParameter",
                    "ForcedTargetUrl": ""
                }
            ],
            "CustomerId": "knownusertest",
            "AccountId": "knownusertest",
            "Version": 3,
            "PublishDate": "2017-05-15T21:39:12.0076806Z",
            "ConfigDataVersion": "1.0.0.1"
        }`;

        //Act
        const result = KnownUser.validateRequestByIntegrationConfig('', "queueIttoken", integrationConfigString, "customerId", "secretKey", httpContextMock);
        const exceptionWasThrown = result.second != null && result.second!.message == "currentUrlWithoutQueueITToken can not be null or empty.";

        //Assert
        expect(userInQueueServiceMock.validateQueueRequestCall).toBeNull('validate queue request should not be called');
        expect(exceptionWasThrown).toBeTruthy('exception should be returned');
    });

    it('should not be called if integration config is empty', () => {
        //Arrange
        resetMocks();

        //Act
        let result = KnownUser.validateRequestByIntegrationConfig("currentUrl", "queueitToken", '', "customerId", "secretKey", httpContextMock);
        const exceptionWasThrown = result.second != null && result.second!.message == "integrationsConfigString can not be null or empty.";

        //Assert
        expect(userInQueueServiceMock.validateQueueRequestCall).toBeNull('validate queue request should not be called');
        expect(exceptionWasThrown).toBeTruthy('exception should be returned');
    });

    it('should ForcedTargetUrl', () => {
        resetMocks();
        userInQueueServiceMock.validateQueueRequestResult = new RequestValidationResult("Queue", "eventid", "", "http://q.qeuue-it.com", "");

        const integrationConfigString = `{
              "Description": "test",
              "Integrations": [
                {
                  "Name": "event1action",
                  "ActionType": "Queue",
                  "EventId": "event1",
                  "CookieDomain": ".test.com",
                  "LayoutName": "Christmas Layout by Queue-it",
                  "Culture": "",
                  "ExtendCookieValidity": true,
                  "CookieValidityMinute": 20,
                  "Triggers": [
                    {
                      "TriggerParts": [
                        {
                          "Operator": "Contains",
                          "ValueToCompare": "event1",
                          "UrlPart": "PageUrl",
                          "ValidatorType": "UrlValidator",
                          "IsNegative": false,
                          "IsIgnoreCase": true
                        }
                      ],
                      "LogicalOperator": "And"
                    }
                  ],
                  "QueueDomain": "knownusertest.queue-it.net",
                  "RedirectLogic": "ForcedTargetUrl",
                  "ForcedTargetUrl": "http://test.com"
                }
              ],
              "CustomerId": "knownusertest",
              "AccountId": "knownusertest",
              "Version": 3,
              "PublishDate": "2017-05-15T21:39:12.0076806Z",
              "ConfigDataVersion": "1.0.0.1"
            }`;

        KnownUser.UserInQueueService = userInQueueServiceMock;
        const result = KnownUser.validateRequestByIntegrationConfig("http://test.com?event1=true", "queueIttoken", integrationConfigString, "customerid", "secretkey", httpContextMock);

        expect(userInQueueServiceMock.validateQueueRequestCall!.method == "validateQueueRequest");
        expect(userInQueueServiceMock.validateQueueRequestCall!.targetUrl == "http://test.com");
    });

    it('should ForcedTargetUrl_AjaxCall', () => {
        resetMocks();
        userInQueueServiceMock.validateQueueRequestResult = new RequestValidationResult("Queue", "eventid", "", "http://q.qeuue-it.com", "");

        httpContextMock.req.headers.set('x-queueit-ajaxpageurl', 'http%3a%2f%2ftest.com%3fevent1%3dtrue');
        httpContextMock.req.headers.set('a', 'b');
        httpContextMock.req.headers.set('e', 'f');

        const integrationConfigString = `{
              "Description": "test",
              "Integrations": [
                {
                  "Name": "event1action",
                  "ActionType": "Queue",
                  "EventId": "event1",
                  "CookieDomain": ".test.com",
                  "LayoutName": "Christmas Layout by Queue-it",
                  "Culture": "",
                  "ExtendCookieValidity": true,
                  "CookieValidityMinute": 20,
                  "Triggers": [
                    {
                      "TriggerParts": [
                        {
                          "Operator": "Contains",
                          "ValueToCompare": "event1",
                          "UrlPart": "PageUrl",
                          "ValidatorType": "UrlValidator",
                          "IsNegative": false,
                          "IsIgnoreCase": true
                        }
                      ],
                      "LogicalOperator": "And"
                    }
                  ],
                  "QueueDomain": "knownusertest.queue-it.net",
                  "RedirectLogic": "ForcedTargetUrl",
                  "ForcedTargetUrl": "http://test.com"
                }
              ],
              "CustomerId": "knownusertest",
              "AccountId": "knownusertest",
              "Version": 3,
              "PublishDate": "2017-05-15T21:39:12.0076806Z",
              "ConfigDataVersion": "1.0.0.1"
            }`;

        KnownUser.UserInQueueService = userInQueueServiceMock;
        const result = KnownUser.validateRequestByIntegrationConfig("http://test.com?event1", "queueIttoken", integrationConfigString, "customerid", "secretkey", httpContextMock);

        expect(userInQueueServiceMock.validateQueueRequestCall!.method).toBe('validateQueueRequest');
        expect(userInQueueServiceMock.validateQueueRequestCall!.targetUrl).toBe('http://test.com');
        expect(result.first!.isAjaxResult).toBeTruthy();
    });

    it('should EventTargetUrl', () => {
        resetMocks();
        userInQueueServiceMock.validateQueueRequestResult = new RequestValidationResult("Queue", "eventid", "", "http://q.qeuue-it.com", "");

        const integrationConfigString = `{
              "Description": "test",
              "Integrations": [
                {
                  "Name": "event1action",
                  "ActionType": "Queue",
                  "EventId": "event1",
                  "CookieDomain": ".test.com",
                  "LayoutName": "Christmas Layout by Queue-it",
                  "Culture": "",
                  "ExtendCookieValidity": true,
                  "CookieValidityMinute": 20,
                  "Triggers": [
                    {
                      "TriggerParts": [
                        {
                          "Operator": "Contains",
                          "ValueToCompare": "event1",
                          "UrlPart": "PageUrl",
                          "ValidatorType": "UrlValidator",
                          "IsNegative": false,
                          "IsIgnoreCase": true
                        }
                      ],
                      "LogicalOperator": "And"
                    }
                  ],
                  "QueueDomain": "knownusertest.queue-it.net",
                  "RedirectLogic": "EventTargetUrl"
                }
              ],
              "CustomerId": "knownusertest",
              "AccountId": "knownusertest",
              "Version": 3,
              "PublishDate": "2017-05-15T21:39:12.0076806Z",
              "ConfigDataVersion": "1.0.0.1"
            }`;

        KnownUser.UserInQueueService = userInQueueServiceMock;
        const result = KnownUser.validateRequestByIntegrationConfig("http://test.com?event1=true", "queueIttoken", integrationConfigString, "customerid", "secretkey", httpContextMock);

        expect(userInQueueServiceMock.validateQueueRequestCall!.method).toBe('validateQueueRequest');
        expect(userInQueueServiceMock.validateQueueRequestCall!.targetUrl).toBe('');
    });

    it('should EventTargetUrl_AjaxCall', () => {
        resetMocks();
        userInQueueServiceMock.validateQueueRequestResult = new RequestValidationResult("Queue", "eventid", "", "http://q.qeuue-it.com", "");

        httpContextMock.req.headers.set('a', 'b');
        httpContextMock.req.headers.set('x-queueit-ajaxpageurl', 'http%3a%2f%2ftest.com%3fevent1%3dtrue');
        httpContextMock.req.headers.set('e', 'f');

        const integrationConfigString = `{
              "Description": "test",
              "Integrations": [
                {
                  "Name": "event1action",
                  "ActionType": "Queue",
                  "EventId": "event1",
                  "CookieDomain": ".test.com",
                  "LayoutName": "Christmas Layout by Queue-it",
                  "Culture": "",
                  "ExtendCookieValidity": true,
                  "CookieValidityMinute": 20,
                  "Triggers": [
                    {
                      "TriggerParts": [
                        {
                          "Operator": "Contains",
                          "ValueToCompare": "event1",
                          "UrlPart": "PageUrl",
                          "ValidatorType": "UrlValidator",
                          "IsNegative": false,
                          "IsIgnoreCase": true
                        }
                      ],
                      "LogicalOperator": "And"
                    }
                  ],
                  "QueueDomain": "knownusertest.queue-it.net",
                  "RedirectLogic": "EventTargetUrl"
                }
              ],
              "CustomerId": "knownusertest",
              "AccountId": "knownusertest",
              "Version": 3,
              "PublishDate": "2017-05-15T21:39:12.0076806Z",
              "ConfigDataVersion": "1.0.0.1"
            }`;

        KnownUser.UserInQueueService = userInQueueServiceMock;
        const result = KnownUser.validateRequestByIntegrationConfig("http://test.com?event1=true", "queueIttoken", integrationConfigString, "customerid", "secretkey", httpContextMock);

        expect(userInQueueServiceMock.validateQueueRequestCall!.method).toBe('validateQueueRequest');
        expect(userInQueueServiceMock.validateQueueRequestCall!.targetUrl).toBe('');
        expect(result.first!.isAjaxResult).toBeTruthy();
    });

    it('should Exception_NoDebugToken', () => {
        resetMocks();
        userInQueueServiceMock.validateQueueRequestResultRaiseException = true;

        httpContextMock.req.headers.set('user-agent', 'googlebot');

        const integrationConfigString = `{
            "Description": "test",
            "Integrations": [
                {
                    "Name": "event1action",
                    "ActionType": "Queue",
                    "EventId": "event1",
                    "CookieDomain": ".test.com",
                    "LayoutName": "Christmas Layout by Queue-it",
                    "Culture": "",
                    "ExtendCookieValidity": true,
                    "CookieValidityMinute": 20,
                    "Triggers": [
                        {
                            "TriggerParts": [
                                {
                                    "Operator": "Contains",
                                    "ValueToCompare": "event1",
                                    "UrlPart": "PageUrl",
                                    "ValidatorType": "UrlValidator",
                                    "IsNegative": false,
                                    "IsIgnoreCase": true
                                },
                                {
                                    "Operator": "Contains",
                                    "ValueToCompare": "googlebot",
                                    "ValidatorType": "UserAgentValidator",
                                    "IsNegative": false,
                                    "IsIgnoreCase": false
                                }
                            ],
                            "LogicalOperator": "And"
                        }
                    ],
                    "QueueDomain": "knownusertest.queue-it.net",
                    "RedirectLogic": "AllowTParameter",
                    "ForcedTargetUrl": ""
                }
            ],
            "CustomerId": "knownusertest",
            "AccountId": "knownusertest",
            "Version": 3,
            "PublishDate": "2017-05-15T21:39:12.0076806Z",
            "ConfigDataVersion": "1.0.0.1"
        }`;

        const result = KnownUser.validateRequestByIntegrationConfig("http://test.com?event1=true", "queueIttoken", integrationConfigString, "customerid", "secretkey", httpContextMock);

        expect(result.second).not.toBeNull()
        expect(httpContextMock.res.cookies.has(KnownUser.QueueITDebugKey)).toBeFalsy('debug header shouldn`t be added');
    });

    it('should CancelAction', () => {
        resetMocks();
        userInQueueServiceMock.validateQueueRequestResult = new RequestValidationResult("Cancel", "eventid", "queueid", "redirectUrl", "");

        httpContextMock.req.headers.set('user-agent', 'googlebot');

        const integrationConfigString = `{
            "Integrations":[
                {
                    "Name":"event1action",
                    "EventId":"eventid",
                    "CookieDomain":"cookiedomain",
                    "LayoutName":null,
                    "Culture":null,
                    "ExtendCookieValidity":null,
                    "CookieValidityMinute":null,
                    "QueueDomain":"queuedomain",
                    "RedirectLogic":null,
                    "ForcedTargetUrl":null,
                    "ActionType":"Cancel",
                    "Triggers":[
                    {
                        "TriggerParts":[
                            {
                                "ValidatorType":"UrlValidator",
                                "Operator":"Contains",
                                "ValueToCompare":"event1",
                                "ValuesToCompare":null,
                                "IsNegative":false,
                                "IsIgnoreCase":true,
                                "UrlPart":"PageUrl",
                                "CookieName":null,
                                "HttpHeaderName":null
                            }
                        ],
                        "LogicalOperator":"And"
                    }
                    ]
                }
            ],
            "Version":3
        }`;

        KnownUser.UserInQueueService = userInQueueServiceMock;
        const result = KnownUser.validateRequestByIntegrationConfig("http://test.com?event1=true", "queueIttoken", integrationConfigString, "customerid", "secretkey", httpContextMock);

        expect(userInQueueServiceMock.validateCancelRequestCall!.method).toBe('validateCancelRequest');
        expect(userInQueueServiceMock.validateCancelRequestCall!.targetUrl).toBe('http://test.com?event1=true');
        expect(userInQueueServiceMock.validateCancelRequestCall!.customerId).toBe('customerid');
        expect(userInQueueServiceMock.validateCancelRequestCall!.secretKey).toBe('secretkey');

        expect(userInQueueServiceMock.validateQueueRequestResult.eventId).toBe('eventid');
        expect(userInQueueServiceMock.validateQueueRequestResult.queueId).toBe('queueid');
        expect(userInQueueServiceMock.validateQueueRequestResult.redirectUrl).toBe('redirectUrl');

        expect(result.first!.isAjaxResult).toBeFalsy();
    });

    it('should CancelAction_AjaxCall', () => {
        resetMocks();
        userInQueueServiceMock.validateQueueRequestResult = new RequestValidationResult("Cancel", "eventid", "", "http://q.qeuue-it.com", '');

        httpContextMock.req.headers.set('a', 'b');
        httpContextMock.req.headers.set('e', 'f');
        httpContextMock.req.headers.set('x-queueit-ajaxpageurl', 'http%3a%2f%2furl');

        const integrationConfigString = `{
           "Integrations":[
              {
                 "Name":"event1action",
                 "EventId":"eventid",
                 "CookieDomain":"cookiedomain",
                 "LayoutName":null,
                 "Culture":null,
                 "ExtendCookieValidity":null,
                 "CookieValidityMinute":null,
                 "QueueDomain":"queuedomain",
                 "RedirectLogic":null,
                 "ForcedTargetUrl":null,
                 "ActionType":"Cancel",
                 "Triggers":[
                    {
                       "TriggerParts":[
                          {
                             "ValidatorType":"UrlValidator",
                             "Operator":"Contains",
                             "ValueToCompare":"event1",
                             "ValuesToCompare":null,
                             "IsNegative":false,
                             "IsIgnoreCase":true,
                             "UrlPart":"PageUrl",
                             "CookieName":null,
                             "HttpHeaderName":null
                          }
                       ],
                       "LogicalOperator":"And"
                    }
                 ]
              }
           ],
           "Version":3
        }`;

        KnownUser.UserInQueueService = userInQueueServiceMock;
        const result = KnownUser.validateRequestByIntegrationConfig("http://test.com?event1=true", "queueIttoken", integrationConfigString, "customerid", "secretkey", httpContextMock);

        expect(userInQueueServiceMock.validateCancelRequestCall!.method).toBe('validateCancelRequest');
        expect(userInQueueServiceMock.validateCancelRequestCall!.targetUrl).toBe('http://url');
        expect(userInQueueServiceMock.validateCancelRequestCall!.customerId).toBe('customerid');
        expect(userInQueueServiceMock.validateCancelRequestCall!.secretKey).toBe('secretkey');

        expect(userInQueueServiceMock.validateCancelRequestCall!.cancelConfig.eventId).toBe('eventid');
        expect(userInQueueServiceMock.validateCancelRequestCall!.cancelConfig.queueDomain).toBe('queuedomain');
        expect(userInQueueServiceMock.validateCancelRequestCall!.cancelConfig.cookieDomain).toBe('cookiedomain');
        expect(userInQueueServiceMock.validateCancelRequestCall!.cancelConfig.version).toBe(3);

        expect(result.first!.isAjaxResult).toBeTruthy();
    });

    it('should IgnoreAction', () => {
        resetMocks();
        userInQueueServiceMock.validateQueueRequestResult = new RequestValidationResult("Ignore", "eventid", "queueid", "redirectUrl", "", "event1action");

        httpContextMock.req.headers.set('user-agent', 'googlebot');

        const integrationConfigString = `{  
                   "Integrations":[  
                      {  
                         "Name":"event1action",
                         "EventId":"eventid",
                         "CookieDomain":"cookiedomain",
                         "LayoutName":null,
                         "Culture":null,
                         "ExtendCookieValidity":null,
                         "CookieValidityMinute":null,
                         "QueueDomain":"queuedomain",
                         "RedirectLogic":null,
                         "ForcedTargetUrl":null,
                         "ActionType":"Ignore",
                         "Triggers":[  
                            {  
                               "TriggerParts":[  
                                  {  
                                     "ValidatorType":"UrlValidator",
                                     "Operator":"Contains",
                                     "ValueToCompare":"event1",
                                     "ValuesToCompare":null,
                                     "IsNegative":false,
                                     "IsIgnoreCase":true,
                                     "UrlPart":"PageUrl",
                                     "CookieName":null,
                                     "HttpHeaderName":null
                                  }
                               ],
                               "LogicalOperator":"And"
                            }
                         ]
                      }
                   ],
                   "Version":3
                }`;

        KnownUser.UserInQueueService = userInQueueServiceMock;

        const result = KnownUser.validateRequestByIntegrationConfig("http://test.com?event1=true", "queueIttoken", integrationConfigString, "customerid", "secretkey", httpContextMock);
        const call = userInQueueServiceMock.requestValidationResult;
        expect(result.first!.actionType).toBe('Ignore');
        expect(call!.method).toBe('getIgnoreResult');
        expect(result.first!.isAjaxResult).toBe(false);
        expect(result.first!.actionName).toBe('event1action');
    });

    it('should IgnoreAction_AjaxCall', () => {
        resetMocks();
        userInQueueServiceMock.validateQueueRequestResult = new RequestValidationResult("Cancel", "eventid", "", "http://q.qeuue-it.com", '');

        httpContextMock.req.headers.set('a', 'b');
        httpContextMock.req.headers.set('c', 'd');
        httpContextMock.req.headers.set('e', 'f');
        httpContextMock.req.headers.set('x-queueit-ajaxpageurl', 'http%3a%2f%2furl');

        const integrationConfigString = `			{
				"Description": "test",
				"Integrations": [
				{
					"Name": "event1action",
					"EventId": "event1",
					"CookieDomain": ".test.com",
					"ActionType":"Ignore",
					"Triggers": [
					{
						"TriggerParts": [
						{
							"Operator": "Contains",
							"ValueToCompare": "event1",
							"UrlPart": "PageUrl",
							"ValidatorType": "UrlValidator",
							"IsNegative": false,
							"IsIgnoreCase": true
						}
						],
						"LogicalOperator": "And"
					}
					],
					"QueueDomain": "knownusertest.queue-it.net"
				}
				],
				"CustomerId": "knownusertest",
				"AccountId": "knownusertest",
				"Version": 3,
				"PublishDate": "2017-05-15T21:39:12.0076806Z",
				"ConfigDataVersion": "1.0.0.1"
			}`;

        KnownUser.UserInQueueService = userInQueueServiceMock;
        const result = KnownUser.validateRequestByIntegrationConfig("http://test.com?event1=true", "queueIttoken", integrationConfigString, "customerid", "secretkey", httpContextMock);
        const call = userInQueueServiceMock.requestValidationResult;
        expect(result.first!.actionType).toBe('Ignore');
        expect(call!.method).toBe('getIgnoreResult');
        expect(result.first!.isAjaxResult).toBeTruthy();
    });

    it('should Debug', () => {
        resetMocks();

        const integrationConfigString = `{
            "Description":
                "test",
            "Integrations": [{
                "Name":
                    "event1action",
                "ActionType": "Queue",
                "EventId":
                    "event1",
                "CookieDomain":
                    ".test.com",
                "LayoutName":
                    "Christmas Layout by Queue-it",
                "Culture":
                    "da-DK",
                "ExtendCookieValidity":
                    true,
                "CookieValidityMinute":
                    20,
                "Triggers": [{
                    "TriggerParts": [{
                        "Operator": "Contains",
                        "ValueToCompare": "event1",
                        "UrlPart": "PageUrl",
                        "ValidatorType": "UrlValidator",
                        "IsNegative": false,
                        "IsIgnoreCase": true
                    }, {
                        "Operator": "Contains",
                        "ValueToCompare": "googlebot",
                        "ValidatorType": "UserAgentValidator",
                        "IsNegative": false,
                        "IsIgnoreCase": false
                    }],
                    "LogicalOperator":
                        "And"
                }],
                "QueueDomain":
                    "knownusertest.queue-it.net",
                "RedirectLogic":
                    "AllowTParameter"
            }],
            "CustomerId":
                "knownusertest",
            "AccountId":
                "knownusertest",
            "Version":
                3,
            "PublishDate":
                "2017-05-15T21:39:12.0076806Z",
            "ConfigDataVersion":
                "1.0.0.1"
        }`;

        httpContextMock.req.setAbsoluteUri("http://localhost/original_url");
        httpContextMock.req.setUserHostAddress("userIP");
        mockGoogleHeaders();

        const secretKey = "secretKey";
        const queueitToken = generateDebugToken("eventId", secretKey);
        const dateTimeProviderMock = new MockDateTimeProvider();
        const expectedServerTime = dateTimeProviderMock.getCurrentTime().toISOString().split('.')[0] + "Z";
        KnownUser.UserInQueueService = userInQueueServiceMock;
        KnownUser.validateRequestByIntegrationConfig("http://test.com?event1=true",
            queueitToken,
            integrationConfigString,
            "customerId",
            secretKey,
            httpContextMock,
            dateTimeProviderMock);

        const actualCookieValue = httpContextMock.res.cookies.get(KnownUser.QueueITDebugKey).value;
        expect(actualCookieValue.indexOf("ServerUtcTime=" + expectedServerTime + "|")).not.toBe(-1);
        expect(actualCookieValue.indexOf("ConfigVersion=3|")).not.toBe(-1);
        expect(actualCookieValue.indexOf("PureUrl=http://test.com?event1=true|")).not.toBe(-1);
        expect(actualCookieValue.indexOf("QueueitToken=" + queueitToken + "|")).not.toBe(-1);
        expect(actualCookieValue.indexOf("RequestIP=userIP|")).not.toBe(-1);
        expect(actualCookieValue.indexOf("RequestHttpHeader_Via=v|")).not.toBe(-1);
        expect(actualCookieValue.indexOf("RequestHttpHeader_Forwarded=f|")).not.toBe(-1);
        expect(actualCookieValue.indexOf("RequestHttpHeader_XForwardedFor=xff|")).not.toBe(-1);
        expect(actualCookieValue.indexOf("RequestHttpHeader_XForwardedHost=xfh|")).not.toBe(-1);
        expect(actualCookieValue.indexOf("RequestHttpHeader_XForwardedProto=xfp|")).not.toBe(-1);
        expect(actualCookieValue.indexOf("MatchedConfig=event1action|")).not.toBe(-1);
        expect(actualCookieValue.indexOf("TargetUrl=http://test.com?event1=true|")).not.toBe(-1);
        expect(actualCookieValue.indexOf("|QueueConfig=EventId:event1&Version:3&ActionName:event1action&QueueDomain:knownusertest.queue-it.net&CookieDomain:.test.com&ExtendCookieValidity:true&CookieValidityMinute:20&LayoutName:Christmas Layout by Queue-it&Culture:da-DK")).not.toBe(-1);
        expect(actualCookieValue.indexOf("SdkVersion=" + SDK_VERSION + "|")).not.toBe(-1);
    });

    it('should Debug_WithoutMatch', () => {
        resetMocks();

        const requestIP = "80.35.35.34";
        const viaHeader = "1.1 example.com";
        const forwardedHeader = "for=192.0.2.60;proto=http;by=203.0.113.43";
        const xForwardedForHeader = "129.78.138.66, 129.78.64.103";
        const xForwardedHostHeader = "en.wikipedia.org:8080";
        const xForwardedProtoHeader = "https";

        const integrationConfigString = `{
			"Description": "test",
			"Integrations": [
			{
				"Name": "event1action",
				"EventId": "event1",
				"CookieDomain": ".test.com",
				"ActionType":"Cancel",
				"Triggers": [
				{
					"TriggerParts": [
					{
						"Operator": "Contains",
						"ValueToCompare": "notmatch",
						"UrlPart": "PageUrl",
						"ValidatorType": "UrlValidator",
						"IsNegative": false,
						"IsIgnoreCase": true
					}
					],  
					"LogicalOperator": "And"
				}
				],
				"QueueDomain": "knownusertest.queue-it.net"
			}
			],
			"CustomerId": "knownusertest",
			"AccountId": "knownusertest",
			"Version": 10,
			"PublishDate": "2017-05-15T21:39:12.0076806Z",
			"ConfigDataVersion": "1.0.0.1"
		}`;

        httpContextMock.req.setAbsoluteUri("http://test.com/?event1=true&queueittoken=queueittokenvalue");
        httpContextMock.req.setUserHostAddress(requestIP);
        httpContextMock.req.headers.set('via', viaHeader);
        httpContextMock.req.headers.set('forwarded', forwardedHeader);
        httpContextMock.req.headers.set('x-forwarded-for', xForwardedForHeader);
        httpContextMock.req.headers.set('x-forwarded-host', xForwardedHostHeader);
        httpContextMock.req.headers.set('x-forwarded-proto', xForwardedProtoHeader);
        const secretKey = "secretKey";
        const queueitToken = generateDebugToken("eventId", secretKey);
        const dateTimeProviderMock = new MockDateTimeProvider();
        const expectedServerTime = dateTimeProviderMock.getCurrentTime().toISOString().split('.')[0] + "Z";

        const result = KnownUser.validateRequestByIntegrationConfig("http://test.com?event1=true",
            queueitToken,
            integrationConfigString,
            "customerId",
            secretKey,
            httpContextMock,
            dateTimeProviderMock);

        expect(httpContextMock.res.cookies.has(KnownUser.QueueITDebugKey)).toBeTruthy('Debug cookie key should be set')
        const actualCookieValue = httpContextMock.res.cookies.get(KnownUser.QueueITDebugKey).value
        expect(actualCookieValue.indexOf("ConfigVersion=10")).not.toBe(-1, 'Should contain config version');
        expect(actualCookieValue.indexOf("PureUrl=http://test.com?event1=true")).not.toBe(-1, 'Should have pureUrl');
        expect(actualCookieValue.indexOf(queueitToken)).not.toBe(-1, 'Should contain QueueITToken');
        expect(actualCookieValue.indexOf("OriginalUrl=http://test.com/?event1=true&queueittoken=queueittokenvalue")).not.toBe(-1, 'Should contain original url');
        expect(actualCookieValue.indexOf("ServerUtcTime=" + expectedServerTime)).not.toBe(-1, 'Should contain serverUtcTime');
        expect(actualCookieValue.indexOf("MatchedConfig=NULL")).not.toBe(-1, 'Should have MatchedConfig=NULL');
        expect(actualCookieValue.indexOf("RequestIP=80.35.35.34")).not.toBe(-1, 'Should contain requestIp');
        expect(actualCookieValue.indexOf("RequestHttpHeader_Via=1.1 example.com")).not.toBe(-1, 'Should contain via header');
        expect(actualCookieValue.indexOf("RequestHttpHeader_Forwarded=for=192.0.2.60;proto=http;by=203.0.113.43")).not.toBe(-1, 'Should contain forwarded headers');
        expect(actualCookieValue.indexOf("RequestHttpHeader_XForwardedFor=129.78.138.66, 129.78.64.103")).not.toBe(-1, 'Should contain forwarded for headers');
        expect(actualCookieValue.indexOf("RequestHttpHeader_XForwardedHost=en.wikipedia.org:8080")).not.toBe(-1, 'Should contain forwarded host header');
        expect(actualCookieValue.indexOf("RequestHttpHeader_XForwardedProto=https")).not.toBe(-1, 'Should contain forwarded proto header');
        expect(actualCookieValue.indexOf("SdkVersion=" + SDK_VERSION + "|")).not.toBe(-1, 'Should contain sdk version');
    });

    it('should NotValidHash_Debug', () => {
        resetMocks();
        userInQueueServiceMock.validateQueueRequestResult = new RequestValidationResult("Debug", "eventid", "queueid", "http://q.qeuue-it.com", '');

        const requestIP = "80.35.35.34";

        const integrationConfigString = `{
				"Description": "test",
				"Integrations": [
				{
					"Name": "event1action",
					"EventId": "event1",
					"CookieDomain": ".test.com",
					"ActionType":"Cancel",
					"Triggers": [
					{
						"TriggerParts": [
						{
							"Operator": "Contains",
							"ValueToCompare": "event1",
							"UrlPart": "PageUrl",
							"ValidatorType": "UrlValidator",
							"IsNegative": false,
							"IsIgnoreCase": true
						}
						],  
						"LogicalOperator": "And"
					}
					],
					"QueueDomain": "knownusertest.queue-it.net"
				}
				],
				"CustomerId": "knownusertest",
				"AccountId": "knownusertest",
				"Version": 3,
				"PublishDate": "2017-05-15T21:39:12.0076806Z",
				"ConfigDataVersion": "1.0.0.1"
			}`;

        httpContextMock.req.setAbsoluteUri("http://test.com/?event1=true&queueittoken=queueittokenvalue");
        httpContextMock.req.setUserHostAddress(requestIP);


        const secretKey = "secretKey";
        const queueitToken = generateDebugToken("eventId", secretKey);
        const expectedServerTime = new Date(Date.now()).toISOString().split('.')[0] + "Z";

        KnownUser.validateRequestByIntegrationConfig("http://test.com?event1=true=", queueitToken, integrationConfigString, "customerId", secretKey, httpContextMock);

        const actualCookieValue = httpContextMock.res.cookies.get(KnownUser.QueueITDebugKey).value

        expect(actualCookieValue.indexOf("PureUrl=http://test.com?event1=true")).not.toBe(-1);
        expect(actualCookieValue.indexOf("ConfigVersion=3")).not.toBe(-1);
        expect(actualCookieValue.indexOf("MatchedConfig=event1action")).not.toBe(-1);
        expect(actualCookieValue.indexOf(queueitToken)).not.toBe(-1);
        expect(actualCookieValue.indexOf("OriginalUrl=http://test.com/?event1=true&queueittoken=queueittokenvalue")).not.toBe(-1);
        expect(actualCookieValue.indexOf("TargetUrl=http://test.com?event1=true")).not.toBe(-1);
        expect(actualCookieValue.indexOf("CancelConfig=EventId:event1&Version:3&QueueDomain:knownusertest.queue-it.net&CookieDomain:.test.com")).not.toBe(-1);
    });

    it('should Debug_NullConfig', () => {
        resetMocks();

        httpContextMock.req.setAbsoluteUri("http://localhost/original_url");
        httpContextMock.req.setUserHostAddress("userIP");
        mockGoogleHeaders();

        const secretKey = "secretKey";
        const queueitToken = generateDebugToken("eventId", secretKey);
        KnownUser.UserInQueueService = userInQueueServiceMock;

        const result = KnownUser.validateRequestByIntegrationConfig("http://test.com?event1=true", queueitToken, "{}", "customerId", secretKey, httpContextMock);
        const errorReturned = result.second != null && result.second!.message == 'integrationsConfigString can not be null or empty.';
        assert(errorReturned);

        //Assert
        expect(userInQueueServiceMock.validateQueueRequestCall).toBeNull();

        const actualCookieValue = httpContextMock.res.cookies.get(KnownUser.QueueITDebugKey).value
        expect(actualCookieValue.indexOf("ConfigVersion=NULL|")).not.toBe(-1);
        expect(actualCookieValue.indexOf("PureUrl=http://test.com?event1=true|")).not.toBe(-1);
        expect(actualCookieValue.indexOf("QueueitToken=" + queueitToken + "|")).not.toBe(-1);
        expect(actualCookieValue.indexOf("SdkVersion=" + SDK_VERSION + "|")).not.toBe(-1);
        expect(actualCookieValue.indexOf("Exception=integrationsConfigString can not be null or empty.")).not.toBe(-1);
    });

    it('should Debug_Missing_CustomerId', () => {
        resetMocks();
        const integrationConfigString = `{}`;
        httpContextMock.req.setAbsoluteUri("http://localhost/original_url");
        httpContextMock.req.setUserHostAddress("userIP");
        mockGoogleHeaders();

        const secretKey = "secretKey";
        const queueitToken = generateDebugToken("eventId", secretKey);
        KnownUser.UserInQueueService = userInQueueServiceMock;

        const result = KnownUser.validateRequestByIntegrationConfig("http://test.com?event1=true", queueitToken, integrationConfigString, '', secretKey, httpContextMock);

        //Assert
        expect(result.second).toBeNull();
        expect(result.first).not.toBeNull();
        expect("https://api2.queue-it.net/diagnostics/connector/error/?code=setup").toBe(result.first!.redirectUrl);
        expect(httpContextMock.res.cookies.has(KnownUser.QueueITDebugKey)).toBeFalsy('debug cookie should not be set');
    });

    it('should Debug_Missing_SecretKey', () => {
        resetMocks();
        const integrationConfigString = `{}`;
        httpContextMock.req.setAbsoluteUri("http://localhost/original_url");
        httpContextMock.req.setUserHostAddress("userIP");
        mockGoogleHeaders();

        const secretKey = "secretKey";
        const queueitToken = generateDebugToken("eventId", secretKey);
        KnownUser.UserInQueueService = userInQueueServiceMock;

        const result = KnownUser.validateRequestByIntegrationConfig("http://test.com?event1=true", queueitToken, integrationConfigString, "customerId", '', httpContextMock);
        //Assert
        expect("https://api2.queue-it.net/diagnostics/connector/error/?code=setup" == result.first!.redirectUrl);
        expect(httpContextMock.res.cookies.has(KnownUser.QueueITDebugKey)).toBeFalsy('debug cookie should not be set');
    });

    it('should Debug_ExpiredToken', () => {
        resetMocks();
        const integrationConfigString = `{}`;
        httpContextMock.req.setAbsoluteUri("http://localhost/original_url");
        httpContextMock.req.setUserHostAddress("userIP");
        mockGoogleHeaders();

        const secretKey = "secretKey";
        const queueitToken = generateDebugToken("eventId", secretKey, true);
        KnownUser.UserInQueueService = userInQueueServiceMock;

        const result = KnownUser.validateRequestByIntegrationConfig("http://test.com?event1=true", queueitToken, integrationConfigString, "customerId", secretKey, httpContextMock);
        //Assert
        expect("https://customerId.api2.queue-it.net/customerId/diagnostics/connector/error/?code=timestamp" == result.first!.redirectUrl);
        expect(httpContextMock.res.cookies.has(KnownUser.QueueITDebugKey)).toBeFalsy('debug cookie should not be set');
    });

    it('should Debug_ModifiedToken', () => {
        resetMocks();
        const integrationConfigString = `{}`;
        httpContextMock.req.setAbsoluteUri("http://localhost/original_url");
        httpContextMock.req.setUserHostAddress("userIP");
        mockGoogleHeaders();

        const secretKey = "secretKey";
        const queueitToken = generateDebugToken("eventId", secretKey) + "invalid-hash";
        KnownUser.UserInQueueService = userInQueueServiceMock;

        const result = KnownUser.validateRequestByIntegrationConfig("http://test.com?event1=true", queueitToken, integrationConfigString, "customerId", secretKey, httpContextMock);
        //Assert
        expect("https://customerId.api2.queue-it.net/customerId/diagnostics/connector/error/?code=hash" == result.first!.redirectUrl);
        expect(httpContextMock.res.cookies.has(KnownUser.QueueITDebugKey)).toBeFalsy('debug cookie should not be set');
    });

});

describe('resolveQueueRequestByLocalEventConfig', () => {
    it('should handle ajax requests', () => {
        resetMocks();

        const eventconfig = new QueueEventConfig('', '', '', '', false, 0, '', 0);
        eventconfig.cookieDomain = "cookieDomain";
        eventconfig.layoutName = "layoutName";
        eventconfig.culture = "culture";
        eventconfig.eventId = "eventId";
        eventconfig.queueDomain = "queueDomain";
        eventconfig.extendCookieValidity = true;
        eventconfig.cookieValidityMinute = 10;
        eventconfig.version = 12;

        KnownUser.UserInQueueService = userInQueueServiceMock;
        const result = KnownUser.resolveQueueRequestByLocalConfig("targeturl", "queueIttoken", eventconfig, "customerid", "secretkey", httpContextMock);

        expect(userInQueueServiceMock.validateQueueRequestCall).not.toBeNull();
        expect(userInQueueServiceMock.validateQueueRequestCall!.method).toBe('validateQueueRequest');
        expect(userInQueueServiceMock.validateQueueRequestCall!.targetUrl).toBe('targeturl');
        expect(userInQueueServiceMock.validateQueueRequestCall!.queueitToken).toBe('queueIttoken');
        expect(userInQueueServiceMock.validateQueueRequestCall!.queueConfig).toBe(eventconfig);
        expect(userInQueueServiceMock.validateQueueRequestCall!.customerId).toBe('customerid');
        expect(userInQueueServiceMock.validateQueueRequestCall!.secretKey).toBe('secretkey');
        expect(result.first!.isAjaxResult).toBeFalsy();
    });

    it('should have isAjaxResult set always', () => {
        resetMocks();

        const eventconfig = new QueueEventConfig('', '', '', '', false, 0, '', 0);
        eventconfig.cookieDomain = "cookieDomain";
        eventconfig.layoutName = "layoutName";
        eventconfig.culture = "culture";
        eventconfig.eventId = "eventId";
        eventconfig.queueDomain = "queueDomain";
        eventconfig.extendCookieValidity = true;
        eventconfig.cookieValidityMinute = 10;
        eventconfig.version = 12;

        KnownUser.UserInQueueService = userInQueueServiceMock;
        const result = KnownUser.resolveQueueRequestByLocalConfig("targeturl", "queueIttoken", eventconfig, "customerid", "secretkey", httpContextMock);

        expect(userInQueueServiceMock.validateQueueRequestCall).not.toBeNull('validateQueueRequest should be called');
        expect(userInQueueServiceMock.validateQueueRequestCall!.method).toBe('validateQueueRequest');
        expect(userInQueueServiceMock.validateQueueRequestCall!.targetUrl).toBe('targeturl');
        expect(userInQueueServiceMock.validateQueueRequestCall!.queueitToken).toBe('queueIttoken');
        expect(userInQueueServiceMock.validateQueueRequestCall!.queueConfig).toBe(eventconfig);
        expect(userInQueueServiceMock.validateQueueRequestCall!.customerId).toBe('customerid');
        expect(userInQueueServiceMock.validateQueueRequestCall!.secretKey).toBe('secretkey');

        expect(result.second).toBeNull();
        expect(result.first).not.toBeNull();
        expect(result.first!.isAjaxResult).toBeFalsy();
    });

    it('should handle NullCustomerId', () => {
        //Arrange
        resetMocks();
        KnownUser.UserInQueueService = userInQueueServiceMock;

        //Act
        const result = KnownUser.resolveQueueRequestByLocalConfig("targetUrl", "queueitToken", null, '', "secretKey", httpContextMock);
        const exceptionWasThrown = result.second != null && result.second!.message == "customerId can not be null or empty.";

        //Assert
        expect(userInQueueServiceMock.validateQueueRequestCall).toBeNull();
        expect(exceptionWasThrown).toBeTruthy();
    });

    it('NullSecretKey', () => {
        //Arrange
        resetMocks();
        KnownUser.UserInQueueService = userInQueueServiceMock;

        //Act
        const result = KnownUser.resolveQueueRequestByLocalConfig("targetUrl", "queueitToken", null, "customerId", '', httpContextMock);
        const exceptionWasThrown = result.second != null && result.second!.message == "secretKey can not be null or empty.";

        //Assert
        expect(userInQueueServiceMock.validateQueueRequestCall).toBeNull();
        expect(exceptionWasThrown).toBeTruthy();
    });

    it('NullEventConfig', () => {
        //Arrange
        resetMocks();
        KnownUser.UserInQueueService = userInQueueServiceMock;

        //Act
        let result = KnownUser.resolveQueueRequestByLocalConfig("targetUrl", "queueitToken", null, "customerId", "secretKey", httpContextMock);
        const exceptionWasThrown = result.second != null && result.second!.message == "queueConfig can not be null.";

        //Assert
        expect(userInQueueServiceMock.validateQueueRequestCall).toBeNull();
        expect(exceptionWasThrown).toBeTruthy();
    });

    it('NullEventId', () => {
        //Arrange
        resetMocks();

        const eventconfig = new QueueEventConfig('', '', '', '', false, 0, '', 0);
        eventconfig.cookieDomain = "cookieDomain";
        eventconfig.layoutName = "layoutName";
        eventconfig.culture = "culture";
        eventconfig.queueDomain = "queueDomain";
        eventconfig.extendCookieValidity = true;
        eventconfig.cookieValidityMinute = 10;
        eventconfig.version = 12;
        KnownUser.UserInQueueService = userInQueueServiceMock;

        //Act
        const result = KnownUser.resolveQueueRequestByLocalConfig("targeturl", "queueIttoken", eventconfig, "customerid", "secretkey", httpContextMock);
        const exceptionWasThrown = result.second != null && result.second!.message == "queueConfig.eventId can not be null or empty.";

        //Assert
        expect(userInQueueServiceMock.validateQueueRequestCall).toBeNull();
        expect(exceptionWasThrown).toBeTruthy();
    });

    it('NullQueueDomain', () => {
        //Arrange
        resetMocks();

        const eventconfig = new QueueEventConfig('', '', '', '', false, 0, '', 0);
        eventconfig.cookieDomain = "cookieDomain";
        eventconfig.layoutName = "layoutName";
        eventconfig.culture = "culture";
        eventconfig.eventId = "eventId";
        eventconfig.queueDomain = '';
        eventconfig.extendCookieValidity = true;
        eventconfig.cookieValidityMinute = 10;
        eventconfig.version = 12;
        KnownUser.UserInQueueService = userInQueueServiceMock;

        //Act
        const result = KnownUser.resolveQueueRequestByLocalConfig("targeturl", "queueIttoken", eventconfig, "customerid", "secretkey", httpContextMock);
        const exceptionWasThrown = result.second != null && result.second!.message == "queueConfig.queueDomain can not be null or empty.";

        //Assert
        expect(userInQueueServiceMock.validateQueueRequestCall).toBeNull();
        expect(exceptionWasThrown).toBeTruthy();
    });

    it('InvalidCookieValidityMinute', () => {
        //Arrange
        resetMocks();

        const eventconfig = new QueueEventConfig('', '', '', '', false, 0, '', 0);
        eventconfig.cookieDomain = "cookieDomain";
        eventconfig.layoutName = "layoutName";
        eventconfig.culture = "culture";
        eventconfig.eventId = "eventId";
        eventconfig.queueDomain = "queueDomain";
        eventconfig.extendCookieValidity = true;
        eventconfig.cookieValidityMinute = 0;
        eventconfig.version = 12;
        KnownUser.UserInQueueService = userInQueueServiceMock;

        //Act
        const result = KnownUser.resolveQueueRequestByLocalConfig("targeturl", "queueIttoken", eventconfig, "customerid", "secretkey", httpContextMock);
        const exceptionWasThrown = result.second != null && result.second!.message == "queueConfig.cookieValidityMinute should be integer greater than 0.";

        //Assert
        expect(userInQueueServiceMock.validateQueueRequestCall).toBeNull();
        expect(exceptionWasThrown).toBeTruthy();
    });

    it('should have Debug cookie if token is present', () => {
        resetMocks();

        const requestIP = "80.35.35.34";
        const viaHeader = "v";
        const forwardedHeader = "f";
        const xForwardedForHeader = "xff";
        const xForwardedHostHeader = "xfh";
        const xForwardedProtoHeader = "xfp";

        httpContextMock.req.headers.set('via', viaHeader);
        httpContextMock.req.headers.set('forwarded', forwardedHeader);
        httpContextMock.req.headers.set('x-forwarded-for', xForwardedForHeader);
        httpContextMock.req.headers.set('x-forwarded-host', xForwardedHostHeader);
        httpContextMock.req.headers.set('x-forwarded-proto', xForwardedProtoHeader);

        httpContextMock.req.setAbsoluteUri("http://test.com/?event1=true&queueittoken=queueittokenvalue");
        httpContextMock.req.setUserHostAddress(requestIP);

        const secretKey = "secretKey";
        const queueitToken = generateDebugToken("eventId", secretKey);
        const dateTimeProviderMock = new MockDateTimeProvider();
        const expectedServerTime = dateTimeProviderMock.getCurrentTime().toISOString().split('.')[0] + "Z";

        const eventconfig = new QueueEventConfig('', '', '', '', false, 0, '', 0);
        eventconfig.cookieDomain = "cookieDomain";
        eventconfig.layoutName = "layoutName";
        eventconfig.culture = "culture";
        eventconfig.eventId = "eventId";
        eventconfig.queueDomain = "queueDomain";
        eventconfig.extendCookieValidity = true;
        eventconfig.cookieValidityMinute = 10;
        eventconfig.version = 12;
        eventconfig.actionName = "event1action";

        KnownUser.UserInQueueService = userInQueueServiceMock;

        const result = KnownUser.resolveQueueRequestByLocalConfig("http://test.com?event1=true",
            queueitToken,
            eventconfig,
            "customerId",
            secretKey,
            httpContextMock,
            dateTimeProviderMock);
        const actualCookieValue = httpContextMock.res.cookies.get(KnownUser.QueueITDebugKey).value;

        expect(actualCookieValue.indexOf("QueueitToken=" + queueitToken)).not.toBe(-1);
        expect(actualCookieValue.indexOf("TargetUrl=http://test.com?event1=true")).not.toBe(-1);
        expect(actualCookieValue.indexOf("QueueitToken=" + queueitToken)).not.toBe(-1);
        expect(actualCookieValue.indexOf("OriginalUrl=http://test.com/?event1=true&queueittoken=queueittokenvalue")).not.toBe(-1);
        expect(actualCookieValue.indexOf("ServerUtcTime=" + expectedServerTime)).not.toBe(-1, 'Should contain ' + "ServerUtcTime=" + expectedServerTime);
        expect(actualCookieValue.indexOf("RequestIP=80.35.35.34")).not.toBe(-1);
        expect(actualCookieValue.indexOf("RequestHttpHeader_Via=v")).not.toBe(-1);
        expect(actualCookieValue.indexOf("RequestHttpHeader_Forwarded=f")).not.toBe(-1);
        expect(actualCookieValue.indexOf("RequestHttpHeader_XForwardedFor=xff")).not.toBe(-1);
        expect(actualCookieValue.indexOf("RequestHttpHeader_XForwardedHost=xfh")).not.toBe(-1);
        expect(actualCookieValue.indexOf("RequestHttpHeader_XForwardedProto=xfp")).not.toBe(-1);
        expect(actualCookieValue.indexOf("QueueConfig=EventId:eventId&Version:12&ActionName:event1action&QueueDomain:queueDomain&CookieDomain:cookieDomain&ExtendCookieValidity:true&CookieValidityMinute:10&LayoutName:layoutName&Culture:culture")).not.toBe(-1);
    });

    it('should Debug_NullConfig', () => {
        resetMocks();

        httpContextMock.req.setAbsoluteUri("http://test.com?event1=true");
        httpContextMock.req.setUserHostAddress("userIP");
        mockGoogleHeaders();

        const secretKey = "secretKey";
        const queueitToken = generateDebugToken("eventId", secretKey);
        // const expectedServerTime = (new Date(Date.now())).toISOString().split('.')[0] + "Z";
        KnownUser.UserInQueueService = userInQueueServiceMock;

        const result = KnownUser.resolveQueueRequestByLocalConfig("http://test.com?event1=true", queueitToken, null, "customerId", secretKey, httpContextMock);
        const errorReturned = result.second != null && result.second!.message == 'queueConfig can not be null.';
        expect(errorReturned).toBeTruthy();

        //Assert
        expect(userInQueueServiceMock.validateQueueRequestCall).toBeNull();

        const actualCookieValue = httpContextMock.res.cookies.get(KnownUser.QueueITDebugKey).value
        expect(actualCookieValue.indexOf("QueueConfig=NULL|")).not.toBe(-1);
        expect(actualCookieValue.indexOf("OriginalUrl=http://test.com?event1=true|")).not.toBe(-1);
        expect(actualCookieValue.indexOf("QueueitToken=" + queueitToken + "|")).not.toBe(-1);
        expect(actualCookieValue.indexOf("SdkVersion=" + SDK_VERSION + "|")).not.toBe(-1);
        expect(actualCookieValue.indexOf("Exception=queueConfig can not be null.")).not.toBe(-1);
    });

    it('should Debug_Missing_CustomerId', () => {
        resetMocks();
        const eventconfig = new QueueEventConfig('', '', '', '', false, 0, '', 0);
        httpContextMock.req.setAbsoluteUri("http://localhost/original_url");
        httpContextMock.req.setUserHostAddress("userIP");
        mockGoogleHeaders();

        const secretKey = "secretKey";
        const queueitToken = generateDebugToken("eventId", secretKey);
        // const expectedServerTime = (new Date(Date.now())).toISOString().split('.')[0] + "Z";
        KnownUser.UserInQueueService = userInQueueServiceMock;

        const result = KnownUser.resolveQueueRequestByLocalConfig("http://test.com?event1=true", queueitToken, eventconfig, '', secretKey, httpContextMock);
        //Assert
        expect("https://api2.queue-it.net/diagnostics/connector/error/?code=setup" == result.first!.redirectUrl);
        expect(httpContextMock.res.cookies.has(KnownUser.QueueITDebugKey)).toBeFalsy('debug cookie should not be set');
    });

    it('should Debug_Missing_SecretKey', () => {
        resetMocks();
        const eventconfig = new QueueEventConfig('', '', '', '', false, 0, '', 0);
        httpContextMock.req.setAbsoluteUri("http://localhost/original_url");
        httpContextMock.req.setUserHostAddress("userIP");
        mockGoogleHeaders();

        const secretKey = "secretKey";
        const queueitToken = generateDebugToken("eventId", secretKey);
        // const expectedServerTime = (new Date(Date.now())).toISOString().split('.')[0] + "Z";
        KnownUser.UserInQueueService = userInQueueServiceMock;

        const result = KnownUser.resolveQueueRequestByLocalConfig("http://test.com?event1=true", queueitToken, eventconfig, "customerId", '', httpContextMock);

        //Assert
        expect(result.first!.redirectUrl).toBe('https://api2.queue-it.net/diagnostics/connector/error/?code=setup');
        expect(httpContextMock.res.cookies.has(KnownUser.QueueITDebugKey)).toBeFalsy('debug cookie should not be set');
    });

    it('should Debug_ExpiredToken', () => {
        resetMocks();

        const eventconfig = new QueueEventConfig('', '', '', '', false, 0, '', 0);
        httpContextMock.req.setAbsoluteUri("http://localhost/original_url");
        httpContextMock.req.setUserHostAddress("userIP");
        mockGoogleHeaders();

        const secretKey = "secretKey";
        const queueitToken = generateDebugToken("eventId", secretKey, true);
        // const expectedServerTime = (new Date(Date.now())).toISOString().split('.')[0] + "Z";
        KnownUser.UserInQueueService = userInQueueServiceMock;

        const result = KnownUser.resolveQueueRequestByLocalConfig("http://test.com?event1=true", queueitToken, eventconfig, "customerId", secretKey, httpContextMock);

        //Assert
        expect(result.first!.redirectUrl).toBe('https://customerId.api2.queue-it.net/customerId/diagnostics/connector/error/?code=timestamp');
        expect(httpContextMock.res.cookies.has(KnownUser.QueueITDebugKey)).toBeFalsy('debug cookie should not be set');
    });

    it('should Debug_ModifiedToken', () => {
        resetMocks();
        const eventconfig = new QueueEventConfig('', '', '', '', false, 0, '', 0);
        httpContextMock.req.setAbsoluteUri("http://localhost/original_url");
        httpContextMock.req.setUserHostAddress("userIP");
        mockGoogleHeaders();

        const secretKey = "secretKey";
        const queueitToken = generateDebugToken("eventId", secretKey) + "invalid-hash";
        // const expectedServerTime = (new Date(Date.now())).toISOString().split('.')[0] + "Z";
        KnownUser.UserInQueueService = userInQueueServiceMock;

        const result = KnownUser.resolveQueueRequestByLocalConfig("http://test.com?event1=true", queueitToken, eventconfig, "customerId", secretKey, httpContextMock);

        //Assert
        expect(result.first!.redirectUrl).toBe('https://customerId.api2.queue-it.net/customerId/diagnostics/connector/error/?code=hash');
        expect(httpContextMock.res.cookies.has(KnownUser.QueueITDebugKey)).toBeFalsy('debug cookie should not be set');
    });

    it('should Exception_NoDebugToken', () => {
        resetMocks();

        const requestIP = "80.35.35.34";
        const viaHeader = "v";
        const forwardedHeader = "f";
        const xForwardedForHeader = "xff";
        const xForwardedHostHeader = "xfh";
        const xForwardedProtoHeader = "xfp";

        httpContextMock.req.headers.set('via', viaHeader);
        httpContextMock.req.headers.set('forwarded', forwardedHeader);
        httpContextMock.req.headers.set('x-forwarded-for', xForwardedForHeader);
        httpContextMock.req.headers.set('x-forwarded-host', xForwardedHostHeader);
        httpContextMock.req.headers.set('x-forwarded-proto', xForwardedProtoHeader);

        httpContextMock.req.setAbsoluteUri("http://test.com/?event1=true&queueittoken=queueittokenvalue");
        httpContextMock.req.setUserHostAddress(requestIP);

        const secretKey = "secretKey";
        const queueitToken = generateDebugToken("eventId", secretKey);
        const expectedServerTime = new Date(Date.now()).toISOString().split('.')[0] + "Z";

        const eventconfig = new QueueEventConfig('', '', '', '', false, 0, '', 0);
        eventconfig.cookieDomain = "cookieDomain";
        eventconfig.layoutName = "layoutName";
        eventconfig.culture = "culture";
        eventconfig.eventId = "eventId";
        eventconfig.queueDomain = "queueDomain";
        eventconfig.extendCookieValidity = true;
        eventconfig.cookieValidityMinute = 10;
        eventconfig.version = 12;
        eventconfig.actionName = "event1action";

        userInQueueServiceMock.validateQueueRequestResultRaiseException = true;
        KnownUser.UserInQueueService = userInQueueServiceMock;

        //Act
        const result = KnownUser.resolveQueueRequestByLocalConfig("http://test.com?event1=true", "queueitToken", eventconfig, "customerId", secretKey, httpContextMock);

        //Assert
        expect(result.first).toBeNull();
        expect(result.second).not.toBeNull();
        expect(httpContextMock.res.cookies.has(KnownUser.QueueITDebugKey)).toBeFalsy();
    });
})

describe('cancelRequestByLocalConfig', () => {
    it('should work for non-ajax requests', () => {
        resetMocks();

        const cancelEventConfig = new CancelEventConfig("", "", "", 0);
        cancelEventConfig.cookieDomain = "cookieDomain";
        cancelEventConfig.eventId = "eventId";
        cancelEventConfig.queueDomain = "queueDomain";
        cancelEventConfig.version = 1;

        KnownUser.UserInQueueService = userInQueueServiceMock;
        const result = KnownUser.cancelRequestByLocalConfig("url", "queueitToken", cancelEventConfig, "customerid", "secretkey", httpContextMock);

        expect(userInQueueServiceMock.validateCancelRequestCall!.method).toBe('validateCancelRequest');
        expect(userInQueueServiceMock.validateCancelRequestCall!.targetUrl).toBe('url');
        expect(userInQueueServiceMock.validateCancelRequestCall!.cancelConfig).toBe(cancelEventConfig);
        expect(userInQueueServiceMock.validateCancelRequestCall!.customerId).toBe('customerid');
        expect(userInQueueServiceMock.validateCancelRequestCall!.secretKey).toBe('secretkey');
        expect(result.first!.isAjaxResult).toBeFalsy();
    });

    it('should AjaxCall', () => {
        resetMocks();

        const cancelEventConfig = new CancelEventConfig('', '', '', 0);
        cancelEventConfig.cookieDomain = "cookieDomain";
        cancelEventConfig.eventId = "eventId";
        cancelEventConfig.queueDomain = "queueDomain";
        cancelEventConfig.version = 1;

        KnownUser.UserInQueueService = userInQueueServiceMock;
        const result = KnownUser.cancelRequestByLocalConfig("url", "queueitToken", cancelEventConfig, "customerid", "secretkey", httpContextMock);

        expect(userInQueueServiceMock.validateCancelRequestCall!.method).toBe('validateCancelRequest');
        expect(userInQueueServiceMock.validateCancelRequestCall!.targetUrl).toBe('url');
        expect(userInQueueServiceMock.validateCancelRequestCall!.cancelConfig).toBe(cancelEventConfig);
        expect(userInQueueServiceMock.validateCancelRequestCall!.customerId).toBe('customerid');
        expect(userInQueueServiceMock.validateCancelRequestCall!.secretKey).toBe('secretkey');
        expect(result.first!.isAjaxResult).toBeFalsy();
    });

    it('should NullQueueDomain', () => {
        //Arrange
        resetMocks();

        const cancelEventConfig = new CancelEventConfig('', '', '', 0);
        cancelEventConfig.eventId = "eventId";
        cancelEventConfig.cookieDomain = "cookieDomain";
        cancelEventConfig.version = 12;

        //Act
        let result = KnownUser.cancelRequestByLocalConfig("targetUrl", "queueitToken", cancelEventConfig, "customerId", "secretKey", httpContextMock);
        let exceptionWasThrown = result.second != null && result.second!.message == "cancelConfig.queueDomain can not be null or empty.";

        //Assert
        expect(userInQueueServiceMock.validateCancelRequestCall).toBeNull();
        expect(exceptionWasThrown).toBeTruthy();
    });

    it('should EventIdNull', () => {
        //Arrange
        resetMocks();

        const cancelEventConfig = new CancelEventConfig('', '', '', 0);
        cancelEventConfig.cookieDomain = "cookieDomain";
        cancelEventConfig.version = 12;

        //Act
        const result = KnownUser.cancelRequestByLocalConfig("targetUrl", "queueitToken", cancelEventConfig, "customerId", "secretKey", httpContextMock);
        const exceptionWasThrown = result.second != null && result.second!.message == "cancelConfig.eventId can not be null or empty.";

        //Assert
        expect(userInQueueServiceMock.validateCancelRequestCall).toBeNull();
        expect(exceptionWasThrown).toBeTruthy();
    });

    it('should CancelEventConfigNull', () => {
        //Arrange
        resetMocks();

        //Act
        const result = KnownUser.cancelRequestByLocalConfig("targetUrl", "queueitToken", null, "customerId", "secretKey", httpContextMock);
        const exceptionWasThrown = result.second != null && result.second!.message == "cancelConfig can not be null.";

        //Assert
        expect(userInQueueServiceMock.validateCancelRequestCall).toBeNull();
        expect(exceptionWasThrown).toBeTruthy();
    });

    it('should CustomerIdNull', () => {
        //Arrange
        resetMocks();

        const eventconfig = new CancelEventConfig('', '', '', 0);

        //Act
        const result = KnownUser.cancelRequestByLocalConfig("targetUrl", "queueitToken", eventconfig, '', "secretKey", httpContextMock);
        const exceptionWasThrown = result.second != null && result.second!.message == "customerId can not be null or empty.";

        //Assert
        expect(userInQueueServiceMock.validateCancelRequestCall).toBeNull();
        expect(exceptionWasThrown).toBeTruthy();
    });

    it('should SecretKeyNull', () => {
        //Arrange
        resetMocks();
        const eventconfig = new CancelEventConfig('', '', '', 0);

        //Act
        const result = KnownUser.cancelRequestByLocalConfig("targetUrl", "queueitToken", eventconfig, "customerid", '', httpContextMock);
        const exceptionWasThrown = result.second != null && result.second!.message == "secretKey can not be null or empty.";

        //Assert
        expect(userInQueueServiceMock.validateCancelRequestCall).toBeNull();
        expect(exceptionWasThrown).toBeTruthy();
    });

    it('should TargetUrl', () => {
        //Arrange
        resetMocks();
        const eventconfig = new CancelEventConfig('', '', '', 0);

        //Act
        const result = KnownUser.cancelRequestByLocalConfig('', "queueitToken", eventconfig, "customerid", "secretkey", httpContextMock);
        const exceptionWasThrown = result.second != null && result.second!.message == "targetUrl can not be null or empty.";

        //Assert
        expect(userInQueueServiceMock.validateCancelRequestCall).toBeNull();
        expect(exceptionWasThrown).toBeTruthy();
    })

    it('should Debug', () => {
        resetMocks();

        const requestIP = "80.35.35.34";
        const viaHeader = "1.1 example.com";
        const forwardedHeader = "for=192.0.2.60;proto=http;by=203.0.113.43";
        const xForwardedForHeader = "129.78.138.66, 129.78.64.103";
        const xForwardedHostHeader = "en.wikipedia.org:8080";
        const xForwardedProtoHeader = "https";

        httpContextMock.req.headers.set('via', viaHeader);
        httpContextMock.req.headers.set('forwarded', forwardedHeader);
        httpContextMock.req.headers.set('x-forwarded-for', xForwardedForHeader);
        httpContextMock.req.headers.set('x-forwarded-host', xForwardedHostHeader);
        httpContextMock.req.headers.set('x-forwarded-proto', xForwardedProtoHeader);
        httpContextMock.req.setAbsoluteUri("http://test.com/?event1=true&queueittoken=queueittokenvalue");
        httpContextMock.req.setUserHostAddress(requestIP);

        const secretKey = "secretKey";
        const queueitToken = generateDebugToken("eventId", secretKey);
        const dateTimeProviderMock = new MockDateTimeProvider();
        const expectedServerTime = dateTimeProviderMock.getCurrentTime().toISOString().split('.')[0] + "Z";

        const cancelEventconfig = new CancelEventConfig('', '', '', 0);
        cancelEventconfig.cookieDomain = "cookieDomain";
        cancelEventconfig.eventId = "eventId";
        cancelEventconfig.queueDomain = "queueDomain";
        cancelEventconfig.version = 1;

        KnownUser.UserInQueueService = userInQueueServiceMock;
        const result = KnownUser.cancelRequestByLocalConfig("http://test.com?event1=true",
            queueitToken,
            cancelEventconfig,
            "customerid",
            "secretKey",
            httpContextMock,
            dateTimeProviderMock);

        const actualCookieValue = httpContextMock.res.cookies.get(KnownUser.QueueITDebugKey).value;

        expect(userInQueueServiceMock.validateCancelRequestCall!.method).toBe('validateCancelRequest');
        expect(userInQueueServiceMock.validateCancelRequestCall!.targetUrl).toBe('http://test.com?event1=true');
        expect(userInQueueServiceMock.validateCancelRequestCall!.cancelConfig).toBe(cancelEventconfig);
        expect(userInQueueServiceMock.validateCancelRequestCall!.customerId).toBe('customerid');
        expect(userInQueueServiceMock.validateCancelRequestCall!.secretKey).toBe('secretKey');
        expect(result.first!.isAjaxResult).toBeFalsy();

        expect(actualCookieValue.indexOf("QueueitToken=" + queueitToken)).not.toBe(-1)
        expect(actualCookieValue.indexOf("OriginalUrl=http://test.com/?event1=true&queueittoken=queueittokenvalue")).not.toBe(-1)
        expect(actualCookieValue.indexOf("TargetUrl=http://test.com?event1=true")).not.toBe(-1)
        expect(actualCookieValue.indexOf("QueueitToken=" + queueitToken)).not.toBe(-1)
        expect(actualCookieValue.indexOf("ServerUtcTime=" + expectedServerTime)).not.toBe(-1)
        expect(actualCookieValue.indexOf("RequestIP=80.35.35.34")).not.toBe(-1)
        expect(actualCookieValue.indexOf("RequestHttpHeader_Via=1.1 example.com")).not.toBe(-1)
        expect(actualCookieValue.indexOf("RequestHttpHeader_Forwarded=for=192.0.2.60;proto=http;by=203.0.113.43")).not.toBe(-1)
        expect(actualCookieValue.indexOf("RequestHttpHeader_XForwardedFor=129.78.138.66, 129.78.64.103")).not.toBe(-1)
        expect(actualCookieValue.indexOf("RequestHttpHeader_XForwardedHost=en.wikipedia.org:8080")).not.toBe(-1)
        expect(actualCookieValue.indexOf("RequestHttpHeader_XForwardedProto=https")).not.toBe(-1)
        expect(actualCookieValue.indexOf("EventId:eventId&Version:1&QueueDomain:queueDomain&CookieDomain:cookieDomain")).not.toBe(-1);
    });

    it('should Debug_NullConfig', () => {
        resetMocks();

        httpContextMock.req.setAbsoluteUri("http://test.com?event1=true");
        httpContextMock.req.setUserHostAddress("userIP");
        mockGoogleHeaders();

        const secretKey = "secretKey";
        const queueitToken = generateDebugToken("eventId", secretKey);
        // const expectedServerTime = (new Date(Date.now())).toISOString().split('.')[0] + "Z";
        KnownUser.UserInQueueService = userInQueueServiceMock;

        const result = KnownUser.cancelRequestByLocalConfig("http://test.com?event1=true", queueitToken, null, "customerId", secretKey, httpContextMock);
        const errorReturned = result.second != null && result.second!.message == "cancelConfig can not be null.";

        //Assert
        expect(userInQueueServiceMock.validateQueueRequestCall).toBeNull();
        expect(errorReturned).toBeTruthy();
        const actualCookieValue = httpContextMock.res.cookies.get(KnownUser.QueueITDebugKey).value;
        expect(actualCookieValue.indexOf("CancelConfig=NULL|")).not.toBe(-1);
        expect(actualCookieValue.indexOf("OriginalUrl=http://test.com?event1=true|")).not.toBe(-1);
        expect(actualCookieValue.indexOf("QueueitToken=" + queueitToken + "|")).not.toBe(-1);
        expect(actualCookieValue.indexOf("SdkVersion=" + SDK_VERSION + "|")).not.toBe(-1);
        expect(actualCookieValue.indexOf("Exception=cancelConfig can not be null.")).not.toBe(-1);
    });

    it('should Debug_Missing_CustomerId', () => {
        resetMocks();
        const cancelConfig = new CancelEventConfig('', '', '', 0);
        httpContextMock.req.setAbsoluteUri("http://localhost/original_url");
        httpContextMock.req.setUserHostAddress("userIP");
        mockGoogleHeaders();

        const secretKey = "secretKey";
        const queueitToken = generateDebugToken("eventId", secretKey);
        // const expectedServerTime = (new Date(Date.now())).toISOString().split('.')[0] + "Z";
        KnownUser.UserInQueueService = userInQueueServiceMock;

        const result = KnownUser.cancelRequestByLocalConfig("http://test.com?event1=true", queueitToken, cancelConfig, '', secretKey, httpContextMock);
        //Assert
        expect("https://api2.queue-it.net/diagnostics/connector/error/?code=setup" == result.first!.redirectUrl);
        expect(httpContextMock.res.cookies.has(KnownUser.QueueITDebugKey)).toBeFalsy('debug cookie should not be set');
    });

    it('should Debug_Missing_SecretKey', () => {
        resetMocks();
        const cancelConfig = new CancelEventConfig('', '', '', 0);
        httpContextMock.req.setAbsoluteUri("http://localhost/original_url");
        httpContextMock.req.setUserHostAddress("userIP");
        mockGoogleHeaders();

        const secretKey = "secretKey";
        const queueitToken = generateDebugToken("eventId", secretKey);
        // const expectedServerTime = (new Date(Date.now())).toISOString().split('.')[0] + "Z";
        KnownUser.UserInQueueService = userInQueueServiceMock;

        const result = KnownUser.cancelRequestByLocalConfig("http://test.com?event1=true", queueitToken, cancelConfig, "customerId", '', httpContextMock);
        //Assert
        expect("https://api2.queue-it.net/diagnostics/connector/error/?code=setup" == result.first!.redirectUrl);
        expect(httpContextMock.res.cookies.has(KnownUser.QueueITDebugKey)).toBeFalsy('debug cookie should not be set');
    });

    it('should Debug_ExpiredToken', () => {
        resetMocks();
        const cancelConfig = new CancelEventConfig('', '', '', 0);
        httpContextMock.req.setAbsoluteUri("http://localhost/original_url");
        httpContextMock.req.setUserHostAddress("userIP");
        mockGoogleHeaders();

        const secretKey = "secretKey";
        const queueitToken = generateDebugToken("eventId", secretKey, true);
        // const expectedServerTime = (new Date(Date.now())).toISOString().split('.')[0] + "Z";
        KnownUser.UserInQueueService = userInQueueServiceMock;

        const result = KnownUser.cancelRequestByLocalConfig("http://test.com?event1=true", queueitToken, cancelConfig, "customerId", secretKey, httpContextMock);
        //Assert
        expect("https://customerId.api2.queue-it.net/customerId/diagnostics/connector/error/?code=timestamp" == result.first!.redirectUrl);
        expect(httpContextMock.res.cookies.has(KnownUser.QueueITDebugKey)).toBeFalsy('debug cookie should not be set');
    });

    it('should Debug_ModifiedToken', () => {
        resetMocks();
        const cancelConfig = new CancelEventConfig('', '', '', 0);
        httpContextMock.req.setAbsoluteUri("http://localhost/original_url");
        httpContextMock.req.setUserHostAddress("userIP");
        mockGoogleHeaders();

        const secretKey = "secretKey";
        const queueitToken = generateDebugToken("eventId", secretKey) + "invalid-hash";
        // const expectedServerTime = (new Date(Date.now())).toISOString().split('.')[0] + "Z";
        KnownUser.UserInQueueService = userInQueueServiceMock;

        const result = KnownUser.cancelRequestByLocalConfig("http://test.com?event1=true", queueitToken, cancelConfig, "customerId", secretKey, httpContextMock);
        //Assert
        expect("https://customerId.api2.queue-it.net/customerId/diagnostics/connector/error/?code=hash" == result.first!.redirectUrl);
        expect(httpContextMock.res.cookies.has(KnownUser.QueueITDebugKey)).toBeFalsy('debug cookie should not be set');
    });

    it('should Exception_NoDebugToken', () => {
        resetMocks();

        const requestIP = "80.35.35.34";
        const viaHeader = "1.1 example.com";
        const forwardedHeader = "for=192.0.2.60;proto=http;by=203.0.113.43";
        const xForwardedForHeader = "129.78.138.66, 129.78.64.103";
        const xForwardedHostHeader = "en.wikipedia.org:8080";
        const xForwardedProtoHeader = "https";

        httpContextMock.req.headers.set('via', viaHeader);
        httpContextMock.req.headers.set('forwarded', forwardedHeader);
        httpContextMock.req.headers.set('x-forwarded-for', xForwardedForHeader);
        httpContextMock.req.headers.set('x-forwarded-host', xForwardedHostHeader);
        httpContextMock.req.headers.set('x-forwarded-proto', xForwardedProtoHeader);

        httpContextMock.req.setAbsoluteUri("http://test.com/?event1=true&queueittoken=queueittokenvalue");
        httpContextMock.req.setUserHostAddress(requestIP);

        const secretKey = "secretKey";

        const cancelEventconfig = new CancelEventConfig('', '', '', 0);
        cancelEventconfig.cookieDomain = "cookieDomain";
        cancelEventconfig.eventId = "eventId";
        cancelEventconfig.queueDomain = "queueDomain";
        cancelEventconfig.version = 1;
        userInQueueServiceMock.validateCancelRequestrRaiseException = true;
        KnownUser.UserInQueueService = userInQueueServiceMock;

        const result = KnownUser.cancelRequestByLocalConfig("http://test.com?event1=true",
            "queueitToken", cancelEventconfig, "customerid", "secretKey", httpContextMock);

        expect(httpContextMock.res.cookies.has(KnownUser.QueueITDebugKey)).toBeFalsy('debug cookie should not be set');
    });
});
