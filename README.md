# skewer-db

A tiny custom JSON document-based db that leverages the structural and schema validation advantages of Mongoose while maintaining the simplicity of MongoDB commands

## Installation

Using npm:
```shell
$ npm i --save skewer-db
```

## Available methods
| **Method**     | **Description**                                                          |
| -------------- | ------------------------------------------------------------------------ |
| getAllRecords  | Gets all records from DB                                                 |
| findById       | Locates a record by id and returns it                                    |
| findByKey      | Locates a record using a key value pair                                  |
| findByTwoKeys  | Locates a record using 2 key value pairs                                 |
| validateSchema | Validates the record against schema and throws error if validation fails |
| insertOne      | Inserts a single record                                                  |
| insertMany     | Inserts multiple records                                                 |
| updateById     | Finds a record by id and updates it                                      |
| insertOrUpdate | Will update and existing record or insert a new one                      |
| deleteById     | Searches for a record by id and deletes it                               |
| deleteAll      | Deletes all records in a collection                                      |

## Usage

### 1. Create a model file with the schema
```ts
import { ISkewerModel, SkewerModel, SchemaType } from 'skewer-db';

export interface IUser {
  userId: string;
  name: string;
}

export const UserSchema: SchemaType = {
  userId: { type: String, required: true },
  name: { type: String, required: true },
};

export interface IUserModel extends IUser, ISkewerModel {}

export const UserModel = () => new SkewerModel<IUserModel>('users', UserSchema);
```

### 2. Use the model to perform db operations
```ts
import UserModel

const userModel = UserModel();
const record = {userId: "jd", name: "J Doe"};
try {
    console.log(UserModel().insertOne(record));
    // {
    //   userId: 'jd',
    //   name: 'J Doe',
    //   id: 'ec56dbe8-d244-49af-86d6-354fa7c23c1f',
    //   createdAt: '2024-12-17T19:42:09.200Z',
    //   updatedAt: '2024-12-17T19:42:09.200Z'
    // }
} catch(error) {
    console.log(error.message);
}

```