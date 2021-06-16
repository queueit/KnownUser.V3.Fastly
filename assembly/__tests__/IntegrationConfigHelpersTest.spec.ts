import {
    ComparisonOperatorHelper,
    CookieValidatorHelper, HttpHeaderValidatorHelper, IntegrationEvaluator,
    UrlValidatorHelper, UserAgentValidatorHelper
} from "../sdk/IntegrationConfig/IntegrationConfigHelpers";
import {ComparisonOperatorType, TriggerPart, UrlPartType} from "../sdk/IntegrationConfig/IntegrationConfigModel";
import {CustomerIntegrationDecodingHandler} from "../sdk/IntegrationConfig/CustomerIntegrationDecodingHandler";
import {MockHttpContextProvider, MockHttpRequest, MockHttpResponse} from "./Mocks";

const httpContextMock = new MockHttpContextProvider(new MockHttpRequest(), new MockHttpResponse());

function resetMocks(): void {
    httpContextMock.reset();
}

describe('ComparisonOperatorHelper', () => {
    it('should evaluate_equals', () => {
        expect(ComparisonOperatorHelper.evaluate(ComparisonOperatorType.EqualS, false, false, "test1", "test1", null)).toBeTruthy();
        expect(ComparisonOperatorHelper.evaluate(ComparisonOperatorType.EqualS, false, false, "test1", "Test1", null)).toBeFalsy();
        expect(ComparisonOperatorHelper.evaluate(ComparisonOperatorType.EqualS, false, true, "test1", "Test1", null)).toBeTruthy();
        expect(ComparisonOperatorHelper.evaluate(ComparisonOperatorType.EqualS, true, false, "test1", "Test1", null)).toBeTruthy();
        expect(ComparisonOperatorHelper.evaluate(ComparisonOperatorType.EqualS, true, false, "test1", "test1", null)).toBeFalsy();
        expect(ComparisonOperatorHelper.evaluate(ComparisonOperatorType.EqualS, true, true, "test1", "Test1", null)).toBeFalsy();
    });

    it('should evaluate_contains', () => {
        expect(ComparisonOperatorHelper.evaluate(ComparisonOperatorType.Contains, false, false, "test_test1_test", "test1", null)).toBeTruthy();
        expect(ComparisonOperatorHelper.evaluate(ComparisonOperatorType.Contains, false, false, "test_test1_test", "Test1", null)).toBeFalsy();
        expect(ComparisonOperatorHelper.evaluate(ComparisonOperatorType.Contains, false, true, "test_test1_test", "Test1", null)).toBeTruthy();
        expect(ComparisonOperatorHelper.evaluate(ComparisonOperatorType.Contains, true, false, "test_test1_test", "Test1", null)).toBeTruthy();
        expect(ComparisonOperatorHelper.evaluate(ComparisonOperatorType.Contains, true, true, "test_test1", "Test1", null)).toBeFalsy();
        expect(ComparisonOperatorHelper.evaluate(ComparisonOperatorType.Contains, true, false, "test_test1", "test1", null)).toBeFalsy();
        expect(ComparisonOperatorHelper.evaluate(ComparisonOperatorType.Contains, false, false, "test_dsdsdsdtest1", "*", null)).toBeTruthy();
        expect(ComparisonOperatorHelper.evaluate(ComparisonOperatorType.Contains, false, false, "", "*", null)).toBeFalsy();
    });

    it('should evaluate_equals_any', () => {
        expect(ComparisonOperatorHelper.evaluate(ComparisonOperatorType.EqualsAny, false, false, "test1", '', ["test1"])).toBeTruthy();
        expect(ComparisonOperatorHelper.evaluate(ComparisonOperatorType.EqualsAny, false, false, "test1", '', ["Test1"])).toBeFalsy();
        expect(ComparisonOperatorHelper.evaluate(ComparisonOperatorType.EqualsAny, false, true, "test1", '', ["Test1"])).toBeTruthy();
        expect(ComparisonOperatorHelper.evaluate(ComparisonOperatorType.EqualsAny, true, false, "test1", '', ["Test1"])).toBeTruthy();
        expect(ComparisonOperatorHelper.evaluate(ComparisonOperatorType.EqualsAny, true, false, "test1", '', ["test1"])).toBeFalsy();
        expect(ComparisonOperatorHelper.evaluate(ComparisonOperatorType.EqualsAny, true, true, "test1", '', ["Test1"])).toBeFalsy();
    });

    it('should evaluate_contains_any', () => {
        expect(ComparisonOperatorHelper.evaluate(ComparisonOperatorType.ContainsAny, false, false, "test_test1_test", '', ["test1"])).toBeTruthy();
        expect(ComparisonOperatorHelper.evaluate(ComparisonOperatorType.ContainsAny, false, false, "test_test1_test", '', ["Test1"])).toBeFalsy();
        expect(ComparisonOperatorHelper.evaluate(ComparisonOperatorType.ContainsAny, false, true, "test_test1_test", '', ["Test1"])).toBeTruthy();
        expect(ComparisonOperatorHelper.evaluate(ComparisonOperatorType.ContainsAny, true, false, "test_test1_test", '', ["Test1"])).toBeTruthy();
        expect(ComparisonOperatorHelper.evaluate(ComparisonOperatorType.ContainsAny, true, true, "test_test1", '', ["Test1"])).toBeFalsy();
        expect(ComparisonOperatorHelper.evaluate(ComparisonOperatorType.ContainsAny, true, false, "test_test1", '', ["test1"])).toBeFalsy();
        expect(ComparisonOperatorHelper.evaluate(ComparisonOperatorType.ContainsAny, false, false, "test_dsdsdsdtest1", '', ["*"])).toBeTruthy();
    });
});

