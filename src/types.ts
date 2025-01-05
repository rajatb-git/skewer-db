export type SchemaType = {
  [key: string]: {
    type: StringConstructor | NumberConstructor | BooleanConstructor | ArrayConstructor;
    required?: boolean;
    enum?: Array<string>;
    unique?: boolean;
    index?: boolean;
  };
};

export interface ISkewerModel {
  [index: string]: any;
  id: string;
  createdAt: string;
  updatedAt: string;
}

export type DataCacheType<T> = { [key: string]: T };

export type IndexCache = { [indexedField: string]: { [indexedFieldValue: string]: Array<string> } };

export type FindObject = { [key: string]: string };
