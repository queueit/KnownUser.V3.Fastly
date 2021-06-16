import {Utils, QueueUrlParams, QueueParameterHelper} from './QueueITHelpers'
import {ActionTypes, RequestValidationResult, QueueEventConfig, CancelEventConfig, ValidationResult} from './Models'
import {StateInfo, UserInQueueStateCookieRepository} from './UserInQueueStateCookieRepository'

export class UserInQueueService {
    static readonly SDK_VERSION: string = "v3-asmscrpt-" + "3.6.0";

    constructor(private userInQueueStateRepository: UserInQueueStateCookieRepository) {
    }

    private getValidTokenResult(
        config: QueueEventConfig,
        queueParams: QueueUrlParams,
        secretKey: string)
        : RequestValidationResult {

        this.userInQueueStateRepository.store(
            config.eventId,
            queueParams.queueId,
            queueParams.cookieValidityMinutes,
            config.cookieDomain,
            queueParams.redirectType,
            secretKey);

        return new RequestValidationResult(
            ActionTypes.QueueAction,
            config.eventId,
            queueParams.queueId,
            "",
            queueParams.redirectType,
            config.actionName,
        );
    }

    private getErrorResult(
        customerId: string,
        targetUrl: string,
        config: QueueEventConfig,
        qParams: QueueUrlParams,
        errorCode: string)
        : RequestValidationResult {

        let query = this.getQueryString(customerId, config.eventId, config.version, config.culture, config.layoutName, config.actionName) +
            "&queueittoken=" + qParams.queueITToken +
            "&ts=" + Utils.getCurrentTime().toString() +
            (targetUrl.length > 0 ? "&t=" + Utils.encodeUrl(targetUrl) : "");
        const uriPath = "error/" + errorCode + "/";
        const redirectUrl = this.generateRedirectUrl(config.queueDomain, uriPath, query);

        return new RequestValidationResult(
            ActionTypes.QueueAction,
            config.eventId,
            "",
            redirectUrl,
            "",
            config.actionName
        );
    }

    private getQueueResult(
        targetUrl: string,
        config: QueueEventConfig,
        customerId: string)
        : RequestValidationResult {

        let query = this.getQueryString(customerId, config.eventId, config.version, config.culture, config.layoutName, config.actionName) +
            (targetUrl.length > 0 ? "&t=" + Utils.encodeUrl(targetUrl) : "");

        const redirectUrl = this.generateRedirectUrl(config.queueDomain, "", query);

        return new RequestValidationResult(
            ActionTypes.QueueAction,
            config.eventId,
            "",
            redirectUrl,
            "",
            config.actionName
        );
    }

    private getQueryString(
        customerId: string,
        eventId: string,
        configVersion: i64,
        culture: string,
        layoutName: string,
        actionName: string)
        : string {
        const queryStringList = new Array<string>();
        queryStringList.push("c=" + Utils.encodeUrl(customerId));
        queryStringList.push("e=" + Utils.encodeUrl(eventId));
        queryStringList.push("ver=" + UserInQueueService.SDK_VERSION);
        queryStringList.push("cver=" + configVersion.toString());
        queryStringList.push("man=" + Utils.encodeUrl(actionName));

        if (culture.length > 0) {
            queryStringList.push("cid=" + Utils.encodeUrl(culture));
        }


        if (layoutName.length > 0) {
            queryStringList.push("l=" + Utils.encodeUrl(layoutName));
        }

        return queryStringList.join("&");
    }


    private generateRedirectUrl(queueDomain: string, uriPath: string, query: string): string {
        if (!Utils.endsWith(queueDomain, "/"))
            queueDomain = queueDomain + "/";

        return "https://".concat(queueDomain).concat(uriPath).concat("?").concat(query);
    }

