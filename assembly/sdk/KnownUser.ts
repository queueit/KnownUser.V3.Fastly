import {UserInQueueService} from './UserInQueueService'
import {UserInQueueStateCookieRepository} from './UserInQueueStateCookieRepository'
import {IDateTimeProvider, IHttpContextProvider} from './HttpContextProvider'
import {
    CancelEventConfig,
    QueueEventConfig,
    KnownUserException,
    RequestValidationResult,
    ActionTypes,
    ValidationResult
} from './Models'
import {Utils, ConnectorDiagnostics, DateTimeProvider} from './QueueITHelpers'
import * as IntegrationConfig from './IntegrationConfig/IntegrationConfigModel'
import * as IntegrationConfigHelpers from './IntegrationConfig/IntegrationConfigHelpers'
import {CustomerIntegrationDecodingHandler} from "./IntegrationConfig/CustomerIntegrationDecodingHandler";

export class KnownUser {
    public static readonly QueueITTokenKey: string = "queueittoken";
    public static readonly QueueITDebugKey: string = "queueitdebug";
    public static readonly QueueITAjaxHeaderKey: string = "x-queueit-ajaxpageurl";

    static UserInQueueService: UserInQueueService | null = null;

    private static getUserInQueueService(
        httpContextProvider: IHttpContextProvider): UserInQueueService {
        if (this.UserInQueueService == null) {
            return new UserInQueueService(new UserInQueueStateCookieRepository(httpContextProvider));
        }
        return this.UserInQueueService!;
    }

    private static isQueueAjaxCall(
        httpContextProvider: IHttpContextProvider): bool {
        const ajaxHeader = httpContextProvider.getHttpRequest().getHeader(this.QueueITAjaxHeaderKey);
        return ajaxHeader != '';
    }

    private static generateTargetUrl(
        originalTargetUrl: string,
        httpContextProvider: IHttpContextProvider): string {
        return !this.isQueueAjaxCall(httpContextProvider) ?
            originalTargetUrl :
            Utils.decodeUrl(httpContextProvider.getHttpRequest().getHeader(this.QueueITAjaxHeaderKey));
    }

    private static logExtraRequestDetails(
        debugEntries: Map<string, string>,
        httpContextProvider: IHttpContextProvider,
        dateTimeProvider: IDateTimeProvider): void {
        const date = dateTimeProvider.getCurrentTime();
        debugEntries.set("ServerUtcTime", date.toISOString().split('.')[0] + "Z");
        debugEntries.set("RequestIP", httpContextProvider.getHttpRequest().getUserHostAddress());
        debugEntries.set("RequestHttpHeader_Via", httpContextProvider.getHttpRequest().getHeader("Via"));
        debugEntries.set("RequestHttpHeader_Forwarded", httpContextProvider.getHttpRequest().getHeader("Forwarded"));
        debugEntries.set("RequestHttpHeader_XForwardedFor", httpContextProvider.getHttpRequest().getHeader("X-Forwarded-For"));
        debugEntries.set("RequestHttpHeader_XForwardedHost", httpContextProvider.getHttpRequest().getHeader("X-Forwarded-Host"));
        debugEntries.set("RequestHttpHeader_XForwardedProto", httpContextProvider.getHttpRequest().getHeader("X-Forwarded-Proto"));
    }

    private static setDebugCookie(
        debugEntries: Map<string, string>,
        httpContextProvider: IHttpContextProvider): void {
        let cookieValue = "";
        let entryKeys = debugEntries.keys();
        for (let i = 0; i < entryKeys.length; i++) {
            let key: string = entryKeys[i];
            cookieValue += key + "=" + debugEntries.get(key) + "|";
        }

        if (cookieValue.lastIndexOf("|") == cookieValue.length - 1) {
            cookieValue = cookieValue.substring(0, cookieValue.length - 1);
        }

        if (cookieValue == "")
            return;

        httpContextProvider.getHttpResponse().setCookie(
            this.QueueITDebugKey,
            cookieValue,
            "",
            Utils.getCurrentTime() + 20 * 60); // now + 20 mins
    }

