import { randomUUID } from 'crypto';

import { SchemaValidationError, RecordNotFoundError, FileLoadError, DuplicateIdError } from './SkewerError';
import { ISkewerModel, SchemaType } from './types';
import { booleanIsTrue } from './utils';
import { FileStorage } from './Storage';

export class SkewerModel<T extends ISkewerModel> {
  private schema: SchemaType;
  private path: string;
  private basePath: string;
  private isTxnOpen: boolean;
  private dataCache: Map<string, T>;

  /**
   * Default constructor
   *
   * @param {string} name Name of the model
   * @param {SchemaType} schema Schema of the model
   * @param {string} basePath Custom path to use for data store in disk, defaults to "process.cwd()/storage"
   */
  constructor(name: string, schema: SchemaType, basePath = `${process.cwd()}/storage`) {
    this.basePath = basePath;
    this.path = `${basePath}/${name}`;
    this.schema = schema;
    this.dataCache = new Map();
    this.isTxnOpen = false;
  }

  // #region private methods
  /**
   * Loads the json data file into memory from disk
   *
   * @private
   * @returns Promise<void>
   * @throws FileLoadError
   */
  private async loadFile(): Promise<void> {
    let fileData: string;
    try {
      fileData = await FileStorage.read(`${this.path}.json`);
    } catch (error) {
      throw new FileLoadError(`${this.path}.json`);
    }

    const records: { [id: string]: T } = JSON.parse(fileData);
    this.dataCache = new Map(Object.entries(records));
  }

  /**
   * Saves the updated state of a collection to disk
   *
   * @private
   */
  private async saveFile(): Promise<void> {
    if (!this.isTxnOpen) {
      await FileStorage.write(`${this.path}.json`, JSON.stringify(Object.fromEntries(this.dataCache)));
    }
  }

  /**
   * Validates the record against schema and throws error if validation fails
   *
   * @param {T} record document to be validated
   * @private
   * @returns {void}
   * @throws SchemaValidationError
   */
  private validateSchema(record: T, isUpdate = false): void {
    for (const key in this.schema) {
      // validate required clause
      if (this.schema[key].required && !record[key]?.toString()) {
        throw new SchemaValidationError(record[key], 'required field');
      }
      // validate type
      if (record[key] && record[key].toString() && !(record[key].constructor === this.schema[key].type)) {
        throw new SchemaValidationError(`${record[key]}`, `should be of type ${this.schema[key].type.name}`);
      }
      // validate enum
      if (
        record[key] &&
        this.schema[key].enum &&
        this.schema[key].type === String &&
        !this.schema[key]?.enum?.includes(record[key])
      ) {
        throw new SchemaValidationError(`${record[key]}`, `enum ${this.schema[key].enum}`);
      }
      // validate unique
      if (booleanIsTrue(this.schema[key].unique) && this.findByKey(key, record[key]).length > (isUpdate ? 1 : 0)) {
        throw new SchemaValidationError(`${record[key]}`, `unique`);
      }
    }
  }
  // #endregion

  /**
   * @returns Promise
   */
  async initialize(): Promise<void> {
    if (!(await FileStorage.exists(this.basePath))) {
      await FileStorage.mkdir(this.basePath);
    }

    // Initializes the empty json files if missing
    if (!(await FileStorage.exists(`${this.path}.json`))) {
      await FileStorage.write(`${this.path}.json`, '{}');
    }

    this.loadFile();
  }

  /**
   * Start a transaction block to increase efficiency of multiple write operations
   */
  openTransaction() {
    this.isTxnOpen = true;
  }

  /**
   * Close transaction block and save all changes to disk
   */
  async commitTransaction(): Promise<void> {
    this.isTxnOpen = false;
    this.saveFile();
  }

  /**
   * Abort transaction block and discard all changes
   */
  async abortTransaction(): Promise<void> {
    this.isTxnOpen = false;
    this.loadFile();
  }

  /**
   * Gets all records from DB
   *
   * @returns {Array<T>} Array of records
   */
  getAllRecords(): Array<T> {
    return Array.from(this.dataCache.values());
  }

  /**
   * Locates a record by id and returns it
   *
   * @param {string} recordId
   * @returns the record if found else returns undefined
   */
  findById(recordId: string): T | undefined {
    return this.dataCache.get(recordId);
  }

