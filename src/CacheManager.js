// @flow
import * as _ from "lodash";
import {FileSystem} from "expo";
import SHA1 from "crypto-js/sha1";

const BASE_DIR = `${FileSystem.cacheDirectory}expo-image-cache/`;

export class CacheEntry {

    uri: string;
    options: FileSystem.DownloadOptions;
    path: string;

    constructor(uri: string, options: FileSystem.DownloadOptions) {
        this.uri = uri;
        this.options = options;
    }

    async getPath(): Promise<?string> {
        const {uri,options} = this;
        const {path, exists, tmpPath} = await getCacheEntry(uri);
        if (exists) {
            return path;
        }

        await FileSystem.createDownloadResumable(uri, tmpPath, options).downloadAsync();
        await FileSystem.moveAsync({ from: tmpPath, to: path });
        return path;
    }
}

export default class CacheManager {

    static entries: { [uri: string]: CacheEntry } = {};

    static get({ uri, ...options }: { uri: string, ...options: FileSystem.DownloadOptions }): CacheEntry {
        if (!CacheManager.entries[uri]) {
            CacheManager.entries[uri] = new CacheEntry(uri, options);
        }
        return CacheManager.entries[uri];
    }

    static async clearCache(): Promise<void> {
        await FileSystem.deleteAsync(BASE_DIR, { idempotent: true });
        await FileSystem.makeDirectoryAsync(BASE_DIR);
    }
}

const getCacheEntry = async (uri: string): Promise<{ exists: boolean, path: string, tmpPath: string }> => {
    const filename = uri.substring(uri.lastIndexOf("/"), uri.indexOf("?") === -1 ? uri.length : uri.indexOf("?"));
    const ext = filename.indexOf(".") === -1 ? ".jpg" : filename.substring(filename.lastIndexOf("."));
    const path = `${BASE_DIR}${SHA1(uri)}${ext}`;
    const tmpPath = `${BASE_DIR}${SHA1(uri)}-${_.uniqueId()}${ext}`;
    // TODO: maybe we don't have to do this every time
    try {
        await FileSystem.makeDirectoryAsync(BASE_DIR);
    } catch (e) {
        // do nothing
    }
    const info = await FileSystem.getInfoAsync(path);
    const {exists} = info;
    return { exists, path, tmpPath };
};