    private static _resolveQueueRequestByLocalConfig(
        targetUrl: string,
        queueitToken: string,
        queueConfig: QueueEventConfig | null,
        customerId: string,
        secretKey: string,
        httpContextProvider: IHttpContextProvider,
        dateTimeProvider: IDateTimeProvider,
        debugEntries: Map<string, string>,
        isDebug: bool): ValidationResult {

        if (isDebug) {
            debugEntries.set("SdkVersion", UserInQueueService.SDK_VERSION);
            debugEntries.set("TargetUrl", targetUrl);
            debugEntries.set("QueueitToken", queueitToken);
            debugEntries.set("OriginalUrl", httpContextProvider.getHttpRequest().getAbsoluteUri());
            debugEntries.set("QueueConfig", queueConfig != null ? queueConfig.getString() : "NULL");

            this.logExtraRequestDetails(debugEntries, httpContextProvider, dateTimeProvider);
        }

        if (customerId == "")
            return new ValidationResult(null, new KnownUserException("customerId can not be null or empty."));
        if (secretKey == "")
            return new ValidationResult(null, new KnownUserException("secretKey can not be null or empty."));
        if (queueConfig == null)
            return new ValidationResult(null, new KnownUserException("queueConfig can not be null."));
        if (queueConfig.eventId == "")
            return new ValidationResult(null, new KnownUserException("queueConfig.eventId can not be null or empty."));
        if (queueConfig.queueDomain == "")
            return new ValidationResult(null, new KnownUserException("queueConfig.queueDomain can not be null or empty."));
        if (queueConfig.cookieValidityMinute <= 0)
            return new ValidationResult(null, new KnownUserException("queueConfig.cookieValidityMinute should be integer greater than 0."));

        const userInQueueService = this.getUserInQueueService(httpContextProvider);
        const result = userInQueueService.validateQueueRequest(targetUrl, queueitToken, queueConfig, customerId, secretKey);
        if (result != null && result.first != null) {
            result.first!.isAjaxResult = this.isQueueAjaxCall(httpContextProvider);
        }

        return result;
    }

    private static _cancelRequestByLocalConfig(
        targetUrl: string,
        queueitToken: string,
        cancelConfig: CancelEventConfig | null,
        customerId: string,
        secretKey: string,
        httpContextProvider: IHttpContextProvider,
        dateTimeProvider: IDateTimeProvider,
        debugEntries: Map<string, string>,
        isDebug: bool): ValidationResult {

        targetUrl = this.generateTargetUrl(targetUrl, httpContextProvider);

        if (isDebug) {
            debugEntries.set("SdkVersion", UserInQueueService.SDK_VERSION);
            debugEntries.set("TargetUrl", targetUrl);
            debugEntries.set("QueueitToken", queueitToken);
            debugEntries.set("CancelConfig", cancelConfig != null ? cancelConfig.getString() : "NULL");
            debugEntries.set("OriginalUrl", httpContextProvider.getHttpRequest().getAbsoluteUri());

            this.logExtraRequestDetails(debugEntries, httpContextProvider, dateTimeProvider);
        }

        if (targetUrl == '')
            return new ValidationResult(null, new KnownUserException("targetUrl can not be null or empty."));
        if (customerId == '')
            return new ValidationResult(null, new KnownUserException("customerId can not be null or empty."));
        if (secretKey == '')
            return new ValidationResult(null, new KnownUserException("secretKey can not be null or empty."));
        if (cancelConfig == null)
            return new ValidationResult(null, new KnownUserException("cancelConfig can not be null."));
        if (cancelConfig.eventId == '')
            return new ValidationResult(null, new KnownUserException("cancelConfig.eventId can not be null or empty."));
        if (cancelConfig.queueDomain == '')
            return new ValidationResult(null, new KnownUserException("cancelConfig.queueDomain can not be null or empty."));

        const userInQueueService = this.getUserInQueueService(httpContextProvider);
        const result = userInQueueService.validateCancelRequest(targetUrl, cancelConfig, customerId, secretKey);
        if (result.first != null) {
            result.first!.isAjaxResult = this.isQueueAjaxCall(httpContextProvider);
        }

        return result;
    }

    private static handleQueueAction(
        currentUrlWithoutQueueITToken: string, queueitToken: string,
        customerIntegrationInfo: IntegrationConfig.CustomerIntegration, customerId: string,
        secretKey: string,
        matchedConfig: IntegrationConfig.IntegrationConfigModel,
        httpContextProvider: IHttpContextProvider,
        dateTimeProvider: IDateTimeProvider,
        debugEntries: Map<string, string>,
        isDebug: bool): ValidationResult {
        let targetUrl: string;

        if (matchedConfig.RedirectLogic == "ForcedTargetUrl") {
            targetUrl = matchedConfig.ForcedTargetUrl;
        } else if (matchedConfig.RedirectLogic == "EventTargetUrl") {
            targetUrl = "";
        } else {
            targetUrl = this.generateTargetUrl(currentUrlWithoutQueueITToken, httpContextProvider);
        }

        const queueEventConfig = new QueueEventConfig(
            matchedConfig.EventId,
            matchedConfig.LayoutName,
            matchedConfig.Culture,
            matchedConfig.QueueDomain,
            matchedConfig.ExtendCookieValidity,
            matchedConfig.CookieValidityMinute,
            matchedConfig.CookieDomain,
            customerIntegrationInfo.Version,
            matchedConfig.Name
        );

        return this._resolveQueueRequestByLocalConfig(targetUrl, queueitToken, queueEventConfig, customerId, secretKey, httpContextProvider, dateTimeProvider, debugEntries, isDebug);
    }

