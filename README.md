# KnownUser.V3.Fastly

Before getting started please read the [documentation](https://github.com/queueit/Documentation/tree/main/edge-connectors) to get acquainted with edge connectors.

This Fastly Queue-it Connector (aka, Queue-it's server-side KnownUser connector) uses a Compute@Edge service to
integrate Queue-it's functionality into Fastly's network.

A Wasm service is required to utilize this connector.

> You can find the latest released version [here](https://github.com/queueit/KnownUser.V3.Fastly/releases/latest).

## Installation

There are two methods of installation:

### As a standalone service

- Go to the Fastly services page and create a new **Wasm** service.
- Go to Domains and fill in the domain that you want your service to be reachable at. You may need to register a CNAME
  record if you have your own domain.
- Then click on *Origins* and add a new host that has the hostname of your origin server.  
  You need to edit the Host and name it **origin**.
- Create a second host that has the hostname of `{yourCustomerId}.queue-it.net` and name it **queue-it**.  
  Edit the host, go to advanced options and fill in the same hostname in **Override host**
- Go to **Dictionaries** and create a new dictionary named `IntegrationConfiguration`.  
  Add the following items in the dictionary:
    - customerId: Your customer ID
    - apiKey: The API key for your account
    - secret: Your KnownUserV3 secret
    - queueItOrigin: The name of the queue-it host, in this case it's `queue-it`  
      You can find these values in the Go Queue-It self-service platform.
- Download the latest package from the releases page and unarchive it.
- Edit the `fastly.toml` file and copy the ID of your service (you can see this by opening up the service in Fastly) and
  replace __{YourServiceId}__ with it.
- Archive the directory in the same format (tar.gz).
- Go to `Package` in the Fastly service page and upload the package.
- To finish up and deploy your service click on the **Activate** button.

### Customizable service with the connector

- Go to the Fastly services page and create a new **Wasm** service and copy it's ID.
- Clone this repository and edit the fastly.toml file, make sure to set the `service_id` field to the ID you copied.
- Then click on *Origins* and add a new host that has the hostname of your origin server.   
  You can name the host **origin** or whatever you choose.
- Create a host that has the hostname of `{yourCustomerId}.queue-it.net` and name it **queue-it**.    
  Edit the host, go to advanced options and fill in the same hostname in **Override host**
- Open up the service in Fastly and go to **Dictionaries** and create a new dictionary named `IntegrationConfiguration`
  .  
  Add the following items in the dictionary:
    - customerId: Your customer ID
    - apiKey: The API key for your account
    - secret: Your KnownUserV3 secret
    - queueItOrigin: The name of the queue-it origin, in this case it's `queue-it`  
      You can find these values in the Go Queue-It self-service platform.
- You need to add some code that uses this connector. Here is an example:

```ts
import {Fastly} from "@fastly/as-compute";
import {onQueueITRequest, IntegrationDetails, onQueueITResponse} from "@queue-it/fastly";

const req = Fastly.getClientRequest();

// This is optional and can be null if it's specified in your Dictionary
const integrationDetails = new IntegrationDetails(
        "QueueItOriginName",
        "CustomerId",
        "SecretKey",
        "ApiKey");
let res = onQueueITRequest(req, integrationDetails);

if (res != null) {
    Fastly.respondWith(res!);
} else {
    const myOrigin = 'Ticketania';
    const cacheOverride = new Fastly.CacheOverride();
    const res = Fastly.fetch(req, {
        backend: myOrigin,
        cacheOverride,
    }).wait();
    onQueueITResponse(res);
    Fastly.respondWith(res);
} 
```

- Build and deploy the package running `fastly compute build` and `fastly compute deploy` in the same directory.
- Create desired waiting room(s), triggers, and actions in the Go Queue-It self-service platform.  
  Then, save/publish the configuration.