describe('ValidatorHelpers', () => {
    it('should cookie_evaluate', () => {
        resetMocks();

        const triggerPart = new TriggerPart();
        triggerPart.CookieName = "c1";
        triggerPart.Operator = ComparisonOperatorType.Contains;
        triggerPart.ValueToCompare = "1";

        expect(CookieValidatorHelper.evaluate(triggerPart, httpContextMock.req)).toBeFalsy();

        httpContextMock.req.setCookieValue("c5", "5")
            .setCookieValue("c1", "1")
            .setCookieValue("c2", "test");
        expect(CookieValidatorHelper.evaluate(triggerPart, httpContextMock.req)).toBeTruthy();

        triggerPart.ValueToCompare = "5";
        expect(CookieValidatorHelper.evaluate(triggerPart, httpContextMock.req)).toBeFalsy();

        triggerPart.ValueToCompare = "Test";
        triggerPart.IsIgnoreCase = true;
        triggerPart.CookieName = "c2";
        expect(CookieValidatorHelper.evaluate(triggerPart, httpContextMock.req)).toBeTruthy();

        triggerPart.ValueToCompare = "Test";
        triggerPart.IsIgnoreCase = true;
        triggerPart.IsNegative = true;
        triggerPart.CookieName = "c2";
        expect(CookieValidatorHelper.evaluate(triggerPart, httpContextMock.req)).toBeFalsy();
    });

    it('should url_evaluate', () => {
        resetMocks();

        const triggerPart = new TriggerPart();
        triggerPart.UrlPart = UrlPartType.PageUrl;
        triggerPart.Operator = ComparisonOperatorType.Contains;
        triggerPart.ValueToCompare = "http://test.tesdomain.com:8080/test?q=1";

        expect(UrlValidatorHelper.evaluate(triggerPart, "http://test.tesdomain.com:8080/test?q=2")).toBeFalsy();

        triggerPart.ValueToCompare = "/Test/t1";
        triggerPart.UrlPart = UrlPartType.PagePath;
        triggerPart.Operator = ComparisonOperatorType.EqualS;
        triggerPart.IsIgnoreCase = true;
        expect(UrlValidatorHelper.evaluate(triggerPart, "http://test.tesdomain.com:8080/test/t1?q=2&y02")).toBeTruthy();

        triggerPart.UrlPart = UrlPartType.HostName;
        triggerPart.ValueToCompare = "test.tesdomain.com";
        triggerPart.Operator = ComparisonOperatorType.Contains;
        expect(UrlValidatorHelper.evaluate(triggerPart, "http://m.test.tesdomain.com:8080/test?q=2")).toBeTruthy();

        triggerPart.UrlPart = UrlPartType.HostName;
        triggerPart.ValueToCompare = "test.tesdomain.com";
        triggerPart.IsNegative = true;
        triggerPart.Operator = ComparisonOperatorType.Contains;
        expect(UrlValidatorHelper.evaluate(triggerPart, "http://m.test.tesdomain.com:8080/test?q=2")).toBeFalsy();
    });

    it('should userAgent_evaluate', () => {
        resetMocks();

        const triggerPart = new TriggerPart();
        triggerPart.Operator = ComparisonOperatorType.Contains;
        triggerPart.ValueToCompare = "googlebot";

        expect(UserAgentValidatorHelper.evaluate(triggerPart, "Googlebot sample useraagent")).toBeFalsy();

        triggerPart.ValueToCompare = "googlebot";
        triggerPart.Operator = ComparisonOperatorType.EqualS;
        triggerPart.IsIgnoreCase = true;
        triggerPart.IsNegative = true;
        expect(UserAgentValidatorHelper.evaluate(triggerPart, "oglebot sample useraagent")).toBeTruthy();

        triggerPart.ValueToCompare = "googlebot";
        triggerPart.Operator = ComparisonOperatorType.Contains;
        triggerPart.IsIgnoreCase = false;
        triggerPart.IsNegative = true;
        expect(UserAgentValidatorHelper.evaluate(triggerPart, "googlebot")).toBeFalsy();

        triggerPart.ValueToCompare = "googlebot";
        triggerPart.IsIgnoreCase = true;
        triggerPart.IsNegative = false;
        triggerPart.Operator = ComparisonOperatorType.Contains;
        expect(UserAgentValidatorHelper.evaluate(triggerPart, "Googlebot")).toBeTruthy();

        triggerPart.ValueToCompare = '';
        triggerPart.ValuesToCompare = ["googlebot"];
        triggerPart.IsIgnoreCase = true;
        triggerPart.IsNegative = false;
        triggerPart.Operator = ComparisonOperatorType.ContainsAny;
        expect(UserAgentValidatorHelper.evaluate(triggerPart, "Googlebot")).toBeTruthy();

        triggerPart.ValuesToCompare = ["googlebot"];
        triggerPart.IsIgnoreCase = true;
        triggerPart.IsNegative = true;
        triggerPart.Operator = ComparisonOperatorType.EqualsAny;
        expect(UserAgentValidatorHelper.evaluate(triggerPart, "oglebot sample useraagent")).toBeTruthy();
    });

    it('should httpHeader_evaluate', () => {
        resetMocks();

        const triggerPart = new TriggerPart();
        triggerPart.Operator = ComparisonOperatorType.Contains;
        triggerPart.ValueToCompare = "1";

        expect(HttpHeaderValidatorHelper.evaluate(triggerPart, "")).toBeFalsy();

        expect(HttpHeaderValidatorHelper.evaluate(triggerPart, "1")).toBeTruthy();

        triggerPart.ValueToCompare = "5";
        expect(HttpHeaderValidatorHelper.evaluate(triggerPart, "1")).toBeFalsy();

        triggerPart.ValueToCompare = "Test";
        triggerPart.IsIgnoreCase = true;
        expect(HttpHeaderValidatorHelper.evaluate(triggerPart, "test")).toBeTruthy();

        triggerPart.ValueToCompare = "Test";
        triggerPart.IsIgnoreCase = true;
        triggerPart.IsNegative = true;
        expect(HttpHeaderValidatorHelper.evaluate(triggerPart, "test")).toBeFalsy();
    });
});