    private static handleCancelAction(
        currentUrlWithoutQueueITToken: string, queueitToken: string,
        customerIntegrationInfo: IntegrationConfig.CustomerIntegration, customerId: string,
        secretKey: string,
        matchedConfig: IntegrationConfig.IntegrationConfigModel,
        httpContextProvider: IHttpContextProvider,
        dateTimeProvider: IDateTimeProvider,
        debugEntries: Map<string, string>,
        isDebug: bool): ValidationResult {
        const cancelEventConfig = new CancelEventConfig(
            matchedConfig.EventId,
            matchedConfig.QueueDomain,
            matchedConfig.CookieDomain,
            customerIntegrationInfo.Version,
            matchedConfig.Name
        );

        const targetUrl = this.generateTargetUrl(currentUrlWithoutQueueITToken, httpContextProvider);
        return this._cancelRequestByLocalConfig(targetUrl, queueitToken, cancelEventConfig, customerId, secretKey, httpContextProvider, dateTimeProvider, debugEntries, isDebug);
    }

    private static handleIgnoreAction(
        httpContextProvider: IHttpContextProvider,
        actionName: string): ValidationResult {
        const userInQueueService = this.getUserInQueueService(httpContextProvider);
        const result = userInQueueService.getIgnoreResult(actionName);
        result.isAjaxResult = this.isQueueAjaxCall(httpContextProvider);
        return new ValidationResult(result, null);
    }

    public static extendQueueCookie(
        eventId: string,
        cookieValidityMinute: i64,
        cookieDomain: string,
        secretKey: string,
        httpContextProvider: IHttpContextProvider): KnownUserException | null {
        if (eventId == "") {
            return new KnownUserException("eventId can not be null or empty.");
        }
        if (secretKey == "") {
            return new KnownUserException("secretKey can not be null or empty.");
        }
        if (cookieValidityMinute <= 0) {
            return new KnownUserException("cookieValidityMinute should be integer greater than 0.");
        }

        const userInQueueService = this.getUserInQueueService(httpContextProvider);
        userInQueueService.extendQueueCookie(eventId, cookieValidityMinute, cookieDomain, secretKey);
        return null;
    }

    public static resolveQueueRequestByLocalConfig(
        targetUrl: string,
        queueitToken: string,
        queueConfig: QueueEventConfig | null,
        customerId: string,
        secretKey: string,
        httpContextProvider: IHttpContextProvider,
        dateTimeProvider: IDateTimeProvider | null = null): ValidationResult {
        if (dateTimeProvider == null) dateTimeProvider = new DateTimeProvider();
        const debugEntries = new Map<string, string>();
        const connectorDiagnostics = ConnectorDiagnostics.verify(customerId, secretKey, queueitToken);

        if (connectorDiagnostics.hasError) {
            return new ValidationResult(connectorDiagnostics.validationResult, null);
        }

        targetUrl = this.generateTargetUrl(targetUrl, httpContextProvider);
        const result = this._resolveQueueRequestByLocalConfig(targetUrl, queueitToken, queueConfig, customerId, secretKey, httpContextProvider, dateTimeProvider, debugEntries, connectorDiagnostics.isEnabled);
        if (result != null && result.second != null) {
            if (connectorDiagnostics.isEnabled) {
                debugEntries.set("Exception", result.second!.message);
            }
        }
        this.setDebugCookie(debugEntries, httpContextProvider);
        return result;
    }

    private static handleException(diagnostics: ConnectorDiagnostics,
                                   debugEntries: Map<string, string>,
                                   ex: KnownUserException,
                                   httpContext: IHttpContextProvider): void {
        if (diagnostics.isEnabled) debugEntries.set('Exception', ex.message);
        this.setDebugCookie(debugEntries, httpContext);
    }

