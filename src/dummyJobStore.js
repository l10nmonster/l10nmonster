export class DummyJobStore {
    async getPendingJobs() {
        return [];
    }

    async getJobStatus() {
        return [];
    }

    async createJobManifest() {
        return 0;
    }

    async updateJobManifest() {
    }

    async updateJob() {
    }

    async getJob() {
        return {};
    }
}
