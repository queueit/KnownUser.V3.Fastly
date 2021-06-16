//@ts-ignore
import {RegExp} from "assemblyscript-regex";
import {KeyValuePair, RequestValidationResult} from "./Models";
import {IDateTimeProvider} from "./HttpContextProvider";
import {Date as WasiDate} from "as-wasi";
import {encodeURIComponent, decodeURIComponent} from "./helpers/Uri";
import {KnownUser} from "./KnownUser";
import {Response} from "@fastly/as-compute";
import {UserInQueueService} from "./UserInQueueService";

export class QueueUrlParams {
    public timeStamp: i64 = 0;
    public eventId: string = "";
    public hashCode: string = "";
    public extendableCookie: bool = false;
    public cookieValidityMinutes: i64 = 0;
    public queueITToken: string = "";
    public queueITTokenWithoutHash: string = "";
    public queueId: string = "";
    public redirectType: string = "";
}


export class Utils {

    static encodeUrl(url: string): string {
        if (url.length == 0)
            return "";
        let decoded = encodeURIComponent(url);
        decoded = decoded.replaceAll('!', '%' + '!'.charCodeAt(0).toString(16));
        decoded = decoded.replaceAll('\'', '%' + '\''.charCodeAt(0).toString(16));
        decoded = decoded.replaceAll('(', '%' + '('.charCodeAt(0).toString(16));
        decoded = decoded.replaceAll(')', '%' + ')'.charCodeAt(0).toString(16));
        decoded = decoded.replaceAll('*', '%' + '*'.charCodeAt(0).toString(16));

        return decoded;
    }

    static decodeUrl(url: string): string {
        return decodeURIComponent(url);
    }

    static generateSHA256Hash: (a: string, b: string) => string = (secretKey: string, stringToHash: string): string => "";

    static endsWith(str: string, search: string): bool {
        if (str == search)
            return true;
        if (str.length == 0 || search.length == 0)
            return false;
        return str.substring(str.length - search.length, str.length) == search;
    }

    static getCurrentTime(): i64 {
        return Math.floor((WasiDate.now() / 1000) as f64) as i64;
    }

    private static _hex2bin: u8[] = [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 0, 0, 0, 0, 0, // 0-9
        0, 10, 11, 12, 13, 14, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, // A-F
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 10, 11, 12, 13, 14, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, // a-f
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ];

    static hex2bin(str: string): string {
        let len = str.length;
        let rv = '';
        let i = 0;

        let c1: i32;
        let c2: i32;

        while (len > 1) {
            let h1 = str.charAt(i++);
            c1 = h1.charCodeAt(0);
            let h2 = str.charAt(i++);
            c2 = h2.charCodeAt(0);

            rv += String.fromCharCode((Utils._hex2bin[c1] << 4) + Utils._hex2bin[c2]);
            len -= 2;
        }

        return rv;
    }

    static addNoCacheHeaders(res: Response): void {
        res.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
        res.headers.set('Pragma', 'no-cache');
        res.headers.set('Expires', 'Fri, 01 Jan 1990 00:00:00 GMT');
    }

    static getParameterByName(url: string, name: string): string {
        const namePart = new RegExp(`[\[\]]`, 'g')
        let match = namePart.exec(name);
        while (match != null) {
            let rxmatch = match.matches[0];
            name = name.replaceAll(rxmatch, '\\$&')
            match = namePart.exec(name);
        }
        const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
        const results = regex.exec(url);
        if (results == null) return '';
        if (results.matches.length < 3) {
            return '';
        }

        return decodeURIComponent(results.matches[2].replaceAll('+', ' '));
    }

    static removeQueueItToken(url: string): string {
        const pattern = new RegExp("([\?&])(" + KnownUser.QueueITTokenKey + "=[^&]*)", 'gi');
        const match = pattern.exec(url);
        if (match == null) return url;

        url = url.replaceAll(match.matches[0], '')
        return url;
    }
}

export class QueueParameterHelper {
    public static readonly TimeStampKey: string = "ts";
    public static readonly ExtendableCookieKey: string = "ce";
    public static readonly CookieValidityMinutesKey: string = "cv";
    public static readonly HashKey: string = "h";
    public static readonly EventIdKey: string = "e";
    public static readonly QueueIdKey: string = "q";
    public static readonly RedirectTypeKey: string = "rt";
    public static readonly KeyValueSeparatorChar: string = '_';
    public static readonly KeyValueSeparatorGroupChar: string = '~';

