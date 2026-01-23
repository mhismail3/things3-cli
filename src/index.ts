#!/usr/bin/env bun
/**
 * Things 3 CLI Entry Point
 */

import { program } from './cli';

program.parse(process.argv);
