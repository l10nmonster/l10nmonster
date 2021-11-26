export class DummyJobStore {
    async getJobManifests() {
        return [];
    }

    async getJobStatusByLangPair() {
        return [];
    }

    async createJobManifest() {
        return 0;
    }

    async updateJob() {
    }

    async getJob() {
        return {};
    }
}
