import { IUser, UserModel } from './UserModel';

(function () {
  const userModel = UserModel();
  const sampleUser: IUser = { userId: 'jd', name: 'J Doe' };

  console.log(userModel.insertOne(sampleUser));
  //   {
  //     userId: 'jd',
  //     name: 'J Doe',
  //     id: 'b1978086-d588-4479-b181-ba669775ba24',
  //     createdAt: 2024-12-17T19:33:11.449Z,
  //     updatedAt: 2024-12-17T19:33:11.449Z
  //   }

  console.log(userModel.getAllRecords());
  //   [
  //     {
  //       userId: 'jd',
  //       name: 'J Doe',
  //       id: 'ec56dbe8-d244-49af-86d6-354fa7c23c1f',
  //       createdAt: '2024-12-17T19:42:09.200Z',
  //       updatedAt: '2024-12-17T19:42:09.200Z'
  //     }
  //   ]
})();
