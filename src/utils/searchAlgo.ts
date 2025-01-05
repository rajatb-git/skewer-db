import { IndexCache, SchemaType } from '../types';

export const find = (
  searchParams: Partial<any>,
  schema: SchemaType,
  dataCache: Map<string, any>,
  indexCache: IndexCache
) => {
  const foundRecords: Array<any> = [],
    tempDataCache = new Map<string, any>(),
    searchPArr = Object.entries(searchParams);
  let counter = 0;

  for (const [key, value] of searchPArr) {
    ++counter;

    if (schema[key].unique || schema[key].index) {
      const dbIds = indexCache[key]?.[value];

      dbIds.forEach((dbId) => {
        const record = (counter === 1 ? dataCache : tempDataCache).get(dbId);
        if (record) tempDataCache.set(dbId, { ...record, count: (record.count || 0) + 1 });
      });
    } else {
      (counter === 1 ? dataCache : tempDataCache).forEach((dcValue) => {
        if (dcValue[key] === value) {
          tempDataCache.set(dcValue.id, { ...dcValue, count: (dcValue.count || 0) + 1 });
        }
      });
    }

    if (tempDataCache.size === 0) {
      break;
    }
  }

  tempDataCache.forEach((value) => {
    if (value.count === searchPArr.length) {
      delete value.count;
      foundRecords.push(value);
    }
  });

  return foundRecords;
};
