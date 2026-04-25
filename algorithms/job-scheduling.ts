/**
 * Priority Queue (Min-Heap) for Production Job Scheduling
 * 
 * Ensures critical orders meet deadlines by always processing
 * the highest priority job next.
 * 
 * Time Complexity:
 *   - Insert (enqueue): O(log n)
 *   - Extract Min (dequeue): O(log n)
 *   - Peek (get next): O(1)
 */

interface JobCard {
  id: string;
  customer: string;
  priority: number;       // 1 = Critical, 2 = High, 3 = Normal, 4 = Low
  deadline: Date;
  machineRequired: string;
  estimatedDuration: number; // hours
  materialStatus: 'ready' | 'pending' | 'shortage';
}

class JobScheduler {
  private heap: JobCard[] = [];

  /**
   * Insert a new job into the priority queue
   * Higher priority (lower number) = processed first
   * If same priority, earlier deadline comes first
   */
  insert(job: JobCard): void {
    this.heap.push(job);
    this.heapifyUp(this.heap.length - 1);
  }

  /**
   * Remove and return the highest priority job
   */
  extractNext(): JobCard | null {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop()!;

    const min = this.heap[0];
    this.heap[0] = this.heap.pop()!;
    this.heapifyDown(0);
    return min;
  }

  /**
   * View the next job without removing it
   */
  peek(): JobCard | null {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  /**
   * Get all jobs sorted by priority
   */
  getAllJobs(): JobCard[] {
    return [...this.heap].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.deadline.getTime() - b.deadline.getTime();
    });
  }

  private heapifyUp(index: number): void {
    const parent = Math.floor((index - 1) / 2);
    if (parent >= 0 && this.compare(this.heap[index], this.heap[parent]) < 0) {
      [this.heap[index], this.heap[parent]] = [this.heap[parent], this.heap[index]];
      this.heapifyUp(parent);
    }
  }

  private heapifyDown(index: number): void {
    const left = 2 * index + 1;
    const right = 2 * index + 2;
    let smallest = index;

    if (left < this.heap.length && this.compare(this.heap[left], this.heap[smallest]) < 0) {
      smallest = left;
    }
    if (right < this.heap.length && this.compare(this.heap[right], this.heap[smallest]) < 0) {
      smallest = right;
    }
    if (smallest !== index) {
      [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
      this.heapifyDown(smallest);
    }
  }

  /**
   * Compare two jobs: lower priority number = higher priority
   * If same priority, earlier deadline wins
   */
  private compare(a: JobCard, b: JobCard): number {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.deadline.getTime() - b.deadline.getTime();
  }
}

// ===== EXAMPLE USAGE =====

const scheduler = new JobScheduler();

// Friday 4 PM — 3 urgent orders
scheduler.insert({
  id: 'JC-001', customer: 'ABC Exports', priority: 1,
  deadline: new Date('2025-04-28'), machineRequired: 'M01',
  estimatedDuration: 8, materialStatus: 'ready'
});

scheduler.insert({
  id: 'JC-002', customer: 'XYZ Garments', priority: 2,
  deadline: new Date('2025-04-30'), machineRequired: 'M02',
  estimatedDuration: 6, materialStatus: 'ready'
});

scheduler.insert({
  id: 'JC-003', customer: 'Local Buyer', priority: 3,
  deadline: new Date('2025-05-02'), machineRequired: 'M01',
  estimatedDuration: 4, materialStatus: 'pending'
});

// Monday morning — process next job
const nextJob = scheduler.extractNext();
console.log(`Next: ${nextJob?.id} — ${nextJob?.customer} (Priority: ${nextJob?.priority})`);
// Output: Next: JC-001 — ABC Exports (Priority: 1)