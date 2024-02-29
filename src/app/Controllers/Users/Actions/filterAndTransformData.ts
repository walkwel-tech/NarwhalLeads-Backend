import { Column } from "../../../../types/ColumnsPreferenceInterface";
import { DataObject } from "../Inputs/DataObject";

export function filterAndTransformData(
    columns: Column[],
    dataArray: DataObject[]
  ): DataObject[] {
    return dataArray.map((dataObj: DataObject) => {
      const filteredData: DataObject = {};
  
      columns.forEach((column: Column) => {
        if (column.isVisible && column.originalName in dataObj) {
          filteredData[column.displayName || column.originalName] =
            dataObj[column.originalName];
        }
      });
  
      return filteredData;
    });
  }
  