describe('IntegrationConfigHelpers', () => {
    it('should getMatchedIntegrationConfig_OneTrigger_And_NotMatched', () => {
        resetMocks();

        const integrationsConfigString = `{
            "Integrations": [{
                "Triggers": [{
                    "LogicalOperator":
                    "Or",
                    "TriggerParts": [{
                        "CookieName": "c1",
                        "Operator": "Equals",
                        "ValueToCompare": "value1",
                        "ValidatorType": "CookieValidator"
                    },{
                        "ValidatorType": "UserAgentValidator",
                        "ValueToCompare": "test",
                        "Operator": "Contains"
                    }]
                }]
            }]
        }`;

        const integrationConfig = CustomerIntegrationDecodingHandler.deserialize(integrationsConfigString);
        const url = "http://test.tesdomain.com:8080/test?q=2";

        const testObj = new IntegrationEvaluator();
        const result = testObj.getMatchedIntegrationConfig(integrationConfig, url, httpContextMock.req);
        expect(result).toBeNull();
    });

    it('should getMatchedIntegrationConfig_OneTrigger_And_Matched', () => {
        resetMocks();

        httpContextMock.req.setCookieValue("c1", "Value1");
        const integrationsConfigString = `{
            "Integrations": [{
                "Name": "integration1",
                "Triggers": [{
                    "LogicalOperator": "And",
                    "TriggerParts": [{
                        "CookieName": "c1",
                        "Operator": "Equals",
                        "IsIgnoreCase" : true,
                        "ValueToCompare": "value1",
                        "ValidatorType": "CookieValidator"
                    },{
                        "UrlPart": "PageUrl",
                        "ValidatorType": "UrlValidator",
                        "ValueToCompare": "test",
                        "Operator": "Contains"
                    }]
                }]
            }]
        }`;

        const integrationConfig = CustomerIntegrationDecodingHandler.deserialize(integrationsConfigString);
        const url = "http://test.tesdomain.com:8080/test?q=2";
        const result = (new IntegrationEvaluator()).getMatchedIntegrationConfig(integrationConfig, url, httpContextMock.req);

        expect(result).not.toBeNull();
        expect(result!.first).not.toBeNull();
        expect(result!.first!.Name).toBe('integration1');
    });

    it('should getMatchedIntegrationConfig_OneTrigger_And_NotMatched_UserAgent', () => {
        resetMocks();

        httpContextMock.req.setCookieValue("c1", "Value1");
        httpContextMock.req.setUserAgent("bot.html google.com googlebot test")

        const integrationsConfigString = `{
            "Integrations": [{
                "Name": "integration1",
                "Triggers": [{
                    "LogicalOperator": "And",
                    "TriggerParts": [{
                        "CookieName": "c1",
                        "Operator": "Equals",
                        "IsIgnoreCase" : true,
                        "IsNegative": false,
                        "ValueToCompare": "value1",
                        "ValidatorType": "CookieValidator"
                    },{
                        "UrlPart": "PageUrl",
                        "ValidatorType": "UrlValidator",
                        "ValueToCompare": "test",
                        "IsIgnoreCase": false,
                        "IsNegative": false,
                        "Operator": "Contains"
                    },{
                        "ValidatorType": "UserAgentValidator",
                        "ValueToCompare": "Googlebot",
                        "Operator": "Contains",
                        "IsIgnoreCase": true,
                        "IsNegative": true
                    }]
                }]
            }]
        }`;

        const integrationConfig = CustomerIntegrationDecodingHandler.deserialize(integrationsConfigString);
        const url = "http://test.tesdomain.com:8080/test?q=2";
        const result = (new IntegrationEvaluator()).getMatchedIntegrationConfig(integrationConfig, url, httpContextMock.req);

        expect(result).toBeNull();
    });

    it('should getMatchedIntegrationConfig_OneTrigger_And_NotMatched_HttpHeader', () => {
        resetMocks();

        httpContextMock.req.setCookieValue("c2", "ddd")
            .setCookieValue("c1", "Value1")
            .setHeader("c1", "t1")
            .setHeader("headertest", "abcd efg test gklm");
        const integrationsConfigString = `{
            "Integrations": [{
                "Name":
                "integration1",
                "Triggers": [{
                    "LogicalOperator":
                    "And",
                    "TriggerParts": [{
                        "CookieName": "c1",
                        "Operator": "Equals",
                        "ValueToCompare": "value1",
                        "ValidatorType": "CookieValidator",
                        "IsIgnoreCase": true,
                        "IsNegative": false
                    },{
                        "UrlPart": "PageUrl",
                        "ValidatorType": "UrlValidator",
                        "ValueToCompare": "test",
                        "Operator": "Contains",
                        "IsIgnoreCase": false,
                        "IsNegative": false
                    },{
                        "ValidatorType": "HttpHeaderValidator",
                        "ValueToCompare": "test",
                        "HttpHeaderName": "HeaderTest",
                        "Operator": "Contains",
                        "IsIgnoreCase": true,
                        "IsNegative": true
                    }]
                }]
            }]
        }`;

        const integrationConfig = CustomerIntegrationDecodingHandler.deserialize(integrationsConfigString);
        const url = "http://www.tesdomain.com:8080/test?q=2";

        expect((new IntegrationEvaluator()).getMatchedIntegrationConfig(integrationConfig, url, httpContextMock.req) == null).toBeTruthy();
    });

    it('should getMatchedIntegrationConfig_OneTrigger_And_Matched_RequestBody', () => {
        resetMocks();

        httpContextMock.req.setCookieValue("c2", "ddd")
            .setCookieValue("c1", "Value1")
            .setHeader("c1", "t1")
            .setHeader("headertest", "abcd efg test gklm")
            .setBody("test body test request");

        const integrationsConfigString = `{
            "Integrations": [{
                "Name":
                "integration1",
                "Triggers": [{
                    "LogicalOperator":
                    "And",
                    "TriggerParts": [{
                        "CookieName": "c1",
                        "Operator": "Equals",
                        "ValueToCompare": "value1",
                        "ValidatorType": "CookieValidator",
                        "IsIgnoreCase": true,
                        "IsNegative": false
                    },{
                        "UrlPart": "PageUrl",
                        "ValidatorType": "UrlValidator",
                        "ValueToCompare": "test",
                        "Operator": "Contains",
                        "IsIgnoreCase": false,
                        "IsNegative": false
                    },{
                        "ValidatorType": "RequestBodyValidator",
                        "ValueToCompare": "test body",
                        "Operator": "Contains",
                        "IsIgnoreCase": true,
                        "IsNegative": false
                    }]
                }]
            }]
        }`;

        const integrationConfig = CustomerIntegrationDecodingHandler.deserialize(integrationsConfigString);
        const url = "http://www.tesdomain.com:8080/test?q=2";

        const result = (new IntegrationEvaluator()).getMatchedIntegrationConfig(integrationConfig, url, httpContextMock.req);
        expect(result).not.toBeNull();
        expect(result!.first).not.toBeNull();
        expect(result!.first!.Name).toBe('integration1');
    });

    it('should getMatchedIntegrationConfig_OneTrigger_Or_NotMatched', () => {
        resetMocks();

        httpContextMock.req.setCookieValue("c2", "Value1");
        const integrationsConfigString = `{
            "Integrations": [{
                "Name":
                "integration1",
                "Triggers": [{
                    "LogicalOperator":
                    "Or",
                    "TriggerParts": [{
                        "CookieName": "c1",
                        "Operator": "Equals",
                        "ValueToCompare": "value1",
                        "ValidatorType": "CookieValidator"
                    },{
                        "UrlPart": "PageUrl",
                        "ValidatorType": "UrlValidator",
                        "IsIgnoreCase": true,
                        "IsNegative": true,
                        "ValueToCompare": "test",
                        "Operator": "Contains"
                    }]
                }]
            }]
        }`;

        const integrationConfig = CustomerIntegrationDecodingHandler.deserialize(integrationsConfigString);
        const url = "http://test.tesdomain.com:8080/test?q=2";
        const result = (new IntegrationEvaluator()).getMatchedIntegrationConfig(integrationConfig, url, httpContextMock.req);

        expect(result).toBeNull();
    });

    it('should getMatchedIntegrationConfig_OneTrigger_Or_Matched', () => {
        resetMocks();

        httpContextMock.req.setCookieValue("c1", "Value1");
        const integrationsConfigString = `{
            "Integrations": [{
                "Name":
                "integration1",
                "Triggers": [{
                    "LogicalOperator":
                    "Or",
                    "TriggerParts": [{
                        "CookieName": "c1",
                        "Operator": "Equals",
                        "ValueToCompare": "value1",
                        "ValidatorType": "CookieValidator"
                    },{
                        "UrlPart": "PageUrl",
                        "ValidatorType": "UrlValidator",
                        "ValueToCompare": "test",
                        "Operator": "Contains"
                    }]
                }]
            }]
        }`;

        const integrationConfig = CustomerIntegrationDecodingHandler.deserialize(integrationsConfigString);
        const url = "http://test.tesdomain.com:8080/test?q=2";
        const result = (new IntegrationEvaluator()).getMatchedIntegrationConfig(integrationConfig, url, httpContextMock.req);

        expect(result).not.toBeNull();
        expect(result!.first).not.toBeNull();
        expect(result!.first!.Name == "integration1").toBeTruthy();
    });

    it('should getMatchedIntegrationConfig_TwoTriggers_Matched', () => {
        resetMocks();

        httpContextMock.req.setCookieValue("c1", "Value1");
        const integrationsConfigString = `{
            "Integrations": [{
                "Name": "integration1",
                "Triggers": [{
                    "LogicalOperator": "And",
                    "TriggerParts": [{
                        "CookieName": "c1",
                        "Operator": "Equals",
                        "ValueToCompare": "value1",
                        "ValidatorType": "CookieValidator",
                        "IsIgnoreCase": true,
                        "IsNegative": false
                    },{
                        "UrlPart": "PageUrl",
                        "ValidatorType": "UrlValidator",
                        "ValueToCompare": "*",
                        "Operator": "Contains"
                    }]
                }]
            }]
        }`;

        const integrationConfig = CustomerIntegrationDecodingHandler.deserialize(integrationsConfigString);
        const url = "http://test.tesdomain.com:8080/test?q=2";
        const result = (new IntegrationEvaluator()).getMatchedIntegrationConfig(integrationConfig, url, httpContextMock.req);

        expect(result).not.toBeNull();
        expect(result!.first).not.toBeNull();
        expect(result!.first!.Name).toBe('integration1');
    });

    it('should getMatchedIntegrationConfig_TwoTriggers_NotMatched', () => {
        resetMocks();

        const integrationsConfigString = `{
            "Integrations": [{
                "Name":
                "integration1",
                "Triggers": [{
                    "LogicalOperator":
                    "And",
                    "TriggerParts": [{
                        "CookieName": "c1",
                        "Operator": "Equals",
                        "ValueToCompare": "value1",
                        "ValidatorType": "CookieValidator"
                    },{
                        "UrlPart": "PageUrl",
                        "ValidatorType": "UrlValidator",
                        "ValueToCompare": "tesT",
                        "Operator": "Contains"
                    }]
                }]
            }]
        }`;

        const integrationConfig = CustomerIntegrationDecodingHandler.deserialize(integrationsConfigString);
        const url = "http://test.tesdomain.com:8080/test?q=2";
        const result = (new IntegrationEvaluator()).getMatchedIntegrationConfig(integrationConfig, url, httpContextMock.req);

        expect(result).toBeNull();
    });

    it('should getMatchedIntegrationConfig_ThreeIntegrationsInOrder_SecondMatched', () => {
        resetMocks();

        httpContextMock.req.setCookieValue("c1", "Value1");
        const integrationsConfigString = `{
            "Integrations": [{
                "Name": "integration0",
                "Triggers": [{
                    "LogicalOperator": "And",
                    "TriggerParts": [{
                        "CookieName": "c1",
                        "Operator": "Equals",
                        "ValueToCompare": "value1",
                        "ValidatorType": "CookieValidator"
                    }]
                }]
            }],
            "Integrations": [{
                "Name": "integration1",
                "Triggers": [{
                    "LogicalOperator": "And",
                    "TriggerParts": [{
                        "CookieName": "c1",
                        "Operator": "Equals",
                        "ValueToCompare": "value1",
                        "ValidatorType": "CookieValidator"
                    }]
                }]
            }],            
            "Integrations": [{
                "Name": "integration2",
                "Triggers": [{
                    "LogicalOperator": "And",
                    "TriggerParts": [{
                        "UrlPart": "PageUrl",
                        "Operator": "Contains",
                        "ValueToCompare": "test",
                        "ValidatorType": "UrlValidator"
                    }]
                }]
            }]
        }`;

        const integrationConfig = CustomerIntegrationDecodingHandler.deserialize(integrationsConfigString);
        const url = "http://test.tesdomain.com:8080/test?q=2";
        const result = (new IntegrationEvaluator()).getMatchedIntegrationConfig(integrationConfig, url, httpContextMock.req)

        expect(result).not.toBeNull();
        expect(result!.first).not.toBeNull();
        expect(result!.first!.Name == "integration2").toBeTruthy();
    });
});
