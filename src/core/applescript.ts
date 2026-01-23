/**
 * AppleScript Queries
 *
 * Executes AppleScript to query Things 3 for data that isn't available
 * through the URL scheme (which is write-only).
 */

import type { ThingsTodo, ThingsProject, ThingsArea, ThingsListId, ThingsItem, ThingsHeading, ThingsChecklistItem } from '../types/things';

/**
 * Custom error for AppleScript failures
 */
export class AppleScriptError extends Error {
  public readonly script?: string;

  constructor(message: string, script?: string) {
    super(message);
    this.name = 'AppleScriptError';
    this.script = script;
  }
}

/**
 * Build an AppleScript command for Things 3
 */
export function buildAppleScript(body: string): string {
  return `tell application "Things3"
${body}
end tell`;
}

/**
 * Execute an AppleScript and return the result
 */
async function runAppleScript(script: string): Promise<string> {
  try {
    const proc = Bun.spawn(['osascript', '-e', script], {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      throw new AppleScriptError(stderr.trim() || 'AppleScript execution failed', script);
    }

    const stdout = await new Response(proc.stdout).text();
    return stdout.trim();
  } catch (error) {
    if (error instanceof AppleScriptError) throw error;
    throw new AppleScriptError(
      error instanceof Error ? error.message : 'Unknown error',
      script
    );
  }
}

/**
 * Get the Things 3 version
 */
export async function getThingsVersion(): Promise<string | null> {
  try {
    const script = buildAppleScript('get version');
    const result = await runAppleScript(script);
    return result || null;
  } catch {
    return null;
  }
}

/**
 * Query items from a Things list with full details
 */
export async function queryList(listId: ThingsListId): Promise<ThingsTodo[]> {
  const validLists = ['inbox', 'today', 'anytime', 'upcoming', 'someday', 'logbook', 'trash'];
  if (!validLists.includes(listId)) {
    throw new AppleScriptError(`Invalid list: ${listId}`);
  }

  const script = buildAppleScript(`
    set output to ""
    set todoList to to dos of list "${listId}"
    repeat with t in todoList
      set tid to id of t
      set tname to name of t
      set tstatus to status of t
      set tnotes to notes of t
      try
        set twhen to activation date of t as string
      on error
        set twhen to ""
      end try
      try
        set tdeadline to due date of t as string
      on error
        set tdeadline to ""
      end try
      try
        set ttags to ""
        repeat with tg in tags of t
          set ttags to ttags & name of tg & ","
        end repeat
        if ttags is not "" then
          set ttags to text 1 thru -2 of ttags
        end if
      on error
        set ttags to ""
      end try
      try
        set tproject to id of project of t
      on error
        set tproject to ""
      end try
      try
        set tarea to id of area of t
      on error
        set tarea to ""
      end try
      set output to output & tid & "|||" & tname & "|||" & tstatus & "|||" & tnotes & "|||" & twhen & "|||" & tdeadline & "|||" & ttags & "|||" & tproject & "|||" & tarea & "\\n"
    end repeat
    return output
  `);

  try {
    const result = await runAppleScript(script);
    if (!result) return [];

    return result
      .split('\n')
      .filter(line => line.includes('|||'))
      .map(line => {
        const [id, title, status, notes, when, deadline, tags, projectId, areaId] = line.split('|||');
        return {
          id,
          type: 'to-do' as const,
          title,
          status: mapStatus(status),
          notes: notes || undefined,
          when: when || undefined,
          deadline: deadline || undefined,
          tags: tags ? tags.split(',').filter(Boolean) : undefined,
          projectId: projectId || undefined,
          areaId: areaId || undefined,
          creationDate: '',
          modificationDate: '',
        };
      });
  } catch {
    return [];
  }
}

/**
 * Query a single item by ID with full details
 */
export async function queryById(itemId: string): Promise<ThingsItem | null> {
  const script = buildAppleScript(`
    try
      set t to to do id "${itemId}"
      set tid to id of t
      set tname to name of t
      set tstatus to status of t
      set tnotes to notes of t
      try
        set twhen to activation date of t as string
      on error
        set twhen to ""
      end try
      try
        set tdeadline to due date of t as string
      on error
        set tdeadline to ""
      end try
      try
        set ttags to ""
        repeat with tg in tags of t
          set ttags to ttags & name of tg & ","
        end repeat
        if ttags is not "" then
          set ttags to text 1 thru -2 of ttags
        end if
      on error
        set ttags to ""
      end try
      try
        set tproject to id of project of t
      on error
        set tproject to ""
      end try
      try
        set tarea to id of area of t
      on error
        set tarea to ""
      end try
      return "TODO|||" & tid & "|||" & tname & "|||" & tstatus & "|||" & tnotes & "|||" & twhen & "|||" & tdeadline & "|||" & ttags & "|||" & tproject & "|||" & tarea
    on error
      try
        set p to project id "${itemId}"
        set pid to id of p
        set pname to name of p
        set pstatus to status of p
        set pnotes to notes of p
        try
          set pwhen to activation date of p as string
        on error
          set pwhen to ""
        end try
        try
          set pdeadline to due date of p as string
        on error
          set pdeadline to ""
        end try
        try
          set ptags to ""
          repeat with tg in tags of p
            set ptags to ptags & name of tg & ","
          end repeat
          if ptags is not "" then
            set ptags to text 1 thru -2 of ptags
          end if
        on error
          set ptags to ""
        end try
        try
          set parea to id of area of p
        on error
          set parea to ""
        end try
        return "PROJECT|||" & pid & "|||" & pname & "|||" & pstatus & "|||" & pnotes & "|||" & pwhen & "|||" & pdeadline & "|||" & ptags & "|||" & parea
      on error
        try
          set a to area id "${itemId}"
          set aid to id of a
          set aname to name of a
          return "AREA|||" & aid & "|||" & aname
        on error
          return ""
        end try
      end try
    end try
  `);

  try {
    const result = await runAppleScript(script);
    if (!result) return null;

    if (result.startsWith('TODO|||')) {
      const [, id, title, status, notes, when, deadline, tags, projectId, areaId] = result.split('|||');
      return {
        id,
        type: 'to-do',
        title,
        status: mapStatus(status),
        notes: notes || undefined,
        when: when || undefined,
        deadline: deadline || undefined,
        tags: tags ? tags.split(',').filter(Boolean) : undefined,
        projectId: projectId || undefined,
        areaId: areaId || undefined,
        creationDate: '',
        modificationDate: '',
      };
    }

    if (result.startsWith('PROJECT|||')) {
      const [, id, title, status, notes, when, deadline, tags, areaId] = result.split('|||');
      return {
        id,
        type: 'project',
        title,
        status: mapStatus(status),
        notes: notes || undefined,
        when: when || undefined,
        deadline: deadline || undefined,
        tags: tags ? tags.split(',').filter(Boolean) : undefined,
        areaId: areaId || undefined,
        creationDate: '',
        modificationDate: '',
      };
    }

    if (result.startsWith('AREA|||')) {
      const [, id, title] = result.split('|||');
      return {
        id,
        type: 'area',
        title,
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Query items by tag with full details
 */
export async function queryByTag(tagName: string): Promise<ThingsTodo[]> {
  const script = buildAppleScript(`
    set output to ""
    try
      set taggedTodos to to dos of tag "${tagName}"
      repeat with t in taggedTodos
        set tid to id of t
        set tname to name of t
        set tstatus to status of t
        set tnotes to notes of t
        try
          set twhen to activation date of t as string
        on error
          set twhen to ""
        end try
        try
          set tdeadline to due date of t as string
        on error
          set tdeadline to ""
        end try
        try
          set ttags to ""
          repeat with tg in tags of t
            set ttags to ttags & name of tg & ","
          end repeat
          if ttags is not "" then
            set ttags to text 1 thru -2 of ttags
          end if
        on error
          set ttags to ""
        end try
        try
          set tproject to id of project of t
        on error
          set tproject to ""
        end try
        try
          set tarea to id of area of t
        on error
          set tarea to ""
        end try
        set output to output & tid & "|||" & tname & "|||" & tstatus & "|||" & tnotes & "|||" & twhen & "|||" & tdeadline & "|||" & ttags & "|||" & tproject & "|||" & tarea & "\\n"
      end repeat
    end try
    return output
  `);

  try {
    const result = await runAppleScript(script);
    if (!result) return [];

    return result
      .split('\n')
      .filter(line => line.includes('|||'))
      .map(line => {
        const [id, title, status, notes, when, deadline, tags, projectId, areaId] = line.split('|||');
        return {
          id,
          type: 'to-do' as const,
          title,
          status: mapStatus(status),
          notes: notes || undefined,
          when: when || undefined,
          deadline: deadline || undefined,
          tags: tags ? tags.split(',').filter(Boolean) : undefined,
          projectId: projectId || undefined,
          areaId: areaId || undefined,
          creationDate: '',
          modificationDate: '',
        };
      });
  } catch {
    return [];
  }
}

/**
 * Query items in a project with full details
 */
export async function queryProject(projectId: string): Promise<ThingsTodo[]> {
  const script = buildAppleScript(`
    set output to ""
    try
      set p to project id "${projectId}"
      set projectTodos to to dos of p
      repeat with t in projectTodos
        set tid to id of t
        set tname to name of t
        set tstatus to status of t
        set tnotes to notes of t
        try
          set twhen to activation date of t as string
        on error
          set twhen to ""
        end try
        try
          set tdeadline to due date of t as string
        on error
          set tdeadline to ""
        end try
        try
          set ttags to ""
          repeat with tg in tags of t
            set ttags to ttags & name of tg & ","
          end repeat
          if ttags is not "" then
            set ttags to text 1 thru -2 of ttags
          end if
        on error
          set ttags to ""
        end try
        set output to output & tid & "|||" & tname & "|||" & tstatus & "|||" & tnotes & "|||" & twhen & "|||" & tdeadline & "|||" & ttags & "\\n"
      end repeat
    end try
    return output
  `);

  try {
    const result = await runAppleScript(script);
    if (!result) return [];

    return result
      .split('\n')
      .filter(line => line.includes('|||'))
      .map(line => {
        const [id, title, status, notes, when, deadline, tags] = line.split('|||');
        return {
          id,
          type: 'to-do' as const,
          title,
          status: mapStatus(status),
          notes: notes || undefined,
          when: when || undefined,
          deadline: deadline || undefined,
          tags: tags ? tags.split(',').filter(Boolean) : undefined,
          projectId,
          creationDate: '',
          modificationDate: '',
        };
      });
  } catch {
    return [];
  }
}

/**
 * Query items in an area
 */
export async function queryArea(areaId: string): Promise<ThingsItem[]> {
  const script = buildAppleScript(`
    set output to ""
    try
      set a to area id "${areaId}"
      -- Get projects in area
      repeat with p in projects of a
        set pid to id of p
        set pname to name of p
        set pstatus to status of p
        set pnotes to notes of p
        try
          set pwhen to activation date of p as string
        on error
          set pwhen to ""
        end try
        try
          set pdeadline to due date of p as string
        on error
          set pdeadline to ""
        end try
        set output to output & "PROJECT|||" & pid & "|||" & pname & "|||" & pstatus & "|||" & pnotes & "|||" & pwhen & "|||" & pdeadline & "\\n"
      end repeat
      -- Get to-dos directly in area (not in projects)
      repeat with t in to dos of a
        set tid to id of t
        set tname to name of t
        set tstatus to status of t
        set tnotes to notes of t
        try
          set twhen to activation date of t as string
        on error
          set twhen to ""
        end try
        try
          set tdeadline to due date of t as string
        on error
          set tdeadline to ""
        end try
        set output to output & "TODO|||" & tid & "|||" & tname & "|||" & tstatus & "|||" & tnotes & "|||" & twhen & "|||" & tdeadline & "\\n"
      end repeat
    end try
    return output
  `);

  try {
    const result = await runAppleScript(script);
    if (!result) return [];

    return result
      .split('\n')
      .filter(line => line.includes('|||'))
      .map(line => {
        const parts = line.split('|||');
        const itemType = parts[0];

        if (itemType === 'PROJECT') {
          const [, id, title, status, notes, when, deadline] = parts;
          return {
            id,
            type: 'project' as const,
            title,
            status: mapStatus(status),
            notes: notes || undefined,
            when: when || undefined,
            deadline: deadline || undefined,
            areaId,
            creationDate: '',
            modificationDate: '',
          };
        } else {
          const [, id, title, status, notes, when, deadline] = parts;
          return {
            id,
            type: 'to-do' as const,
            title,
            status: mapStatus(status),
            notes: notes || undefined,
            when: when || undefined,
            deadline: deadline || undefined,
            areaId,
            creationDate: '',
            modificationDate: '',
          };
        }
      });
  } catch {
    return [];
  }
}

/**
 * Get all projects with full details
 */
export async function getAllProjects(): Promise<ThingsProject[]> {
  const script = buildAppleScript(`
    set output to ""
    repeat with p in projects
      set pid to id of p
      set pname to name of p
      set pstatus to status of p
      set pnotes to notes of p
      try
        set pwhen to activation date of p as string
      on error
        set pwhen to ""
      end try
      try
        set pdeadline to due date of p as string
      on error
        set pdeadline to ""
      end try
      try
        set ptags to ""
        repeat with tg in tags of p
          set ptags to ptags & name of tg & ","
        end repeat
        if ptags is not "" then
          set ptags to text 1 thru -2 of ptags
        end if
      on error
        set ptags to ""
      end try
      try
        set parea to id of area of p
      on error
        set parea to ""
      end try
      set output to output & pid & "|||" & pname & "|||" & pstatus & "|||" & pnotes & "|||" & pwhen & "|||" & pdeadline & "|||" & ptags & "|||" & parea & "\\n"
    end repeat
    return output
  `);

  try {
    const result = await runAppleScript(script);
    if (!result) return [];

    return result
      .split('\n')
      .filter(line => line.includes('|||'))
      .map(line => {
        const [id, title, status, notes, when, deadline, tags, areaId] = line.split('|||');
        return {
          id,
          type: 'project' as const,
          title,
          status: mapStatus(status),
          notes: notes || undefined,
          when: when || undefined,
          deadline: deadline || undefined,
          tags: tags ? tags.split(',').filter(Boolean) : undefined,
          areaId: areaId || undefined,
          creationDate: '',
          modificationDate: '',
        };
      });
  } catch {
    return [];
  }
}

/**
 * Get all areas with full details including item counts
 */
export async function getAllAreas(): Promise<ThingsArea[]> {
  const script = buildAppleScript(`
    set output to ""
    repeat with a in areas
      set aid to id of a
      set aname to name of a
      try
        set atags to ""
        repeat with tg in tags of a
          set atags to atags & name of tg & ","
        end repeat
        if atags is not "" then
          set atags to text 1 thru -2 of atags
        end if
      on error
        set atags to ""
      end try
      set output to output & aid & "|||" & aname & "|||" & atags & "\\n"
    end repeat
    return output
  `);

  try {
    const result = await runAppleScript(script);
    if (!result) return [];

    return result
      .split('\n')
      .filter(line => line.includes('|||'))
      .map(line => {
        const [id, title, tags] = line.split('|||');
        return {
          id,
          type: 'area' as const,
          title,
          tags: tags ? tags.split(',').filter(Boolean) : undefined,
        };
      });
  } catch {
    return [];
  }
}

/**
 * Get all tags
 */
export async function getAllTags(): Promise<{ id: string; name: string; parentId?: string }[]> {
  const script = buildAppleScript(`
    set output to ""
    repeat with t in tags
      set tid to id of t
      set tname to name of t
      try
        set tparent to id of parent tag of t
      on error
        set tparent to ""
      end try
      set output to output & tid & "|||" & tname & "|||" & tparent & "\\n"
    end repeat
    return output
  `);

  try {
    const result = await runAppleScript(script);
    if (!result) return [];

    return result
      .split('\n')
      .filter(line => line.includes('|||'))
      .map(line => {
        const [id, name, parentId] = line.split('|||');
        return {
          id,
          name,
          parentId: parentId || undefined,
        };
      });
  } catch {
    return [];
  }
}

/**
 * Get headings in a project
 */
export async function getProjectHeadings(projectId: string): Promise<ThingsHeading[]> {
  // Note: Things AppleScript doesn't have a direct way to get headings
  // We'll need to get them through the project
  // This is a simplified version - headings are containers within projects
  return [];
}

/**
 * Get checklist items for a to-do
 */
export async function getChecklistItems(todoId: string): Promise<ThingsChecklistItem[]> {
  // Note: Things AppleScript has limited support for checklist items
  // This is a placeholder for future implementation
  return [];
}

/**
 * Query items with deadlines
 */
export async function queryDeadlines(): Promise<ThingsTodo[]> {
  const script = buildAppleScript(`
    set output to ""
    repeat with t in to dos
      try
        set tdeadline to due date of t
        if tdeadline is not missing value then
          set tid to id of t
          set tname to name of t
          set tstatus to status of t
          set tnotes to notes of t
          try
            set twhen to activation date of t as string
          on error
            set twhen to ""
          end try
          set tdeadlineStr to tdeadline as string
          try
            set ttags to ""
            repeat with tg in tags of t
              set ttags to ttags & name of tg & ","
            end repeat
            if ttags is not "" then
              set ttags to text 1 thru -2 of ttags
            end if
          on error
            set ttags to ""
          end try
          try
            set tproject to id of project of t
          on error
            set tproject to ""
          end try
          try
            set tarea to id of area of t
          on error
            set tarea to ""
          end try
          set output to output & tid & "|||" & tname & "|||" & tstatus & "|||" & tnotes & "|||" & twhen & "|||" & tdeadlineStr & "|||" & ttags & "|||" & tproject & "|||" & tarea & "\\n"
        end if
      end try
    end repeat
    return output
  `);

  try {
    const result = await runAppleScript(script);
    if (!result) return [];

    return result
      .split('\n')
      .filter(line => line.includes('|||'))
      .map(line => {
        const [id, title, status, notes, when, deadline, tags, projectId, areaId] = line.split('|||');
        return {
          id,
          type: 'to-do' as const,
          title,
          status: mapStatus(status),
          notes: notes || undefined,
          when: when || undefined,
          deadline: deadline || undefined,
          tags: tags ? tags.split(',').filter(Boolean) : undefined,
          projectId: projectId || undefined,
          areaId: areaId || undefined,
          creationDate: '',
          modificationDate: '',
        };
      });
  } catch {
    return [];
  }
}

/**
 * Query repeating to-dos
 */
export async function queryRepeating(): Promise<ThingsTodo[]> {
  const script = buildAppleScript(`
    set output to ""
    repeat with t in to dos
      try
        set trr to repeating of t
        if trr is true then
          set tid to id of t
          set tname to name of t
          set tstatus to status of t
          set tnotes to notes of t
          try
            set twhen to activation date of t as string
          on error
            set twhen to ""
          end try
          try
            set tdeadline to due date of t as string
          on error
            set tdeadline to ""
          end try
          try
            set ttags to ""
            repeat with tg in tags of t
              set ttags to ttags & name of tg & ","
            end repeat
            if ttags is not "" then
              set ttags to text 1 thru -2 of ttags
            end if
          on error
            set ttags to ""
          end try
          try
            set tproject to id of project of t
          on error
            set tproject to ""
          end try
          try
            set tarea to id of area of t
          on error
            set tarea to ""
          end try
          set output to output & tid & "|||" & tname & "|||" & tstatus & "|||" & tnotes & "|||" & twhen & "|||" & tdeadline & "|||" & ttags & "|||" & tproject & "|||" & tarea & "\\n"
        end if
      end try
    end repeat
    return output
  `);

  try {
    const result = await runAppleScript(script);
    if (!result) return [];

    return result
      .split('\n')
      .filter(line => line.includes('|||'))
      .map(line => {
        const [id, title, status, notes, when, deadline, tags, projectId, areaId] = line.split('|||');
        return {
          id,
          type: 'to-do' as const,
          title,
          status: mapStatus(status),
          notes: notes || undefined,
          when: when || undefined,
          deadline: deadline || undefined,
          tags: tags ? tags.split(',').filter(Boolean) : undefined,
          projectId: projectId || undefined,
          areaId: areaId || undefined,
          creationDate: '',
          modificationDate: '',
        };
      });
  } catch {
    return [];
  }
}

/**
 * Map Things status string to our enum
 */
function mapStatus(status: string): 'open' | 'completed' | 'canceled' {
  const statusLower = status?.toLowerCase?.() ?? '';
  if (statusLower.includes('complet')) return 'completed';
  if (statusLower.includes('cancel')) return 'canceled';
  return 'open';
}
