import {JSONHandler} from "assemblyscript-json";
import {
    CustomerIntegration,
    IntegrationConfigModel,
    TriggerModel,
    TriggerPart
} from "./IntegrationConfigModel";
import {JSONDecoder} from "assemblyscript-json";

const ARRAY_NAME_INTEGRATIONS = "Integrations";
const ARRAY_NAME_TRIGGERS = "Triggers";
const ARRAY_NAME_TRIGGER_PARTS = "TriggerParts";
const ARRAY_NAME_VALUES_TO_COMPARE = "ValuesToCompare";

export class CustomerIntegrationDecodingHandler extends JSONHandler {
    private readonly _deserializedValue: CustomerIntegration;
    private isInIntegrations: bool = false;
    private isInTriggers: bool = false;
    private isInConfigModel: bool = false;
    private isInTriggerModel: bool = false;
    private isInTriggerPart: bool = false;
    private currentIntegrationConfigModel: IntegrationConfigModel | null;
    private currentTriggerModel: TriggerModel | null;
    private currentTriggerPart: TriggerPart | null;
    private isInTriggerParts: bool = false;
    private isInTriggerPartValuesToCompare: bool = false;
    private arrayStack: string[] = [];

    constructor() {
        super();
        this._deserializedValue = new CustomerIntegration();
    }

    pushArray(name: string): bool {
        // Handle array start
        // true means that nested object needs to be traversed, false otherwise
        // Note that returning false means JSONDecoder.startIndex need to be updated by handler

        // Push array name to stack BEFORE checking if we recognize it
        // This ensures every pushArray has a matching popArray
        this.arrayStack.push(name);

        if (name == ARRAY_NAME_INTEGRATIONS) {
            this.isInIntegrations = true;
        } else if (name == ARRAY_NAME_TRIGGERS) {
            this.isInTriggers = true;
        } else if (name == ARRAY_NAME_TRIGGER_PARTS) {
            this.isInTriggerParts = true;
        } else if (name == ARRAY_NAME_VALUES_TO_COMPARE) {
            this.isInTriggerPartValuesToCompare = true;
        }
        return this.isInIntegrations
            || this.isInTriggers
            || this.isInTriggerParts
            || this.isInTriggerPartValuesToCompare;
    }


    popArray(): void {
        // Pop array name from stack
        if (this.arrayStack.length == 0) {
            return; // Defensive: should never happen
        }

        const arrayName = this.arrayStack.pop();

        // Only clear flags for recognized arrays
        if (arrayName == ARRAY_NAME_VALUES_TO_COMPARE) {
            this.isInTriggerPartValuesToCompare = false;
        } else if (arrayName == ARRAY_NAME_TRIGGER_PARTS) {
            this.isInTriggerParts = false;
        } else if (arrayName == ARRAY_NAME_TRIGGERS) {
            this.isInTriggers = false;
        } else if (arrayName == ARRAY_NAME_INTEGRATIONS) {
            this.isInIntegrations = false;
        }
        // Note: Unrecognized arrays (like InvolvedWaitingRoomIds) are popped but don't affect flags
    }

    pushObject(name: string): bool {
        if (this.isInTriggerParts) {
            this.isInTriggerPart = true;
            this.currentTriggerPart = new TriggerPart();
        } else if (this.isInTriggers) {
            this.isInTriggerModel = true;
            this.currentTriggerModel = new TriggerModel();
        } else if (this.isInIntegrations) {
            this.isInConfigModel = true;
            this.currentIntegrationConfigModel = new IntegrationConfigModel();
        }
        return super.pushObject(name);
    }

    popObject(): void {
        if (this.isInTriggerPart) {
            this.currentTriggerModel!.TriggerParts.push(this.currentTriggerPart!);
            this.isInTriggerPart = false;
        } else if (this.isInTriggerModel) {
            // Defensive: only add trigger if we have a valid integration
            if (this.currentIntegrationConfigModel != null) {
                this.currentIntegrationConfigModel!.Triggers.push(this.currentTriggerModel!);
            }
            this.isInTriggerModel = false;
        } else if (this.isInConfigModel) {
            this._deserializedValue.Integrations.push(this.currentIntegrationConfigModel!);
            this.isInConfigModel = false;
        }
    }

