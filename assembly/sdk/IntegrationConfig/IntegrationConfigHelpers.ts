import * as IntegrationModels from './IntegrationConfigModel'
import {KnownUserException} from '../Models'
import {IHttpRequest} from '../HttpContextProvider'
//@ts-ignore
import {URL} from '@fastly/as-url';

export interface IIntegrationEvaluator {
    getMatchedIntegrationConfig(
        customerIntegration: IntegrationModels.CustomerIntegration,
        currentPageUrl: string,
        request: IHttpRequest): IntegrationModels.IntegrationConfigModelResult | null;
}

export class IntegrationEvaluator implements IIntegrationEvaluator {
    public getMatchedIntegrationConfig(
        customerIntegration: IntegrationModels.CustomerIntegration,
        currentPageUrl: string,
        request: IHttpRequest | null): IntegrationModels.IntegrationConfigModelResult | null {

        if (request == null)
            return new IntegrationModels.IntegrationConfigModelResult(null, new KnownUserException("request is null"));

        if (customerIntegration == null)
            return new IntegrationModels.IntegrationConfigModelResult(null, new KnownUserException("customerIntegration is null"));

        for (let i = 0; i < customerIntegration.Integrations.length; i++) {
            let integration = customerIntegration.Integrations[i];
            for (let t = 0; t < integration.Triggers.length; t++) {
                let trigger = integration.Triggers[t];
                if (this.evaluateTrigger(trigger, currentPageUrl, request)) {
                    return new IntegrationModels.IntegrationConfigModelResult(integration, null);
                }
            }
        }
        return null;
    }

    private evaluateTrigger(trigger: IntegrationModels.TriggerModel, currentPageUrl: string, request: IHttpRequest): bool {
        if (trigger.LogicalOperator == IntegrationModels.LogicalOperatorType.Or) {
            for (let i = 0; i < trigger.TriggerParts.length; i++) {
                let part = trigger.TriggerParts[i];
                if (this.evaluateTriggerPart(part, currentPageUrl, request))
                    return true;
            }
            return false;
        } else {
            for (let i = 0; i < trigger.TriggerParts.length; i++) {
                let part = trigger.TriggerParts[i];
                let matched = this.evaluateTriggerPart(part, currentPageUrl, request);
                if (!matched)
                    return false;
            }
            return true;
        }
    }

    private evaluateTriggerPart(triggerPart: IntegrationModels.TriggerPart, currentPageUrl: string, request: IHttpRequest): bool {
        if (triggerPart.ValidatorType == IntegrationModels.ValidatorType.UrlValidator) {
            return UrlValidatorHelper.evaluate(triggerPart, currentPageUrl);
        } else if (triggerPart.ValidatorType == IntegrationModels.ValidatorType.CookieValidator) {
            return CookieValidatorHelper.evaluate(triggerPart, request);
        } else if (triggerPart.ValidatorType == IntegrationModels.ValidatorType.UserAgentValidator) {
            return UserAgentValidatorHelper.evaluate(triggerPart, request.getUserAgent());
        } else if (triggerPart.ValidatorType == IntegrationModels.ValidatorType.HttpHeaderValidator) {
            return HttpHeaderValidatorHelper.evaluate(triggerPart, request.getHeader(triggerPart.HttpHeaderName));
        } else if (triggerPart.ValidatorType == IntegrationModels.ValidatorType.RequestBodyValidator) {
            return RequestBodyValidatorHelper.evaluate(triggerPart, request.getRequestBodyAsString());
        } else {
            return false;
        }
    }
}

export class UrlValidatorHelper {
    public static evaluate(triggerPart: IntegrationModels.TriggerPart, url: string): bool {
        let urlpart = this.getUrlPart(triggerPart, url);
        return ComparisonOperatorHelper.evaluate(
            triggerPart.Operator,
            triggerPart.IsNegative,
            triggerPart.IsIgnoreCase,
            urlpart,
            triggerPart.ValueToCompare,
            triggerPart.ValuesToCompare);
    }

    private static getUrlPart(triggerPart: IntegrationModels.TriggerPart, url: string): string {
        if (triggerPart.UrlPart == IntegrationModels.UrlPartType.PagePath) {
            return this.getPathFromUrl(url);
        } else if (triggerPart.UrlPart == IntegrationModels.UrlPartType.PageUrl) {
            return url;
        } else if (triggerPart.UrlPart == IntegrationModels.UrlPartType.HostName) {
            return this.getHostNameFromUrl(url);
        } else {
            return "";
        }
    }

    public static getHostNameFromUrl(url: string): string {
        let urlx = new URL(url);
        return urlx.host;
    }

