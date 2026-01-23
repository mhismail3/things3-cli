/**
 * Things Client Service
 *
 * High-level client for interacting with Things 3 via URL scheme.
 */

import {
  buildAddTodoUrl,
  buildAddProjectUrl,
  buildUpdateUrl,
  buildUpdateProjectUrl,
  buildShowUrl,
  buildSearchUrl,
  buildJsonUrl,
  buildCompleteUrl,
  buildCancelUrl,
} from '../core/url-builder';
import { executeUrl, ExecutionResult } from '../core/url-executor';
import type {
  AddTodoParams,
  AddProjectParams,
  UpdateTodoParams,
  UpdateProjectParams,
  ShowParams,
} from '../types/things';

export interface ThingsClientOptions {
  dryRun?: boolean;
  authToken?: string;
}

export class ThingsClient {
  private authToken: string | undefined;
  private dryRun: boolean;

  constructor(options: ThingsClientOptions = {}) {
    this.dryRun = options.dryRun ?? false;
    this.authToken = options.authToken;
  }

  /**
   * Check if client is in dry run mode
   */
  isDryRun(): boolean {
    return this.dryRun;
  }

  /**
   * Set the auth token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Execute a Things URL
   */
  private async execute(url: string): Promise<ExecutionResult> {
    return executeUrl(url, { dryRun: this.dryRun });
  }

  /**
   * Check if auth token is available
   */
  private requireAuth(): ExecutionResult | null {
    if (!this.authToken) {
      return {
        success: false,
        url: '',
        error: 'Authentication required. Run "things3 auth setup" to configure your auth token.',
      };
    }
    return null;
  }

  /**
   * Add a new to-do
   */
  async addTodo(params: AddTodoParams): Promise<ExecutionResult> {
    const url = buildAddTodoUrl(params);
    return this.execute(url);
  }

  /**
   * Add a new project
   */
  async addProject(params: AddProjectParams): Promise<ExecutionResult> {
    const url = buildAddProjectUrl(params);
    return this.execute(url);
  }

  /**
   * Update an existing to-do
   */
  async updateTodo(params: UpdateTodoParams): Promise<ExecutionResult> {
    const authError = this.requireAuth();
    if (authError) return authError;

    const url = buildUpdateUrl(params, this.authToken!);
    return this.execute(url);
  }

  /**
   * Update an existing project
   */
  async updateProject(params: UpdateProjectParams): Promise<ExecutionResult> {
    const authError = this.requireAuth();
    if (authError) return authError;

    const url = buildUpdateProjectUrl(params, this.authToken!);
    return this.execute(url);
  }

  /**
   * Mark a to-do as complete
   */
  async completeTodo(id: string): Promise<ExecutionResult> {
    const authError = this.requireAuth();
    if (authError) return authError;

    const url = buildCompleteUrl(id, this.authToken!);
    return this.execute(url);
  }

  /**
   * Mark a to-do as canceled
   */
  async cancelTodo(id: string): Promise<ExecutionResult> {
    const authError = this.requireAuth();
    if (authError) return authError;

    const url = buildCancelUrl(id, this.authToken!);
    return this.execute(url);
  }

  /**
   * Show a list or item in Things
   */
  async show(params: ShowParams): Promise<ExecutionResult> {
    const url = buildShowUrl(params);
    return this.execute(url);
  }

  /**
   * Open Things search with a query
   */
  async search(query: string): Promise<ExecutionResult> {
    const url = buildSearchUrl({ query });
    return this.execute(url);
  }

  /**
   * Execute a bulk JSON operation
   */
  async executeJson(data: object[], revealOnAdd?: boolean): Promise<ExecutionResult> {
    const authError = this.requireAuth();
    if (authError) return authError;

    const url = buildJsonUrl({
      data,
      authToken: this.authToken!,
      revealOnAdd,
    });
    return this.execute(url);
  }
}

/**
 * Create a Things client with optional configuration
 */
export function createThingsClient(options: ThingsClientOptions = {}): ThingsClient {
  return new ThingsClient(options);
}
