import * as assert from 'assert';

import { SkewerModel, ISkewerModel, SchemaType } from '../src';

interface TestModel extends ISkewerModel {
  name: string;
  age: number;
  active: boolean;
}

const testSchema: SchemaType = {
  name: { type: String, required: true, unique: true },
  age: { type: Number, required: true },
  active: { type: Boolean },
  keyword: { type: String, enum: ['a', 'b', 'c'] },
};

describe('SkewerModel', () => {
  let model: SkewerModel<TestModel>;

  beforeEach(() => {
    model = new SkewerModel<TestModel>('testModel', testSchema);
    // Clear existing data before each test
    model.deleteAll();
  });

  it('should insert a single record', () => {
    const record = { name: 'John Doe', age: 30, active: true };
    const insertedRecord = model.insertOne(record);
    assert.equal(model.countAll(), 1);
    assert.deepEqual(insertedRecord, {
      ...record,
      id: insertedRecord.id,
      createdAt: insertedRecord.createdAt,
      updatedAt: insertedRecord.updatedAt,
    });
  });

  it('should insert multiple records', () => {
    const records = [
      { name: 'Jane Doe', age: 25, active: false },
      { name: 'Peter Pan', age: 18, active: true },
    ];
    const insertedRecords = model.insertMany(records);
    assert.equal(model.countAll(), 2);
    assert.deepEqual(insertedRecords[0], {
      ...records[0],
      id: insertedRecords[0].id,
      createdAt: insertedRecords[0].createdAt,
      updatedAt: insertedRecords[0].updatedAt,
    });
    assert.deepEqual(insertedRecords[1], {
      ...records[1],
      id: insertedRecords[1].id,
      createdAt: insertedRecords[1].createdAt,
      updatedAt: insertedRecords[1].updatedAt,
    });
  });

  it('should throw DuplicateIdError when inserting a record with an existing ID', () => {
    const record = { name: 'John Doe', age: 30, active: true };
    const insertedRecord = model.insertOne(record);

    assert.throws(() => {
      model.insertOne(record, insertedRecord.id);
    }, /DuplicateIdError/);
  });

  it('should throw error if schema validation fails', () => {
    assert.throws(() => model.insertOne({ name: 123, age: 30 } as any), /SchemaValidationError/);
    assert.throws(() => model.insertOne({ name: 'John Doe', age: '30' } as any), /SchemaValidationError/);
    assert.throws(() => model.insertOne({ age: 30 } as any), /SchemaValidationError/);
  });

  it('should get all records', () => {
    const record1 = { name: 'John Doe', age: 30, active: true };
    const record2 = { name: 'Jane Doe', age: 25, active: false };
    model.insertOne(record1);
    model.insertOne(record2);
    const allRecords = model.getAllRecords();
    assert.equal(allRecords.length, 2);
  });

  it('should find a record by id', () => {
    const record = { name: 'John Doe', age: 30, active: true };
    const insertedRecord = model.insertOne(record);
    const foundRecord = model.findById(insertedRecord.id);
    assert.deepEqual(foundRecord, insertedRecord);
  });

  it('should find a record by key', () => {
    const record = { name: 'John Doe', age: 30, active: true };
    const insertedRecord = model.insertOne(record);
    const foundRecord = model.findByKey('name', 'John Doe')?.[0];
    assert.deepEqual(foundRecord, insertedRecord);
  });

  it('should update a record by id', () => {
    const record = { name: 'John Doe', age: 30, active: true };
    const insertedRecord = model.insertOne(record);
    const updatedRecord = model.updateById(insertedRecord.id, { age: 35 });
    assert.equal(updatedRecord.age, 35);
  });

  it('should throw error if record not found while updating', () => {
    assert.throws(() => model.updateById('nonexistentId', { age: 35 }), /RecordNotFoundError/);
  });

  it('should upsert a record', () => {
    const record = { name: 'John Doe', age: 30, active: true };
    let upsertedRecord = model.insertOrUpdate(record, 'newId');
    assert.deepEqual(upsertedRecord, {
      ...record,
      id: 'newId',
      createdAt: upsertedRecord.createdAt,
      updatedAt: upsertedRecord.updatedAt,
    });

    upsertedRecord = model.insertOrUpdate({ age: 35 }, 'newId');
    assert.equal(upsertedRecord.age, 35);
  });

  it('should delete a record by id', () => {
    const record = { name: 'John Doe', age: 30, active: true };
    const insertedRecord = model.insertOne(record);
    const deletedRecord = model.deleteById(insertedRecord.id);
    assert.deepEqual(deletedRecord, insertedRecord);
    assert.equal(model.countAll(), 0);
  });

  it('should throw error if record not found while deleting', () => {
    assert.throws(() => model.deleteById('nonexistentId'), /RecordNotFoundError/);
  });

  it('should delete all records', () => {
    const record1 = { name: 'John Doe', age: 30, active: true };
    const record2 = { name: 'Jane Doe', age: 25, active: false };
    model.insertOne(record1);
    model.insertOne(record2);
    model.deleteAll();
    assert.equal(model.countAll(), 0);
  });

  it('should find a record by two keys', () => {
    const record1 = { name: 'John Doe', age: 30, active: true };
    const record2 = { name: 'Jane Doe', age: 30, active: false };
    model.insertOne(record1);
    model.insertOne(record2);
    const foundRecord = model.findByTwoKeys('name', 'Jane Doe', 'age', 30)?.[0];
    assert.deepEqual(foundRecord, {
      ...record2,
      id: foundRecord?.id,
      createdAt: foundRecord?.createdAt,
      updatedAt: foundRecord?.updatedAt,
    });
  });

  it('should open and commit a transaction', () => {
    model.openTransaction();
    const record = { name: 'John Doe', age: 30, active: true };
    model.insertOne(record);
    model.commitTransaction();

    assert.equal(model.countAll(), 1);
  });

  it('should validate unique constraint', () => {
    const record1 = { name: 'John Doe', age: 30, active: true, keyword: 'a' };
    model.insertOne(record1);
    assert.throws(() => model.insertOne(record1), /SchemaValidationError/);
  });

  it('should validate enum constraint', () => {
    const record1 = { name: 'John Doe', age: 30, active: true, keyword: 'd' };
    assert.throws(() => model.insertOne(record1), /SchemaValidationError/);
  });
});
