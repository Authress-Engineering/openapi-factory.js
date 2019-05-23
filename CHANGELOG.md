# Change log
This is the changelog for [OpenAPI Factory](readme.md).

## 4.4 ##
* Provide a way to override the DefaultPathResolver

## 4.3 ##
* Return `null` bodies when body is not specified rather than defaulting `{}`
* Provide the `rawBody` options parameter to keep the original body with the request instead of converting to JSON.

## 4.2 ##
* Include middleware for requests and responses
* Always fallback to event handling when neither API or schedule is triggered.
* When a path token is not specified the value of that token is `null`.

## 4.1 ##
* Optimize code to use es6 classes

## 4.0 ##
* Now comes with the `async` handler, feel free to await all the calls.
* Default
```json
    {
        "Content-Type": "application/link+json",
        "Access-Control-Allow-Origin": "*"
    }
```
## 3.2 ##
* Prevent registration of duplicate paths

## 3.1 ##
* Provide defaults for event parameters in the path, query, stage, and headers well not specified.
* Added two new triggers `onEvent` and `onSchedule` which will get triggered via the appropriate mechanisms.

## 3.0 ##
* Change AWS authorizer type to REQUEST from TOKEN.
* Improve logging for request failures.

## 2.2 ##
* paths can be specified at the top level instead of needing to put the paths in '{/proxy+}'.

## 2.1 ##
* Binary data can now be sent as a buffer.

## 2.0 ##
* Support new API Gateway format.
* Set default AuthorizerPolicy with promises.

## 1.1 ##
* Convert to using singlu function to Lambda Functions will work with the API without class instantiation.
* Add VPC Security Group and Subnet options.
* Remove reference to configuration (moved to deployment configuration instead of API configuration).

## 1.0 ##
* Created npm library for building apis.
* Pull api method and resource from AWS context.
* Standardize names of ResourcePath, and Method