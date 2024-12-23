import * as fs from 'fs';

export class FileStorage {
  /**
   * Asynchronously reads the entire contents of a file
   *
   * @param  {string} path
   * @returns Promise<string>
   */
  static async read(path: string): Promise<string> {
    return fs.promises.readFile(path, 'utf-8');
  }

  /**
   * Asynchronously writes data to a file, replacing the file if it already exists
   *
   * @param  {string} path
   * @param  {string} data
   * @returns Promise
   */
  static async write(path: string, data: string): Promise<void> {
    return fs.promises.writeFile(path, data);
  }

  /**
   * Tests a user's permissions for the location specified
   *
   * @param  {string} path
   * @returns Promise<boolean>
   */
  static async exists(path: string): Promise<boolean> {
    try {
      await fs.promises.access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Asynchronously creates a directory
   *
   * @param  {string} path
   * @returns Promise
   */
  static async mkdir(path: string): Promise<void> {
    try {
      await fs.promises.mkdir(path);
    } catch (error) {
      if (error.code === 'EEXIST') {
        return;
      }

      throw error;
    }
  }
}
