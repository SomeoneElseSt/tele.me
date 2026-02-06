/**
 * IndexedDB wrapper for persistent video storage
 * Stores video blobs with metadata for cross-session persistence
 */

const DB_NAME = 'teleme.me-videos'
const DB_VERSION = 1
const STORE_NAME = 'videos'
const MAX_VIDEOS = 10
const MAX_STORAGE_MB = 500 // 500MB total storage limit

export type StoredVideo = {
    id: string
    blob: Blob
    createdAt: number
    mimeType?: string
    takeNumber: number
}

type VideoMetadata = Omit<StoredVideo, 'blob'> & {
    size: number
}

/**
 * Initialize the IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION)

        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result)

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' })
            }
        }
    })
}

/**
 * Check available storage quota
 */
export async function checkStorageQuota(): Promise<{
    available: boolean
    usedMB: number
    quotaMB: number
}> {
    if (!navigator.storage?.estimate) {
        return { available: true, usedMB: 0, quotaMB: Infinity }
    }

    try {
        const estimate = await navigator.storage.estimate()
        const usedMB = (estimate.usage ?? 0) / (1024 * 1024)
        const quotaMB = (estimate.quota ?? Infinity) / (1024 * 1024)
        const available = usedMB + 100 < quotaMB // Keep 100MB buffer

        return { available, usedMB, quotaMB }
    } catch {
        return { available: true, usedMB: 0, quotaMB: Infinity }
    }
}

/**
 * Get current video count in storage
 */
export async function getVideoCount(): Promise<number> {
    try {
        const db = await openDB()
        const transaction = db.transaction(STORE_NAME, 'readonly')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.count()

        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
        })
    } catch (error) {
        console.error('Failed to get video count:', error)
        return 0
    }
}

/**
 * Get total storage size used by videos
 */
export async function getStorageSize(): Promise<number> {
    try {
        const db = await openDB()
        const transaction = db.transaction(STORE_NAME, 'readonly')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.getAll()

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const videos = request.result as StoredVideo[]
                const totalSize = videos.reduce((sum, video) => sum + video.blob.size, 0)
                resolve(totalSize)
            }
            request.onerror = () => reject(request.error)
        })
    } catch (error) {
        console.error('Failed to get storage size:', error)
        return 0
    }
}

/**
 * Save a video to IndexedDB
 */
export async function saveVideo(video: StoredVideo): Promise<void> {
    const count = await getVideoCount()
    if (count >= MAX_VIDEOS) {
        throw new Error(`Maximum of ${MAX_VIDEOS} videos can be stored`)
    }

    const quota = await checkStorageQuota()
    if (!quota.available) {
        throw new Error('Insufficient storage space available')
    }

    const sizeMB = video.blob.size / (1024 * 1024)
    if (sizeMB > MAX_STORAGE_MB) {
        throw new Error(`Video size (${sizeMB.toFixed(1)}MB) exceeds maximum (${MAX_STORAGE_MB}MB)`)
    }

    const db = await openDB()
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
        const request = store.put(video)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
    })
}

/**
 * Load all videos from IndexedDB
 */
export async function loadVideos(): Promise<StoredVideo[]> {
    try {
        const db = await openDB()
        const transaction = db.transaction(STORE_NAME, 'readonly')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.getAll()

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const videos = request.result as StoredVideo[]
                // Sort by creation time, newest first
                videos.sort((a, b) => b.createdAt - a.createdAt)
                resolve(videos)
            }
            request.onerror = () => reject(request.error)
        })
    } catch (error) {
        console.error('Failed to load videos:', error)
        return []
    }
}

/**
 * Delete a single video from IndexedDB
 */
export async function deleteVideo(id: string): Promise<void> {
    try {
        const db = await openDB()
        const transaction = db.transaction(STORE_NAME, 'readwrite')
        const store = transaction.objectStore(STORE_NAME)

        return new Promise((resolve, reject) => {
            const request = store.delete(id)
            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
        })
    } catch (error) {
        console.error('Failed to delete video:', error)
    }
}

/**
 * Clear all videos from IndexedDB
 */
export async function clearAllVideos(): Promise<void> {
    try {
        const db = await openDB()
        const transaction = db.transaction(STORE_NAME, 'readwrite')
        const store = transaction.objectStore(STORE_NAME)

        return new Promise((resolve, reject) => {
            const request = store.clear()
            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
        })
    } catch (error) {
        console.error('Failed to clear videos:', error)
    }
}
