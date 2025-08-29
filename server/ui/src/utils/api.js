// Helper function for fetch requests
export async function fetchApi(url, options = {}) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            // Attempt to get error message from response body
            let errorData;
            try {
                errorData = await response.json();
            } catch { /* Ignore if response body is not JSON */ }
            const errorMessage = errorData?.message || `HTTP error! status: ${response.status}`;
            const error = new Error(errorMessage);
            error.status = response.status;
            error.response = response;
            throw error;
        }
        return await response.json();
    } catch (error) {
        console.error("API Fetch Error:", error);
        // Re-throw the error so it can be caught by the calling component
        // Preserve custom properties if they exist
        if (error.status || error.response) {
            throw error;
        }
        // For network errors or other issues, create a new error with preserved info
        const newError = new Error(error.message || 'Network error');
        newError.originalError = error;
        throw newError;
    }
} 