    public validateQueueRequest(
        targetUrl: string,
        queueitToken: string,
        config: QueueEventConfig,
        customerId: string,
        secretKey: string): ValidationResult {
        const state: StateInfo = this.userInQueueStateRepository.getState(config.eventId,
            config.cookieValidityMinute, secretKey, true);
        if (state.isValid) {
            if (state.isStateExtendable() && config.extendCookieValidity) {
                this.userInQueueStateRepository.store(config.eventId,
                    state.queueId,
                    0,
                    config.cookieDomain,
                    state.redirectType,
                    secretKey);
            }
            return new ValidationResult(new RequestValidationResult(
                ActionTypes.QueueAction,
                config.eventId,
                state.queueId,
                "",
                state.redirectType,
                config.actionName
            ), null);
        }

        const queueParams = QueueParameterHelper.extractQueueParams(queueitToken);

        let requestValidationResult: RequestValidationResult | null;
        let isTokenValid: bool = false;

        if (queueParams != null) {
            const tokenValidationResult = this.validateToken(config, queueParams, secretKey);
            isTokenValid = tokenValidationResult.isValid;

            if (isTokenValid) {
                requestValidationResult = this.getValidTokenResult(config, queueParams, secretKey);
            } else {
                requestValidationResult = this.getErrorResult(customerId, targetUrl, config, queueParams, tokenValidationResult.errorCode);
            }
        } else {
            requestValidationResult = this.getQueueResult(targetUrl, config, customerId);
        }

        if (state.isFound && !isTokenValid) {
            this.userInQueueStateRepository.cancelQueueCookie(config.eventId, config.cookieDomain);
        }

        return new ValidationResult(requestValidationResult, null);
    }

    public validateCancelRequest(
        targetUrl: string,
        config: CancelEventConfig,
        customerId: string,
        secretKey: string): ValidationResult {
        //we do not care how long cookie is valid while canceling cookie
        const state = this.userInQueueStateRepository.getState(config.eventId, -1, secretKey, false);

        if (state.isValid) {

            this.userInQueueStateRepository.cancelQueueCookie(config.eventId, config.cookieDomain);
            const query = this.getQueryString(customerId, config.eventId, config.version, '', '', config.actionName) +
                (targetUrl.length > 0 ? "&r=" + Utils.encodeUrl(targetUrl) : "");

            const uriPath = "cancel/" + customerId + "/" + config.eventId + "/";
            const redirectUrl = this.generateRedirectUrl(config.queueDomain, uriPath, query);
            return new ValidationResult(new RequestValidationResult(
                ActionTypes.CancelAction,
                config.eventId,
                state.queueId,
                redirectUrl,
                state.redirectType,
                config.actionName), null);
        } else {
            return new ValidationResult(new RequestValidationResult(
                ActionTypes.CancelAction,
                config.eventId,
                "",
                "",
                "",
                config.actionName), null);
        }
    }

    public extendQueueCookie(
        eventId: string,
        cookieValidityMinutes: i64,
        cookieDomain: string,
        secretKey: string): void {
        this.userInQueueStateRepository.reissueQueueCookie(eventId, cookieValidityMinutes, cookieDomain, secretKey)
    }

    public getIgnoreResult(
        actionName: string): RequestValidationResult {
        return new RequestValidationResult(ActionTypes.IgnoreAction, "", "", "", "", actionName);
    }

    private validateToken(
        config: QueueEventConfig,
        queueParams: QueueUrlParams,
        secretKey: string): TokenValidationResult {

        const calculatedHash = Utils.generateSHA256Hash(secretKey, queueParams.queueITTokenWithoutHash);

        if (calculatedHash != queueParams.hashCode) {
            return new TokenValidationResult(false, "hash");
        }


        if (queueParams.eventId != config.eventId)
            return new TokenValidationResult(false, "eventid");

        if (queueParams.timeStamp < Utils.getCurrentTime())
            return new TokenValidationResult(false, "timestamp");

        return new TokenValidationResult(true, "");
    }

}

class TokenValidationResult {
    constructor(
        public isValid: bool,
        public errorCode: string) {

    }

}
