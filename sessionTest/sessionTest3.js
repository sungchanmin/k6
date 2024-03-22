import http from "k6/http";
import encoding from "k6/encoding";
import { browser } from 'k6/experimental/browser';
import { check } from "k6";
import { parseHTML } from 'k6/html';

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

// 테스트 수행 전 필요한 쿠키 정보 보관(복지관, 복지샵)
export function setup() {
  const COOKIES_ARRAY = new Array();
  const COOKIES_OBJECT = {};
  const HEADER = { cookies: COOKIES_OBJECT, };
  const CUSER_FORM_DATA = {
    "loginSearchBean.userId": properties.USER_ID,
    "loginSearchBean.password": encoding.b64encode(properties.PASSWORD),
    "loginSearchBean.loginType": "S",
    "loginSearchBean.loginKind": "",
    "loginSearchBean.loginKindSub": "",
  };

  // 복지관 로그인 및 쿠키 보관
  let cuserLoginRes = http.post(properties.CUSER_LOGIN_ACTION_API, CUSER_FORM_DATA, { redirects: 0 });
  for (let key in cuserLoginRes.cookies) { 
    COOKIES_OBJECT[key] = cuserLoginRes.cookies[key][0].value;
    COOKIES_ARRAY.push(cuserLoginRes.cookies[key][0]);
  }
  
  // 복지샵 ASP 요청 및 Form 태그에 포함된 34개 input 태그 값 추출
  let shopAspRes = http.get(properties.SHOP_ASP_URL, HEADER);
  let formTag = parseHTML(shopAspRes.body).find('#divLink');
  const SHOP_FORM_DATA = {};
  
  for (let i = 0; i < formTag.children().size(); i++) {
      let key = properties.SHOP_ASP_INPUT_NAME[i];
      let value = formTag.children().get(i).value();
      SHOP_FORM_DATA[key] = value;
  }

  // 복지샵 로그인 및 쿠키 보관
  let shopLoginRes = http.post(properties.SHOP_LOGIN_ACTION_API, SHOP_FORM_DATA, { redirects: 0 });
  for (let key in shopLoginRes.cookies) { 
    COOKIES_OBJECT[key] = shopLoginRes.cookies[key][0].value; 
    COOKIES_ARRAY.push(shopLoginRes.cookies[key][0]);
  }

  return COOKIES_ARRAY;
}

export default async function (COOKIES) {
  
  console.log(COOKIES);
  for(let key in COOKIES) {
    console.log(COOKIES[key]);
  }


  const context = browser.newContext();
  const page = context.newPage();
  context.addCookies(COOKIES);

  try {
    // 복지샵 페이지 요청
    await page.goto(properties.SHOP_MAIN_PAGE_URL);

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' })
    ]);

    //check(page, { 'Main page title check --- ▒▒ 임직원을 위한 복리후생관 ▒▒': (page) => page.locator('title').textContent() == '▒▒ 임직원을 위한 복리후생관 ▒▒', });
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
