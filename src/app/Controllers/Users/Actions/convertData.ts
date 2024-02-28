export function convertData(data: any, labels: any, year: any) {
    // Initialize an array of 12 elements with all zeros
    const dataArr = Array(12).fill(0);
  
    // Loop through each object in the data array and update the corresponding element in dataArr
    data.forEach((obj: any) => {
      const index = obj.month - 1;
      if (obj.year != year) {
      } else {
        dataArr[index] += obj.count;
      }
    });
    let years: any = [];
    data.map((i: any) => {
      if (!years.includes(i.year)) {
        years.push(i.year);
      }
    });
  
    // Create an object with labels and data properties
    return { labels, data: dataArr, years: years };
  }