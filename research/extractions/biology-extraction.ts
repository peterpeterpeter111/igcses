// Private, source-bound aggregate for audit tests. Public coverage imports only
// the metadata JSON; raw schemes and question partitions must stay server-side.
import metadata from './4BI1-2024-June-1-standard.json' with { type: 'json' };
import q1 from './4BI1-2024-June-1-standard/Q1.json' with { type: 'json' };
import q2 from './4BI1-2024-June-1-standard/Q2.json' with { type: 'json' };
import q3 from './4BI1-2024-June-1-standard/Q3.json' with { type: 'json' };
import q4 from './4BI1-2024-June-1-standard/Q4.json' with { type: 'json' };
import q5 from './4BI1-2024-June-1-standard/Q5.json' with { type: 'json' };
import q6 from './4BI1-2024-June-1-standard/Q6.json' with { type: 'json' };
import q7 from './4BI1-2024-June-1-standard/Q7.json' with { type: 'json' };

import q8 from './4BI1-2024-June-1-standard/Q8.json' with { type: 'json' };

import q9 from './4BI1-2024-June-1-standard/Q9.json' with { type: 'json' };

import q10 from './4BI1-2024-June-1-standard/Q10.json' with { type: 'json' };

const partitions = [q1, q2, q3, q4, q5, q6, q7, q8, q9, q10];
type Keys<T> = T extends unknown ? keyof T : never;
type Value<T, K extends PropertyKey> = T extends unknown ? K extends keyof T ? T[K] : undefined : never;
type ObjectShape<T> = { [K in Keys<T> as undefined extends Value<T, K> ? never : K]: Combined<Value<T, K>> }
  & { [K in Keys<T> as undefined extends Value<T, K> ? K : never]?: Combined<Value<T, K>> };
type Combined<T> = ([NonNullable<T>] extends [never] ? never : NonNullable<T> extends (infer Item)[] ? Combined<Item>[]
  : NonNullable<T> extends object ? ObjectShape<NonNullable<T>>
  : NonNullable<T>) | Extract<T, null | undefined>;
type Task = Combined<(typeof partitions)[number]['tasks'][number]>;
const tasks: Task[] = partitions.flatMap<Task>((partition) => partition.tasks);
if (metadata.tasks.length !== 0 || metadata.taskPartitions.schemaVersion !== 1
  || metadata.taskPartitions.parts.length !== partitions.length
  || tasks.length !== metadata.detailedLeafTasks
  || tasks.reduce((sum, task) => sum + task.originalMarks, 0) !== metadata.detailedOriginalMarks
  || partitions.some((partition, i) => partition.paperId !== metadata.paperId
    || partition.question !== metadata.taskPartitions.parts[i].question
    || metadata.taskPartitions.parts[i].path !== `${metadata.paperId}/Q${partition.question}.json`
    || partition.tasks.some((task) => task.paperId !== metadata.paperId || task.questionPath.split('.')[0] !== partition.question
      || task.taskId !== `${metadata.paperId}.Q${task.questionPath}`))
  || new Set(tasks.map((task) => task.taskId)).size !== tasks.length) {
  throw new Error('Biology extraction partition declaration or allocation mismatch');
}
const biologyExtraction = { ...metadata, tasks };
export default biologyExtraction;
