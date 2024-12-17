import * as fs from 'fs';

import { randomUUID } from 'crypto';

import { DBError } from './DBError';
import { ISkewerModel, SchemaType } from './types';
import { booleanIsTrue } from './utils';

interface GenericRecordType<T extends ISkewerModel> {
  [id: string]: T;
}

export class SkewerModel<T extends ISkewerModel> {
  name: string;

  schema: SchemaType;

  path: string;

  /**
   * Default constructor
   *
   * @param {string} name Name of the model
   * @param {SchemaType} schema Schema of the model
   */
  constructor(name: string, schema: SchemaType) {
    console.log('constructed');
    this.name = name;
    this.path = `${process.cwd()}/storage/${name}`;
    this.schema = schema;

    if (!fs.existsSync(`${process.cwd()}/storage`)) {
      fs.mkdirSync(`${process.cwd()}/storage`);
    }

    this.initialize();
  }
  /**
   * Initializes the empty json files if missing
   *
   * @private
   */
  private initialize() {
    if (!fs.existsSync(`${this.path}.json`)) {
      fs.writeFileSync(`${this.path}.json`, '{}');
    }

    if (!fs.existsSync(`${this.path}_values.json`)) {
      fs.writeFileSync(`${this.path}_values.json`, '[]');
    }
  }

  /**
   * Loads the json data file from memory
   *
   * @private
   * @returns {object} GenericRecordType
   */
  private loadFile(): GenericRecordType<T> {
    console.log('file accessed');
    return JSON.parse(
      fs.readFileSync(`${this.path}.json`, {
        encoding: 'utf-8',
      })
    );
  }
  /**
   * Loads the json array files from memory
   *
   * @returns {array} Array
   */
  private loadValuesFile(): Array<T> {
    return JSON.parse(
      fs.readFileSync(`${this.path}_values.json`, {
        encoding: 'utf-8',
      })
    );
  }

  /**
   * Gets all records from DB
   *
   * @returns {Array<T>} Array of records
   */
  public getAllRecords(): Array<T> {
    const valuesFile = this.loadValuesFile();

    return valuesFile;
  }

  /**
   * Locates a record by id and returns it
   *
   * @param {string} recordId
   * @returns {T | undefined} record
   */
  public findById(recordId: string): T | undefined {
    const records = this.loadFile();

    return records[recordId];
  }

  /**
   * Locates a record using a key value pair
   *
   * @param {string} key sarch field
   * @param {any} value search value
   * @returns {T | undefined} record
   */
  public findByKey(key: string, value: any): T | undefined {
    const valuesFile = this.loadValuesFile();

    return valuesFile.find((x) => x[key] === value);
  }
  /**
   * Locates a record using 2 key value pairs
   *
   * @param {string} key1 sarch field 1
   * @param {any} value1 search value 1
   * @param {string} key2 sarch field 2
   * @param {any} value2 search value 2
   * @returns {T | undefined} record
   */
  public findByTwoKeys(key1: string, value1: any, key2: string, value2: any): T | undefined {
    const valuesFile = this.loadValuesFile();

    return valuesFile.find((x) => x[key1] === value1 && x[key2] === value2);
  }

  /**
   * Validates the record against schema and throws error if validation fails
   *
   * @param {T} record
   * @returns void
   */
  public validateSchema(record: T): void {
    for (const key in this.schema) {
      // validate required clause
      if (this.schema[key].required && !record[key]?.toString()) {
        throw new Error(`${record[key]} is a required field for ${key}!`);
      }
      // validate type
      if (record[key] && record[key].toString() && record[key] instanceof this.schema[key].type) {
        throw new Error(`value "${record[key]}" for key "${key}" should be of type ${this.schema[key].type.name}!`);
      }
      // validate enum
      if (this.schema[key].enum && this.schema[key].type === String && !this.schema[key]?.enum?.includes(record[key])) {
        throw new Error(`${record[key]} does not satisfy the schemas enum criteria ${this.schema[key].enum}!`);
      }
      // validate unique
      if (booleanIsTrue(this.schema[key].unique) && this.findByKey(key, record[key])) {
        throw new Error(`${record[key]} does not satisfy the schemas unique criteria!`);
      }
    }
  }

  /**
   * Inserts a single record
   *
   * @param {any} record
   * @param {string} id? custom id to be used while inserting the record
   * @returns {T} returns the inserted record or throws error if schema validation fails
   */
  public insertOne(record: any, id?: string): T {
    const records = this.loadFile();

    this.validateSchema(record);

    const newId = id || randomUUID();
    record.id = newId;
    record.createdAt = new Date();
    record.updatedAt = new Date();
    records[newId] = record;

    this.saveState(records);

    return record;
  }

  /**
   * Inserts multiple records
   *
   * @param  {Array<any>} newRecords Array of multiple records with or without ids
   * @returns {GenericRecordType<T>} returns multiple json documents in a single object or throws error if schema validation fails
   */
  public insertMany(newRecords: Array<any>): GenericRecordType<T> {
    const records = this.loadFile();

    newRecords.forEach((x) => {
      this.validateSchema(x);

      const newId = x.id || randomUUID();
      x.id = newId;
      x.createdAt = new Date();
      x.updatedAt = new Date();

      records[newId] = x;
    });

    this.saveState(records);

    return records;
  }

  /**
   * Finds a record by id and updates it
   *
   * @param  {string} recordId search id
   * @param  {Partial<T>} newRecord partial record with new values
   * @returns {T | Error} new updated record or error if record is not found
   */
  public updateById(recordId: string, newRecord: Partial<T>): T | Error {
    const records = this.loadFile();

    const oldRecord = records[recordId];

    if (!oldRecord) {
      return new DBError('Record not found!');
    }

    delete newRecord.id;
    delete newRecord.createdAt;

    records[recordId] = { ...oldRecord, ...newRecord, updatedAt: new Date() };

    this.saveState(records);

    return records[recordId];
  }

  /**
   * Will update and existing record or insert a new one
   *
   * @param  {Partial<T>} record
   * @param  {string} id
   * @returns {T} new updated record
   */
  public insertOrUpdate(record: Partial<T>, id: string): T {
    const records = this.loadFile();

    if (records[id]) {
      // update
      const oldRecord = records[id];

      records[id] = { ...oldRecord, ...record, updatedAt: new Date() };

      this.saveState(records);
    } else {
      // insert
      const newId = id;
      record.id = newId;
      record.createdAt = new Date();
      record.updatedAt = new Date();
      records[newId] = record as T;

      this.saveState(records);
    }

    return record as T;
  }

  /**
   * Searches for a record by id and deletes it
   *
   * @param  {string} recordId id to search for
   * @returns {T | Error} the deleted record or an error when record is not found
   */
  public deleteById(recordId: string): T | Error {
    const records = this.loadFile();

    const deletedRecord = records[recordId];
    delete records[recordId];

    if (!deletedRecord) {
      return new DBError('Record not found for deletion!');
    }

    this.saveState(records);

    return deletedRecord;
  }

  /**
   * Deletes all records in a collection
   *
   * @returns void
   */
  public deleteAll(): void {
    this.saveState({});
  }

  /**
   * Saves the updated state of a file to memory
   *
   * @private
   * @param  {GenericRecordType<T>} records
   * @returns void
   */
  private saveState(records: GenericRecordType<T>): void {
    fs.writeFileSync(`${this.path}.json`, JSON.stringify(records));
    fs.writeFileSync(`${this.path}_values.json`, JSON.stringify(Object.values(records)));
  }
}
