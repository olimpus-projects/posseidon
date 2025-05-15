import SqliteQueue, { QueueItem } from "./queue";

export class PosseidonService {
    private queue: SqliteQueue;
    public jobs: QueueItem[] | null = null;
    private _jobStatus: 'pending' | 'processing' | 'completed' | 'failed' = 'pending'; 
    public calbackResponse: string = '';
    public file: any;
    public project: any;
    private _processingFlag : boolean = false;

    constructor() {
        this.queue = new SqliteQueue();
    }

    async start(): Promise<void> {
        this.queue.initialize();
        this._processingFlag = false;

        if(!this.queue) {
            throw new Error('Queue not initialized');
        }
    }

    async newJob(job: QueueItem): Promise<void> {
        try {
            this._jobStatus = 'pending';
            await this.queue.enqueue(job);
            this.processQueue();
        } catch (error) {
            throw new Error('Error creating job: ' + error);
        }
    }

    async processQueue(): Promise<QueueItem | void> {
        try {
            if(!this._processingFlag) {
            
                this._processingFlag = true;
                this.jobs = await this.queue.getStatus('pending');
                if(!this.jobs || !this.jobs[0]) {
                    throw new Error('Queue is empty');
                }
                const job = this.jobs[0];
                this._jobStatus = 'processing';
                // process job here
                // calling the project app to process file and response for callback_url
                this._jobStatus = 'completed';
                if (typeof job.id === 'undefined') {
                    throw new Error('Job id is undefined');
                }
                this.queue.updateStatus(job.id, 'completed');
                return job;
            }
        } catch (error) {
            this._jobStatus = 'failed';
            if(this.jobs && this.jobs[0] && typeof this.jobs[0].id === 'number') {
                this.queue.updateStatus(this.jobs[0].id, 'failed', JSON.stringify(error));
            }
            throw new Error('Error processing queue: ' + error);
        } finally {
            this._processingFlag = false;
        }
    }
}