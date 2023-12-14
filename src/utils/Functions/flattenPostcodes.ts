export interface County {
  county: string;
  postalCode: string[];
  key: string;
}

export function flattenPostalCodes(postCodeList: County[]): County[] {
  const flattenedPostalCodes: string[] = [];

  postCodeList.forEach((county: County) => {
    const postalCodes: string[] = county.postalCode.map(
      (code: string) => `${code}`
    );
    flattenedPostalCodes.push(...postalCodes);
  });
  const result: County[] = [
    {
      county: `${postCodeList[0].county}`,
      postalCode: flattenedPostalCodes,
      key: `${postCodeList[0].key}`,
    },
  ];

  return result;
}
