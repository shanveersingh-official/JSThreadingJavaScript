/**
 * JSThreadingJavaScript - A multithreading library for browsers using Web Workers.
 * Supports worker pool, task queue, Promise-based task execution.
 * 
 * Author: Shanveer Singh
 * License: Apache License 2.0
 */

class ThreadWorker {
  constructor(id, worker, pool) {
    this.id = id;
    this.worker = worker;
    this.pool = pool;
    this.isBusy = false;

    this.worker.onmessage = this._onMessage.bind(this);
    this.worker.onerror = this._onError.bind(this);
  }

  _onMessage(event) {
    const msg = event.data;
    const { taskId, result, error } = msg;
    if (!this.pool.callbacks.has(taskId)) return;

    const { resolve, reject } = this.pool.callbacks.get(taskId);
    this.pool.callbacks.delete(taskId);

    this.isBusy = false;
    this.pool.freeWorkers.push(this);
    this.pool._processQueue();

    if (error) {
      reject(new Error(error));
      this.pool.emit && this.pool.emit('taskError', { taskId, error, workerId: this.id });
    } else {
      resolve(result);
      this.pool.emit && this.pool.emit('taskComplete', { taskId, result, workerId: this.id });
    }
  }

  _onError(err) {
    this.pool.emit && this.pool.emit('workerError', { workerId: this.id, error: err.message || err });
  }

  postTask(taskId, code) {
    this.isBusy = true;
    this.pool.emit && this.pool.emit('taskStart', { taskId, workerId: this.id });
    this.worker.postMessage({ taskId, code });
  }

  terminate() {
    return this.worker.terminate();
  }
}

class JSThreadingJavaScript {
  /**
   * @param {Object} options
   * @param {number} options.poolSize Number of web workers (default 4)
   * @param {boolean} options.debug Enable debug logging (default false)
   */
  constructor(options = {}) {
    this.poolSize = options.poolSize || 4;
    this.debug = options.debug || false;

    this.workers = [];
    this.freeWorkers = [];
    this.taskQueue = [];
    this.taskIdCounter = 0;
    this.callbacks = new Map();

    // Simple event emitter pattern for debugging and events
    this._events = {};
    
    this._initPool();
  }

  on(event, handler) {
    if (!this._events[event]) this._events[event] = [];
    this._events[event].push(handler);
  }

  emit(event, data) {
    if (this._events[event]) {
      for (const h of this._events[event]) {
        try {
          h(data);
        } catch (e) {
          console.error(`Error in event handler for ${event}:`, e);
        }
      }
    }
  }

  _initPool() {
    for (let i = 0; i < this.poolSize; i++) {
      this._createWorker(i + 1);
    }
  }

  _createWorker(id) {
    const workerCode = `
      self.onmessage = async function(e) {
        const { taskId, code } = e.data;
        try {
          const result = await (async () => { return eval(code); })();
          self.postMessage({ taskId, result });
        } catch (err) {
          self.postMessage({ taskId, error: err.message || err.toString() });
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    const threadWorker = new ThreadWorker(id, worker, this);

    this.workers.push(threadWorker);
    this.freeWorkers.push(threadWorker);

    if (this.debug) {
      this.emit('debug', `Created worker #${id}`);
    }
  }

  /**
   * Run JavaScript code in a worker thread.
   * @param {string} code JS code to execute
   * @returns {Promise<any>} Promise resolving to the result
   */
  runCode(code) {
    if (typeof code !== 'string') {
      return Promise.reject(new TypeError('Code must be a string.'));
    }
    return new Promise((resolve, reject) => {
      const taskId = ++this.taskIdCounter;
      this.callbacks.set(taskId, { resolve, reject });
      this.taskQueue.push({ taskId, code });
      this._processQueue();
    });
  }

  _processQueue() {
    while (this.taskQueue.length > 0 && this.freeWorkers.length > 0) {
      const { taskId, code } = this.taskQueue.shift();
      const worker = this.freeWorkers.shift();
      if (this.debug) {
        this.emit('debug', `Assigning task #${taskId} to worker #${worker.id}`);
      }
      worker.postTask(taskId, code);
    }
  }

  /**
   * Gracefully terminate all workers.
   * @returns {Promise<void>}
   */
  async shutdown() {
    if (this.debug) this.emit('debug', 'Terminating all workers...');
    await Promise.all(this.workers.map(w => w.terminate()));
    this.workers = [];
    this.freeWorkers = [];
    if (this.debug) this.emit('debug', 'All workers terminated.');
  }
}

// Export for ES modules and browser global
if (typeof window !== 'undefined') {
  window.JSThreadingJavaScript = JSThreadingJavaScript;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = JSThreadingJavaScript;
}