# Artifactory NPMRC Setup

it can be a little hard to setup npmrc with artifactory (especially when
using SSO)

this app allows you to setup npmrc (with scopes if required) with an
interactive interface for login.

## Options
| name | required | default | description |
| ---- | -------- | ------- | ----------- |
| server | true |    | artifactory server to connect to |
| scopes / s | false |   | scopes to setup for artifactory on the local machine, if not set the specified artifactory server will be set as your main NPM registry |
| api-key / a | false |  | set an API key to use for login (useful if you require a non interactive login) |
| api-username / u | false | | required if api-key is set, the username for the user the api key belongs to |
| no-keep-existing | false | false | dont keep existing npmrc lines, only write new artifactory lines (defaults to keeping existing npmrc lines, commenting out matching scopes) |
| npmrc-path / p | false | ~/.npmrc | path to the npmrc file to replace/update (defaults to .npmrc in home directory) |
| no-interactive | | skip loading all interactive elements (for use in CI), you must supply a valid api-key to use this option |
| help / h | false | | show help text |
