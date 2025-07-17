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
            throw new Error(errorMessage);
        }
        return await response.json();
    } catch (error) {
        console.error("API Fetch Error:", error);
        // Re-throw the error so it can be caught by the calling component
        throw error;
    }
} 