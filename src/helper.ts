export class QueueITHelper {
  static readonly KUP_VERSION: string = "fastly-2.0.3";

  static addKUPlatformVersion(redirectQueueUrl: string): string {
    return redirectQueueUrl + "&kupver=" + QueueITHelper.KUP_VERSION;
  }
}

export interface RequestLogger {
  log(message: string): void;
}