    public static validateRequestByIntegrationConfig(
        currentUrlWithoutQueueITToken: string,
        queueitToken: string,
        integrationsConfigString: string,
        customerId: string,
        secretKey: string,
        httpContextProvider: IHttpContextProvider,
        dateTimeProvider: IDateTimeProvider | null = null): ValidationResult {
        if (dateTimeProvider == null) dateTimeProvider = new DateTimeProvider();

        const debugEntries = new Map<string, string>();

        const connectorDiagnostics = ConnectorDiagnostics.verify(customerId, secretKey, queueitToken);
        if (connectorDiagnostics.hasError) {
            return new ValidationResult(connectorDiagnostics.validationResult, null);
        }
        if (connectorDiagnostics.isEnabled) {
            debugEntries.set("SdkVersion", UserInQueueService.SDK_VERSION);
            debugEntries.set("PureUrl", currentUrlWithoutQueueITToken);
            debugEntries.set("QueueitToken", queueitToken);
            debugEntries.set("OriginalUrl", httpContextProvider.getHttpRequest().getAbsoluteUri());

            this.logExtraRequestDetails(debugEntries, httpContextProvider, dateTimeProvider);
        }

        const customerIntegrationInfo = CustomerIntegrationDecodingHandler.deserialize(integrationsConfigString);

        if (connectorDiagnostics.isEnabled) {
            debugEntries.set('ConfigVersion', customerIntegrationInfo && customerIntegrationInfo.Version != 0 ? customerIntegrationInfo.Version.toString() : "NULL");
        }

        if (currentUrlWithoutQueueITToken == '') {
            const ex = new KnownUserException("currentUrlWithoutQueueITToken can not be null or empty.");
            this.handleException(connectorDiagnostics, debugEntries, ex, httpContextProvider);
            return new ValidationResult(null, ex);
        }
        if (customerIntegrationInfo == null || customerIntegrationInfo.Version == 0) {
            const ex = new KnownUserException("integrationsConfigString can not be null or empty.");
            this.handleException(connectorDiagnostics, debugEntries, ex, httpContextProvider);
            return new ValidationResult(null, ex);
        }

        const configEvaluator = new IntegrationConfigHelpers.IntegrationEvaluator();

        const configMatchResult = configEvaluator.getMatchedIntegrationConfig(
            customerIntegrationInfo,
            currentUrlWithoutQueueITToken,
            httpContextProvider.getHttpRequest());

        if (connectorDiagnostics.isEnabled) {
            debugEntries.set('MatchedConfig', configMatchResult != null && configMatchResult.first != null ?
                configMatchResult.first!.Name
                : "NULL");
        }
        if (configMatchResult == null || configMatchResult.second != null) {
            this.setDebugCookie(debugEntries, httpContextProvider);
            return new ValidationResult(new RequestValidationResult("", "", "", "", "", ""), null);
        }
        const matchedConfig = configMatchResult.first!;
        let result: ValidationResult

        if (matchedConfig.ActionType == ActionTypes.QueueAction) {
            result = this.handleQueueAction(currentUrlWithoutQueueITToken, queueitToken, customerIntegrationInfo,
                customerId, secretKey, matchedConfig, httpContextProvider, dateTimeProvider, debugEntries, connectorDiagnostics.isEnabled);
        } else if (matchedConfig.ActionType == ActionTypes.CancelAction) {
            result = this.handleCancelAction(currentUrlWithoutQueueITToken, queueitToken, customerIntegrationInfo,
                customerId, secretKey, matchedConfig, httpContextProvider, dateTimeProvider, debugEntries, connectorDiagnostics.isEnabled);
        } else {
            result = this.handleIgnoreAction(httpContextProvider, matchedConfig.Name);
        }
        if (result.second != null && connectorDiagnostics.isEnabled) {
            debugEntries.set('Exception', result.second!.message);
        }

        this.setDebugCookie(debugEntries, httpContextProvider);
        return result;
    }

    public static cancelRequestByLocalConfig(
        targetUrl: string,
        queueitToken: string,
        cancelConfig: CancelEventConfig | null,
        customerId: string,
        secretKey: string,
        httpContextProvider: IHttpContextProvider,
        dateTimeProvider: IDateTimeProvider | null = null): ValidationResult {
        if (dateTimeProvider == null) dateTimeProvider = new DateTimeProvider();
        const debugEntries = new Map<string, string>();
        const connectorDiagnostics = ConnectorDiagnostics.verify(customerId, secretKey, queueitToken);

        if (connectorDiagnostics.hasError)
            return new ValidationResult(connectorDiagnostics.validationResult, null);

        const result = this._cancelRequestByLocalConfig(
            targetUrl, queueitToken, cancelConfig, customerId, secretKey, httpContextProvider, dateTimeProvider, debugEntries, connectorDiagnostics.isEnabled);
        if (result.second != null && connectorDiagnostics.isEnabled) {
            debugEntries.set('Exception', result.second!.message);
        }
        this.setDebugCookie(debugEntries, httpContextProvider);

        return result;
    }
}

