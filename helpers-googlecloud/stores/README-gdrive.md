# Google Drive Store Delegate

The `GDriveStoreDelegate` provides file storage capabilities using Google Drive, modeled after the existing `GCSStoreDelegate`.

## Prerequisites

1. **Enable Google Drive API**: In your Google Cloud Console, enable the Google Drive API for your project
2. **Set up authentication** (choose one):
   - **Service Account** (recommended for production):
     - Create a service account in Google Cloud Console
     - Download the JSON key file
     - Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to the path of the JSON file
     - Share the target Google Drive folder with the service account email
   - **User Credentials** (for development):
     - Run the following command to authenticate with the required Drive scopes:
     ```bash
     gcloud auth application-default login --scopes=https://www.googleapis.com/auth/drive,https://www.googleapis.com/auth/drive.file,https://www.googleapis.com/auth/cloud-platform
     ```
     - Ensure your account has access to the target Google Drive folder
3. **Required Scopes**: The delegate requires these OAuth scopes:
   - `https://www.googleapis.com/auth/drive` (full Drive access)
   - `https://www.googleapis.com/auth/drive.file` (file-specific access)

## Usage

```javascript
import { GDriveStoreDelegate } from '@l10nmonster/helpers-googlecloud';

// Initialize with a folder ID (the folder where files will be stored)
const driveDelegate = new GDriveStoreDelegate('your-folder-id');

// Or with a folder ID and a subfolder path (will be created if it doesn't exist)
const driveDelegate = new GDriveStoreDelegate('your-folder-id', 'path/to/subfolder');
```

## Getting a Folder ID

To get a folder ID from Google Drive:
1. Open Google Drive in your browser
2. Navigate to the folder you want to use
3. Look at the URL - the folder ID is the last part after `/folders/`
   - Example: `https://drive.google.com/drive/folders/1abc123def456ghi789jkl` 
   - Folder ID: `1abc123def456ghi789jkl`

## Configuration Example

```javascript
// In your l10nmonster configuration
export default {
    stores: {
        myDriveStore: new (await import('@l10nmonster/helpers-googlecloud')).GDriveStoreDelegate(
            '1abc123def456ghi789jkl', // Your folder ID
            'translations'             // Optional subfolder path
        )
    }
    // ... rest of your config
};
```

## Authentication

The delegate uses the standard Google Auth Library, which will automatically detect credentials from:
- Service account key file (set via `GOOGLE_APPLICATION_CREDENTIALS` environment variable)
- Google Cloud SDK credentials (`gcloud auth application-default login`)
- Compute Engine metadata server (when running on GCP)

## API Methods

The `GDriveStoreDelegate` implements the same interface as other store delegates:

- `listAllFiles()` - Lists all files in the target folder
- `ensureBaseDirExists()` - Ensures the folder structure exists
- `getFile(filename)` - Retrieves file contents as a string
- `getStream(filename)` - Retrieves file as a readable stream
- `saveFile(filename, contents)` - Saves file contents
- `saveStream(filename, readable)` - Saves from a readable stream
- `deleteFiles(filenames)` - Deletes multiple files

## Troubleshooting

### "Request had insufficient authentication scopes"

This error typically occurs when:

1. **Google Drive API is not enabled**: Go to Google Cloud Console → APIs & Services → Library → Search for "Google Drive API" → Enable it
2. **Service account lacks permissions**: If using a service account, make sure to:
   - Share the target folder with the service account email address
   - Give the service account "Editor" permissions on the folder
3. **Incorrect authentication setup**: Verify your authentication method:
   ```bash
   # For user credentials - MUST include Drive scopes
   gcloud auth application-default login --scopes=https://www.googleapis.com/auth/drive,https://www.googleapis.com/auth/drive.file,https://www.googleapis.com/auth/cloud-platform
   
   # For service account, ensure environment variable is set
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"
   ```

### "File not found" errors

- Ensure the folder ID is correct and accessible
- Check that your credentials have read access to the folder
- Verify the folder exists and is not in the trash

### "Quota exceeded" errors

- Check your Google Drive API quotas in Google Cloud Console
- Consider implementing exponential backoff for high-volume operations

## Notes

- Files are stored with `application/octet-stream` MIME type
- The delegate handles folder creation automatically
- File versioning is handled by Google Drive's built-in versioning system
- Files with the same name will be updated rather than creating duplicates 