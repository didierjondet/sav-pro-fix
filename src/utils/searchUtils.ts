/**
 * Utility function for multi-word search functionality
 * Splits search terms by spaces and checks if ALL words are found in the target text
 */
export const multiWordSearch = (searchTerm: string, ...targetTexts: (string | undefined | null)[]): boolean => {
  if (!searchTerm.trim()) return true;
  
  // Split search term into individual words and filter out empty strings
  const searchWords = searchTerm.toLowerCase().trim().split(/\s+/).filter(word => word.length > 0);
  
  // Combine all target texts into one searchable string, filtering out null/undefined values
  const combinedText = targetTexts
    .filter((text): text is string => text != null && text !== undefined)
    .join(' ')
    .toLowerCase();
  
  // Check if ALL search words are found in the combined text
  return searchWords.every(word => combinedText.includes(word));
};