import { Readable } from 'node:stream';
import { google } from 'googleapis';
import { getRegressionMode } from '@l10nmonster/core';

export class GDriveStoreDelegate {
    constructor(folderId, folderPath = '') {
        this.folderId = folderId;
        this.folderPath = folderPath;
        this.drive = null;
    }

    toString() {
        return `GDriveStoreDelegate(folderId=${this.folderId}, folderPath=${this.folderPath})`;
    }

    async #initializeDrive() {
        if (!this.drive) {
            try {
                const auth = new google.auth.GoogleAuth({
                    scopes: [
                        'https://www.googleapis.com/auth/drive',
                        'https://www.googleapis.com/auth/drive.file'
                    ]
                });
                this.drive = google.drive({ version: 'v3', auth });
            } catch (e) {
                throw new Error(`Failed to initialize Google Drive client: ${e.message}. Make sure you have proper authentication configured (service account key or 'gcloud auth application-default login').`);
            }
        }
    }

    async #getOrCreateFolder(folderName, parentId) {
        await this.#initializeDrive();
        
        // Check if folder exists
        const query = `name='${folderName}' and parents in '${parentId}' and mimeType='application/vnd.google-apps.folder'`;
        const response = await this.drive.files.list({ q: query });
        
        if (response.data.files.length > 0) {
            return response.data.files[0].id;
        }
        
        // Create folder if it doesn't exist
        const folderMetadata = {
            name: folderName,
            parents: [parentId],
            mimeType: 'application/vnd.google-apps.folder'
        };
        
        const folder = await this.drive.files.create({
            requestBody: folderMetadata,
            fields: 'id'
        });
        
        return folder.data.id;
    }

    async #resolveFolderPath() {
        if (!this.folderPath) {
            return this.folderId;
        }

        const pathParts = this.folderPath.split('/').filter(part => part.length > 0);
        let currentFolderId = this.folderId;

        for (const folderName of pathParts) {
            currentFolderId = await this.#getOrCreateFolder(folderName, currentFolderId);
        }

        return currentFolderId;
    }

    async listAllFiles() {
        await this.#initializeDrive();
        const targetFolderId = await this.#resolveFolderPath();
        
        const query = `'${targetFolderId}' in parents and mimeType != 'application/vnd.google-apps.folder'`;
        const response = await this.drive.files.list({
            q: query,
            fields: 'files(id,name,modifiedTime,version)'
        });
        
        const filenamesWithModified = response.data.files.map(f => [f.name, f.version || f.modifiedTime]);
        return filenamesWithModified;
    }

    async ensureBaseDirExists() {
        return await this.#resolveFolderPath();
    }

    async getFile(filename) {
        await this.#initializeDrive();
        const targetFolderId = await this.#resolveFolderPath();
        
        const query = `name='${filename}' and '${targetFolderId}' in parents`;
        const response = await this.drive.files.list({ q: query });
        
        if (response.data.files.length === 0) {
            throw new Error(`File not found: ${filename}`);
        }
        
        const fileId = response.data.files[0].id;
        const fileContent = await this.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });
        
        return fileContent.data;
    }

    async getStream(filename) {
        await this.#initializeDrive();
        const targetFolderId = await this.#resolveFolderPath();
        
        const query = `name='${filename}' and '${targetFolderId}' in parents`;
        const response = await this.drive.files.list({ q: query });
        
        if (response.data.files.length === 0) {
            throw new Error(`File not found: ${filename}`);
        }
        
        const fileId = response.data.files[0].id;
        const stream = await this.drive.files.get({
            fileId: fileId,
            alt: 'media'
        }, { responseType: 'stream' });
        
        return stream.data;
    }

    async saveFile(filename, contents) {
        Array.isArray(filename) && (filename = filename.join('/'));
        await this.#initializeDrive();
        const targetFolderId = await this.#resolveFolderPath();
        
        // Check if file already exists
        const query = `name='${filename}' and '${targetFolderId}' in parents`;
        const response = await this.drive.files.list({ q: query });
        
        const media = {
            mimeType: 'application/octet-stream',
            body: Readable.from([contents])
        };
        
        if (response.data.files.length > 0) {
            // Update existing file
            const fileId = response.data.files[0].id;
            await this.drive.files.update({
                fileId: fileId,
                media: media
            });
        } else {
            // Create new file
            const fileMetadata = {
                name: filename,
                parents: [targetFolderId]
            };
            
            await this.drive.files.create({
                requestBody: fileMetadata,
                media: media,
                fields: 'id'
            });
        }
    }

    async saveStream(filename, readable) {
        Array.isArray(filename) && (filename = filename.join('/'));
        await this.#initializeDrive();
        const targetFolderId = await this.#resolveFolderPath();
        
        // Check if file already exists
        const query = `name='${filename}' and '${targetFolderId}' in parents`;
        const response = await this.drive.files.list({ q: query });
        
        const media = {
            mimeType: 'application/octet-stream',
            body: readable
        };
        
        let fileId;
        if (response.data.files.length > 0) {
            // Update existing file
            fileId = response.data.files[0].id;
            await this.drive.files.update({
                fileId: fileId,
                media: media
            });
        } else {
            // Create new file
            const fileMetadata = {
                name: filename,
                parents: [targetFolderId]
            };
            
            const result = await this.drive.files.create({
                requestBody: fileMetadata,
                media: media,
                fields: 'id,version'
            });
            fileId = result.data.id;
        }
        
        // Get the updated file info for version
        const fileInfo = await this.drive.files.get({
            fileId: fileId,
            fields: 'version,modifiedTime'
        });
        
        return getRegressionMode() ? 'TS1' : fileInfo.data.version || fileInfo.data.modifiedTime;
    }

    async deleteFiles(filenames) {
        await this.#initializeDrive();
        const targetFolderId = await this.#resolveFolderPath();
        
        for (const filename of filenames) {
            const query = `name='${filename}' and '${targetFolderId}' in parents`;
            const response = await this.drive.files.list({ q: query });
            
            for (const file of response.data.files) {
                await this.drive.files.delete({ fileId: file.id });
            }
        }
    }
} 