    public static extractQueueParams(queueitToken: string): QueueUrlParams | null {
        if (queueitToken.length == 0) {
            return null;
        }

        const result = new QueueUrlParams();
        result.queueITToken = queueitToken;

        const paramList = result.queueITToken.split(QueueParameterHelper.KeyValueSeparatorGroupChar);
        for (let i = 0; i < paramList.length; i++) {
            let paramKeyValue = paramList[i];

            let keyValueArr = paramKeyValue.split(QueueParameterHelper.KeyValueSeparatorChar);
            if (keyValueArr.length != 2) {
                continue;
            }

            if (keyValueArr[0] == QueueParameterHelper.HashKey) {
                result.hashCode = keyValueArr[1];
            } else if (keyValueArr[0] == QueueParameterHelper.TimeStampKey) {
                result.timeStamp = I64.parseInt(keyValueArr[1]);
            } else if (keyValueArr[0] == QueueParameterHelper.CookieValidityMinutesKey) {
                result.cookieValidityMinutes = I64.parseInt(keyValueArr[1]);
            } else if (keyValueArr[0] == QueueParameterHelper.EventIdKey) {
                result.eventId = keyValueArr[1];
            } else if (keyValueArr[0] == QueueParameterHelper.ExtendableCookieKey) {
                let extendCookie = (keyValueArr[1].length > 0 ? keyValueArr[1] : "false").toLowerCase();
                result.extendableCookie = extendCookie == "true";
            } else if (keyValueArr[0] == QueueParameterHelper.QueueIdKey) {
                result.queueId = keyValueArr[1];

            } else if (keyValueArr[0] == QueueParameterHelper.RedirectTypeKey) {
                result.redirectType = keyValueArr[1];
            }
        }

        const hashWithPrefix = QueueParameterHelper.KeyValueSeparatorGroupChar +
            QueueParameterHelper.HashKey +
            QueueParameterHelper.KeyValueSeparatorChar +
            result.hashCode;
        result.queueITTokenWithoutHash = result.queueITToken.replaceAll(hashWithPrefix, "");
        return result;
    }
}

export class CookieHelper {
    public static toMapFromValue(cookieValue: string): Map<string, string> {
        const items: string[] = cookieValue.split('&');
        let result = new Map<string, string>();
        for (let i = 0; i < items.length; i++) {
            let item: string = items[i];
            let keyValue = item.split('=');
            if (keyValue.length == 2) {
                result.set(keyValue[0], keyValue[1]);
            }
        }
        return result;
    }

    public static toValueFromKeyValueCollection(cookieValues: Array<KeyValuePair>): string {
        let values = new Array<string>();

        for (let i = 0; i < cookieValues.length; i++) {
            let kvp: KeyValuePair = cookieValues[i];
            values.push(kvp.key + "=" + kvp.value);
        }

        return values.join("&");
    }
}

export class ConnectorDiagnostics {
    public isEnabled: bool = false;
    public hasError: bool = false;
    public validationResult: RequestValidationResult | null

    private setStateWithTokenError(customerId: string, errorCode: string): void {
        this.hasError = true;
        const redirectUrl = "https://" + customerId + ".api2.queue-it.net/" + customerId + "/diagnostics/connector/error/?code=" + errorCode;
        this.validationResult = new RequestValidationResult("ConnectorDiagnosticsRedirect", "",
            "", redirectUrl, "", "")
    }

    private setStateWithSetupError(): void {
        this.hasError = true;
        this.validationResult = new RequestValidationResult("ConnectorDiagnosticsRedirect", "", "",
            "https://api2.queue-it.net/diagnostics/connector/error/?code=setup", "", "")
    }

    public static verify(customerId: string, secretKey: string, queueitToken: string): ConnectorDiagnostics {
        const diagnostics = new ConnectorDiagnostics();
        const qParams = QueueParameterHelper.extractQueueParams(queueitToken);

        if (qParams == null)
            return diagnostics;
        if (qParams.redirectType == null)
            return diagnostics;
        if (qParams.redirectType != "debug")
            return diagnostics;
        if (!(customerId != "" && secretKey != "")) {
            diagnostics.setStateWithSetupError();
            return diagnostics;
        }
        if (Utils.generateSHA256Hash(secretKey, qParams.queueITTokenWithoutHash) != qParams.hashCode) {
            diagnostics.setStateWithTokenError(customerId, "hash");
            return diagnostics;
        }
        if (qParams.timeStamp < Utils.getCurrentTime()) {
            diagnostics.setStateWithTokenError(customerId, "timestamp");
            return diagnostics;
        }
        diagnostics.isEnabled = true;

        return diagnostics;
    }
}

export class DateTimeProvider implements IDateTimeProvider {
    getCurrentTime(): Date {
        return new Date(i64(WasiDate.now()));
    }
}
