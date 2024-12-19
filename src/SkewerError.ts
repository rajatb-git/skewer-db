export class SkewerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SkewerError';

    Object.setPrototypeOf(this, SkewerError.prototype);
  }
}

export class SchemaValidationError extends SkewerError {
  constructor(key: string, criteria: string) {
    super(`The field ${key} is invalid and fails the criteria ${criteria}!`);
    this.name = 'SchemaValidationError';
  }
}

export class RecordNotFoundError extends SkewerError {
  constructor() {
    super('Record not found!');
    this.name = 'RecordNotFoundError';
  }
}

export class FileLoadError extends SkewerError {
  constructor(path: string) {
    super(`Error loading data store file for path - ${path}!`);
    this.name = 'FileLoadError';
  }
}

export class DuplicateIdError extends SkewerError {
  constructor() {
    super('A record with this ID already exists in the database!');
    this.name = 'DuplicateIdError';
  }
}
