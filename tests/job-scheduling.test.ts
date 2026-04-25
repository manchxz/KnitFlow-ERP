/**
 * Unit Tests for Job Scheduling (Priority Queue)
 *
 * Tests the Min-Heap implementation for production job scheduling.
 * Ensures critical orders are processed in correct priority order.
 */

// Minimal interface for testing
interface JobCard {
  id: string;
  customer: string;
  priority: number;
  deadline: Date;
  machineRequired: string;
  estimatedDuration: number;
  materialStatus: 'ready' | 'pending' | 'shortage';
}

class JobScheduler {
  private heap: JobCard[] = [];

  insert(job: JobCard): void {
    this.heap.push(job);
    this.heapifyUp(this.heap.length - 1);
  }

  extractNext(): JobCard | null {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop()!;

    const min = this.heap[0];
    this.heap[0] = this.heap.pop()!;
    this.heapifyDown(0);
    return min;
  }

  peek(): JobCard | null {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  getAllJobs(): JobCard[] {
    return [...this.heap].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.deadline.getTime() - b.deadline.getTime();
    });
  }

  size(): number {
    return this.heap.length;
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

  private compare(a: JobCard, b: JobCard): number {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.deadline.getTime() - b.deadline.getTime();
  }
}

describe('JobScheduler', () => {
  let scheduler: JobScheduler;

  beforeEach(() => {
    scheduler = new JobScheduler();
  });

  describe('insert', () => {
    it('should add a job to the queue', () => {
      scheduler.insert({
        id: 'JC-001',
        customer: 'ABC Exports',
        priority: 1,
        deadline: new Date('2025-04-28'),
        machineRequired: 'M01',
        estimatedDuration: 8,
        materialStatus: 'ready'
      });

      expect(scheduler.size()).toBe(1);
    });

    it('should maintain heap property with multiple jobs', () => {
      scheduler.insert(createJob('JC-001', 3, '2025-05-02'));
      scheduler.insert(createJob('JC-002', 1, '2025-04-28'));
      scheduler.insert(createJob('JC-003', 2, '2025-04-30'));

      expect(scheduler.peek()?.priority).toBe(1);
    });
  });

  describe('extractNext', () => {
    it('should return null for empty queue', () => {
      expect(scheduler.extractNext()).toBeNull();
    });

    it('should return the highest priority job', () => {
      scheduler.insert(createJob('JC-001', 2, '2025-04-30'));
      scheduler.insert(createJob('JC-002', 1, '2025-04-28'));
      scheduler.insert(createJob('JC-003', 3, '2025-05-02'));

      const next = scheduler.extractNext();
      expect(next?.id).toBe('JC-002');
      expect(next?.priority).toBe(1);
    });

    it('should break ties by deadline', () => {
      scheduler.insert(createJob('JC-001', 1, '2025-04-30'));
      scheduler.insert(createJob('JC-002', 1, '2025-04-28'));

      const next = scheduler.extractNext();
      expect(next?.id).toBe('JC-002'); // Earlier deadline wins
    });

    it('should reduce size after extraction', () => {
      scheduler.insert(createJob('JC-001', 1, '2025-04-28'));
      scheduler.extractNext();
      expect(scheduler.size()).toBe(0);
    });
  });

  describe('peek', () => {
    it('should return null for empty queue', () => {
      expect(scheduler.peek()).toBeNull();
    });

    it('should return highest priority job without removing', () => {
      scheduler.insert(createJob('JC-001', 2, '2025-04-30'));
      scheduler.insert(createJob('JC-002', 1, '2025-04-28'));

      const peeked = scheduler.peek();
      expect(peeked?.id).toBe('JC-002');
      expect(scheduler.size()).toBe(2); // Still there
    });
  });

  describe('getAllJobs', () => {
    it('should return all jobs sorted by priority', () => {
      scheduler.insert(createJob('JC-001', 3, '2025-05-02'));
      scheduler.insert(createJob('JC-002', 1, '2025-04-28'));
      scheduler.insert(createJob('JC-003', 2, '2025-04-30'));

      const all = scheduler.getAllJobs();
      expect(all.map(j => j.id)).toEqual(['JC-002', 'JC-003', 'JC-001']);
    });
  });

  describe('production scenario', () => {
    it('should handle Friday 4 PM rush scenario', () => {
      // Simulate 3 urgent orders arriving at once
      scheduler.insert(createJob('JC-001', 1, '2025-04-28', 'ABC Exports'));
      scheduler.insert(createJob('JC-002', 2, '2025-04-30', 'XYZ Garments'));
      scheduler.insert(createJob('JC-003', 3, '2025-05-02', 'Local Buyer'));

      // Monday morning: process next job
      const next = scheduler.extractNext();
      expect(next?.customer).toBe('ABC Exports');
      expect(next?.priority).toBe(1);
    });
  });
});

// Test helper
function createJob(
  id: string,
  priority: number,
  deadline: string,
  customer: string = 'Test Customer'
): JobCard {
  return {
    id,
    customer,
    priority,
    deadline: new Date(deadline),
    machineRequired: 'M01',
    estimatedDuration: 8,
    materialStatus: 'ready'
  };
}
