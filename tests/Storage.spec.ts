import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as sinon from 'sinon';
import { FileStorage } from '../src/Storage';

const testFilePath = path.join(__dirname, 'test.txt');
const testDirPath = path.join(__dirname, 'testDir');

describe('FileStorage', () => {
  afterEach(async () => {
    try {
      await fs.promises.unlink(testFilePath);
    } catch (err) {} // Ignore if file doesn't exist

    try {
      await fs.promises.rm(testDirPath, { recursive: true });
    } catch (err) {} // Ignore if directory doesn't exist
  });

  it('should read from a file', async () => {
    await fs.promises.writeFile(testFilePath, 'test data');
    const data = await FileStorage.read(testFilePath);
    assert.equal(data, 'test data');
  });

  it('should throw error if file not found while reading', async () => {
    try {
      await FileStorage.read('non_existent_file.txt');
      assert.fail('Should throw an error');
    } catch (error) {
      // Check if correct error type is thrown
    }
  });

  it('should write to a file', async () => {
    await FileStorage.write(testFilePath, 'test data');
    const data = await fs.promises.readFile(testFilePath, 'utf-8');
    assert.equal(data, 'test data');
  });

  it('should check if a file exists', async () => {
    assert.equal(await FileStorage.exists(testFilePath), false);
    await fs.promises.writeFile(testFilePath, 'Some Text');
    assert.equal(await FileStorage.exists(testFilePath), true);
  });

  it('should check if a file exists (negative case)', async () => {
    assert.equal(await FileStorage.exists('non_existent_file.txt'), false);
  });

  it('should make a directory', async () => {
    await FileStorage.mkdir(testDirPath);
    assert.equal(fs.existsSync(testDirPath), true);
  });

  it('should make a directory (directory already exists)', async () => {
    await fs.promises.mkdir(testDirPath);
    await FileStorage.mkdir(testDirPath);
    assert.equal(fs.existsSync(testDirPath), true);
  });

  it('should throw error making directory, other than directory exists', async () => {
    const originalMkdir = fs.promises.mkdir;

    try {
      const mockEAccessError = new Error('Mock EACCES error');
      mockEAccessError.cause = { code: 'EACCES' };
      sinon.stub(fs.promises, 'mkdir').throws(mockEAccessError);

      await FileStorage.mkdir(testDirPath);
      assert.fail('Should have thrown an error');
    } catch (error) {
      assert.notEqual(error.code, 'EEXIST');
    } finally {
      fs.promises.mkdir = originalMkdir;
    }
  });
});
