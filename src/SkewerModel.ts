import { randomUUID } from 'crypto';

import { SchemaValidationError, RecordNotFoundError, FileLoadError, DuplicateIdError } from './SkewerError';
import { DataCacheType, IndexCache, ISkewerModel, SchemaType } from './types';
import { booleanIsTrue } from './utils';
import { FileStorage } from './Storage';
import { CONSTANTS } from './Constants';

export class SkewerModel<T extends ISkewerModel> {
  private schema: SchemaType;
  private path: string;
  private basePath: string;
  private isTxnOpen: boolean;
  private dataCache: DataCacheType<T>;
  // { "indexedField": { "indexedFieldValue": ["database_id_1", "database_id_2"] } }
  private indexCache: IndexCache;
  private isIndexDirty: boolean;

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
    this.dataCache = {};
    this.isTxnOpen = false;
    this.isIndexDirty = false;
    this.indexCache = {};
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
    let fileData: string, indexFileData: string;
    try {
      fileData = await FileStorage.read(`${this.path}.json`);
      indexFileData = await FileStorage.read(`${this.path}_index.json`);
    } catch (error) {
      throw new FileLoadError(`${this.path}.json`);
    }

    const records: { [id: string]: T } = JSON.parse(fileData);
    this.dataCache = records;

    this.indexCache = JSON.parse(indexFileData);
  }

  /**
   * Saves the updated state of a collection to disk
   *
   * @private
   */
  private async saveFile(): Promise<void> {
    if (!this.isTxnOpen) {
      await FileStorage.write(`${this.path}.json`, JSON.stringify(this.dataCache));

      if (this.isIndexDirty) {
        await FileStorage.write(`${this.path}_index.json`, JSON.stringify(this.indexCache));
      }
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
      if (booleanIsTrue(this.schema[key].unique) && this.find({ [key]: record[key] }).length > (isUpdate ? 1 : 0)) {
        throw new SchemaValidationError(`${record[key]}`, `unique`);
      }
    }
  }

  /**
   * Updates the index cache for one record
   *
   * @param  {any} record the insert / update record data
   * @param  {string} id id of the record being inserted / updated
   * @private
   * @returns void
   */
  private addToIndex(record: any, id: string): void {
    this.isIndexDirty = true;

    Object.keys(record).forEach((recordKey) => {
      const recordValue = record[recordKey];

      if (CONSTANTS.ignoredDBRecordKeys.includes(recordKey)) {
      } else if (this.schema[recordKey].unique || this.schema[recordKey].index) {
        if (!this.indexCache[recordKey] || !this.indexCache[recordKey][recordValue]) {
          this.indexCache[recordKey] = { [recordValue]: [] };
        }

        this.indexCache[recordKey][recordValue].push(id);
      }
    });
  }

  /**
   * Removes the old indexed value and adds the new one
   *
   * @param  {any} oldRecord
   * @param  {any} newRecord
   * @param  {string} id
   * @private
   * @returns void
   */
  private updateInIndex(oldRecord: any, newRecord: any, id: string): void {
    this.isIndexDirty = true;

    Object.keys(newRecord).forEach((recordKey) => {
      const recordValue = newRecord[recordKey];

      if (CONSTANTS.ignoredDBRecordKeys.includes(recordKey)) {
      } else if (this.schema[recordKey].unique || this.schema[recordKey].index) {
        if (!this.indexCache[recordKey]) {
          this.indexCache[recordKey] = { [recordValue]: [] };
        }

        // locates the index for a field with the old value and then removes the record id from the id array
        this.indexCache[recordKey][oldRecord[recordKey]] = this.indexCache[recordKey][oldRecord[recordKey]].filter(
          (x) => x !== id
        );

        this.indexCache[recordKey][recordValue].push(id);
      }
    });
  }

  /**
   * Removes the deleted value from index
   *
   * @param  {any} oldRecord
   * @param  {string} id
   * @private
   * @returns void
   */
  private deleteInIndex(oldRecord: any, deleteId: string): void {
    this.isIndexDirty = true;

    Object.keys(oldRecord).forEach((recordKey) => {
      const recordValue = oldRecord[recordKey];

      if (CONSTANTS.ignoredDBRecordKeys.includes(recordKey)) {
      } else if (this.schema[recordKey].unique || this.schema[recordKey].index) {
        if (!this.indexCache[recordKey]) {
          this.indexCache[recordKey] = { [recordValue]: [] };
        }

        // locates the index for a field with the old value and then removes the record id from the id array
        this.indexCache[recordKey][oldRecord[recordKey]] = this.indexCache[recordKey][oldRecord[recordKey]].filter(
          (x) => x !== deleteId
        );
      }
    });
  }
  // #endregion

  /**
   * @returns Promise
   */
  async initialize(): Promise<SkewerModel<T>> {
    if (!(await FileStorage.exists(this.basePath))) {
      await FileStorage.mkdir(this.basePath);
    }

    // Initializes the empty json files if missing
    if (!(await FileStorage.exists(`${this.path}.json`))) {
      await FileStorage.write(`${this.path}.json`, '{}');
    }

    // Initializes the empty json files if missing
    if (!(await FileStorage.exists(`${this.path}_index.json`))) {
      await FileStorage.write(`${this.path}_index.json`, '{}');
    }

    await this.loadFile();

    return this;
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
    return Array.from(Object.values(this.dataCache));
  }

  /**
   * Locates a record by id and returns it
   *
   * @param {string} recordId
   * @returns the record if found else returns undefined
   */
  findById(recordId: string): T | undefined {
    return this.dataCache[recordId];
  }

  /**
   * Locates all records that match the search parameters (case-sensitive)
   *
   * @param {object} searchParams search parameters
   * @returns an array of records found
   */
  find(searchParams: { [key: string]: string | number | boolean }): Array<T> {
    const foundRecords: Array<any> = [],
      tempDataCache: DataCacheType<any> = {},
      searchPArr = Object.entries(searchParams);
    let counter = 0;

    for (const [key, value] of searchPArr) {
      ++counter;

      if (this.schema[key].unique || this.schema[key].index) {
        const dbIds = this.indexCache[key]?.[value as any] || [];

        dbIds.forEach((dbId) => {
          const record = (counter === 1 ? this.dataCache : tempDataCache)[dbId];
          if (record) tempDataCache[dbId] = { ...record, count: (record.count || 0) + 1 };
        });
      } else {
        Object.values(counter === 1 ? this.dataCache : tempDataCache).forEach((dcValue) => {
          if (dcValue[key] === value) {
            tempDataCache[dcValue.id] = { ...dcValue, count: (dcValue.count || 0) + 1 };
          }
        });
      }

      if (tempDataCache.size === 0) {
        break;
      }
    }

    Object.values(tempDataCache).forEach((value) => {
      if (value.count === searchPArr.length) {
        delete value.count;
        foundRecords.push(value);
      }
    });

    return foundRecords;
  }

  /**
   * Counts the number of records in a collection
   *
   * @returns count of records
   */
  countAll(): number {
    return Object.keys(this.dataCache).length;
  }

  /**
   * Inserts a single record
   *
   * @param {any} record
   * @param {string} id? custom id to be used while inserting the record
   * @returns {Promise<T>} returns the inserted record or throws error if schema validation fails
   * @throws SchemaValidationError
   */
  async insertOne(record: any, id?: string): Promise<T> {
    if (id && this.dataCache[id]) {
      throw new DuplicateIdError();
    }

    this.validateSchema(record);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _, ...strippedRecord } = record;

    const newId = id || randomUUID();

    this.addToIndex(strippedRecord, newId);

    record.id = newId;
    record.createdAt = new Date().toISOString();
    record.updatedAt = new Date().toISOString();

    this.dataCache[newId] = record;

    await this.saveFile();

    return record;
  }

  /**
   * Inserts multiple records
   *
   * @param  {Array<any>} newRecords Array of multiple records with or without ids
   * @returns {Promise<Array<T>>} returns all inserted json documents in an array or throws error if schema validation fails
   * @throws SchemaValidationError
   */
  async insertMany(newRecords: Array<any>): Promise<Array<T>> {
    newRecords.forEach((x) => {
      this.validateSchema(x);

      const newId = x.id || randomUUID();

      this.addToIndex(x, newId);

      x.id = newId;
      x.createdAt = new Date().toISOString();
      x.updatedAt = new Date().toISOString();

      this.dataCache[newId] = x;
    });

    await this.saveFile();

    return newRecords;
  }

  /**
   * Finds a record by id and updates it
   *
   * @param  {string} recordId search id
   * @param  {Partial<T>} newRecord partial record with new values
   * @returns {Promise<T>} new updated record
   * @throws RecordNotFoundError | SchemaValidationError
   */
  async updateById(recordId: string, newRecord: Partial<T>): Promise<T> {
    const oldRecord = this.dataCache[recordId];

    if (!oldRecord) {
      throw new RecordNotFoundError();
    }

    // in case id or created at fields are passed delete them
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, createdAt, updatedAt, ...strippedNewRecord } = newRecord;

    this.updateInIndex(oldRecord, strippedNewRecord, oldRecord.id);

    const formedNewRecord = { ...oldRecord, ...strippedNewRecord, updatedAt: new Date().toISOString() };
    this.validateSchema(formedNewRecord, true);

    this.dataCache[recordId] = formedNewRecord;

    await this.saveFile();

    return formedNewRecord;
  }

  /**
   * Will update and existing record or insert a new one
   *
   * @param  {Partial<T>} record
   * @param  {string} id
   * @returns {Promise<T>} new updated / inserted record
   * @throws RecordNotFoundError | SchemaValidationError
   */
  insertOrUpdate(record: Partial<T>, id: string): Promise<T> {
    if (this.dataCache[id]) {
      return this.updateById(id, record);
    } else {
      return this.insertOne(record, id);
    }
  }

  /**
   * Searches for a record by id and deletes it
   *
   * @param  {string} recordId id to search for
   * @returns {Promise<T>} the deleted record
   * @throws RecordNotFoundError
   */
  async deleteById(recordId: string): Promise<T> {
    const deletedRecord = this.dataCache[recordId];

    if (!deletedRecord) {
      throw new RecordNotFoundError();
    }

    delete this.dataCache[recordId];

    this.deleteInIndex(deletedRecord, recordId);

    await this.saveFile();

    return deletedRecord;
  }

  /**
   * Deletes all records in a collection
   */
  async deleteAll(): Promise<void> {
    this.dataCache = {};
    await this.saveFile();
  }
}
