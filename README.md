# skewer-db
![skewerdb](./docs/skewerdb_icon_200.svg) 

[CONTRIBUTING](https://github.com/rajatb-git/skewer-db/blob/main/CONTRIBUTING.md) |
[Code of Conduct](https://github.com/rajatb-git/skewer-db/blob/main/CODE_OF_CONDUCT.md) |
[CHANGELOG](https://github.com/rajatb-git/skewer-db/blob/main/CHANGELOG.md)

A lightweight, document-based database for small-scale projects and local development.  Leveraging familiar Mongoose/MongoDB paradigms for easy setup and usage. Data is stored locally on disk.

## Why SkewerDB?

Need a simple database for a small project or local development?  Tired of the overhead and learning curve associated with other document databases? SkewerDB offers a streamlined solution, utilizing the familiar schema validation and command structure of Mongoose and MongoDB. This minimizes setup time and allows developers to get started quickly.

* **Lightweight:** Minimal dependencies and overhead.
* **Easy to Learn:**  Uses Mongoose/MongoDB-like syntax and commands.
* **Local Storage:** Data is persisted locally on disk.
* **Fast Setup:**  Get up and running in minutes.
* **Schema Validation:** Ensure data integrity with Mongoose-style schemas.

## Installation

Using npm:
```shell
$ npm i --save skewer-db
```

## Usage

### 1. Define Your Schema and Model
```ts
import { ISkewerModel, SchemaType, SkewerModel } from "skewer-db";

export interface IUser {
  name: string;
}

export const UserSchema: SchemaType = {
  name: { type: String, required: true },
};

export interface IUserModel extends IUser, ISkewerModel {}

export const UserModel = () => new SkewerModel<IUserModel>('users', UserSchema);
```

### 2. Perform Database Operations
```ts
import UserModel from './user-model'; // Import your model

const userModel = UserModel();
userModel.initialize();

try {
  const newRecord = userModel.insertOne(record);
  console.log(newRecord);
  // Expected Output:
  // {
  //   userId: 'jd',
  //   name: 'J Doe',
  //   id: 'some-generated-uuid',
  //   createdAt: '2024-12-17T19:42:09.200Z',
  //   updatedAt: '2024-12-17T19:42:09.200Z'
  // }


  const foundUser = userModel.findById(newRecord.id)
  console.log(foundUser)
  // Expected Output: Same as above


  const allUsers = userModel.getAllRecords()
  console.log(allUsers)
  // Expected Output: An array with the user objects
} catch (error) {
  console.error(error.message);
}
```

## Testing
90% of existing test cases have been generated using LLM models

## Available methods
| **Method**              | **Description**                                                        |
| ----------------------- | ---------------------------------------------------------------------- |
| getAllRecords()         | Retrieves all records from the collection.                             |
| findById(id)            | Retrieves a record by its ID.                                          |
| find(searchObject)      | Locates all records that match the search parameters (case-sensitive). |
| insertOne(record)       | Inserts a single record.                                               |
| insertMany(records)     | Inserts multiple records.                                              |
| updateById(id, updates) | Updates a record by its ID.                                            |
| insertOrUpdate(record)  | Updates an existing record or inserts a new one.                       |
| deleteById(id)          | Deletes a record by its ID.                                            |
| deleteAll()             | Deletes all records from the collection.                               |
| validateSchema(record)  | Validates a record against the schema.                                 |