  /**
   * Locates a record using a key value pair
   *
   * @param {string} key sarch field
   * @param {any} value search value
   * @returns an array of records found
   */
  findByKey(key: string, value: any): Array<T> {
    const foundRecords: Array<T> = [];

    this.dataCache.forEach((dcValue) => {
      if (dcValue[key] === value) foundRecords.push(dcValue);
    });

    return foundRecords;
  }

  /**
   * Locates a record using 2 key value pairs
   *
   * @param {string} key1 sarch field 1
   * @param {any} value1 search value 1
   * @param {string} key2 sarch field 2
   * @param {any} value2 search value 2
   * @returns an array of records found
   */
  findByTwoKeys(key1: string, value1: any, key2: string, value2: any): Array<T> {
    const foundRecords: Array<T> = [];

    this.dataCache.forEach((dcValue) => {
      if (dcValue[key1] === value1 && dcValue[key2] === value2) foundRecords.push(dcValue);
    });

    return foundRecords;
  }
  /**
   * Counts the number of records in a collection
   *
   * @returns count of records
   */
  countAll(): number {
    return this.dataCache.size;
  }

  /**
   * Inserts a single record
   *
   * @param {any} record
   * @param {string} id? custom id to be used while inserting the record
   * @returns {T} returns the inserted record or throws error if schema validation fails
   * @throws SchemaValidationError
   */
  insertOne(record: any, id?: string): T {
    if (id && this.dataCache.has(id)) {
      throw new DuplicateIdError();
    }

    this.validateSchema(record);

    const newId = id || randomUUID();

    record.id = newId;
    record.createdAt = new Date();
    record.updatedAt = new Date();

    this.dataCache.set(newId, record);

    this.saveFile();

    return record;
  }

  /**
   * Inserts multiple records
   *
   * @param  {Array<any>} newRecords Array of multiple records with or without ids
   * @returns {Array<T>} returns all inserted json documents in an array or throws error if schema validation fails
   * @throws SchemaValidationError
   */
  insertMany(newRecords: Array<any>): Array<T> {
    newRecords.forEach((x) => {
      this.validateSchema(x);

      const newId = x.id || randomUUID();
      x.id = newId;
      x.createdAt = new Date();
      x.updatedAt = new Date();

      this.dataCache.set(newId, x);
    });

    this.saveFile();

    return newRecords;
  }

  /**
   * Finds a record by id and updates it
   *
   * @param  {string} recordId search id
   * @param  {Partial<T>} newRecord partial record with new values
   * @returns {T} new updated record
   * @throws RecordNotFoundError | SchemaValidationError
   */
  updateById(recordId: string, newRecord: Partial<T>): T {
    const oldRecord = this.dataCache.get(recordId);

    if (!oldRecord) {
      throw new RecordNotFoundError();
    }

    // in case id or created at fields are passed delete them
    delete newRecord.id;
    delete newRecord.createdAt;

    const formedNewRecord = { ...oldRecord, ...newRecord, updatedAt: new Date() };

    this.validateSchema(formedNewRecord, true);

    this.dataCache.set(recordId, formedNewRecord);

    this.saveFile();

    return formedNewRecord;
  }

  /**
   * Will update and existing record or insert a new one
   *
   * @param  {Partial<T>} record
   * @param  {string} id
   * @returns {T} new updated / inserted record
   * @throws RecordNotFoundError | SchemaValidationError
   */
  insertOrUpdate(record: Partial<T>, id: string): T {
    if (this.dataCache.has(id)) {
      return this.updateById(id, record);
    } else {
      return this.insertOne(record, id);
    }
  }

  /**
   * Searches for a record by id and deletes it
   *
   * @param  {string} recordId id to search for
   * @returns {T} the deleted record
   * @throws RecordNotFoundError
   */
  deleteById(recordId: string): T {
    const deletedRecord = this.dataCache.get(recordId);

    if (!deletedRecord || !this.dataCache.delete(recordId)) {
      throw new RecordNotFoundError();
    }

    this.saveFile();

    return deletedRecord;
  }

  /**
   * Deletes all records in a collection
   */
  deleteAll(): void {
    this.dataCache.clear();
    this.saveFile();
  }
}
