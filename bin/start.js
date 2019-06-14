#!/usr/bin/env node

const exec = require('child_process').exec;
const path = require('path');

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
}

const args = process.argv;
args.splice(0, 2);

runCommand(`electron ${path.resolve(__dirname, '../')} ${args.join(' ')}`);
