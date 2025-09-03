import puppeteer from "puppeteer";
import Promise from "bluebird";
import hb from "handlebars";
import inlineCss from "inline-css";

export const generatePdf = async (file, options, callback) => {

  let args = ["--no-sandbox", "--disable-setuid-sandbox"];
  if (options.args) {
    args = options.args;
    delete options.args;
  }

  const browser = await puppeteer.launch({ args: args });

  const page = await browser.newPage();

  if (file.content) {

    let data = await inlineCss(file.content, { url: "/" });
    const template = hb.compile(data, { strict: true });
    const result = template(data);
    const html = result;

    await page.setContent(html, { waitUntil: "networkidle0" });

  }
  else {
    await page.goto(file.url, { waitUntil: ["load", "networkidle0"] })

    await page.waitForNavigation({ waitUntil: "networkidle0" })
  }

  return Promise.props(page.pdf(options))
    .then(async function (data) {
      await browser.close();

      return Buffer.from(Object.values(data));
    })
    .asCallback(callback);
};
