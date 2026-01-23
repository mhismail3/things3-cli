/**
 * Query Command
 *
 * Query items from Things 3.
 */

import {
  queryList,
  queryByTag,
  queryProject,
  queryArea,
  getAllProjects,
  getAllAreas,
  getAllTags,
  queryById,
  queryDeadlines,
  queryRepeating,
} from '../core/applescript';
import type { ThingsItem, ThingsListId } from '../types/things';

export interface QueryOptions {
  list?: ThingsListId;
  tag?: string;
  project?: string;
  area?: string;
  id?: string;
  all?: boolean;
  projects?: boolean;
  areas?: boolean;
  tags?: boolean;
  deadlines?: boolean;
  repeating?: boolean;
  json?: boolean;
}

export interface QueryResult {
  success: boolean;
  items: ThingsItem[];
  count: number;
  filter?: string;
  error?: string;
}

export interface TagQueryResult {
  success: boolean;
  tags: { id: string; name: string; parentId?: string }[];
  count: number;
  error?: string;
}

/**
 * Query items from Things
 */
export async function queryCommand(options: QueryOptions): Promise<QueryResult | TagQueryResult> {
  try {
    // Special case: query by ID returns single item
    if (options.id) {
      const item = await queryById(options.id);
      if (item) {
        return {
          success: true,
          items: [item],
          count: 1,
          filter: `id:${options.id}`,
        };
      }
      return {
        success: false,
        items: [],
        count: 0,
        filter: `id:${options.id}`,
        error: `Item not found: ${options.id}`,
      };
    }

    // Special case: query all tags
    if (options.tags) {
      const tags = await getAllTags();
      return {
        success: true,
        tags,
        count: tags.length,
      } as TagQueryResult;
    }

    let items: ThingsItem[] = [];
    let filter: string | undefined;

    if (options.list) {
      items = await queryList(options.list);
      filter = `list:${options.list}`;
    } else if (options.tag) {
      items = await queryByTag(options.tag);
      filter = `tag:${options.tag}`;
    } else if (options.project) {
      items = await queryProject(options.project);
      filter = `project:${options.project}`;
    } else if (options.area) {
      items = await queryArea(options.area);
      filter = `area:${options.area}`;
    } else if (options.projects) {
      items = await getAllProjects();
      filter = 'all projects';
    } else if (options.areas) {
      items = await getAllAreas();
      filter = 'all areas';
    } else if (options.deadlines) {
      items = await queryDeadlines();
      filter = 'items with deadlines';
    } else if (options.repeating) {
      items = await queryRepeating();
      filter = 'repeating items';
    } else {
      // Default to today
      items = await queryList('today');
      filter = 'list:today';
    }

    return {
      success: true,
      items,
      count: items.length,
      filter,
    };
  } catch (error) {
    return {
      success: false,
      items: [],
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
