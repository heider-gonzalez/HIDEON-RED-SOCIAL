/**
 * Cache for column existence checks to avoid repeated database queries
 */

const columnCache = new Map<string, boolean>();

export async function checkColumnExistsWithCache(
  tableName: string,
  columnName: string,
  checkFn: () => Promise<boolean>
): Promise<boolean> {
  const cacheKey = `${tableName}.${columnName}`;
  
  // Return cached value if available
  if (columnCache.has(cacheKey)) {
    return columnCache.get(cacheKey)!;
  }
  
  // Check and cache the result
  const exists = await checkFn();
  columnCache.set(cacheKey, exists);
  
  return exists;
}

export function clearColumnCache(): void {
  columnCache.clear();
}

export function getColumnCacheStats(): { size: number; keys: string[] } {
  return {
    size: columnCache.size,
    keys: Array.from(columnCache.keys())
  };
}
