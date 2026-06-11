/**
 * Bundled sample workflows — imported as JSON modules so they work in
 * both the Vite dev server and the UMD/ES library build.
 */

import catFact       from './1-cat-fact.json';
import usersAndPosts from './2-users-and-posts.json';
import statusCheck   from './3-status-check.json';
import chainedApis   from './4-chained-apis.json';
import loopUsers     from './5-loop-users.json';
import evaluateDelay from './6-evaluate-delay-switch.json';
import fileStream    from './7-file-stream.json';
import largeCsv      from './8-large-csv.json';

export type SampleCategory = 'Basics' | 'Logic' | 'Files';

export interface SampleMeta {
    id:          string;
    label:       string;
    description: string;
    category:    SampleCategory;
    blockCount:  number;
    data:        Record<string, unknown>;
}

export const SAMPLES: SampleMeta[] = [
    {
        id:          '1-cat-fact',
        label:       'Cat Fact API',
        description: 'Simple GET + JSONPath extraction',
        category:    'Basics',
        blockCount:  4,
        data:        catFact as Record<string, unknown>,
    },
    {
        id:          '2-users-and-posts',
        label:       'Users & Posts',
        description: 'Chained API calls with variable passing',
        category:    'Basics',
        blockCount:  6,
        data:        usersAndPosts as Record<string, unknown>,
    },
    {
        id:          '3-status-check',
        label:       'Status Check',
        description: 'Branch on HTTP status code',
        category:    'Basics',
        blockCount:  6,
        data:        statusCheck as Record<string, unknown>,
    },
    {
        id:          '4-chained-apis',
        label:       'Chained Public APIs',
        description: 'Dog image, joke, and country combined',
        category:    'Logic',
        blockCount:  9,
        data:        chainedApis as Record<string, unknown>,
    },
    {
        id:          '5-loop-users',
        label:       'Loop Over Users',
        description: 'Iterate a fetched array with Loop block',
        category:    'Logic',
        blockCount:  7,
        data:        loopUsers as Record<string, unknown>,
    },
    {
        id:          '6-evaluate-delay',
        label:       'Evaluate, Delay & Switch',
        description: 'Expressions, wait, and multi-branch',
        category:    'Logic',
        blockCount:  8,
        data:        evaluateDelay as Record<string, unknown>,
    },
    {
        id:          '7-file-stream',
        label:       'File Download & Stream',
        description: 'CSV download, line-by-line reader',
        category:    'Files',
        blockCount:  8,
        data:        fileStream as Record<string, unknown>,
    },
    {
        id:          '8-large-csv',
        label:       'Large CSV (26k rows)',
        description: 'Batch-processing with skip + limit',
        category:    'Files',
        blockCount:  8,
        data:        largeCsv as Record<string, unknown>,
    },
];
