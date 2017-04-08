# Change log
This is the changelog for [OpenAPI Factory](readme.md).

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