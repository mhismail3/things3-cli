/**
 * Test utilities for Things 3 CLI tests
 */

import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'bun:sqlite';

/**
 * Create a temporary directory for tests
 */
export function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), 'things3-test-'));
}

/**
 * Clean up a temporary directory
 */
export function cleanupTempDir(path: string): void {
  if (existsSync(path)) {
    rmSync(path, { recursive: true, force: true });
  }
}

/**
 * Create an in-memory database for tests
 */
export function createTestDatabase(): Database {
  return new Database(':memory:');
}

/**
 * Capture stdout/stderr output during function execution
 */
export function captureOutput(fn: () => void): { stdout: string; stderr: string } {
  const originalStdout = process.stdout.write.bind(process.stdout);
  const originalStderr = process.stderr.write.bind(process.stderr);

  let stdout = '';
  let stderr = '';

  process.stdout.write = (chunk: string | Uint8Array): boolean => {
    stdout += chunk.toString();
    return true;
  };

  process.stderr.write = (chunk: string | Uint8Array): boolean => {
    stderr += chunk.toString();
    return true;
  };

  try {
    fn();
  } finally {
    process.stdout.write = originalStdout;
    process.stderr.write = originalStderr;
  }

  return { stdout, stderr };
}

/**
 * Capture async output
 */
export async function captureOutputAsync(fn: () => Promise<void>): Promise<{ stdout: string; stderr: string }> {
  const originalStdout = process.stdout.write.bind(process.stdout);
  const originalStderr = process.stderr.write.bind(process.stderr);

  let stdout = '';
  let stderr = '';

  process.stdout.write = (chunk: string | Uint8Array): boolean => {
    stdout += chunk.toString();
    return true;
  };

  process.stderr.write = (chunk: string | Uint8Array): boolean => {
    stderr += chunk.toString();
    return true;
  };

  try {
    await fn();
  } finally {
    process.stdout.write = originalStdout;
    process.stderr.write = originalStderr;
  }

  return { stdout, stderr };
}

/**
 * Mock exec responses for AppleScript/URL tests
 */
type ExecMockResponse = {
  stdout?: string;
  stderr?: string;
  error?: Error;
};

let execMockResponses: Map<string, ExecMockResponse> = new Map();
let execMockEnabled = false;
let execCalls: string[] = [];

export function mockExec(responses: Map<string, ExecMockResponse>): void {
  execMockResponses = responses;
  execMockEnabled = true;
  execCalls = [];
}

export function resetExecMock(): void {
  execMockResponses.clear();
  execMockEnabled = false;
  execCalls = [];
}

export function isExecMocked(): boolean {
  return execMockEnabled;
}

export function getExecMockResponse(command: string): ExecMockResponse | undefined {
  // Check for exact match first
  if (execMockResponses.has(command)) {
    execCalls.push(command);
    return execMockResponses.get(command);
  }
  // Check for partial matches
  for (const [key, value] of execMockResponses) {
    if (command.includes(key)) {
      execCalls.push(command);
      return value;
    }
  }
  execCalls.push(command);
  return undefined;
}

export function getExecCalls(): string[] {
  return [...execCalls];
}

/**
 * Create a mock file system structure in a temp directory
 */
export function mockFs(baseDir: string, files: Map<string, string>): void {
  for (const [path, content] of files) {
    const fullPath = join(baseDir, path);
    const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(fullPath, content);
  }
}

/**
 * Wait for a condition to be true with timeout
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 50
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error(`waitFor timeout after ${timeout}ms`);
}

/**
 * Create sample Things items for testing
 */
export function createSampleTodo(overrides: Partial<import('../src/types/things').ThingsTodo> = {}): import('../src/types/things').ThingsTodo {
  return {
    id: 'test-todo-1',
    type: 'to-do',
    title: 'Test Todo',
    status: 'open',
    creationDate: '2024-01-01T00:00:00Z',
    modificationDate: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createSampleProject(overrides: Partial<import('../src/types/things').ThingsProject> = {}): import('../src/types/things').ThingsProject {
  return {
    id: 'test-project-1',
    type: 'project',
    title: 'Test Project',
    status: 'open',
    creationDate: '2024-01-01T00:00:00Z',
    modificationDate: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Assert helpers
 */
export function assertContains(str: string, substring: string, message?: string): void {
  if (!str.includes(substring)) {
    throw new Error(message ?? `Expected "${str}" to contain "${substring}"`);
  }
}

export function assertNotContains(str: string, substring: string, message?: string): void {
  if (str.includes(substring)) {
    throw new Error(message ?? `Expected "${str}" not to contain "${substring}"`);
  }
}