    public static getPathFromUrl(url: string): string {
        let urlx = new URL(url);
        return urlx.pathname;
    }
}

export class CookieValidatorHelper {
    public static evaluate(triggerPart: IntegrationModels.TriggerPart, request: IHttpRequest): bool {
        return ComparisonOperatorHelper.evaluate(triggerPart.Operator,
            triggerPart.IsNegative,
            triggerPart.IsIgnoreCase,
            this.getCookie(triggerPart.CookieName, request),
            triggerPart.ValueToCompare,
            triggerPart.ValuesToCompare);
    }

    private static getCookie(cookieName: string, request: IHttpRequest): string {
        return request.getCookieValue(cookieName);
    }
}

export class UserAgentValidatorHelper {
    public static evaluate(triggerPart: IntegrationModels.TriggerPart, userAgent: string): bool {

        return ComparisonOperatorHelper.evaluate(triggerPart.Operator,
            triggerPart.IsNegative,
            triggerPart.IsIgnoreCase,
            userAgent,
            triggerPart.ValueToCompare,
            triggerPart.ValuesToCompare);
    }
}

export class RequestBodyValidatorHelper {
    public static evaluate(triggerPart: IntegrationModels.TriggerPart, bodyString: string): bool {

        return ComparisonOperatorHelper.evaluate(triggerPart.Operator,
            triggerPart.IsNegative,
            triggerPart.IsIgnoreCase,
            bodyString,
            triggerPart.ValueToCompare,
            triggerPart.ValuesToCompare);
    }
}

export class HttpHeaderValidatorHelper {
    public static evaluate(triggerPart: IntegrationModels.TriggerPart, headerValue: string): bool {
        return ComparisonOperatorHelper.evaluate(triggerPart.Operator,
            triggerPart.IsNegative,
            triggerPart.IsIgnoreCase,
            headerValue,
            triggerPart.ValueToCompare,
            triggerPart.ValuesToCompare);
    }
}

export class ComparisonOperatorHelper {
    public static evaluate(opt: string,
                           isNegative: bool,
                           isIgnoreCase: bool,
                           value: string,
                           valueToCompare: string,
                           valuesToCompare: Array<string> | null): bool {
        if (valuesToCompare == null) {
            valuesToCompare = new Array<string>();
        }
        if (opt == IntegrationModels.ComparisonOperatorType.EqualS) {
            return ComparisonOperatorHelper.equalS(value, valueToCompare, isNegative, isIgnoreCase);
        } else if (opt == IntegrationModels.ComparisonOperatorType.Contains) {
            return ComparisonOperatorHelper.contains(value, valueToCompare, isNegative, isIgnoreCase);
        } else if (opt == IntegrationModels.ComparisonOperatorType.EqualsAny) {
            return ComparisonOperatorHelper.equalsAny(value, valuesToCompare, isNegative, isIgnoreCase);
        } else if (opt == IntegrationModels.ComparisonOperatorType.ContainsAny) {
            return ComparisonOperatorHelper.containsAny(value, valuesToCompare, isNegative, isIgnoreCase);
        } else {
            return false;
        }
    }

    private static contains(value: string, valueToCompare: string, isNegative: bool, ignoreCase: bool): bool {
        if (valueToCompare == "*" && value != "")
            return true;

        let evaluation = false;

        if (ignoreCase)
            evaluation = value.toUpperCase().indexOf(valueToCompare.toUpperCase()) != -1;
        else
            evaluation = value.indexOf(valueToCompare) != -1;

        if (isNegative)
            return !evaluation;
        else
            return evaluation;
    }

    private static equalS(value: string, valueToCompare: string, isNegative: bool, ignoreCase: bool): bool {
        let evaluation = false;

        if (ignoreCase)
            evaluation = value.toUpperCase() == valueToCompare.toUpperCase();
        else
            evaluation = value == valueToCompare;

        if (isNegative)
            return !evaluation;
        else
            return evaluation;
    }

    private static equalsAny(value: string, valuesToCompare: Array<string>, isNegative: bool, isIgnoreCase: bool): bool {
        for (let i = 0; i < valuesToCompare.length; i++) {
            let valueToCompare = valuesToCompare[i];
            if (ComparisonOperatorHelper.equalS(value, valueToCompare, false, isIgnoreCase))
                return !isNegative;
        }

        return isNegative;
    }

    private static containsAny(value: string, valuesToCompare: Array<string>, isNegative: bool, isIgnoreCase: bool): bool {
        for (let i = 0; i < valuesToCompare.length; i++) {
            let valueToCompare = valuesToCompare[i];
            if (ComparisonOperatorHelper.contains(value, valueToCompare, false, isIgnoreCase))
                return !isNegative;
        }

        return isNegative;
    }
}
