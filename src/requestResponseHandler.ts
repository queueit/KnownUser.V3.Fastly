import { KnownUser } from "@queue-it/connector-javascript";
import { QueueITHelper } from "./helper";
import { FastlyHttpContextProvider, getHttpHandler } from "./contextProvider";
import {
  getIntegrationConfig,
  resolveIntegrationDetails,
  IntegrationDetails,
  QueueItIntegrationEndpointProvider,
} from "./integrationConfigProvider";

function getParameterByName(url: string, name: string): string {
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
  const results = regex.exec(url);
  if (!results) return '';
  if (!results[2]) return '';
  return results[2].replace(/\+/g, ' ');
}

function removeQueueItToken(url: string): string {
  const pattern = new RegExp("([?&])(" + KnownUser.QueueITTokenKey + "=[^&]*)", 'gi');
  const match = pattern.exec(url);
  if (match === null) return url;
  url = url.replaceAll(match[0], '');
  return url;
}

function addNoCacheHeaders(res: Response): void {
  res.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.headers.set('Pragma', 'no-cache');
  res.headers.set('Expires', 'Fri, 01 Jan 1990 00:00:00 GMT');
}

const QUEUEIT_FAILED_HEADERNAME = "x-queueit-failed";
let httpProvider: FastlyHttpContextProvider | null = null;

export async function onQueueITRequest(
  req: Request,
  conf: IntegrationDetails | null = null
): Promise<Response | null> {
  if (conf == null) {
    conf = resolveIntegrationDetails();
  }
  if (conf == null) {
    return new Response("No integration details found.", {
      headers: new Headers(),
      status: 404,
    });
  }

  const integrationProvider =
    conf.provider == null
      ? new QueueItIntegrationEndpointProvider()
      : conf.provider;
  httpProvider = getHttpHandler(req);

  let integrationConfigJson = await getIntegrationConfig(conf, integrationProvider);
  const requestUrl: string = conf.resolveWorkerRequestUrl(req.url);

  const queueItToken = getParameterByName(requestUrl, KnownUser.QueueITTokenKey);
  const requestUrlWithoutToken: string = removeQueueItToken(requestUrl);

  // The requestUrlWithoutToken is used to match Triggers and as the Target url (where to return the users to).
  // It is therefor important that this is exactly the url of the users browsers. So, if your webserver is
  // behind e.g. a load balancer that modifies the host name or port, reformat requestUrlWithoutToken before proceeding.
  try {
    const validationResult = await KnownUser.validateRequestByIntegrationConfig(
      requestUrlWithoutToken,
      queueItToken,
      integrationConfigJson,
      conf.customerId,
      conf.secretKey,
      httpProvider!
    );

    if (validationResult.doRedirect()) {
      if (validationResult.isAjaxResult) {
        let response = new Response(null, {
          status: 200,
          headers: httpProvider!.getResponseHeaders(),
        });
        // In case of ajax call send the user to the queue by sending a custom queue-it header and redirecting user to queue from javascript
        response.headers.set("Access-Control-Expose-Headers", validationResult.getAjaxQueueRedirectHeaderKey());
        response.headers.set(
          validationResult.getAjaxQueueRedirectHeaderKey(),
          QueueITHelper.addKUPlatformVersion(
            validationResult.getAjaxRedirectUrl()
          )
        );
        addNoCacheHeaders(response);
        return response;
      } else {
        let response = new Response(null, {
          status: 302,
          headers: httpProvider!.getResponseHeaders(),
        });
        // Send the user to the queue - either because hash was missing or because is was invalid
        response.headers.set(
          "Location",
          QueueITHelper.addKUPlatformVersion(validationResult.redirectUrl)
        );
        addNoCacheHeaders(response);
        return response;
      }
    } else {
      // Request can continue - we remove queueittoken from querystring parameter to avoid sharing of user specific token
      // Support mobile scenario adding the condition !validationResult.isAjaxResult
      if (
        queueItToken != "" &&
        !validationResult.isAjaxResult &&
        validationResult.actionType == "Queue"
      ) {
        let response = new Response(null, {
          status: 302,
          headers: httpProvider!.getResponseHeaders(),
        });
        response.headers.set("Location", requestUrlWithoutToken);
        addNoCacheHeaders(response);
        return response;
      } else {
        // lets caller decide the next step, or just serve the request normally
        return null;
      }
    }
  } catch {
    httpProvider!.isError = true;
  }

  return null;
}

//Fill in the Queue-it headers
export function onQueueITResponse(res: Response): void {
  const contextHeaders = httpProvider!.getResponseHeaders();

  if (httpProvider!.isError) {
    res.headers.append(QUEUEIT_FAILED_HEADERNAME, "true");
  }
  for (const key of contextHeaders.keys()) {
    if (key.length == 0) continue;
    const value = contextHeaders.get(key);
    if (value != null && value.length > 0)
      res.headers.append(key, value);
  }
}
