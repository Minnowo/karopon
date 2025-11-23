/**
 * Trigger a download of any Blob data with the specified filename.
 * @param data Blob object to download
 * @param filename Name of the file to save as
 */
export function DownloadData(data: Blob, filename: string) {
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
}
