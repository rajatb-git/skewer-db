// Error.CastError;
// Error.DivergentArrayError;
// Error.DocumentNotFoundError;
// Error.MissingSchemaError;
// Error.MongooseServerSelectionError;
// Error.OverwriteModelError;
// Error.ParallelSaveError;
// Error.StrictModeError;
// Error.StrictPopulateError;
// Error.ValidationError;
// Error.ValidatorError;
// Error.VersionError;
// Error.messages;

export class DBError extends Error {
  message: string;

  constructor(message: string) {
    super();

    this.message = message;

    Object.setPrototypeOf(this, DBError.prototype);
  }

  DocumentNotFoundError() {
    this.name = 'DocumentNotFoundError';
  }

  SchemaValidationError() {
    this.name = 'SchemaValidationError';
  }
}
