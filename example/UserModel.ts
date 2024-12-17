import { ISkewerModel, SchemaType, SkewerModel } from '../src';

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
