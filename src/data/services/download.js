import { get } from 'axios';
import * as module from './download';

/**
 * Download a file and return its blob is successful, or null if not.
 * @param {obj} file - file entry with downloadUrl
 * @return {blob} - file blob or null
 */
export const downloadFile = (file) => (
  get(file.downloadUrl)
    .then(resp => resp.data)
    .catch(() => null)
);

/**
 * Download blobs given file objects.  Returns a promise map.
 * @param {obj[]} files - list of file entries with downloadUrl, name, and description
 * @return {Promise[]} - Promise map of download attempts (null for failed fetches)
 */
export const downloadFileBlobs = (files) => Promise.all(files.map(module.downloadFile));

export const getTextFileContent = (url, { onSuccess, onError }) => (
  get(url)
    .then(({ data }) => onSuccess(data))
    .catch(({ response }) => onError(response.status))
);
