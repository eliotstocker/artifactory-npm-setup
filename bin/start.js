#!/usr/bin/env node

const exec = require('child_process').exec;
const path = require('path');

const args = process.argv;
if(args.includes('--no-interactive')) {
    console.log('starting in non interactive mode... (you probably dont want this if you\'re not setting up CI)');
    return require('../ci');
}

const SEPARATOR = process.platform === "win32" ? ";" : ":",
    env = Object.assign({}, process.env);

env.PATH = path.resolve(__dirname, '../node_modules/.bin') + SEPARATOR + env.PATH;

function runCommand(cmd) {
    const proc = exec(cmd, {
        cwd: process.cwd(),
        env: env
    });

    proc.stdout.pipe(process.stdout);
    proc.stderr.pipe(process.stderr);

    proc.on('exit', code => {
        process.exitCode = code;
    })
}


args.splice(0, 2);

runCommand(`electron ${path.resolve(__dirname, '../index.js')} ${args.join(' ')}`);
