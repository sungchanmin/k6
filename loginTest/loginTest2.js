import { browser } from 'k6/experimental/browser';
import { check } from "k6";

const properties = JSON.parse(open('./properties.json'));

export const options = {
  scenarios: {
    ui: {
      executor: 'shared-iterations',
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
};

export default async function () {
  const page = browser.newPage();

  try {
    // 로그인 페이지 요청
    await page.goto(properties.LOGIN_PAGE_URL);

    page.locator('input[name="loginSearchBean.userId1"]').type(properties.USER_ID);
    page.locator('input[name="loginSearchBean.password1"]').type(properties.PASSWORD);

    check(page, { 'Login page title check --- 로그인 | 임직원을 위한 복리후생관': (page) => page.locator('title').textContent() == '로그인 | 임직원을 위한 복리후생관', });
    page.screenshot({ path: `screenshots/LoginPage_${getTimeStamp()}_${__VU}.png` });

    await Promise.all([
      // 로그인 및 메인 페이지 요청
      page.keyboard.press('Enter'),
      // page.evaluate(() => { jsLogin(); }),
      page.waitForNavigation({ waitUntil: 'domcontentloaded' })
    ]);

    check(page, { 'Main page title check --- ▒▒ 임직원을 위한 복리후생관 ▒▒': (page) => page.locator('title').textContent() == '▒▒ 임직원을 위한 복리후생관 ▒▒', });
    page.screenshot({ path: `screenshots/MainPage_${getTimeStamp()}_${__VU}.png` });

  } finally {
    page.close();
  }
}

function getTimeStamp() {
  let serverDate = new Date();
  let localDate = new Date(serverDate.getTime() + (9 * 60 * 60 * 1000));
  return localDate.toISOString().replace(/:/g, "-");
}