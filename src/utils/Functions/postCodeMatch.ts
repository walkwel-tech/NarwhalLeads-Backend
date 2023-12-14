export function arraysAreEqual(
  array1: (string | any)[],
  array2: (string | any)[]
): boolean {
  if (array1.length !== array2.length) {
    return false;
  }

  return array1.reduce((isEqual: boolean, obj1: any, index: number) => {
    const obj2 = array2[index];

    return (
      isEqual &&
      obj1.day === obj2.day &&
      obj1.isActive === obj2.isActive &&
      obj1.openTime === obj2.openTime &&
      obj1.closeTime === obj2.closeTime
    );
  }, true);
}
