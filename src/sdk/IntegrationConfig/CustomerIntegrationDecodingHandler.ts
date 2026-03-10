import {
    CustomerIntegration,
    IntegrationConfigModel,
    TriggerModel,
    TriggerPart
} from "./IntegrationConfigModel";

export class CustomerIntegrationDecodingHandler {
    static deserialize(integrationsConfigString: string): CustomerIntegration {
        const result = new CustomerIntegration();
        if (!integrationsConfigString) return result;

        const parsed = JSON.parse(integrationsConfigString);
        result.Version = parsed.Version ?? 0;
        result.Description = parsed.Description ?? '';

        if (Array.isArray(parsed.Integrations)) {
            result.Integrations = parsed.Integrations.map((item: any) => {
                const model = new IntegrationConfigModel();
                model.Name = item.Name ?? '';
                model.EventId = item.EventId ?? '';
                model.CookieDomain = item.CookieDomain ?? '';
                model.LayoutName = item.LayoutName ?? '';
                model.Culture = item.Culture ?? '';
                model.ExtendCookieValidity = item.ExtendCookieValidity ?? false;
                model.CookieValidityMinute = item.CookieValidityMinute ?? 0;
                model.QueueDomain = item.QueueDomain ?? '';
                model.RedirectLogic = item.RedirectLogic ?? '';
                model.ForcedTargetUrl = item.ForcedTargetUrl ?? '';
                model.ActionType = item.ActionType ?? '';

                model.Triggers = (item.Triggers ?? []).map((trigger: any) => {
                    const t = new TriggerModel();
                    t.LogicalOperator = trigger.LogicalOperator ?? '';
                    t.TriggerParts = (trigger.TriggerParts ?? []).map((part: any) => {
                        const tp = new TriggerPart();
                        tp.ValidatorType = part.ValidatorType ?? '';
                        tp.Operator = part.Operator ?? '';
                        tp.ValueToCompare = part.ValueToCompare ?? '';
                        tp.ValuesToCompare = part.ValuesToCompare ?? [];
                        tp.IsNegative = part.IsNegative ?? false;
                        tp.IsIgnoreCase = part.IsIgnoreCase ?? false;
                        tp.UrlPart = part.UrlPart ?? '';
                        tp.CookieName = part.CookieName ?? '';
                        tp.HttpHeaderName = part.HttpHeaderName ?? '';
                        return tp;
                    });
                    return t;
                });

                return model;
            });
        }

        return result;
    }
}
