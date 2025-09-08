/**
 * Network Error Handler Utility
 * Provides user-friendly error messages for common network issues
 */

export const getNetworkErrorMessage = (error) => {
  if (!error) return 'An unexpected error occurred. Please try again.';
  
  const errorMessage = error.message?.toLowerCase() || '';
  
  // Network connectivity issues
  if (errorMessage.includes('network request failed') || 
      errorMessage.includes('failed to fetch') ||
      errorMessage.includes('network error')) {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }
  
  // Timeout errors
  if (errorMessage.includes('timeout') || 
      errorMessage.includes('timed out')) {
    return 'The request is taking too long. Please check your connection and try again.';
  }
  
  // DNS/Server not found
  if (errorMessage.includes('not found') || 
      errorMessage.includes('could not resolve') ||
      errorMessage.includes('enotfound')) {
    return 'Unable to reach the server. Please check your internet connection.';
  }
  
  // Connection refused
  if (errorMessage.includes('connection refused') || 
      errorMessage.includes('econnrefused')) {
    return 'Server is temporarily unavailable. Please try again in a few moments.';
  }
  
  // SSL/Certificate errors
  if (errorMessage.includes('certificate') || 
      errorMessage.includes('ssl') ||
      errorMessage.includes('tls')) {
    return 'Secure connection failed. Please check your internet connection.';
  }
  
  // Rate limiting
  if (errorMessage.includes('too many requests') || 
      errorMessage.includes('rate limit')) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  
  // Server errors (5xx)
  if (errorMessage.includes('500') || 
      errorMessage.includes('502') || 
      errorMessage.includes('503') || 
      errorMessage.includes('504')) {
    return 'Server is temporarily unavailable. Please try again later.';
  }
  
  // Authentication errors
  if (errorMessage.includes('unauthorized') || 
      errorMessage.includes('401')) {
    return 'Authentication failed. Please log in again.';
  }
  
  // Forbidden errors
  if (errorMessage.includes('forbidden') || 
      errorMessage.includes('403')) {
    return 'Access denied. You may not have permission for this action.';
  }
  
  // API key or quota errors
  if (errorMessage.includes('api key') || 
      errorMessage.includes('quota') ||
      errorMessage.includes('billing')) {
    return 'Service temporarily unavailable. Please try again later.';
  }
  
  // Location/GPS specific errors
  if (errorMessage.includes('location') && 
      (errorMessage.includes('denied') || errorMessage.includes('permission'))) {
    return 'Location access denied. Please enable location services and try again.';
  }
  
  // Parse JSON errors
  if (errorMessage.includes('json') || 
      errorMessage.includes('parse')) {
    return 'Server response error. Please try again.';
  }
  
  // Default fallback for unknown errors
  return 'Connection problem. Please check your internet and try again.';
};

export const handleAsyncError = async (asyncFunction, fallbackMessage = null) => {
  try {
    return await asyncFunction();
  } catch (error) {
    console.error('Async operation failed:', error);
    const userMessage = fallbackMessage || getNetworkErrorMessage(error);
    throw new Error(userMessage);
  }
};

export const isConnectionError = (error) => {
  if (!error) return false;
  
  const errorMessage = error.message?.toLowerCase() || '';
  
  return errorMessage.includes('network request failed') ||
         errorMessage.includes('failed to fetch') ||
         errorMessage.includes('network error') ||
         errorMessage.includes('timeout') ||
         errorMessage.includes('enotfound') ||
         errorMessage.includes('connection refused');
};
