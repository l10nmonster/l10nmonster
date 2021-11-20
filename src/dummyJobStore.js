export class DummyJobStore {
    async getPendingJobs() {
        return [];
    }

    async createJobManifest() {
        return 0;
    }

    async updateJobManifest() {
    }

    async updateJob() {
    }
}
