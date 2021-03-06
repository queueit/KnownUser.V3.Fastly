import {JSONDecoder} from "assemblyscript-json";
import {CustomerIntegrationDecodingHandler} from "../sdk/IntegrationConfig/CustomerIntegrationDecodingHandler";
import * as IntegrationModels from "../sdk/IntegrationConfig/IntegrationConfigModel";

describe('CustomerIntegrationDecodingHandler', () => {

    it('should deserialize', () => {
        const integrationConfigString = `{
   "Description":"tst",
   "Integrations":[
      {
         "Name":"mojitest",
         "ActionType":"Queue",
         "EventId":"event1",
         "CookieDomain":"",
         "LayoutName":null,
         "Culture":"",
         "ExtendCookieValidity":true,
         "CookieValidityMinute":20,
         "Triggers":[
            {
               "TriggerParts":[
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"mojitest",
                     "ValuesToCompare":null,
                     "UrlPart":"PageUrl",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  }
               ],
               "LogicalOperator":"And"
            }
         ],
         "QueueDomain":"queueitknownusertst.test.queue-it.net",
         "RedirectLogic":"AllowTParameter",
         "ForcedTargetUrl":""
      },
      {
         "Name":"all pages",
         "ActionType":"Queue",
         "EventId":"disabled",
         "CookieDomain":"",
         "LayoutName":null,
         "Culture":"",
         "ExtendCookieValidity":true,
         "CookieValidityMinute":20,
         "Triggers":[
            {
               "TriggerParts":[
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"test02082018",
                     "ValuesToCompare":null,
                     "UrlPart":"PageUrl",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  }
               ],
               "LogicalOperator":"And"
            }
         ],
         "QueueDomain":"queueitknownusertst.test.queue-it.net",
         "RedirectLogic":"AllowTParameter",
         "ForcedTargetUrl":""
      },
      {
         "Name":"event1 ignore action (default)",
         "ActionType":"Ignore",
         "EventId":null,
         "CookieDomain":null,
         "LayoutName":null,
         "Culture":null,
         "ExtendCookieValidity":null,
         "CookieValidityMinute":0,
         "Triggers":[
            {
               "TriggerParts":[
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"ignore-queue-event1-nodomain",
                     "ValuesToCompare":null,
                     "UrlPart":"PageUrl",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  },
                  {
                     "Operator":"ContainsAny",
                     "ValueToCompare":"",
                     "ValuesToCompare":[
                        "ignore-this-queue-event1-nodomain",
                        "ignore-that-queue-event1-nodomain"
                     ],
                     "UrlPart":"PageUrl",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  },
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"*",
                     "ValuesToCompare":null,
                     "UrlPart":null,
                     "CookieName":"ignore-queue-event1",
                     "HttpHeaderName":null,
                     "ValidatorType":"CookieValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  },
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"ignore-queue-event1",
                     "ValuesToCompare":null,
                     "UrlPart":null,
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"RequestBodyValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  }
               ],
               "LogicalOperator":"Or"
            }
         ],
         "QueueDomain":null,
         "RedirectLogic":null,
         "ForcedTargetUrl":null
      },
      {
         "Name":"event1 queue action (default)",
         "ActionType":"Queue",
         "EventId":"event1",
         "CookieDomain":"",
         "LayoutName":"White Space",
         "Culture":"",
         "ExtendCookieValidity":true,
         "CookieValidityMinute":20,
         "Triggers":[
            {
               "TriggerParts":[
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"queue-event1-nodomain",
                     "ValuesToCompare":null,
                     "UrlPart":"PageUrl",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  },
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"bot",
                     "ValuesToCompare":null,
                     "UrlPart":null,
                     "CookieName":"Akamai-bot",
                     "HttpHeaderName":null,
                     "ValidatorType":"CookieValidator",
                     "IsNegative":true,
                     "IsIgnoreCase":true
                  },
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"bot",
                     "ValuesToCompare":null,
                     "UrlPart":null,
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UserAgentValidator",
                     "IsNegative":true,
                     "IsIgnoreCase":true
                  },
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"bot",
                     "ValuesToCompare":null,
                     "UrlPart":null,
                     "CookieName":null,
                     "HttpHeaderName":"Akamai-bot",
                     "ValidatorType":"HttpHeaderValidator",
                     "IsNegative":true,
                     "IsIgnoreCase":true
                  }
               ],
               "LogicalOperator":"And"
            }
         ],
         "QueueDomain":"queueitknownusertst.test.queue-it.net",
         "RedirectLogic":"AllowTParameter",
         "ForcedTargetUrl":""
      },
      {
         "Name":"event1 cancel action (default)",
         "ActionType":"Cancel",
         "EventId":"event1",
         "CookieDomain":"",
         "LayoutName":null,
         "Culture":null,
         "ExtendCookieValidity":null,
         "CookieValidityMinute":0,
         "Triggers":[
            {
               "TriggerParts":[
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"cancel-event1-nodomain",
                     "ValuesToCompare":null,
                     "UrlPart":"PageUrl",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  }
               ],
               "LogicalOperator":"And"
            }
         ],
         "QueueDomain":"queueitknownusertst.test.queue-it.net",
         "RedirectLogic":null,
         "ForcedTargetUrl":null
      },
      {
         "Name":"event1 ignore action (ticketania)",
         "ActionType":"Ignore",
         "EventId":null,
         "CookieDomain":null,
         "LayoutName":null,
         "Culture":null,
         "ExtendCookieValidity":null,
         "CookieValidityMinute":0,
         "Triggers":[
            {
               "TriggerParts":[
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"ignore-queue-event1",
                     "ValuesToCompare":null,
                     "UrlPart":"PageUrl",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  },
                  {
                     "Operator":"ContainsAny",
                     "ValueToCompare":"",
                     "ValuesToCompare":[
                        "ignore-that-queue-event1",
                        "ignore-this-queue-event1"
                     ],
                     "UrlPart":"PageUrl",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  }
               ],
               "LogicalOperator":"Or"
            }
         ],
         "QueueDomain":null,
         "RedirectLogic":null,
         "ForcedTargetUrl":null
      },
      {
         "Name":"event1 queue action (ticketania)",
         "ActionType":"Queue",
         "EventId":"event1",
         "CookieDomain":".ticketania.com",
         "LayoutName":"White Space",
         "Culture":"",
         "ExtendCookieValidity":true,
         "CookieValidityMinute":20,
         "Triggers":[
            {
               "TriggerParts":[
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"queue-event1",
                     "ValuesToCompare":null,
                     "UrlPart":"PageUrl",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  },
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"bot",
                     "ValuesToCompare":null,
                     "UrlPart":null,
                     "CookieName":"Akamai-bot",
                     "HttpHeaderName":null,
                     "ValidatorType":"CookieValidator",
                     "IsNegative":true,
                     "IsIgnoreCase":true
                  },
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"bot",
                     "ValuesToCompare":null,
                     "UrlPart":null,
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UserAgentValidator",
                     "IsNegative":true,
                     "IsIgnoreCase":true
                  },
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"bot",
                     "ValuesToCompare":null,
                     "UrlPart":null,
                     "CookieName":null,
                     "HttpHeaderName":"Akamai-bot",
                     "ValidatorType":"HttpHeaderValidator",
                     "IsNegative":true,
                     "IsIgnoreCase":true
                  },
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"ticketania",
                     "ValuesToCompare":null,
                     "UrlPart":"HostName",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  }
               ],
               "LogicalOperator":"And"
            }
         ],
         "QueueDomain":"queueitknownusertst.test.queue-it.net",
         "RedirectLogic":"AllowTParameter",
         "ForcedTargetUrl":""
      },
      {
         "Name":"event1 queue action (cloudflare)",
         "ActionType":"Queue",
         "EventId":"event1",
         "CookieDomain":".cloudflare-queue-it.com",
         "LayoutName":"White Space",
         "Culture":"",
         "ExtendCookieValidity":true,
         "CookieValidityMinute":20,
         "Triggers":[
            {
               "TriggerParts":[
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"queue-event1",
                     "ValuesToCompare":null,
                     "UrlPart":"PageUrl",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  },
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"bot",
                     "ValuesToCompare":null,
                     "UrlPart":null,
                     "CookieName":"Akamai-bot",
                     "HttpHeaderName":null,
                     "ValidatorType":"CookieValidator",
                     "IsNegative":true,
                     "IsIgnoreCase":true
                  },
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"bot",
                     "ValuesToCompare":null,
                     "UrlPart":null,
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UserAgentValidator",
                     "IsNegative":true,
                     "IsIgnoreCase":true
                  },
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"bot",
                     "ValuesToCompare":null,
                     "UrlPart":null,
                     "CookieName":null,
                     "HttpHeaderName":"Akamai-bot",
                     "ValidatorType":"HttpHeaderValidator",
                     "IsNegative":true,
                     "IsIgnoreCase":true
                  },
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"cloudflare-queue-it.com",
                     "ValuesToCompare":null,
                     "UrlPart":"HostName",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  }
               ],
               "LogicalOperator":"And"
            }
         ],
         "QueueDomain":"queueitknownusertst.test.queue-it.net",
         "RedirectLogic":"AllowTParameter",
         "ForcedTargetUrl":""
      },
      {
         "Name":"event1 queue action (akamai)",
         "ActionType":"Queue",
         "EventId":"event1",
         "CookieDomain":".hypequeue.com",
         "LayoutName":"White Space",
         "Culture":"",
         "ExtendCookieValidity":true,
         "CookieValidityMinute":20,
         "Triggers":[
            {
               "TriggerParts":[
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"queue-event1-nodomain",
                     "ValuesToCompare":null,
                     "UrlPart":"PageUrl",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  }
               ],
               "LogicalOperator":"And"
            },
            {
               "TriggerParts":[
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"queue-event1",
                     "ValuesToCompare":null,
                     "UrlPart":"PageUrl",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  },
                  {
                     "Operator":"Equals",
                     "ValueToCompare":"bot",
                     "ValuesToCompare":null,
                     "UrlPart":null,
                     "CookieName":"Akamai-bot",
                     "HttpHeaderName":null,
                     "ValidatorType":"CookieValidator",
                     "IsNegative":true,
                     "IsIgnoreCase":true
                  },
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"bot",
                     "ValuesToCompare":null,
                     "UrlPart":null,
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UserAgentValidator",
                     "IsNegative":true,
                     "IsIgnoreCase":true
                  },
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"bot",
                     "ValuesToCompare":null,
                     "UrlPart":null,
                     "CookieName":null,
                     "HttpHeaderName":"Akamai-bot",
                     "ValidatorType":"HttpHeaderValidator",
                     "IsNegative":true,
                     "IsIgnoreCase":true
                  },
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"hypequeue.com",
                     "ValuesToCompare":null,
                     "UrlPart":"HostName",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  }
               ],
               "LogicalOperator":"And"
            }
         ],
         "QueueDomain":"queueitknownusertst.test.queue-it.net",
         "RedirectLogic":"AllowTParameter",
         "ForcedTargetUrl":""
      },
      {
         "Name":"event1 cancel action (ticketania)",
         "ActionType":"Cancel",
         "EventId":"event1",
         "CookieDomain":".ticketania.com",
         "LayoutName":null,
         "Culture":null,
         "ExtendCookieValidity":null,
         "CookieValidityMinute":0,
         "Triggers":[
            {
               "TriggerParts":[
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"cancel-event1",
                     "ValuesToCompare":null,
                     "UrlPart":"PageUrl",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  },
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"ticketania",
                     "ValuesToCompare":null,
                     "UrlPart":"HostName",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  }
               ],
               "LogicalOperator":"And"
            }
         ],
         "QueueDomain":"queueitknownusertst.test.queue-it.net",
         "RedirectLogic":null,
         "ForcedTargetUrl":null
      },
      {
         "Name":"event1 cancel action (cloudflare)",
         "ActionType":"Cancel",
         "EventId":"event1",
         "CookieDomain":".cloudflare-queue-it.com",
         "LayoutName":null,
         "Culture":null,
         "ExtendCookieValidity":null,
         "CookieValidityMinute":0,
         "Triggers":[
            {
               "TriggerParts":[
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"cancel-event1",
                     "ValuesToCompare":null,
                     "UrlPart":"PageUrl",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  },
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"cloudflare-queue-it.com",
                     "ValuesToCompare":null,
                     "UrlPart":"HostName",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  }
               ],
               "LogicalOperator":"And"
            }
         ],
         "QueueDomain":"queueitknownusertst.test.queue-it.net",
         "RedirectLogic":null,
         "ForcedTargetUrl":null
      },
      {
         "Name":"event1 cancel action (akamai)",
         "ActionType":"Cancel",
         "EventId":"event1",
         "CookieDomain":".hypequeue.com",
         "LayoutName":null,
         "Culture":null,
         "ExtendCookieValidity":null,
         "CookieValidityMinute":0,
         "Triggers":[
            {
               "TriggerParts":[
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"cancel-event1",
                     "ValuesToCompare":null,
                     "UrlPart":"PageUrl",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  },
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"hypequeue.com",
                     "ValuesToCompare":null,
                     "UrlPart":"HostName",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  }
               ],
               "LogicalOperator":"And"
            }
         ],
         "QueueDomain":"queueitknownusertst.test.queue-it.net",
         "RedirectLogic":null,
         "ForcedTargetUrl":null
      },
      {
         "Name":"future queue action (default)",
         "ActionType":"Queue",
         "EventId":"future",
         "CookieDomain":"",
         "LayoutName":null,
         "Culture":"",
         "ExtendCookieValidity":true,
         "CookieValidityMinute":20,
         "Triggers":[
            {
               "TriggerParts":[
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"idle-future-nodomain",
                     "ValuesToCompare":null,
                     "UrlPart":"PageUrl",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  }
               ],
               "LogicalOperator":"And"
            }
         ],
         "QueueDomain":"queueitknownusertst.test.queue-it.net",
         "RedirectLogic":"AllowTParameter",
         "ForcedTargetUrl":""
      },
      {
         "Name":"future queue action (ticketania)",
         "ActionType":"Queue",
         "EventId":"future",
         "CookieDomain":".ticketania.com",
         "LayoutName":null,
         "Culture":"",
         "ExtendCookieValidity":true,
         "CookieValidityMinute":20,
         "Triggers":[
            {
               "TriggerParts":[
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"idle-future",
                     "ValuesToCompare":null,
                     "UrlPart":"PageUrl",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  },
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"ticketania",
                     "ValuesToCompare":null,
                     "UrlPart":"HostName",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  }
               ],
               "LogicalOperator":"And"
            }
         ],
         "QueueDomain":"queueitknownusertst.test.queue-it.net",
         "RedirectLogic":"AllowTParameter",
         "ForcedTargetUrl":""
      },
      {
         "Name":"future queue action (cloudflare)",
         "ActionType":"Queue",
         "EventId":"future",
         "CookieDomain":".cloudflare-queue-it.com",
         "LayoutName":null,
         "Culture":"",
         "ExtendCookieValidity":true,
         "CookieValidityMinute":20,
         "Triggers":[
            {
               "TriggerParts":[
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"idle-future",
                     "ValuesToCompare":null,
                     "UrlPart":"PageUrl",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  },
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"cloudflare-queue-it.com",
                     "ValuesToCompare":null,
                     "UrlPart":"HostName",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  }
               ],
               "LogicalOperator":"And"
            }
         ],
         "QueueDomain":"queueitknownusertst.test.queue-it.net",
         "RedirectLogic":"AllowTParameter",
         "ForcedTargetUrl":""
      },
      {
         "Name":"future queue action (akamai)",
         "ActionType":"Queue",
         "EventId":"future",
         "CookieDomain":".hypequeue.com",
         "LayoutName":null,
         "Culture":"",
         "ExtendCookieValidity":true,
         "CookieValidityMinute":20,
         "Triggers":[
            {
               "TriggerParts":[
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"idle-future",
                     "ValuesToCompare":null,
                     "UrlPart":"PageUrl",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  },
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"hypequeue.com",
                     "ValuesToCompare":null,
                     "UrlPart":"HostName",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  }
               ],
               "LogicalOperator":"And"
            }
         ],
         "QueueDomain":"queueitknownusertst.test.queue-it.net",
         "RedirectLogic":"AllowTParameter",
         "ForcedTargetUrl":""
      },
      {
         "Name":"disabled queue action (default)",
         "ActionType":"Queue",
         "EventId":"disabled",
         "CookieDomain":"",
         "LayoutName":null,
         "Culture":"",
         "ExtendCookieValidity":true,
         "CookieValidityMinute":20,
         "Triggers":[
            {
               "TriggerParts":[
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"queue-disabled-nodomain",
                     "ValuesToCompare":null,
                     "UrlPart":"PageUrl",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  }
               ],
               "LogicalOperator":"And"
            }
         ],
         "QueueDomain":"queueitknownusertst.test.queue-it.net",
         "RedirectLogic":"AllowTParameter",
         "ForcedTargetUrl":""
      },
      {
         "Name":"disabled [not extend cookie] queue action (default)",
         "ActionType":"Queue",
         "EventId":"disabled",
         "CookieDomain":"",
         "LayoutName":null,
         "Culture":"",
         "ExtendCookieValidity":false,
         "CookieValidityMinute":20,
         "Triggers":[
            {
               "TriggerParts":[
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"queue-disabled-notextendcookie-nodomain",
                     "ValuesToCompare":null,
                     "UrlPart":"PageUrl",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  }
               ],
               "LogicalOperator":"And"
            }
         ],
         "QueueDomain":"queueitknownusertst.test.queue-it.net",
         "RedirectLogic":"AllowTParameter",
         "ForcedTargetUrl":""
      },
      {
         "Name":"disabled queue action (ticketania)",
         "ActionType":"Queue",
         "EventId":"disabled",
         "CookieDomain":".ticketania.com",
         "LayoutName":null,
         "Culture":"",
         "ExtendCookieValidity":true,
         "CookieValidityMinute":20,
         "Triggers":[
            {
               "TriggerParts":[
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"queue-disabled",
                     "ValuesToCompare":null,
                     "UrlPart":"PageUrl",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  },
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"ticketania",
                     "ValuesToCompare":null,
                     "UrlPart":"HostName",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  }
               ],
               "LogicalOperator":"And"
            }
         ],
         "QueueDomain":"queueitknownusertst.test.queue-it.net",
         "RedirectLogic":"AllowTParameter",
         "ForcedTargetUrl":""
      },
      {
         "Name":"disabled queue action (cloudflare)",
         "ActionType":"Queue",
         "EventId":"disabled",
         "CookieDomain":".cloudflare-queue-it.com",
         "LayoutName":null,
         "Culture":"",
         "ExtendCookieValidity":true,
         "CookieValidityMinute":20,
         "Triggers":[
            {
               "TriggerParts":[
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"queue-disabled",
                     "ValuesToCompare":null,
                     "UrlPart":"PageUrl",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  },
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"cloudflare-queue-it.com",
                     "ValuesToCompare":null,
                     "UrlPart":"HostName",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  }
               ],
               "LogicalOperator":"And"
            }
         ],
         "QueueDomain":"queueitknownusertst.test.queue-it.net",
         "RedirectLogic":"AllowTParameter",
         "ForcedTargetUrl":""
      },
      {
         "Name":"disabled queue action (akamai)",
         "ActionType":"Queue",
         "EventId":"disabled",
         "CookieDomain":".hypequeue.com",
         "LayoutName":null,
         "Culture":"",
         "ExtendCookieValidity":true,
         "CookieValidityMinute":20,
         "Triggers":[
            {
               "TriggerParts":[
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"queue-disabled",
                     "ValuesToCompare":null,
                     "UrlPart":"PageUrl",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  },
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"hypequeue.com",
                     "ValuesToCompare":null,
                     "UrlPart":"HostName",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  }
               ],
               "LogicalOperator":"And"
            }
         ],
         "QueueDomain":"queueitknownusertst.test.queue-it.net",
         "RedirectLogic":"AllowTParameter",
         "ForcedTargetUrl":""
      },
      {
         "Name":"safetynet queue action (default)",
         "ActionType":"Queue",
         "EventId":"safetynet",
         "CookieDomain":"",
         "LayoutName":null,
         "Culture":"",
         "ExtendCookieValidity":true,
         "CookieValidityMinute":20,
         "Triggers":[
            {
               "TriggerParts":[
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"queue-safetynet-nodomain",
                     "ValuesToCompare":null,
                     "UrlPart":"PageUrl",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  }
               ],
               "LogicalOperator":"And"
            }
         ],
         "QueueDomain":"queueitknownusertst.test.queue-it.net",
         "RedirectLogic":"AllowTParameter",
         "ForcedTargetUrl":""
      },
      {
         "Name":"test02082018",
         "ActionType":"Queue",
         "EventId":"test02082018",
         "CookieDomain":"",
         "LayoutName":null,
         "Culture":"",
         "ExtendCookieValidity":false,
         "CookieValidityMinute":20,
         "Triggers":[
            {
               "TriggerParts":[
                  {
                     "Operator":"Contains",
                     "ValueToCompare":"test02082018",
                     "ValuesToCompare":null,
                     "UrlPart":"PageUrl",
                     "CookieName":null,
                     "HttpHeaderName":null,
                     "ValidatorType":"UrlValidator",
                     "IsNegative":false,
                     "IsIgnoreCase":true
                  }
               ],
               "LogicalOperator":"And"
            }
         ],
         "QueueDomain":"queueitknownusertst.test.queue-it.net",
         "RedirectLogic":"AllowTParameter",
         "ForcedTargetUrl":""
      }
   ],
   "CustomerId":"queueitknownusertst",
   "AccountId":"queueit-mosa",
   "Version":55,
   "PublishDate":"2021-05-25T08:43:43.3277603Z",
   "ConfigDataVersion":"1.0.0.3"
}`;
        const handler = new CustomerIntegrationDecodingHandler();
        const customerIntegrationDecodingHandler = new JSONDecoder<CustomerIntegrationDecodingHandler>(handler);

        customerIntegrationDecodingHandler.deserialize(Uint8Array.wrap(String.UTF8.encode(integrationConfigString)));
        const customerIntegrationInfo: IntegrationModels.CustomerIntegration = handler.value();

        expect(customerIntegrationInfo.Version).toBe(55);
        expect(customerIntegrationInfo.Description).toBe("tst", 'Description should be deserialized');
        expect(customerIntegrationInfo.Integrations.length).toBe(23);
        expect(customerIntegrationInfo.Integrations[0].Name).toBe("mojitest");
        expect(customerIntegrationInfo.Integrations[1].Name).toBe("all pages");
        let triggerModel = customerIntegrationInfo.Integrations[0].Triggers[0];
        expect(triggerModel.LogicalOperator).toBe("And");
        expect(triggerModel.TriggerParts[0].ValueToCompare).toBe("mojitest");
        expect(triggerModel.TriggerParts[0].IsNegative).toBe(false);
        expect(triggerModel.TriggerParts[0].IsIgnoreCase).toBe(true);

        triggerModel = customerIntegrationInfo.Integrations[1].Triggers[0];
        expect(triggerModel.TriggerParts[0].ValueToCompare).toBe('test02082018');

        triggerModel = customerIntegrationInfo.Integrations[2].Triggers[0];
        expect(triggerModel.TriggerParts[1].ValuesToCompare.length).toBe(2);
        expect(triggerModel.TriggerParts[1].ValuesToCompare[0]).toBe('ignore-this-queue-event1-nodomain');
        expect(triggerModel.TriggerParts[1].ValuesToCompare[1]).toBe('ignore-that-queue-event1-nodomain');
    });
})