    setInteger(name: string, value: i64): void {
        if (this.isInConfigModel) {
            this.setConfigModelInteger(name, value);
        } else if (name == "Version") {
            this._deserializedValue.Version = value;
        }
    }

    setBoolean(name: string, value: bool): void {
        if (this.isInTriggerPart) {
            this.setTriggerPartBoolean(name, value);
        } else if (this.isInConfigModel) {
            this.setConfigModelBoolean(name, value);
        }
    }

    setString(name: string, value: string): void {
        if (this.isInTriggerPartValuesToCompare) {
            this.addTriggerPartValuesToCompare(value);
        } else if (this.isInTriggerPart) {
            this.setTriggerPartString(name, value);
        } else if (this.isInTriggerModel) {
            this.setTriggerModelString(name, value);
        } else if (this.isInConfigModel) {
            this.setConfigModelString(name, value);
        } else if (name == "Description") {
            this._deserializedValue.Description = value;
        }
    }

    setConfigModelBoolean(name: string, value: bool): void {
        if (name == "ExtendCookieValidity") {
            this.currentIntegrationConfigModel!.ExtendCookieValidity = value;
        }
    }

    setTriggerPartBoolean(name: string, value: bool): void {
        if (name == "IsNegative") {
            this.currentTriggerPart!.IsNegative = value;
        } else if (name == "IsIgnoreCase") {
            this.currentTriggerPart!.IsIgnoreCase = value;
        }
    }

    setConfigModelInteger(name: string, value: i64): void {
        if (name == "CookieValidityMinute") {
            this.currentIntegrationConfigModel!.CookieValidityMinute = value;
        }
    }

    addTriggerPartValuesToCompare(value: string): void {
        this.currentTriggerPart!.ValuesToCompare.push(value);
    }

    setTriggerPartString(name: string, value: string): void {
        if (name == "ValidatorType") {
            this.currentTriggerPart!.ValidatorType = value;
        } else if (name == "Operator") {
            this.currentTriggerPart!.Operator = value;
        } else if (name == "ValueToCompare") {
            this.currentTriggerPart!.ValueToCompare = value;
        } else if (name == "UrlPart") {
            this.currentTriggerPart!.UrlPart = value;
        } else if (name == "CookieName") {
            this.currentTriggerPart!.CookieName = value;
        } else if (name == "HttpHeaderName") {
            this.currentTriggerPart!.HttpHeaderName = value;
        }
    }

    setTriggerModelString(name: string, value: string): void {
        if (name == "LogicalOperator") {
            this.currentTriggerModel!.LogicalOperator = value;
        }
    }

    setConfigModelString(name: string, value: string): void {
        if (name == "Name") {
            this.currentIntegrationConfigModel!.Name = value;
        } else if (name == "EventId") {
            this.currentIntegrationConfigModel!.EventId = value;
        } else if (name == "CookieDomain") {
            this.currentIntegrationConfigModel!.CookieDomain = value;
        } else if (name == "LayoutName") {
            this.currentIntegrationConfigModel!.LayoutName = value;
        } else if (name == "Culture") {
            this.currentIntegrationConfigModel!.Culture = value;
        } else if (name == "QueueDomain") {
            this.currentIntegrationConfigModel!.QueueDomain = value;
        } else if (name == "RedirectLogic") {
            this.currentIntegrationConfigModel!.RedirectLogic = value;
        } else if (name == "ForcedTargetUrl") {
            this.currentIntegrationConfigModel!.ForcedTargetUrl = value;
        } else if (name == "ActionType") {
            this.currentIntegrationConfigModel!.ActionType = value;
        }
    }

    value(): CustomerIntegration {
        return this._deserializedValue;
    }

    static deserialize(integrationsConfigString: string): CustomerIntegration {
        const handler = new CustomerIntegrationDecodingHandler();
        if (integrationsConfigString == '') {
            return handler.value();
        }
        const decoder = new JSONDecoder<CustomerIntegrationDecodingHandler>(handler);
        decoder.deserialize(Uint8Array.wrap(String.UTF8.encode(integrationsConfigString)));
        return handler.value();
    }
}
