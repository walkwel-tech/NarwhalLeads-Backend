export const openingHoursFormatting=(schedule:any)=>{
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
  ];
  let result = "";
  schedule.forEach((item: { day: any; openTime: any; closeTime: any; }, index: string | number) => {
    if (item.day) {
      result += `${item.day} ${item.openTime} - ${item.closeTime} `;
    } else {
        //@ts-ignore
      result += `${days[index]} Closed `;
    }
  });
  return result
}