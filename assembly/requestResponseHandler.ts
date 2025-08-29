import { Request, Response, Headers } from "@fastly/as-compute";
import { KnownUser } from "./sdk/KnownUser";
import { QueueITHelper } from "./helper";
import { FastlyHttpContextProvider, getHttpHandler } from "./contextProvider";
import {
  getIntegrationConfig,
  resolveIntegrationDetails,
  IntegrationDetails,
  QueueItIntegrationEndpointProvider,
} from "./integrationConfigProvider";
import { Utils } from "./sdk/QueueITHelpers";

const QUEUEIT_FAILED_HEADERNAME = "x-queueit-failed";
let httpProvider: FastlyHttpContextProvider | null = null;

export function onQueueITRequest(
  req: Request,
  conf: IntegrationDetails | null = null
): Response | null {
  if (conf == null) {
    conf = resolveIntegrationDetails();
  }
  if (conf == null) {
    return new Response(String.UTF8.encode("No integration details found."), {
      headers: new Headers(),
      status: 404,
      url: "",
    });
  }

  const integrationProvider =
    conf.provider == null
      ? new QueueItIntegrationEndpointProvider()
      : conf.provider;
  QueueITHelper.configureKnownUserHashing();
  httpProvider = getHttpHandler(req);

  let integrationConfigJson = getIntegrationConfig(conf, integrationProvider);
  const requestUrl: string = conf.resolveWorkerRequestUrl(req.url);

  const queueItToken = Utils.getParameterByName(
    requestUrl,
    KnownUser.QueueITTokenKey
  );
  const requestUrlWithoutToken: string = Utils.removeQueueItToken(requestUrl);

  // The requestUrlWithoutToken is used to match Triggers and as the Target url (where to return the users to).
  // It is therefor important that this is exactly the url of the users browsers. So, if your webserver is
  // behind e.g. a load balancer that modifies the host name or port, reformat requestUrlWithoutToken before proceeding.
  const validationResultPair = KnownUser.validateRequestByIntegrationConfig(
    requestUrlWithoutToken,
    queueItToken,
    integrationConfigJson,
    conf.customerId,
    conf.secretKey,
    httpProvider!
  );

  if (
    validationResultPair.first != null &&
    validationResultPair.first!.doRedirect()
  ) {
    const validationResult = validationResultPair.first!;

    if (validationResult.isAjaxResult) {
      let response = new Response(null, {
        status: 200,
        headers: httpProvider!.getHttpResponse().getHeaders(),
        url: "",
      });
      // In case of ajax call send the user to the queue by sending a custom queue-it header and redirecting user to queue from javascript
      response.headers.set("Access-Control-Expose-Headers", validationResult.getAjaxQueueRedirectHeaderKey());
      response.headers.set(
        validationResult.getAjaxQueueRedirectHeaderKey(),
        QueueITHelper.addKUPlatformVersion(
          validationResult.getAjaxRedirectUrl()
        )
      );
      Utils.addNoCacheHeaders(response);
      return response;
    } else {
      let response = new Response(null, {
        status: 302,
        headers: httpProvider!.getHttpResponse().getHeaders(),
        url: "",
      });
      // Send the user to the queue - either because hash was missing or because is was invalid
      response.headers.set(
        "Location",
        QueueITHelper.addKUPlatformVersion(validationResult.redirectUrl)
      );
      Utils.addNoCacheHeaders(response);
      return response;
    }
  } else if (validationResultPair.first != null) {
    const validationResult = validationResultPair.first!;
    // Request can continue - we remove queueittoken form querystring parameter to avoid sharing of user specific token
    // Support mobile scenario adding the condition !validationResult.isAjaxResult
    if (
      queueItToken != "" &&
      !validationResult.isAjaxResult &&
      validationResult.actionType == "Queue"
    ) {
      let response = new Response(null, {
        status: 302,
        headers: httpProvider!.getHttpResponse().getHeaders(),
        url: requestUrlWithoutToken,
      });
      response.headers.set("Location", requestUrlWithoutToken);
      Utils.addNoCacheHeaders(response);
      return response;
    } else {
      // lets caller decide the next step, or just serve the request normally
      return null;
    }
  } else if (validationResultPair.second != null) {
    httpProvider!.isError = true;
  }

  return null;
}

//Fill in the Queue-it headers
export function onQueueITResponse(res: Response): void {
  const contextHeaders = httpProvider!.getHttpResponse().getHeaders();
  const contextHeaderKeys = contextHeaders.keys();

  if (httpProvider!.isError) {
    res.headers.append(QUEUEIT_FAILED_HEADERNAME, "true");
  }
  for (let i = 0; i < contextHeaderKeys.length; i++) {
    if (contextHeaderKeys[i].length == 0) continue;
    let value = contextHeaders.get(contextHeaderKeys[i]);
    if (value != null && value!.length > 0)
      res.headers.append(contextHeaderKeys[i], value!);
  }
}
