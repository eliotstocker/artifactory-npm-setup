'use strict';

module.exports = [
    {
        name: 'server',
        defaultOption: true,
        type: String,
        description: 'artifactory server to connect to'
    },
    {
        name: 'scopes',
        alias: 's',
        type: String,
        description: '[Optional] scopes to setup for artifactory on the local machine, if not set the specified artifactory server will be set as your main NPM registry',
        multiple: true
    },
    {
        name: 'api-key',
        alias: 'a',
        type: String,
        description: '[Optional] set an API key to use for login (useful if you require a non interactive login)'
    },
    {
        name: 'api-username',
        alias: 'u',
        type: String,
        description: '[Optional] required if api-key is set, the username for the user the api key belongs to'
    },
    {
        name: 'no-keep-existing',
        type: Boolean,
        description: '[Optional] dont keep existing npmrc lines, only write new artifactory lines (defaults to keeping existing npmrc lines, commenting out matching scopes)'
    },
    {
        name: 'skip-backup',
        type: Boolean,
        description: '[Optional] skip creating a backup of existing npmrc files at the same path as specified by the npmrc-path option (defaults to keeping backup)'
    },
    {
        name: 'npmrc-path',
        alias: 'p',
        type: String,
        description: '[Optional] path to the npmrc file to replace/update (defaults to .npmrc in home directory)'
    },
    {
        name: 'no-interactive',
        type: Boolean,
        description: '[Optional] disable electron interactive shell (for user login etc), must be used in conjunction with api-key and api-username'
    },
    {
        name: 'help',
        alias: 'h',
        type: Boolean,
        description: 'show this help text'
    }
];
