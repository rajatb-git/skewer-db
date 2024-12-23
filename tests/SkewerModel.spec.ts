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
  const testBasePath = `${process.cwd()}/test_storage`;

  beforeEach(async () => {
    model = new SkewerModel<TestModel>('testModel', testSchema, testBasePath);
    await model.initialize();
    model.deleteAll();
  });

  after(async () => {
    try {
      await model.abortTransaction();
    } finally {
    }
  });

  it('should initialize correctly', async () => {
    const allRecords = model.getAllRecords();
    assert.equal(allRecords.length, 0);
  });

  it('should insert a single record', async () => {
    const record = { name: 'John Doe', age: 30, active: true };
    const insertedRecord = model.insertOne(record);
    assert.equal(model.countAll(), 1);
    assert(insertedRecord.id);
    assert(insertedRecord.createdAt instanceof Date);
    assert(insertedRecord.updatedAt instanceof Date);

    const recordFromDb = model.findById(insertedRecord.id);
    assert.deepEqual(recordFromDb, insertedRecord);
  });

  it('should insert multiple records', () => {
    const records = [
      { name: 'Jane Doe', age: 25, active: false },
      { name: 'Peter Pan', age: 18, active: true },
    ];
    const insertedRecords = model.insertMany(records);
    assert.equal(model.countAll(), 2);

    insertedRecords.forEach((record) => {
      assert(record.id);
      assert(record.createdAt instanceof Date);
      assert(record.updatedAt instanceof Date);
      const recordFromDb = model.findById(record.id);
      assert.deepEqual(recordFromDb, record);
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

  it('should find records by two keys', () => {
    const record1 = { name: 'John Doe', age: 30, active: true };
    const record2 = { name: 'Jane Doe', age: 30, active: false };

    model.insertMany([record1, record2]);

    const foundRecords = model.findByTwoKeys('age', 30, 'active', true);
    assert.equal(foundRecords.length, 1);
    assert.deepEqual(foundRecords[0], {
      ...record1,
      id: foundRecords[0].id,
      createdAt: foundRecords[0].createdAt,
      updatedAt: foundRecords[0].updatedAt,
    });
  });

  it('should open and commit transaction', async () => {
    model.openTransaction();
    const record = { name: 'John Doe', age: 30, active: true };
    model.insertOne(record);

    assert.equal(model.countAll(), 1);

    await model.commitTransaction();
    await model.initialize();

    assert.equal(model.countAll(), 1);
  });

  it('should open, modify during, and abort transaction', async () => {
    const record = { name: 'John Doe', age: 30, active: true };
    let insertedRecord = model.insertOne(record);
    assert.equal(model.countAll(), 1);

    model.openTransaction();

    insertedRecord = model.updateById(insertedRecord.id, { age: 35 }); // Modify during transaction
    assert.equal(insertedRecord.age, 35);

    await model.abortTransaction();
    await model.initialize(); // Reload to verify changes discarded

    const retrievedRecord = model.findById(insertedRecord.id);
    assert.equal(retrievedRecord?.age, 30); // Original value before transaction should be restored
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
