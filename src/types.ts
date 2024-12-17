export type SchemaType = {
  [key: string]: {
    type: StringConstructor | NumberConstructor | BooleanConstructor | DateConstructor | ArrayConstructor;
    required?: boolean;
    enum?: Array<string>;
    unique?: boolean;
  };
};

export interface ISkewerModel {
  [index: string]: any;
  id: string;
  createdAt: Date;
  updatedAt: Date;
}
