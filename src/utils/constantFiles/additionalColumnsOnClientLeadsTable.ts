export const additionalColumnsForLeads = (length: number) => {
  const data = [
    {
      originalName: COLUMN_NAMES.CLIENT_NAME,
      isVisible: true,
      index: length,
      displayName: COLUMN_NAMES.CLIENT_NAME,
    },
    {
      originalName:  COLUMN_NAMES.BUSINESS_NAME,
      isVisible: true,
      index: length + 1,
      displayName:  COLUMN_NAMES.BUSINESS_NAME,
    },
    {
      originalName:  COLUMN_NAMES.BUSINESS_INDUSTRY,
      isVisible: true,
      index: length + 2,
      displayName:  COLUMN_NAMES.BUSINESS_INDUSTRY,
    },
  ];
  return data;
};

export const COLUMN_NAMES={
    CLIENT_NAME:"clientName",
    BUSINESS_NAME:"businessName",
    BUSINESS_INDUSTRY:"businessIndustry"
}