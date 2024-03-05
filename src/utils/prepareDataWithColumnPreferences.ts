// Function to filter and transform the data
import {Column} from "../types/ColumnsPreferenceInterface";
import {DataObject} from "../types/DataObject";

export function prepareDataWithColumnPreferences(
    columnPreferences: Column[],
    data: DataObject[]
): DataObject[] {
    return data.map((dataObj: DataObject) => {
        const filteredData: DataObject = {};
        columnPreferences.forEach((column: Column) => {
            if (column.isVisible) {
                filteredData[column.displayName || column.originalName] =
                    dataObj[column.originalName];
            }
        });
        return filteredData;
    });
}
