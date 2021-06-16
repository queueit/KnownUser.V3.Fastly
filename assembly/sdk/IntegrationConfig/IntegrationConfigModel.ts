import {KnownUserException, Tuple} from "../Models";

export class IntegrationConfigModelResult extends Tuple<IntegrationConfigModel | null, KnownUserException | null> {
}

export class IntegrationConfigModel {
    Name: string = "";
    EventId: string = "";
    CookieDomain: string = "";
    LayoutName: string = "";
    Culture: string = "";
    ExtendCookieValidity: bool = false;
    CookieValidityMinute: i64 = 0;
    QueueDomain: string = "";
    RedirectLogic: string = "";
    ForcedTargetUrl: string = "";
    ActionType: string = "";
    Triggers: Array<TriggerModel>;

    constructor() {
        this.Triggers = new Array<TriggerModel>();
    }
}

export class CustomerIntegration {
    Integrations: Array<IntegrationConfigModel>;
    Version: i64;
    Description: string;

    constructor() {
        this.Integrations = new Array<IntegrationConfigModel>();
        this.Version = 0;
        this.Description = "";
    }
}

export class TriggerPart {
    ValidatorType: string = "";
    Operator: string = "";
    ValueToCompare: string = "";
    ValuesToCompare: Array<string>;
    IsNegative: bool = false;
    IsIgnoreCase: bool = false;
    UrlPart: string = ""; // UrlValidator
    CookieName: string = ""; // CookieValidator
    HttpHeaderName: string = ""; // HttpHeaderValidator

    constructor() {
        this.ValuesToCompare = new Array<string>();
    }
}

export class TriggerModel {
    constructor() {
        this.TriggerParts = new Array<TriggerPart>();
        this.LogicalOperator = "";
    }

    TriggerParts: Array<TriggerPart>;
    LogicalOperator: string;
}

export class ValidatorType {
    public static readonly UrlValidator: string = "UrlValidator";
    public static readonly CookieValidator: string = "CookieValidator";
    public static readonly UserAgentValidator: string = "UserAgentValidator";
    public static readonly HttpHeaderValidator: string = "HttpHeaderValidator";
    public static readonly RequestBodyValidator: string = "RequestBodyValidator";
}

export class UrlPartType {
    static readonly HostName: string = "HostName";
    static readonly PagePath: string = "PagePath";
    static readonly PageUrl: string = "PageUrl";
}

export class ComparisonOperatorType {
    static readonly EqualS: string = "Equals";
    static readonly Contains: string = "Contains";
    static readonly EqualsAny: string = "EqualsAny";
    static readonly ContainsAny: string = "ContainsAny";
}

export class LogicalOperatorType {
    public static readonly Or: string = "Or";
    public static readonly And: string = "And";
}

export class ActionType {
    public static readonly IgnoreAction: string = "Ignore";
    public static readonly CancelAction: string = "Cancel";
    public static readonly QueueAction: string = "Queue";
}
