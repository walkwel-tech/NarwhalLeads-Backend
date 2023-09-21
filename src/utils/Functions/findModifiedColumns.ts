
 export function findUpdatedFields(originalDoc: any, updatedDoc: any) {
    const updatedFields = {};
    let oldFields={}

    const deepCompare = (original: { [x: string]: any; }, updated: { [x: string]: any; }, path = '') => {
      for (const key in updated) {
        const originalValue = original[key];
        const updatedValue = updated[key];
        const currentPath = path ? `${path}.${key}` : key;
        if (typeof originalValue === 'object' && typeof updatedValue === 'object') {
          deepCompare(originalValue, updatedValue, currentPath);
        } else if (originalValue !== updatedValue) {
          //@ts-ignore
          updatedFields[currentPath] = updatedValue;
          //@ts-ignore
          oldFields[currentPath] = originalValue;
        }
      }
    };
  
    deepCompare(originalDoc, updatedDoc);
  
    return {updatedFields,oldFields};
  }

export  function findModifiedFieldsForUserService(previous:any, current:any) {
    const updatedFields = {};
    const oldFields={}
  
    for (const key in current) {
      if (previous[key] !== current[key]) {
        //@ts-ignore
        updatedFields[key] = current[key];
         //@ts-ignore
        oldFields[key]=previous[key]
      }
    }
  
    return {updatedFields,oldFields};
  }