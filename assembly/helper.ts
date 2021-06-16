import {Utils} from "./sdk/QueueITHelpers";
import {hmacString} from "./sdk/helpers/crypto";

export class QueueITHelper {
    static readonly KUP_VERSION: string = "fastly-1.0.0";

    static configureKnownUserHashing(): void {
        Utils.generateSHA256Hash = hmacString;
    }

    static addKUPlatformVersion(redirectQueueUrl: string): string {
        return redirectQueueUrl + "&kupver=" + QueueITHelper.KUP_VERSION;
    }
}

export interface RequestLogger {
    log(message: string): void;
}
