# skewer-db

## Why Skewer DB?
The market has a lot of databases with a lot of support that you can use, SkewerDB tackles a niche use case for small scale setups where you need a db to store minimal information or just use it for local projects.
All the the small document based (no server) dbs currently come with a learning curve, SkewerDB takes advantage of commands from mongoose and mongodb. SkewerDB uses the same schema validation and declarations setup of mongoose and similar commands to mongodb thereby reducing the learning and setup time.
The data store resides locally in disk.

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