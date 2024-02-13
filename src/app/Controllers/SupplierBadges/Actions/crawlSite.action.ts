import puppeteer from "puppeteer";

export const crawlSite = async (website: string) => {
  const webBase = process.env.APP_HOME ?? "";

  const browser = await puppeteer.launch();
  const newPage = await browser.newPage();
  await newPage.goto(website, { waitUntil: "load", timeout: 0 });
  const hasSpotDifBadge = await newPage.evaluate((webBase) => {
    const images = document.querySelectorAll("img");

    return Array.from(images).some((img) => img.src.includes(webBase));
  }, webBase);
  await browser.close();


  return hasSpotDifBadge;
};
