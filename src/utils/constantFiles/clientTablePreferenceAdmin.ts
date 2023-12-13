import { CLIENTS_COLUMNS } from "./clientTableColumns";

function convertToDisplayName(input: string) {
  return input
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, function (str) {
      return str.toUpperCase();
    })
    .trim();
}

export const clientTablePreference = [
  {
    originalName: CLIENTS_COLUMNS.LEAD_ALERT_FREQUENCY,
    isVisible: false,
    index: 6,
    displayName: convertToDisplayName(CLIENTS_COLUMNS.LEAD_ALERT_FREQUENCY),
  },
  {
    originalName: CLIENTS_COLUMNS.BUSINESS_CITY,
    isVisible: false,
    index: 7,
    displayName: convertToDisplayName(CLIENTS_COLUMNS.BUSINESS_CITY),
  },
  {
    originalName: CLIENTS_COLUMNS.BUSINESS_INDUSTRY,
    isVisible: false,
    index: 8,
    displayName: convertToDisplayName(CLIENTS_COLUMNS.BUSINESS_INDUSTRY),
  },
  {
    originalName: CLIENTS_COLUMNS.PAYMENT_METHOD,
    isVisible: false,
    index: 9,
    displayName: convertToDisplayName(CLIENTS_COLUMNS.PAYMENT_METHOD),
  },
  {
    originalName: CLIENTS_COLUMNS.LEAD_COST,
    isVisible: false,
    index: 10,
    displayName: convertToDisplayName(CLIENTS_COLUMNS.LEAD_COST),
  },
  {
    originalName: CLIENTS_COLUMNS.BUYER_ID,
    isVisible: false,
    index: 11,
    displayName: convertToDisplayName(CLIENTS_COLUMNS.BUYER_ID),
  },
  {
    originalName: CLIENTS_COLUMNS.CREDITS,
    isVisible: false,
    index: 12,
    displayName: convertToDisplayName(CLIENTS_COLUMNS.CREDITS),
  },
  {
    originalName: CLIENTS_COLUMNS.LAST_NAME,
    isVisible: false,
    index: 13,
    displayName: convertToDisplayName(CLIENTS_COLUMNS.LAST_NAME),
  },
  {
    originalName: CLIENTS_COLUMNS.EMAIL,
    isVisible: false,
    index: 14,
    displayName: convertToDisplayName(CLIENTS_COLUMNS.EMAIL),
  },
  {
    originalName: CLIENTS_COLUMNS.FIRST_NAME,
    isVisible: false,
    index: 3,
    displayName: convertToDisplayName(CLIENTS_COLUMNS.FIRST_NAME),
  },
  {
    originalName: CLIENTS_COLUMNS.BUSINESS_CITY,
    isVisible: true,
    index: 0,
    displayName: convertToDisplayName(CLIENTS_COLUMNS.BUSINESS_CITY),
  },
  {
    originalName: CLIENTS_COLUMNS.BUSINESS_SALES_NUMBER,
    isVisible: true,
    index: 1,
    displayName: convertToDisplayName(CLIENTS_COLUMNS.BUSINESS_SALES_NUMBER),
  },
  {
    originalName: CLIENTS_COLUMNS.BUSINESS_ADDRESS,
    isVisible: true,
    index: 2,
    displayName: convertToDisplayName(CLIENTS_COLUMNS.BUSINESS_ADDRESS),
  },
  {
    originalName: CLIENTS_COLUMNS.BUSINESS_LOGO,
    isVisible: true,
    index: 4,
    displayName: convertToDisplayName(CLIENTS_COLUMNS.BUSINESS_LOGO),
  },
  {
    originalName: CLIENTS_COLUMNS.BUSINESS_POST_CODE,
    isVisible: true,
    index: 5,
    displayName: convertToDisplayName(CLIENTS_COLUMNS.BUSINESS_POST_CODE),
  },
  {
    originalName: CLIENTS_COLUMNS.USER_SIGNUP_STATUS,
    isVisible: true,
    index: 15,
    displayName: convertToDisplayName(CLIENTS_COLUMNS.USER_SIGNUP_STATUS),
  },
  {
    originalName: CLIENTS_COLUMNS.CREATED_AT,
    isVisible: true,
    index: 16,
    displayName: convertToDisplayName(CLIENTS_COLUMNS.CREATED_AT),
  },
  {
    originalName: CLIENTS_COLUMNS.DAILY,
    isVisible: true,
    index: 17,
    displayName: convertToDisplayName(CLIENTS_COLUMNS.DAILY),
  },
  {
    originalName: CLIENTS_COLUMNS.ACCOUNT_MANAGER,
    isVisible: true,
    index: 18,
    displayName: convertToDisplayName(CLIENTS_COLUMNS.ACCOUNT_MANAGER),
  },
  {
    originalName: CLIENTS_COLUMNS.PHONE_NUMBER,
    isVisible: true,
    index: 19,
    displayName: convertToDisplayName(CLIENTS_COLUMNS.PHONE_NUMBER),
  },
];
