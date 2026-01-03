# JSThreadingJavaScript

A lightweight and efficient multithreading library for browsers using Web Workers.

## Features

- Run multiple JavaScript tasks concurrently using a configurable worker pool.
- Promise-based API for easy async code execution.
- Task queuing when all workers are busy.
- Debug event hooks for monitoring worker and task lifecycle.
- Graceful shutdown of all workers.
- Pure vanilla JavaScript — no dependencies.

## Installation

Just include `JSThreadingJavaScript.js` in your project or bundle it with your favorite tool.

```
<script src="JSThreadingJavaScript.min.js"></script>
<script>
  const jsthread = new JSThreadingJavaScript({ poolSize: 4, debug: true });
  // ...
</script>
```

Or import as a module:

```
import JSThreadingJavaScript from './JSThreadingJavaScript.js';

const jsthread = new JSThreadingJavaScript({ poolSize: 4 });
```

## Usage

```
const jsthread = new JSThreadingJavaScript({ poolSize: 3, debug: true });

jsthread.on('debug', msg => console.log('[DEBUG]', msg));
jsthread.on('taskComplete', ({ taskId, result, workerId }) => {
  console.log(`Task #${taskId} completed by worker #${workerId}:`, result);
});
jsthread.on('taskError', ({ taskId, error }) => {
  console.error(`Task #${taskId} failed:`, error);
});

// Run code snippets asynchronously in worker threads
(async () => {
  const result1 = await jsthread.runCode('return 2 + 2;');
  const result2 = await jsthread.runCode(`
    const wait = ms => new Promise(r => setTimeout(r, ms));
    await wait(500);
    return "Hello after delay";
  `);

  console.log(result1, result2);

  await jsthread.shutdown();
})();
```

## API

### `new JSThreadingJavaScript(options)`

- `options.poolSize` (number, default `4`): Number of Web Workers in the pool.
- `options.debug` (boolean, default `false`): Enable debug event messages.

### `runCode(code: string): Promise<any>`

Executes the provided JavaScript code string inside a worker thread. Returns a Promise that resolves with the result or rejects on error or timeout.

### `shutdown(): Promise<void>`

Gracefully terminates all workers.

### Event Listeners

- `'debug'` — Debugging messages.
- `'taskStart'` — Task started on a worker.
- `'taskComplete'` — Task completed successfully.
- `'taskError'` — Task failed with an error.
- `'workerError'` — Worker thread encountered an error.
- `'workerExit'` — Worker thread exited.

## License

Apache License 2.0 — See [LICENSE](LICENSE) file for details.

---

Created by Shanveer Singh
